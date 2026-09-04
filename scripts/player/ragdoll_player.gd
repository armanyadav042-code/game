extends RigidBody3D
## The Ragdoll Rooftop Rush player: a controllable rigid-body ragdoll with
## floppy joints, an upright stabilizer, and springy arcade movement.

signal jumped
signal soft_landing
signal hard_landing(strength: float)
signal hard_hit(strength: float)
signal started_falling
signal launched
signal fell

const TORSO_COLOR := Color(0.26, 0.58, 0.96)
const HEAD_COLOR := Color(1.0, 0.78, 0.48)
const ARM_COLOR := Color(0.30, 0.78, 0.90)
const LEG_COLOR := Color(0.95, 0.60, 0.24)
const JOINT_PIVOT_HEIGHT := 0.42

const MOVE_SPEED := 7.4
const GROUND_ACCEL := 13.0
const AIR_ACCEL := 4.2
const AIR_MAX_SPEED := 9.5
const JUMP_SPEED := 11.4
const MAX_ANGULAR_VELOCITY := 8.0
const UPRIGHT_GROUND := 8.0
const UPRIGHT_AIR := 2.6
const WORLD_LAYER := 1
const PLAYER_LAYER := 2

var controls_enabled: bool = false
var _grounded := false
var _coyote := 0.0
var _jump_buffer := 0.0
var _prev_grounded := false
var _fall_speed := 0.0
var _prev_horizontal_speed := 0.0
var _limbs: Array = []
var _time_since_ground := 99.0


func _ready() -> void:
	add_to_group("player")
	collision_layer = PLAYER_LAYER
	collision_mask = WORLD_LAYER
	continuous_cd = true
	can_sleep = false
	linear_damp = 0.4
	angular_damp = 0.9
	build_ragdoll()


func set_controls_enabled(value: bool) -> void:
	controls_enabled = value


func is_grounded() -> bool:
	return _grounded


func teleport_to(position: Vector3, keep_facing: bool = false) -> void:
	global_position = position
	for l in _limbs:
		if l is RigidBody3D:
			l.linear_velocity = Vector3.ZERO
			l.angular_velocity = Vector3.ZERO
	linear_velocity = Vector3.ZERO
	angular_velocity = Vector3.ZERO
	if keep_facing:
		global_transform.basis = Basis.IDENTITY
	_grounded = false
	_coyote = 0.0
	_fall_speed = 0.0


func launch_up(speed: float) -> void:
	linear_velocity = Vector3(linear_velocity.x, speed, linear_velocity.z)
	_grounded = false
	_coyote = 0.0
	launched.emit()
	GameManager.play_sfx("launch")


func build_ragdoll() -> void:
	# Torso (this body).
	var torso_shape := BoxShape3D.new()
	torso_shape.size = Vector3(0.58, 0.74, 0.42)
	var torso_col := CollisionShape3D.new()
	torso_col.shape = torso_shape
	add_child(torso_col)

	var torso_mesh := MeshInstance3D.new()
	torso_mesh.mesh = _box_mesh(Vector3(0.55, 0.72, 0.40))
	torso_mesh.material_override = _material(TORSO_COLOR)
	add_child(torso_mesh)

	_add_limb("Head", HEAD_COLOR, Vector3(0.0, 0.48, 0.0), Vector3(0.44, 0.5, 0.44), "box", 0.45)
	_add_limb("ArmL", ARM_COLOR, Vector3(-0.38, 0.24, 0.0), Vector3(0.19, 0.72, 0.19), "box", 0.30)
	_add_limb("ArmR", ARM_COLOR, Vector3(0.38, 0.24, 0.0), Vector3(0.19, 0.72, 0.19), "box", 0.30)
	_add_limb("LegL", LEG_COLOR, Vector3(-0.16, -0.16, 0.0), Vector3(0.20, 0.76, 0.20), "box", 0.34)
	_add_limb("LegR", LEG_COLOR, Vector3(0.16, -0.16, 0.0), Vector3(0.20, 0.76, 0.20), "box", 0.34)

	_add_cone_twist("Head", Vector3(0.0, 0.42, 0.0), 62.0, 24.0)
	_add_cone_twist("ArmL", Vector3(-0.38, 0.24, 0.0), 72.0, 24.0)
	_add_cone_twist("ArmR", Vector3(0.38, 0.24, 0.0), 72.0, 24.0)
	_add_cone_twist("LegL", Vector3(-0.16, -0.16, 0.0), 50.0, 12.0)
	_add_cone_twist("LegR", Vector3(0.16, -0.16, 0.0), 50.0, 12.0)


