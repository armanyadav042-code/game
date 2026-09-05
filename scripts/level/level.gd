extends Node3D
## Builds the full 10-section rooftop obstacle course, all checkpoints, the
## finish area, lighting, and procedural low-poly decorations.

const WORLD_LAYER := 1
const PLAYER_LAYER := 2
const FALL_Y := -0.4

const ROOF_COLOR := Color(0.62, 0.40, 0.27)
const ROOF_DARK := Color(0.48, 0.30, 0.22)
const ROOF_BLUE := Color(0.28, 0.56, 0.78)
const PLATFORM_BLUE := Color(0.30, 0.55, 0.85)
const BEAM_YELLOW := Color(0.95, 0.72, 0.28)
const PLAZA := Color(0.42, 0.45, 0.49)
const DANGER_RED := Color(0.92, 0.25, 0.22)
const GRAY := Color(0.52, 0.55, 0.58)
const GREEN := Color(0.22, 0.68, 0.42)
const WINDOW := Color(0.25, 0.65, 0.82)

const CHECKPOINT_SCENE := preload("res://scenes/checkpoints/checkpoint.tscn")
const FINISH_SCENE := preload("res://scenes/finish/finish.tscn")
const MOVING_SCENE := preload("res://scenes/obstacles/moving_platform.tscn")
const FALLING_SCENE := preload("res://scenes/obstacles/falling_platform.tscn")
const ROTATING_SCENE := preload("res://scenes/obstacles/rotating_bar.tscn")
const LAUNCH_SCENE := preload("res://scenes/obstacles/launch_pad.tscn")
const PUSH_SCENE := preload("res://scenes/obstacles/push_crate.tscn")

var player
var _materials: Dictionary = {}
var _course_end := 0.0
var _obstacles: Array = []
var _checkpoints: Array = []
var _finish
var _current_checkpoint := 0
var _respawn_pos := Vector3(0, 0, 0)
var _rng := RandomNumberGenerator.new()
var _roof_records: Array = []


func _ready() -> void:
	_rng.seed = 777
	_build_environment()
	_build_course()


func configure(target: Node) -> void:
	player = target
	_respawn_pos = player.global_position
	player.set_controls_enabled(false)


func respawn_player() -> void:
	player.teleport_to(_respawn_pos)
	player.set_controls_enabled(true)
	reset_obstacles()
	GameManager.play_sfx("land_soft")


func reset_obstacles() -> void:
	for o in _obstacles:
		if o and o.has_method("reset"):
			o.reset()


func get_number_of_checkpoints() -> int:
	return _checkpoints.size()


func _physics_process(_delta: float) -> void:
	if player == null:
		return
	if player.controls_enabled and player.global_position.y < FALL_Y:
		GameManager.play_sfx("fall")
		respawn_player()


# ---------------------------------------------------------------------------
# Course construction
# ---------------------------------------------------------------------------

