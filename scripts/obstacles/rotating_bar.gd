extends Node3D
## A bar that sweeps around a central pivot and knocks the player around.
## The bar body is a child so it can collide with the ragdoll while the pivot
## node performs the rotation.

var _speed := 1.2
var _active := true
var _angle := 0.0
var _length := 7.0


func setup(center: Vector3, size: Vector3, spin_speed: float, home_yaw: float = 0.0) -> void:
	_length = size.x
	_speed = spin_speed
	_angle = home_yaw
	position = center
	rotation.y = home_yaw
	_build_bar(size)


func _build_bar(size: Vector3) -> void:
	var bar := StaticBody3D.new()
	bar.collision_layer = 1
	bar.collision_mask = 0
	add_child(bar)

	var shape := BoxShape3D.new()
	shape.size = size
	var col := CollisionShape3D.new()
	col.shape = shape
	bar.add_child(col)

	var mesh := MeshInstance3D.new()
	var bm := BoxMesh.new()
	bm.size = size
	mesh.mesh = bm
	var mat := StandardMaterial3D.new()
	mat.albedo_color = Color(0.95, 0.30, 0.22)
	mat.emission_enabled = true
	mat.emission = Color(0.8, 0.1, 0.05)
	mat.emission_energy_multiplier = 0.8
	mat.roughness = 0.4
	mesh.material_override = mat
	bar.add_child(mesh)

	# End caps make the spin direction easy to read.
	for x in [-size.x * 0.5, size.x * 0.5]:
		var cap := MeshInstance3D.new()
		cap.mesh = _box_mesh(Vector3(0.5, 0.55, 0.55))
		cap.position = Vector3(x, 0, 0)
		var cm := StandardMaterial3D.new()
		cm.albedo_color = Color(1.0, 0.85, 0.1)
		cm.roughness = 0.3
		cap.material_override = cm
		bar.add_child(cap)


func _physics_process(delta: float) -> void:
	if not _active:
		return
	_angle += _speed * delta
	rotation.y = _angle


func reset() -> void:
	_angle = 0.0
	rotation.y = 0.0


func set_active(value: bool) -> void:
	_active = value


func _box_mesh(size: Vector3) -> BoxMesh:
	var m := BoxMesh.new()
	m.size = size
	return m