func _add_limb(limb_name: String, color: Color, local_pos: Vector3, size: Vector3, kind: String, limb_mass: float) -> void:
	var limb := RigidBody3D.new()
	limb.name = limb_name
	limb.mass = limb_mass
	limb.collision_layer = PLAYER_LAYER
	limb.collision_mask = WORLD_LAYER
	limb.continuous_cd = true
	limb.can_sleep = false
	limb.linear_damp = 0.1
	limb.angular_damp = 0.5
	limb.position = local_pos
	add_child(limb)

	var col := CollisionShape3D.new()
	var shape := BoxShape3D.new()
	shape.size = size
	col.shape = shape
	col.position = Vector3(0, 0, 0)
	if kind == "box" and limb_name != "Head":
		col.position = Vector3(0, -size.y * 0.22, 0)
	limb.add_child(col)

	var mesh := MeshInstance3D.new()
	mesh.material_override = _material(color)
	if limb_name == "Head":
		mesh.mesh = _box_mesh(size)
	else:
		mesh.mesh = _box_mesh(size)
	mesh.position = col.position
	limb.add_child(mesh)

	_limbs.append(limb)


func _add_cone_twist(target: String, pivot: Vector3, swing_deg: float, twist_deg: float) -> void:
	var j := ConeTwistJoint3D.new()
	j.name = "Joint" + target
	j.position = pivot
	add_child(j)
	j.node_a = NodePath("..")
	j.node_b = NodePath("../" + target)
	j.set_param(ConeTwistJoint3D.PARAM_SWING_SPAN, deg_to_rad(swing_deg))
	j.set_param(ConeTwistJoint3D.PARAM_TWIST_SPAN, deg_to_rad(twist_deg))


func _box_mesh(size: Vector3) -> BoxMesh:
	var m := BoxMesh.new()
	m.size = size
	return m


func _material(color: Color) -> StandardMaterial3D:
	var mat := StandardMaterial3D.new()
	mat.albedo_color = color
	mat.roughness = 0.72
	mat.metallic = 0.06
	return mat


func _physics_process(delta: float) -> void:
	_check_ground()
	var was_airborne := not _grounded

	if controls_enabled:
		_move(delta)
		_apply_upright(delta)
		_clock_jump(delta)
		_clock_fall(delta)
		_detect_impacts(was_airborne)

	_time_since_ground += delta
	if _grounded:
		_time_since_ground = 0.0


func _move(delta: float) -> void:
	var move := _get_move_input()
	var desired := Vector3(move.x * MOVE_SPEED, 0, move.y * MOVE_SPEED)
	var accel := GROUND_ACCEL if _grounded else AIR_ACCEL
	var blend := 1.0 - exp(-accel * delta)
	var v := linear_velocity
	v.x = lerpf(v.x, desired.x, blend)
	v.z = lerpf(v.z, desired.z, blend)

	var horizontal := Vector3(v.x, 0, v.z)
	if not _grounded and horizontal.length() > AIR_MAX_SPEED:
		horizontal = horizontal.normalized() * AIR_MAX_SPEED
		v.x = horizontal.x
		v.z = horizontal.z
	linear_velocity = Vector3(v.x, linear_velocity.y, v.z)