func _build_course() -> void:
	# Section 1 - Easy starting rooftops.
	var p1 := _add_static_box(Vector3(0, -0.5, 0), Vector3(7, 3, 9), ROOF_COLOR)
	_roof_records.append({"center": p1.position, "width": 7.0, "depth": 9.0, "top": 1.0})
	_course_end = 4.5
	_next_roof(6.0, 10.0, 1.3, 1.5, ROOF_BLUE, -0.4)
	_next_roof(6.0, 10.0, 1.6, 1.0, ROOF_COLOR, 0.4)

	# Section 2 - Small gaps.
	for i in range(4):
		var top := 1.9 + i * 0.28
		var gap := 1.0 + (i % 2) * 0.45
		_next_roof(4.2, 6.0, top, gap, PLATFORM_BLUE if i % 2 == 0 else ROOF_DARK, 0.0 if i % 2 == 0 else 0.35)

	# Section 3 - Larger jumps.
	_next_roof(4.6, 4.5, 3.1, 4.0, BEAM_YELLOW, 0.0)
	_next_roof(4.6, 4.5, 3.4, 4.5, BEAM_YELLOW, -0.7)
	_next_roof(5.0, 5.0, 3.7, 5.0, BEAM_YELLOW, 0.7)

	# Checkpoint 1 landing.
	var cp1 := _next_roof(6.0, 10.0, 3.7, 3.0, ROOF_BLUE, 0.0)
	_add_checkpoint(cp1)
	_add_launch_pad(Vector3(2.4, 3.7 + 0.2, cp1.position.z))

	# Section 4 - Moving platforms across a larger gap.
	var move_gap_start := _course_end
	_next_roof(6.0, 8.0, 3.7, 13.0, ROOF_COLOR, 0.0)
	_add_moving(Vector3(-2.2, 3.05, move_gap_start + 3.8), Vector3(3.0, 0.5, 4.6), Vector3(1, 0, 0), 3.2, 1.7, PLATFORM_BLUE)
	_add_moving(Vector3(1.8, 3.05, move_gap_start + 9.0), Vector3(3.0, 0.5, 4.6), Vector3(0, 0, 1), 2.6, 1.8, GREEN)

	# Checkpoint 2 landing.
	var cp2 := _next_roof(6.0, 10.0, 3.7, 2.2, ROOF_COLOR, 0.0)
	_add_checkpoint(cp2)

	# Section 5 - Narrow platforms (beams).
	for i in range(3):
		var top := 4.0 + i * 0.2
		_next_roof(1.5, 6.0, top, 2.0, BEAM_YELLOW, 0.0 if i % 2 == 0 else -0.35)

	var cp3 := _next_roof(5.0, 9.0, 4.4, 2.4, ROOF_BLUE, 0.0)
	_add_checkpoint(cp3)

	# Section 6 - Rotating bar obstacle on a wide roof.
	var rot_roof := _next_roof(7.2, 13.0, 4.4, 3.0, PLAZA, 0.0)
	_add_rotating(Vector3(0.0, 4.4 + 0.75, rot_roof.position.z), Vector3(7.0, 0.36, 0.36), 1.4)

	var cp4 := _next_roof(5.5, 9.0, 4.4, 2.4, ROOF_COLOR, 0.0)
	_add_checkpoint(cp4)

	# Section 7 - Falling platforms.
	var fall_start := _course_end
	_next_roof(5.5, 9.0, 4.6, 9.5, ROOF_BLUE, 0.0)
	_add_falling(Vector3(0.0, 4.1, fall_start + 3.0), Vector3(3.0, 0.6, 3.0), GRAY)
	_add_falling(Vector3(0.6, 4.3, fall_start + 5.0), Vector3(3.0, 0.6, 3.0), GRAY)
	_add_falling(Vector3(-0.5, 4.5, fall_start + 7.0), Vector3(3.0, 0.6, 3.0), GRAY)

	var cp5 := _next_roof(6.0, 9.0, 4.6, 2.4, ROOF_COLOR, 0.0)
	_add_checkpoint(cp5)
	_add_push_crate(Vector3(cp5.position.x - 2.0, cp5.position.y + 1.9, cp5.position.z - 1.2), Vector3(0.8, 0.8, 0.8), Color(0.72, 0.50, 0.30))
	_add_push_crate(Vector3(cp5.position.x + 1.8, cp5.position.y + 1.9, cp5.position.z + 1.2), Vector3(0.8, 0.8, 0.8), Color(0.72, 0.50, 0.30))

	# Section 8 - Moving barriers on a long roof.
	var barrier_roof := _next_roof(7.0, 14.0, 4.6, 3.0, PLAZA, 0.0)
	var b1_z := barrier_roof.position.z + 2.8
	var b2_z := barrier_roof.position.z + 6.0
	_add_moving(Vector3(0.0, 4.6 + 1.15, b1_z), Vector3(6.0, 2.1, 0.5), Vector3(1, 0, 0), 5.0, 1.9, DANGER_RED)
	_add_moving(Vector3(0.0, 4.6 + 1.15, b2_z), Vector3(6.0, 2.1, 0.5), Vector3(1, 0, 0), 5.0, -1.9, DANGER_RED)

	var cp6 := _next_roof(5.5, 9.0, 4.6, 2.4, ROOF_BLUE, 0.0)
	_add_checkpoint(cp6)

	# Section 9 - Difficult rooftop sequence.
	_next_roof(4.0, 4.0, 5.0, 4.5, BEAM_YELLOW, 0.0)
	var d2 := _next_roof(4.0, 4.0, 5.4, 5.0, ROOF_DARK, 0.9)
	_add_rotating(Vector3(d2.position.x, 5.4 + 0.75, d2.position.z), Vector3(4.4, 0.36, 0.36), 1.8)
	_next_roof(4.0, 4.0, 5.8, 5.5, PLATFORM_BLUE, -0.8)
	_next_roof(4.2, 4.2, 6.2, 5.8, ROOF_COLOR, 0.0)

	var cp7 := _next_roof(6.0, 10.0, 6.2, 3.0, ROOF_BLUE, 0.0)
	_add_checkpoint(cp7)

	# Section 10 - Final challenge: moving platform + launch pad + finish.
	var final_gap_start := _course_end
	_next_roof(7.0, 12.0, 6.2, 14.0, PLAZA, 0.0)
	_add_moving(Vector3(0.0, 5.65, final_gap_start + 4.5), Vector3(3.4, 0.5, 5.0), Vector3(1, 0, 0), 3.4, 1.7, PLATFORM_BLUE)
	_add_rotating(Vector3(0.0, 6.2 + 0.75, final_gap_start + 9.5), Vector3(5.5, 0.36, 0.36), 1.6)
	var final_roof := _next_roof(7.0, 12.0, 6.2, 2.5, ROOF_COLOR, 0.0)
	_add_finish(Vector3(0.0, 6.2, final_roof.position.z))

	# Decorative props / city around the course.
	_add_city_decorations()
	_add_special_decorations()


