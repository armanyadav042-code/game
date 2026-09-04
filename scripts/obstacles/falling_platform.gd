extends AnimatableBody3D
## A platform that drops shortly after the player steps on it, then resets.

const FALL_SPEED := 9.5
const RESPAWN_AFTER := 2.2
const DROP_DELAY := 0.10

var _base := Vector3.ZERO
var _falling := false
var _drop_timer := 0.0
var _respawn_timer := 0.0
var _size := Vector3.ONE
var _mesh: MeshInstance3D


func _ready() -> void:
	sync_to_physics = true


func setup(center: Vector3, size: Vector3, color: Color) -> void:
	_base = center
	_size = size
	position = _base
	_build_body(size, color)


func reset() -> void:
	_falling = false
	_drop_timer = 0.0
	_respawn_timer = 0.0
	position = _base
	_refresh_material(Color(0.65, 0.62, 0.58))


func _build_body(size: Vector3, color: Color) -> void:
	var shape := BoxShape3D.new()
	shape.size = size
	var col := CollisionShape3D.new()
	col.shape = shape
	add_child(col)

	_mesh = MeshInstance3D.new()
	var bm := BoxMesh.new()
	bm.size = size
	_mesh.mesh = bm
	_refresh_material(color)
	add_child(_mesh)

	var area := Area3D.new()
	area.collision_layer = 0
	area.collision_mask = 2
	area.monitoring = true
	area.monitorable = false
	add_child(area)
	var a_shape := CollisionShape3D.new()
	var a_box := BoxShape3D.new()
	a_box.size = Vector3(size.x * 1.05, size.y + 0.8, size.z * 1.05)
	a_shape.shape = a_box
	area.add_child(a_shape)
	area.body_entered.connect(_on_body_entered)


func _on_body_entered(body: Node) -> void:
	if not _falling and body.is_in_group("player"):
		_falling = true
		_drop_timer = DROP_DELAY
		_refresh_material(Color(0.95, 0.22, 0.22))


func _physics_process(delta: float) -> void:
	if not _falling:
		return
	_drop_timer -= delta
	if _drop_timer <= 0.0:
		position.y -= FALL_SPEED * delta
		_respawn_timer += delta
	if _respawn_timer >= RESPAWN_AFTER:
		reset()


func _refresh_material(color: Color) -> void:
	if _mesh == null:
		return
	var mat := StandardMaterial3D.new()
	mat.albedo_color = color
	mat.roughness = 0.6
	_mesh.material_override = mat
