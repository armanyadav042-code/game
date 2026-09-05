extends Node3D
## Smooth third-person follow camera with look-ahead and impact shake.

const DESIRED_OFFSET := Vector3(0.0, 5.6, -7.4)
const LOOK_HEIGHT := 1.3
const LEAD_DISTANCE := 5.5
const CAMERA_LERP := 3.4

var player: Node3D
var _camera: Camera3D
var _focus := Vector3.ZERO
var _shake := 0.0
var _shake_pos := Vector3.ZERO


func _ready() -> void:
	_camera = get_node("Camera3D")
	_focus = global_position + DESIRED_OFFSET


func setup(target: Node3D) -> void:
	player = target
	if player:
		_focus = player.global_position
		global_position = player.global_position + DESIRED_OFFSET


func add_shake(amount: float) -> void:
	_shake = clampf(_shake + amount, 0.0, 1.4)


func _process(delta: float) -> void:
	if player == null:
		return

	var target_focus := player.global_position + Vector3(0, LOOK_HEIGHT, 0)
	var velocity := Vector3.ZERO
	var body := player as RigidBody3D
	if body != null:
		velocity = body.linear_velocity
	var lead := Vector3(0, 0, clampf(velocity.z * 0.12, -1.2, 2.6))
	lead.x = clampf(velocity.x * 0.06, -1.4, 1.4)
	target_focus += lead

	_focus = _focus.lerp(target_focus, clampf(delta * CAMERA_LERP, 0.0, 1.0))

	var target_pos := _focus + DESIRED_OFFSET
	global_position = global_position.lerp(target_pos, clampf(delta * CAMERA_LERP, 0.0, 1.0))
	if global_position.y < _focus.y + 1.2:
		global_position.y = _focus.y + 1.2

	_shake = maxf(0.0, _shake - delta * 2.6)
	if _shake > 0.001:
		var t := 0.05 * _shake
		_shake_pos = Vector3(
			randf_range(-t, t),
			randf_range(-t, t) * 0.6,
			randf_range(-t, t)
		)
	else:
		_shake_pos = Vector3.ZERO
	_camera.position = _shake_pos
	_camera.look_at(_focus + Vector3(0.0, 0.2, LEAD_DISTANCE), Vector3.UP)