func _next_roof(width: float, depth: float, top_y: float, gap: float, color: Color, x_offset: float = 0.0) -> StaticBody3D:
	var center_z := _course_end + gap + depth / 2.0
	var center := Vector3(x_offset, top_y - 1.5, center_z)
	var size := Vector3(width, 3.0, depth)
	var body := _add_static_box(center, size, color)
	_roof_records.append({"center": body.position, "width": width, "depth": depth, "top": top_y})
	_course_end = center_z + depth / 2.0
	return body


func _add_checkpoint(spawn_platform: StaticBody3D) -> void:
	var spawn := spawn_platform.position + Vector3(0, 2.5, 0)
	var visual := spawn_platform.position + Vector3(0, 1.1, 0)
	var cp
	cp = CHECKPOINT_SCENE.instantiate()
	cp.index = _checkpoints.size()
	cp.respawn_position = spawn
	add_child(cp)
	cp.global_position = visual
	cp.activated.connect(_on_checkpoint_activated)
	_checkpoints.append(cp)


func _on_checkpoint_activated(index: int) -> void:
	_current_checkpoint = index
	if index >= 0 and index < _checkpoints.size():
		_respawn_pos = _checkpoints[index].respawn_position
	GameManager.set_checkpoint(_current_checkpoint)


func _add_moving(center: Vector3, size: Vector3, direction: Vector3, range: float, speed: float, color: Color) -> void:
	var o
	o = MOVING_SCENE.instantiate()
	add_child(o)
	o.setup(center, size, direction, range, speed, color)
	_obstacles.append(o)


func _add_rotating(center: Vector3, size: Vector3, speed: float) -> void:
	var o
	o = ROTATING_SCENE.instantiate()
	add_child(o)
	o.setup(center, size, speed)
	_obstacles.append(o)


func _add_falling(center: Vector3, size: Vector3, color: Color) -> void:
	var o
	o = FALLING_SCENE.instantiate()
	add_child(o)
	o.setup(center, size, color)
	_obstacles.append(o)


func _add_launch_pad(center: Vector3) -> void:
	var o
	o = LAUNCH_SCENE.instantiate()
	add_child(o)
	o.global_position = center
	_obstacles.append(o)


func _add_push_crate(center: Vector3, size: Vector3, color: Color) -> void:
	var o
	o = PUSH_SCENE.instantiate()
	add_child(o)
	o.setup(center, size, color)
	_obstacles.append(o)


func _add_finish(center: Vector3) -> void:
	_finish = FINISH_SCENE.instantiate()
	add_child(_finish)
	_finish.global_position = center
	_finish.finished.connect(_on_finish)


func _on_finish() -> void:
	GameManager.finish_run()
	if player:
		player.set_controls_enabled(false)


# ---------------------------------------------------------------------------
# Environment / visuals
# ---------------------------------------------------------------------------