func _get_move_input() -> Vector2:
	var x := Input.get_action_strength("move_right") - Input.get_action_strength("move_left")
	var z := Input.get_action_strength("move_forward") - Input.get_action_strength("move_back")
	return Vector2(clampf(x, -1.0, 1.0), clampf(z, -1.0, 1.0))


func _apply_upright(delta: float) -> void:
	var up := global_transform.basis.y
	var axis := up.cross(Vector3.UP)
	var strength := UPRIGHT_GROUND if _grounded else UPRIGHT_AIR
	angular_velocity += axis * strength * 8.0 * delta

	if _grounded:
		angular_velocity = angular_velocity.lerp(Vector3.ZERO, clampf(delta * 6.5, 0.0, 1.0))
	else:
		angular_velocity = angular_velocity.limit_length(MAX_ANGULAR_VELOCITY)


func _clock_jump(delta: float) -> void:
	_jump_buffer = maxf(0.0, _jump_buffer - delta)
	if Input.is_action_just_pressed("jump"):
		_jump_buffer = 0.16

	if _grounded:
		_coyote = 0.14
	else:
		_coyote = maxf(0.0, _coyote - delta)

	if _jump_buffer > 0.0 and _coyote > 0.0:
		linear_velocity = Vector3(linear_velocity.x, JUMP_SPEED, linear_velocity.z)
		_jump_buffer = 0.0
		_coyote = 0.0
		_grounded = false
		jumped.emit()
		GameManager.play_sfx("jump")
		_emit_dust(10, Color(0.82, 0.78, 0.72))


func _clock_fall(_delta: float) -> void:
	if _grounded:
		_fall_speed = 0.0
	else:
		_fall_speed = maxf(_fall_speed, -linear_velocity.y)
	if _fall_speed > 4.0 and not _prev_grounded and not _grounded:
		started_falling.emit()
		GameManager.play_sfx("fall")


func _detect_impacts(was_airborne: bool) -> void:
	var speed := Vector3(linear_velocity.x, 0, linear_velocity.z).length()
	if was_airborne and _grounded:
		var landing_strength := _fall_speed
		if landing_strength > 8.0:
			hard_landing.emit(landing_strength)
			GameManager.play_sfx("land_hard")
			_emit_dust(18, Color(0.85, 0.82, 0.76))
		elif landing_strength > 3.0:
			soft_landing.emit()
			GameManager.play_sfx("land_soft")
			_emit_dust(9, Color(0.85, 0.82, 0.76))
		_fall_speed = 0.0

	if _grounded and _prev_horizontal_speed - speed > 8.0 and speed < 2.0:
		hard_hit.emit(1.0)
		GameManager.play_sfx("hit")
		_emit_dust(14, Color(0.9, 0.3, 0.2))
	_prev_horizontal_speed = speed
	_prev_grounded = _grounded


func _check_ground() -> void:
	var space := get_world_3d().direct_space_state
	if space == null:
		return
	var from := global_position
	var to := global_position + Vector3.DOWN * 1.05
	var q := PhysicsRayQueryParameters3D.create(from, to, WORLD_LAYER)
	var ex: Array[RID] = []
	ex.append(get_rid())
	q.exclude = ex
	var result := space.intersect_ray(q)
	_grounded = not result.is_empty()


func _emit_dust(count: int, color: Color) -> void:
	var parent := get_parent()
	if parent == null:
		return
	var p := CPUParticles3D.new()
	parent.add_child(p)
	p.global_position = global_position + Vector3(0, -0.45, 0)
	p.one_shot = true
	p.amount = count
	p.lifetime = 0.55
	p.explosiveness = 1.0
	p.direction = Vector3(0, -1, 0)
	p.spread = 55.0
	p.gravity = Vector3(0, -10.0, 0)
	p.initial_velocity_min = 1.2
	p.initial_velocity_max = 4.5
	p.scale_amount_min = 0.18
	p.scale_amount_max = 0.45
	p.color = color
	p.emitting = true
	p.finished.connect(p.queue_free)
