extends Control
## Pause overlay (process_mode ALWAYS so it works while the world is paused).

signal resume_pressed
signal restart_pressed
signal menu_pressed

const UI := preload("res://scripts/ui/ui_helpers.gd")


func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	_build()


func _build() -> void:
	var dim := ColorRect.new()
	dim.color = Color(0.0, 0.0, 0.0, 0.56)
	dim.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	add_child(dim)

	var center := CenterContainer.new()
	center.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	add_child(center)

	var vb := VBoxContainer.new()
	vb.alignment = BoxContainer.ALIGNMENT_CENTER
	vb.add_theme_constant_override("separation", 18)
	center.add_child(vb)

	var title := UI.label("PAUSED", 48, Color(1, 0.88, 0.42), true)
	vb.add_child(title)

	var spacer := Control.new()
	spacer.custom_minimum_size = Vector2(0, 20)
	vb.add_child(spacer)

	var resume := UI.make_button("RESUME", Color(0.16, 0.62, 0.38, 1.0), 320, 64)
	resume.pressed.connect(func() -> void: resume_pressed.emit())
	vb.add_child(resume)

	var restart := UI.make_button("RESTART CHECKPOINT", Color(0.30, 0.42, 0.78, 1.0), 320, 60)
	restart.pressed.connect(func() -> void: restart_pressed.emit())
	vb.add_child(restart)

	var menu := UI.make_button("MAIN MENU", Color(0.46, 0.31, 0.62, 1.0), 320, 60)
	menu.pressed.connect(func() -> void: menu_pressed.emit())
	vb.add_child(menu)

	modulate = Color(0, 0, 0, 0)
	create_tween().tween_property(self, "modulate", Color.WHITE, 0.22).set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)
