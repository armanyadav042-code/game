extends Node3D
## Booster pad that flings the ragdoll upward when touched.

const LAUNCH_SPEED := 14.0

var _light: OmniLight3D


func _ready() -> void:
	_build()


func setup(center: Vector3, parent: Node) -> void:
	parent.add_child(self)
	global_position = center


func _build() -> void:
	var pad := MeshInstance3D.new()
	pad.mesh = _box_mesh(Vector3(2.4, 0.14, 2.4))
	var mat := StandardMaterial3D.new()
	mat.albedo_color = Color(0.25, 0.85, 0.95)
	mat.emission_enabled = true
	mat.emission = Color(0.1, 0.65, 0.95)
	mat.emission_energy_multiplier = 1.6
	mat.roughness = 0.25
	pad.material_override = mat
	add_child(pad)

	_light = OmniLight3D.new()
	_light.position = Vector3(0, 0.8, 0)
	_light.omni_range = 4.0
	_light.light_energy = 1.6
	_light.light_color = Color(0.45, 0.85, 1.0)
	add_child(_light)

	var area := Area3D.new()
	area.collision_layer = 0
	area.collision_mask = 2
	area.monitoring = true
	area.monitorable = false
	add_child(area)
	var shape := CollisionShape3D.new()
	var box := BoxShape3D.new()
	box.size = Vector3(2.2, 0.6, 2.2)
	shape.shape = box
	area.add_child(shape)
	area.body_entered.connect(_on_body_entered)


func _physics_process(_delta: float) -> void:
	# Gentle pulse.
	if _light == null:
		return
	var t := 0.5 + 0.5 * sin(Time.get_ticks_msec() / 180.0)
	_light.light_energy = 1.2 + t * 0.8


func _on_body_entered(body: Node) -> void:
	if not body.is_in_group("player"):
		return
	if body.has_method("launch_up"):
		body.launch_up(LAUNCH_SPEED)
		Effects.burst(get_parent(), global_position + Vector3(0, 0.6, 0), Color(0.3, 0.9, 1.0), 30, 4.0, 10.0, 0.8)


func reset() -> void:
	pass


func _box_mesh(size: Vector3) -> BoxMesh:
	var m := BoxMesh.new()
	m.size = size
	return m
