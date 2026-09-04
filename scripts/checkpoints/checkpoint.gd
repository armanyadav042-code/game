extends Node3D
## Checkpoint with an Area3D trigger, bright diamond visual, light, and
## activation burst.

signal activated(index: int)

const UI_SPAWN := Color(1.0, 0.82, 0.22)
const ACTIVE_COLOR := Color(0.30, 0.95, 0.45)

var index: int = 0
var respawn_position: Vector3 = Vector3.ZERO
var _active := false
var _mesh: MeshInstance3D
var _light: OmniLight3D


func _ready() -> void:
	_build()
	_place_marker()


func setup(checkpoint_index: int, visual_pos: Vector3, spawn: Vector3) -> void:
	index = checkpoint_index
	respawn_position = spawn
	global_position = visual_pos
	_place_marker()


func is_active() -> bool:
	return _active


func activate() -> void:
	if _active:
		return
	_active = true
	_refresh_visual()
	GameManager.play_sfx("checkpoint")
	if has_node("Marker"):
		Effects.burst(get_parent(), global_position + Vector3(0, 0.4, 0), ACTIVE_COLOR, 28, 3.0, 7.0, 0.7)
	activated.emit(index)


func reset() -> void:
	_active = false
	_refresh_visual()


func _build() -> void:
	# Pivot (diamond).
	var marker := Node3D.new()
	marker.name = "Marker"
	add_child(marker)

	_mesh = MeshInstance3D.new()
	_mesh.mesh = _box_mesh(Vector3(0.55, 0.55, 0.55))
	_mesh.rotation = Vector3(0.785, 0.0, 0.785)
	marker.add_child(_mesh)

	_light = OmniLight3D.new()
	_light.omni_range = 5.5
	_light.light_energy = 1.4
	marker.add_child(_light)

	# Trigger.
	var area := Area3D.new()
	area.name = "Area"
	area.collision_layer = 0
	area.collision_mask = 2
	area.monitoring = true
	area.monitorable = false
	add_child(area)
	var shape := CollisionShape3D.new()
	var box := BoxShape3D.new()
	box.size = Vector3(2.4, 3.2, 2.4)
	shape.shape = box
	area.add_child(shape)
	area.body_entered.connect(_on_body_entered)

	_refresh_visual()


func _place_marker() -> void:
	# The marker floats slightly above the trigger.
	var m := get_node("Marker")
	m.global_position = global_position + Vector3(0, 1.3, 0)
	m.rotation = Vector3(0, 0, 0)


func _on_body_entered(body: Node) -> void:
	if body.is_in_group("player"):
		activate()


func _refresh_visual() -> void:
	if _mesh == null:
		return
	var color := ACTIVE_COLOR if _active else UI_SPAWN
	var mat := StandardMaterial3D.new()
	mat.albedo_color = color
	mat.emission_enabled = true
	mat.emission = color
	mat.emission_energy_multiplier = 1.8 if _active else 0.8
	mat.roughness = 0.2
	mat.metallic = 0.3
	_mesh.material_override = mat
	if _light:
		_light.light_color = color
		_light.light_energy = 2.0 if _active else 1.0


func _box_mesh(size: Vector3) -> BoxMesh:
	var m := BoxMesh.new()
	m.size = size
	return m
