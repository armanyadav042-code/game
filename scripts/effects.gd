extends RefCounted
class_name Effects
## Lightweight one-shot 3D particle effects used for landing dust,
## checkpoint bursts, and finish confetti.

static func burst(parent: Node, pos: Vector3, color: Color, count: int = 16, speed_min: float = 2.0, speed_max: float = 6.0, life: float = 0.6) -> void:
	if parent == null:
		return
	var p := CPUParticles3D.new()
	parent.add_child(p)
	p.global_position = pos
	p.one_shot = true
	p.amount = count
	p.lifetime = life
	p.explosiveness = 1.0
	p.emission_shape = CPUParticles3D.EMISSION_SHAPE_SPHERE
	p.emission_sphere_radius = 0.2
	p.direction = Vector3.UP
	p.spread = 180.0
	p.gravity = Vector3(0, -8.0, 0)
	p.initial_velocity_min = speed_min
	p.initial_velocity_max = speed_max
	p.scale_amount_min = 0.14
	p.scale_amount_max = 0.40
	p.color = color
	p.emitting = true
	p.finished.connect(p.queue_free)
