extends Node3D
## Finish gate with a banner, glowing pad, and area trigger.

signal finished

var _fired := false
var _post: MeshInstance3D


func _ready() -> void:
	_build()


func build_at(pos: Vector3, parent: Node) -> void:
	parent.add_child(self)
	global_position = pos


func _build() -> void:
	# Pad.
	var pad := MeshInstance3D.new()
	pad.mesh = _box_mesh(Vector3(6.0, 0.18, 4.0))
	var pad_mat := StandardMaterial3D.new()
	pad_mat.albedo_color = Color(0.24, 0.95, 0.45)
	pad_mat.emission_enabled = true
	pad_mat.emission = Color(0.24, 0.95, 0.45)
	pad_mat.emission_energy_multiplier = 1.4
	pad.material_override = pad_mat
	add_child(pad)

	# Posts and banner.
	for x in [-3.0, 3.0]:
		var post := MeshInstance3D.new()
		post.mesh = _box_mesh(Vector3(0.3, 5.2, 0.3))
		post.position = Vector3(x, 2.6, 0)
		var post_mat := StandardMaterial3D.new()
		post_mat.albedo_color = Color(0.95, 0.95, 0.95)
		post.material_override = post_mat
		add_child(post)

	var banner := MeshInstance3D.new()
	banner.mesh = _box_mesh(Vector3(6.4, 1.0, 0.16))
	banner.position = Vector3(0, 4.5, 0)
	var banner_mat := StandardMaterial3D.new()
	banner_mat.albedo_color = Color(0.98, 0.75, 0.18)
	banner_mat.emission_enabled = true
	banner_mat.emission = Color(0.98, 0.5, 0.1)
	banner_mat.emission_energy_multiplier = 0.8
	banner.material_override = banner_mat
	add_child(banner)

	# Light.
	var l := OmniLight3D.new()
	l.position = Vector3(0, 3.5, 0)
	l.omni_range = 10.0
	l.light_energy = 2.0
	l.light_color = Color(0.5, 1.0, 0.55)
	add_child(l)

	# Trigger.
	var area := Area3D.new()
	area.collision_layer = 0
	area.collision_mask = 2
	area.monitoring = true
	area.monitorable = false
	add_child(area)
	var shape := CollisionShape3D.new()
	var box := BoxShape3D.new()
	box.size = Vector3(5.5, 8.0, 4.5)
	shape.shape = box
	area.add_child(shape)
	area.body_entered.connect(_on_body_entered)


func reset() -> void:
	_fired = false


func _on_body_entered(body: Node) -> void:
	if _fired:
		return
	if body.is_in_group("player"):
		_fired = true
		GameManager.play_sfx("finish")
		Effects.burst(get_parent(), global_position + Vector3(0, 2.0, 0), Color(0.4, 1.0, 0.5), 60, 5.0, 11.0, 1.1)
		finished.emit()


func _box_mesh(size: Vector3) -> BoxMesh:
	var m := BoxMesh.new()
	m.size = size
	return m
