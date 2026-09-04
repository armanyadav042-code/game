extends Control
## Settings screen: mute and master volume slider.

signal back_pressed

const UI := preload("res://scripts/ui/ui_helpers.gd")

var _mute_button: Button
var _volume: HSlider


func _ready() -> void:
	set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	_build()


func _build() -> void:
	UI.color_rect(Color(0.03, 0.07, 0.16, 1.0), self)

	var center := CenterContainer.new()
	center.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	add_child(center)

	var panel := PanelContainer.new()
	panel.custom_minimum_size = Vector2(520, 420)
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
	style.border_color = Color(0.40, 0.50, 0.82)
	style.content_margin_left = 28
	style.content_margin_right = 28
	style.content_margin_top = 26
	style.content_margin_bottom = 24
	panel.add_theme_stylebox_override("panel", style)

	var vb := VBoxContainer.new()
	vb.alignment = BoxContainer.ALIGNMENT_CENTER
	vb.add_theme_constant_override("separation", 16)
	panel.add_child(vb)

	var title := UI.label("SETTINGS", 42, Color(1, 0.82, 0.36), true)
	vb.add_child(title)

	var spacer := Control.new()
	spacer.custom_minimum_size = Vector2(0, 12)
	vb.add_child(spacer)

	_mute_button = UI.make_button("SOUND: ON", Color(0.28, 0.46, 0.62, 1.0), 320, 60)
	_mute_button.pressed.connect(func() -> void:
		GameManager.toggle_mute()
		_refresh()
	)
	vb.add_child(_mute_button)

	var volume_label := UI.label("VOLUME", 20, Color(0.8, 0.88, 1.0), false)
	vb.add_child(volume_label)

	_volume = HSlider.new()
	_volume.min_value = -30.0
	_volume.max_value = 0.0
	_volume.step = 1.0
	_volume.value = GameManager.volume_db
	_volume.custom_minimum_size = Vector2(340, 34)
	_volume.value_changed.connect(func(value: float) -> void: GameManager.set_volume(value))
	vb.add_child(_volume)

	var spacer2 := Control.new()
	spacer2.custom_minimum_size = Vector2(0, 12)
	vb.add_child(spacer2)

	var back := UI.make_button("BACK", Color(0.28, 0.42, 0.72, 1.0), 220, 58)
	back.pressed.connect(func() -> void: back_pressed.emit())
	vb.add_child(back)

	_refresh()


func _refresh() -> void:
	_mute_button.text = "SOUND: OFF" if GameManager.muted else "SOUND: ON"