func _build_environment() -> void:
	var sky_mat := ProceduralSkyMaterial.new()
	sky_mat.sky_top_color = Color(0.18, 0.42, 0.82)
	sky_mat.sky_horizon_color = Color(0.74, 0.84, 0.96)
	sky_mat.ground_bottom_color = Color(0.16, 0.20, 0.29)
	sky_mat.ground_horizon_color = Color(0.58, 0.64, 0.74)

	var sky := Sky.new()
	sky.sky_material = sky_mat

	var env := Environment.new()
	env.background_mode = Environment.BG_SKY
	env.sky = sky
	env.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	env.ambient_light_color = Color(0.66, 0.76, 0.95)
	env.ambient_light_energy = 1.0
	env.tonemap_mode = Environment.TONE_MAPPER_FILMIC

	var we := WorldEnvironment.new()
	we.environment = env
	add_child(we)

	var sun := DirectionalLight3D.new()
	sun.rotation = Vector3(deg_to_rad(-42), deg_to_rad(-35), 0.0)
	sun.light_energy = 1.35
	sun.shadow_enabled = true
	sun.directional_shadow_max_distance = 90.0
	add_child(sun)

	var fill := DirectionalLight3D.new()
	fill.rotation = Vector3(deg_to_rad(-25), deg_to_rad(145), 0.0)
	fill.light_energy = 0.35
	fill.light_color = Color(0.85, 0.9, 1.0)
	add_child(fill)

	# Far city floor (visual only; the player respawns long before reaching it).
	_add_mesh_box(Vector3(0, -32, 60), Vector3(220, 3, 260), Color(0.16, 0.20, 0.27))


func _add_city_decorations() -> void:
	# Simple skyline in the distance.
	for i in range(18):
		var x := _rng.randf_range(-95, -20) if i % 2 == 0 else _rng.randf_range(20, 95)
		var z := _rng.randf_range(-20, 190)
		var w := _rng.randf_range(7, 16)
		var d := _rng.randf_range(7, 16)
		var h := _rng.randf_range(8, 34)
		var color := Color(0.28, 0.34, 0.46).darkened(_rng.randf() * 0.25)
		var t := _add_mesh_box(Vector3(x, -h * 0.5, z), Vector3(w, h, d), color)
		_add_windows(t, w, d, h)


func _add_special_decorations() -> void:
	# AC units and vents on the first few roofs.
	_add_ac_on(Vector2(-2.3, 0.0))
	_add_ac_on(Vector2(2.1, 11.0))
	_add_ac_on(Vector2(-2.2, 22.0))
	_add_pipe_on(Vector2(0.0, 52.9), 2.4)
	_add_sign_on(Vector2(1.8, 22.0), Color(0.92, 0.72, 0.2))
	_add_sign_on(Vector2(-2.0, 80.9), Color(0.3, 0.7, 0.95))
	_add_ac_on(Vector2(2.0, 160.5))
	_add_pipe_on(Vector2(2.3, 174.5), 2.8)

	# Clouds.
	for i in range(8):
		var cloud := MeshInstance3D.new()
		cloud.mesh = _sphere_mesh(_rng.randf_range(2.0, 4.0))
		cloud.position = Vector3(_rng.randf_range(-80, 80), _rng.randf_range(22, 42), _rng.randf_range(-10, 180))
		var cm := StandardMaterial3D.new()
		cm.albedo_color = Color(1, 1, 1, 0.55)
		cm.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
		cm.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
		cloud.material_override = cm
		add_child(cloud)


# ---------------------------------------------------------------------------
# Build helpers
# ---------------------------------------------------------------------------

func _add_static_box(center: Vector3, size: Vector3, color: Color) -> StaticBody3D:
	var body := StaticBody3D.new()
	body.collision_layer = WORLD_LAYER
	body.collision_mask = 0
	body.position = center
	add_child(body)

	var shape := BoxShape3D.new()
	shape.size = size
	var col := CollisionShape3D.new()
	col.shape = shape
	body.add_child(col)

	var mesh := MeshInstance3D.new()
	var bm := BoxMesh.new()
	bm.size = size
	mesh.mesh = bm
	mesh.material_override = _mat(color)
	body.add_child(mesh)
	return body


func _add_mesh_box(center: Vector3, size: Vector3, color: Color, emissive: bool = false, energy: float = 0.4) -> MeshInstance3D:
	var mesh := MeshInstance3D.new()
	var bm := BoxMesh.new()
	bm.size = size
	mesh.mesh = bm
	var mat := StandardMaterial3D.new()
	mat.albedo_color = color
	if emissive:
		mat.emission_enabled = true
		mat.emission = color
		mat.emission_energy_multiplier = energy
	mesh.material_override = mat
	mesh.position = center
	add_child(mesh)
	return mesh


