extends Control
## In-game HUD: timer, checkpoint indicator, buttons, and mobile touch pads.

signal pause_pressed
signal restart_pressed
signal mute_pressed

const UI := preload("res://scripts/ui/ui_helpers.gd")

var _time_label: Label
var _check_label: Label
var _sound_button: Button
var _mobile := false


func _ready() -> void:
	set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	_mobile = DisplayServer.is_touchscreen_available()
	_build()


func _process(_delta: float) -> void:
	_time_label.text = GameManager.get_formatted_time(GameManager.current_time)
	if GameManager.state == GameManager.GameState.PLAYING:
		_check_label.text = "CHECKPOINT %d / 7" % (GameManager.current_checkpoint + 1)


func set_mute_button(is_muted: bool) -> void:
	if is_muted:
		_sound_button.text = "SOUND: OFF"
	else:
		_sound_button.text = "SOUND: ON"


func _build() -> void:
	# Top-left status.
	var left_panel := PanelContainer.new()
	left_panel.set_anchors_and_offsets_preset(Control.PRESET_TOP_LEFT)
	left_panel.offset_left = 18
	left_panel.offset_top = 16
	left_panel.offset_right = 350
	left_panel.offset_bottom = 120
	left_panel.modulate = Color(1, 1, 1, 0.88)
	add_child(left_panel)

	var style := StyleBoxFlat.new()
	style.bg_color = Color(0.04, 0.08, 0.18, 0.82)
	style.corner_radius_top_left = 14
	style.corner_radius_top_right = 14
	style.corner_radius_bottom_left = 14
	style.corner_radius_bottom_right = 14
	style.border_width_left = 2
	style.border_width_top = 2
	style.border_width_right = 2
	style.border_width_bottom = 2
	style.border_color = Color(0.32, 0.46, 0.75)
	style.content_margin_left = 16
	style.content_margin_right = 16
	style.content_margin_top = 10
	style.content_margin_bottom = 10
	left_panel.add_theme_stylebox_override("panel", style)

	var left_box := VBoxContainer.new()
	left_box.add_theme_constant_override("separation", 2)
	left_panel.add_child(left_box)

	_time_label = UI.label("00:00.000", 34, Color(1, 0.92, 0.55), false)
	left_box.add_child(_time_label)

	_check_label = UI.label("CHECKPOINT 1 / 7", 18, Color(0.75, 0.85, 1.0), false)
	left_box.add_child(_check_label)

	# Top-right buttons.
	var right_box := HBoxContainer.new()
	right_box.set_anchors_and_offsets_preset(Control.PRESET_TOP_RIGHT)
	right_box.offset_left = -330
	right_box.offset_right = -16
	right_box.offset_top = 16
	right_box.offset_bottom = 84
	right_box.add_theme_constant_override("separation", 10)
	right_box.alignment = BoxContainer.ALIGNMENT_END
	add_child(right_box)

	var pause := UI.make_button("II", Color(0.25, 0.40, 0.70, 0.92), 72, 54)
	pause.pressed.connect(func() -> void: pause_pressed.emit())
	right_box.add_child(pause)

	_sound_button = UI.make_button("SOUND: ON", Color(0.28, 0.46, 0.62, 0.92), 122, 54)
	_sound_button.pressed.connect(func() -> void: mute_pressed.emit())
	right_box.add_child(_sound_button)

	var restart := UI.make_button("R", Color(0.66, 0.3, 0.30, 0.92), 72, 54)
	restart.pressed.connect(func() -> void: restart_pressed.emit())
	right_box.add_child(restart)

	_build_touch_controls()


func _build_touch_controls() -> void:
	if not _mobile:
		return

	var left := HBoxContainer.new()
	left.set_anchors_and_offsets_preset(Control.PRESET_BOTTOM_LEFT)
	left.offset_left = 24
	left.offset_top = -146
	left.offset_right = 380
	left.offset_bottom = -30
	left.add_theme_constant_override("separation", 12)
	add_child(left)

	_add_touch_button(left, "LEFT", "move_left", Color(0.22, 0.55, 0.94, 0.65))
	_add_touch_button(left, "RIGHT", "move_right", Color(0.22, 0.55, 0.94, 0.65))

	var jump := UI.make_button("JUMP", Color(0.95, 0.60, 0.22, 0.7), 170, 104)
	jump.set_anchors_and_offsets_preset(Control.PRESET_BOTTOM_RIGHT)
	jump.offset_left = -206
	jump.offset_right = -30
	jump.offset_top = -142
	jump.offset_bottom = -30
	jump.add_theme_font_size_override("font_size", 30)
	_add_touch_actions(jump, "jump")
	add_child(jump)


func _add_touch_button(container: HBoxContainer, text: String, action: String, color: Color) -> void:
	var btn := UI.make_button(text, color, 104, 104)
	btn.add_theme_font_size_override("font_size", 24)
	_add_touch_actions(btn, action)
	container.add_child(btn)


func _add_touch_actions(btn: Button, action: String) -> void:
	btn.button_down.connect(func() -> void: Input.action_press(action))
	btn.button_up.connect(func() -> void: Input.action_release(action))
