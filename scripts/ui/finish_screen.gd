extends Control
## Finish overlay.

signal play_again_pressed
signal menu_pressed

const UI := preload("res://scripts/ui/ui_helpers.gd")

var _time_label: Label
var _best_label: Label


func _ready() -> void:
	set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	_build()


func set_results(time_seconds: float, best_seconds: float) -> void:
	_time_label.text = "TIME  %s" % GameManager.get_formatted_time(time_seconds)
	var best_text := GameManager.get_formatted_time(best_seconds)
	if best_seconds > 0.0 and absf(best_seconds - time_seconds) < 0.001:
		_best_label.text = "NEW BEST!  %s" % best_text
	else:
		_best_label.text = "BEST  %s" % best_text


func _build() -> void:
	var dim := ColorRect.new()
	dim.color = Color(0.0, 0.0, 0.0, 0.58)
	dim.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	add_child(dim)

	var center := CenterContainer.new()
	center.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	add_child(center)

	var panel := PanelContainer.new()
	panel.custom_minimum_size = Vector2(520, 360)
	center.add_child(panel)
	var style := StyleBoxFlat.new()
	style.bg_color = Color(0.05, 0.10, 0.22, 0.96)
	style.corner_radius_top_left = 22
	style.corner_radius_top_right = 22
	style.corner_radius_bottom_left = 22
	style.corner_radius_bottom_right = 22
	style.border_width_left = 4
	style.border_width_top = 4
	style.border_width_right = 4
	style.border_width_bottom = 4
	style.border_color = Color(0.95, 0.72, 0.18)
	style.content_margin_left = 30
	style.content_margin_right = 30
	style.content_margin_top = 30
	style.content_margin_bottom = 28
	panel.add_theme_stylebox_override("panel", style)

	var vb := VBoxContainer.new()
	vb.alignment = BoxContainer.ALIGNMENT_CENTER
	vb.add_theme_constant_override("separation", 14)
	panel.add_child(vb)

	var title := UI.label("FINISHED!", 54, Color(0.40, 0.90, 0.52), true)
	vb.add_child(title)

	var spacer := Control.new()
	spacer.custom_minimum_size = Vector2(0, 8)
	vb.add_child(spacer)

	_time_label = UI.label("TIME  00:00.000", 32, Color(1, 0.95, 0.75), true)
	vb.add_child(_time_label)

	_best_label = UI.label("BEST  00:00.000", 24, Color(0.72, 0.82, 1.0), true)
	vb.add_child(_best_label)

	var spacer2 := Control.new()
	spacer2.custom_minimum_size = Vector2(0, 16)
	vb.add_child(spacer2)

	var again := UI.make_button("PLAY AGAIN", Color(0.15, 0.62, 0.36, 1.0), 300, 64)
	again.pressed.connect(func() -> void: play_again_pressed.emit())
	vb.add_child(again)

	var menu := UI.make_button("MAIN MENU", Color(0.42, 0.32, 0.62, 1.0), 300, 58)
	menu.pressed.connect(func() -> void: menu_pressed.emit())
	vb.add_child(menu)

	modulate = Color(0, 0, 0, 0)
	create_tween().tween_property(self, "modulate", Color.WHITE, 0.34).set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)
