extends AnimatableBody3D
## Reusable kinematic moving obstacle/platform. It slides along its configured
## axis and pushes the ragdoll (Godot's AnimatableBody3D handles that cleanly).

var _base := Vector3.ZERO
var _axis := Vector3.ZERO
var _range := 0.0
var _speed := 1.0
var _phase := 0.0
var _active := true


func _ready() -> void:
	sync_to_physics = true


func setup(center: Vector3, size: Vector3, direction: Vector3, travel_range: float, speed: float, color: Color, name_prefix: String = "") -> void:
	_base = center
	_axis = direction.normalized()
	_range = travel_range
	_speed = speed
	_phase = 0.0
	position = _base
	_build_body(size, color, name_prefix)


func _build_body(size: Vector3, color: Color, _name_prefix: String) -> void:
	var shape := BoxShape3D.new()
	shape.size = size
	var col := CollisionShape3D.new()
	col.shape = shape
	add_child(col)

	var mesh := MeshInstance3D.new()
	var bm := BoxMesh.new()
	bm.size = size
	mesh.mesh = bm
	var mat := StandardMaterial3D.new()
	mat.albedo_color = color
	mat.roughness = 0.55
	mat.metallic = 0.10
	mesh.material_override = mat
	add_child(mesh)


func _physics_process(delta: float) -> void:
	if not _active:
		return
	_phase += delta * _speed
	var t := sin(_phase) * 0.5 + 0.5
	position = _base + _axis * _range * (t - 0.5)


func reset() -> void:
	_phase = 0.0
	position = _base


func set_active(value: bool) -> void:
	_active = value
