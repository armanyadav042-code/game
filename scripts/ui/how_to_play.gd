extends Control
## How to play screen.

signal back_pressed

const UI := preload("res://scripts/ui/ui_helpers.gd")


func _ready() -> void:
	set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	_build()


func _build() -> void:
	var bg := UI.color_rect(Color(0.03, 0.07, 0.16, 1.0), self)

	var center := CenterContainer.new()
	center.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	add_child(center)

	var panel := PanelContainer.new()
	panel.custom_minimum_size = Vector2(760, 620)
	center.add_child(panel)
	var style := StyleBoxFlat.new()
	style.bg_color = Color(0.05, 0.10, 0.22, 0.96)
	style.corner_radius_top_left = 22
	style.corner_radius_top_right = 22
	style.corner_radius_bottom_left = 22
	style.corner_radius_bottom_right = 22
	style.border_width_left = 3
	style.border_width_top = 3
	style.border_width_right = 3
	style.border_width_bottom = 3
	style.border_color = Color(0.30, 0.45, 0.78)
	style.content_margin_left = 28
	style.content_margin_right = 28
	style.content_margin_top = 26
	style.content_margin_bottom = 22
	panel.add_theme_stylebox_override("panel", style)

	var vb := VBoxContainer.new()
	vb.add_theme_constant_override("separation", 10)
	panel.add_child(vb)

	var title := UI.label("HOW TO PLAY", 42, Color(1, 0.82, 0.36), true)
	vb.add_child(title)

	var spacer := Control.new()
	spacer.custom_minimum_size = Vector2(0, 8)
	vb.add_child(spacer)

	var text := UI.label(
		"RUN across the rooftops, JUMP the gaps, dodge the \
		spinning bars and moving walls, and grab every checkpoint.\n\n" +
		"DESKTOP\n" +
		"A / D or LEFT / RIGHT  -  move left / right\n" +
		"W / S or UP / DOWN      -  run forward / back\n" +
		"SPACE                    -  jump\n" +
		"R                          -  restart at checkpoint\n" +
		"ESC                        -  pause\n" +
		"M                          -  mute\n\n" +
		"MOBILE\n" +
		"On-screen LEFT, RIGHT and JUMP buttons.\n\n" +
		"TIP\n" +
		"The ragdoll is floppy on purpose! Steer carefully and \
		hold forward while airborne to keep control.",
		21,
		Color(0.86, 0.92, 1.0),
		false
	)
	text.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	vb.add_child(text)

	var spacer2 := Control.new()
	spacer2.custom_minimum_size = Vector2(0, 12)
	vb.add_child(spacer2)

	var back := UI.make_button("BACK", Color(0.28, 0.42, 0.72, 1.0), 220, 56)
	back.pressed.connect(func() -> void: back_pressed.emit())
	vb.add_child(back)
