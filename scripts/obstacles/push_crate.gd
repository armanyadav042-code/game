extends RigidBody3D
## Small pushable crate. The ragdoll can shove it around; it can also be used
## to reach slightly higher ledges.

func setup(center: Vector3, size: Vector3, color: Color) -> void:
	mass = 1.4
	collision_layer = 1
	collision_mask = 1
	continuous_cd = true
	can_sleep = true
	linear_damp = 0.3
	angular_damp = 0.5
	position = center

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
	mat.roughness = 0.7
	mesh.material_override = mat
	add_child(mesh)


func reset() -> void:
	linear_velocity = Vector3.ZERO
	angular_velocity = Vector3.ZERO