func _add_windows(parent: Node3D, w: float, d: float, h: float) -> void:
	var cols := int(clampf(w / 2.2, 2.0, 5.0))
	var rows := int(clampf(h / 2.8, 1.0, 7.0))
	for r in range(rows):
		for c in range(cols):
			var wx := (c - (cols - 1) * 0.5) * 2.1
			var wy := -h * 0.5 + 2.2 + r * 2.6
			var win := MeshInstance3D.new()
			win.mesh = _box_mesh(Vector3(1.3, 0.7, 0.08))
			win.position = Vector3(wx, wy, d * 0.5 + 0.06)
			var mat := StandardMaterial3D.new()
			mat.albedo_color = WINDOW
			mat.emission_enabled = true
			mat.emission = WINDOW
			mat.emission_energy_multiplier = 0.35
			win.material_override = mat
			parent.add_child(win)


func _roof_top_at(x: float, z: float) -> float:
	for r in _roof_records:
		var c: Vector3 = r["center"]
		if absf(x - c.x) <= r["width"] * 0.5 - 0.7 and absf(z - c.z) <= r["depth"] * 0.5 - 0.7:
			return r["top"]
	return -999.0


func _add_ac_on(xz: Vector2) -> void:
	var top := _roof_top_at(xz.x, xz.y)
	if top > -100.0:
		_add_ac_unit(Vector3(xz.x, top + 0.4, xz.y))


func _add_pipe_on(xz: Vector2, height: float) -> void:
	var top := _roof_top_at(xz.x, xz.y)
	if top > -100.0:
		_add_pipe(Vector3(xz.x, top + height * 0.5 - 0.05, xz.y), height)


func _add_sign_on(xz: Vector2, color: Color) -> void:
	var top := _roof_top_at(xz.x, xz.y)
	if top > -100.0:
		_add_sign(Vector3(xz.x, top, xz.y), color)


func _add_ac_unit(center: Vector3) -> void:
	var unit := _add_static_box(center, Vector3(1.4, 0.8, 1.4), Color(0.72, 0.74, 0.78))
	var fan := MeshInstance3D.new()
	fan.mesh = _cylinder_mesh(0.45, 0.12)
	fan.position = center + Vector3(0, 0.42, 0.75)
	var mat := StandardMaterial3D.new()
	mat.albedo_color = Color(0.35, 0.37, 0.4)
	fan.material_override = mat
	add_child(fan)
	_obstacles.append(unit)


func _add_pipe(center: Vector3, height: float) -> void:
	var pipe := _add_static_box(center, Vector3(0.8, height, 0.8), Color(0.75, 0.62, 0.45))
	pipe.rotation.z = 0.0
	var cap := MeshInstance3D.new()
	cap.mesh = _sphere_mesh(0.5)
	cap.position = center + Vector3(0, height * 0.5 + 0.2, 0)
	var mat := StandardMaterial3D.new()
	mat.albedo_color = Color(0.82, 0.68, 0.48)
	cap.material_override = mat
	add_child(cap)


func _add_sign(center: Vector3, color: Color) -> void:
	var post := _add_static_box(center + Vector3(0, 0.5, 0), Vector3(0.25, 1.8, 0.25), Color(0.35, 0.35, 0.38))
	var sign := MeshInstance3D.new()
	sign.mesh = _box_mesh(Vector3(1.6, 0.9, 0.12))
	sign.position = center + Vector3(0, 1.7, 0)
	var mat := StandardMaterial3D.new()
	mat.albedo_color = color
	mat.emission_enabled = true
	mat.emission = color
	mat.emission_energy_multiplier = 0.5
	sign.material_override = mat
	add_child(sign)
	_obstacles.append(post)


func _box_mesh(size: Vector3) -> BoxMesh:
	var m := BoxMesh.new()
	m.size = size
	return m


func _cylinder_mesh(radius: float, height: float) -> CylinderMesh:
	var m := CylinderMesh.new()
	m.top_radius = radius
	m.bottom_radius = radius
	m.height = height
	return m


func _sphere_mesh(radius: float) -> SphereMesh:
	var m := SphereMesh.new()
	m.radius = radius
	m.height = radius * 2.0
	return m


func _mat(color: Color) -> StandardMaterial3D:
	var key := color.to_html()
	if _materials.has(key):
		return _materials[key]
	var mat := StandardMaterial3D.new()
	mat.albedo_color = color
	mat.roughness = 0.78
	mat.metallic = 0.04
	_materials[key] = mat
	return mat
