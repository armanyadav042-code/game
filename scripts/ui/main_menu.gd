extends Control
## Title screen with animated buttons.

signal play_pressed
signal how_pressed
signal settings_pressed

const UI := preload("res://scripts/ui/ui_helpers.gd")

var _title: Label
var _subtitle: Label
var _started := false


func _ready() -> void:
	set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	_build()


func _build() -> void:
	var bg := UI.color_rect(Color(0.035, 0.07, 0.16, 1.0), self)
	var glow := ColorRect.new()
	glow.color = Color(0.05, 0.12, 0.28, 0.6)
	glow.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	add_child(glow)

	var small_bg := ColorRect.new()
	small_bg.color = Color(0.04, 0.08, 0.2, 0.45)
	small_bg.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	small_bg.offset_left = 180
	small_bg.offset_top = 90
	small_bg.offset_right = -180
	small_bg.offset_bottom = -90
	add_child(small_bg)

	var center := CenterContainer.new()
	center.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	add_child(center)

	var vb := VBoxContainer.new()
	vb.alignment = BoxContainer.ALIGNMENT_CENTER
	vb.add_theme_constant_override("separation", 18)
	center.add_child(vb)

	_title = UI.label("RAGDOLL ROOFTOP RUSH", 52, Color(1.0, 0.78, 0.25), true)
	_title.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_title.custom_minimum_size = Vector2(780, 90)
	vb.add_child(_title)

	_subtitle = UI.label("Run. Flop. Repeat.", 24, Color(0.7, 0.82, 1.0), true)
	vb.add_child(_subtitle)

	var spacer := Control.new()
	spacer.custom_minimum_size = Vector2(0, 24)
	vb.add_child(spacer)

	var play := UI.make_button("PLAY", Color(0.15, 0.62, 0.36, 1.0), 320, 74)
	play.pressed.connect(func() -> void: play_pressed.emit())
	vb.add_child(play)

	var how := UI.make_button("HOW TO PLAY", Color(0.25, 0.44, 0.80, 1.0), 320, 62)
	how.pressed.connect(func() -> void: how_pressed.emit())
	vb.add_child(how)

	var settings := UI.make_button("SETTINGS", Color(0.41, 0.34, 0.66, 1.0), 320, 62)
	settings.pressed.connect(func() -> void: settings_pressed.emit())
	vb.add_child(settings)

	# Decorative rooftops behind the panel.
	_add_rooftop(0.10, Color(0.10, 0.16, 0.32, 0.9), 260)
	_add_rooftop(0.70, Color(0.14, 0.21, 0.38, 0.9), 350)
	_add_rooftop(0.45, Color(0.08, 0.14, 0.28, 0.8), 220)


func _add_rooftop(frac: float, color: Color, width: float) -> void:
	var rect := ColorRect.new()
	rect.color = color
	rect.set_anchors_and_offsets_preset(Control.PRESET_BOTTOM_WIDE)
	rect.offset_left = width
	rect.offset_right = -width * 0.6
	rect.offset_top = -(70 - 40 * frac)
	rect.offset_bottom = 0
	rect.modulate = Color(1, 1, 1, 0.95)
	add_child(rect)


func play_intro() -> void:
	if _started:
		return
	_started = true
	modulate = Color(0, 0, 0, 0)
	create_tween().tween_property(self, "modulate", Color.WHITE, 0.45).set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)
	var tw := create_tween()
	tw.tween_property(_title, "position:y", _title.position.y - 8, 0.4).set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)
	tw.parallel().tween_property(_subtitle, "modulate:a", 1.0, 0.5)


func hide_quick() -> void:
	create_tween().tween_property(self, "modulate:a", 0.0, 0.18).set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_IN)
