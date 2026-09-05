extends Node3D
## Main entry scene: builds the world, wires the player/camera/level together,
## and drives the menu/HUD/finish UI flow.

# These hold runtime-loaded scene instances whose behaviour comes from their
# own scripts. They must stay untyped (Variant) so duck-typed calls like
# level.configure() and main_menu.play_pressed resolve dynamically — a static
# Node3D/Control type makes the GDScript analyzer fail with "not found in base".
var level
var player
var camera_rig
var ui_layer: CanvasLayer
var main_menu
var hud
var pause_menu
var finish_screen
var how_screen
var settings_screen


func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	_build_world()
	_build_ui()
	if GameManager.auto_start_next_run:
		GameManager.auto_start_next_run = false
		call_deferred("_start_game")
	else:
		_show_main_menu()
		main_menu.play_intro()
	GameManager.state_changed.connect(_on_state_changed)


func _build_world() -> void:
	level = load("res://scenes/level/level.tscn").instantiate()
	add_child(level)

	player = load("res://scenes/player/player.tscn").instantiate()
	add_child(player)
	player.global_position = Vector3(0, 1.5, 0)

	camera_rig = load("res://scenes/camera_rig.tscn").instantiate()
	add_child(camera_rig)
	camera_rig.setup(player)

	level.configure(player)

	player.hard_landing.connect(_on_hard_landing)
	player.hard_hit.connect(_on_hard_hit)


func _build_ui() -> void:
	ui_layer = CanvasLayer.new()
	ui_layer.layer = 50
	add_child(ui_layer)

	main_menu = load("res://scenes/ui/main_menu.tscn").instantiate()
	hud = load("res://scenes/ui/hud.tscn").instantiate()
	pause_menu = load("res://scenes/ui/pause_menu.tscn").instantiate()
	finish_screen = load("res://scenes/ui/finish_screen.tscn").instantiate()
	how_screen = load("res://scenes/ui/how_to_play.tscn").instantiate()
	settings_screen = load("res://scenes/ui/settings.tscn").instantiate()

	for child in [main_menu, hud, pause_menu, finish_screen, how_screen, settings_screen]:
		child.process_mode = Node.PROCESS_MODE_ALWAYS
		ui_layer.add_child(child)

	hud.visible = false
	pause_menu.visible = false
	finish_screen.visible = false
	how_screen.visible = false
	settings_screen.visible = false
	hud.set_mute_button(GameManager.muted)

	main_menu.play_pressed.connect(_start_game)
	main_menu.how_pressed.connect(_show_how_to_play)
	main_menu.settings_pressed.connect(_show_settings)
	hud.pause_pressed.connect(_pause_game)
	hud.restart_pressed.connect(_restart_checkpoint)
	hud.mute_pressed.connect(func() -> void: GameManager.toggle_mute(); hud.set_mute_button(GameManager.muted))
	pause_menu.resume_pressed.connect(_resume_game)
	pause_menu.restart_pressed.connect(_restart_checkpoint)
	pause_menu.menu_pressed.connect(_go_main_menu)
	finish_screen.play_again_pressed.connect(_play_again)
	finish_screen.menu_pressed.connect(_go_main_menu)
	how_screen.back_pressed.connect(_show_main_menu)
	settings_screen.back_pressed.connect(_show_main_menu)


func _unhandled_input(event: InputEvent) -> void:
	if event.is_action_pressed("pause"):
		if GameManager.state == GameManager.GameState.PLAYING:
			_pause_game()
			get_viewport().set_input_as_handled()
		elif GameManager.state == GameManager.GameState.PAUSED:
			_resume_game()
			get_viewport().set_input_as_handled()
	elif event.is_action_pressed("restart"):
		if GameManager.state == GameManager.GameState.PLAYING or GameManager.state == GameManager.GameState.PAUSED:
			_restart_checkpoint()
			get_viewport().set_input_as_handled()


# ---------------------------------------------------------------------------
# UI flow
# ---------------------------------------------------------------------------

func _show_main_menu() -> void:
	_hide_all_ui()
	main_menu.visible = true
	hud.visible = false
	GameManager.back_to_menu()


func _show_how_to_play() -> void:
	_hide_all_ui()
	how_screen.visible = true


func _show_settings() -> void:
	_hide_all_ui()
	settings_screen.visible = true


func _start_game() -> void:
	_hide_all_ui()
	hud.visible = true
	GameManager.start_run()
	player.set_controls_enabled(true)
	if level and level.has_method("reset_obstacles"):
		level.reset_obstacles()


func _pause_game() -> void:
	if GameManager.state != GameManager.GameState.PLAYING:
		return
	get_tree().paused = true
	GameManager.pause_run()
	pause_menu.visible = true


func _resume_game() -> void:
	if GameManager.state != GameManager.GameState.PAUSED:
		return
	get_tree().paused = false
	GameManager.resume_run()
	pause_menu.visible = false


func _restart_checkpoint() -> void:
	pause_menu.visible = false
	get_tree().paused = false
	GameManager.play_sfx("button")
	if level and level.has_method("respawn_player"):
		level.respawn_player()
	if GameManager.state == GameManager.GameState.PAUSED:
		_resume_game()


func _play_again() -> void:
	get_tree().paused = false
	GameManager.auto_start_next_run = true
	get_tree().reload_current_scene()


func _go_main_menu() -> void:
	get_tree().paused = false
	get_tree().reload_current_scene()


func _on_state_changed(new_state: int) -> void:
	if new_state == GameManager.GameState.FINISHED:
		_show_finish_screen()


func _show_finish_screen() -> void:
	get_tree().paused = false
	_hide_all_ui()
	finish_screen.set_results(GameManager.current_time, GameManager.best_time)
	finish_screen.visible = true
	if player:
		player.set_controls_enabled(false)


func _on_hard_landing(strength: float) -> void:
	camera_rig.add_shake(clampf(strength / 14.0, 0.0, 1.2))


func _on_hard_hit(_strength: float) -> void:
	camera_rig.add_shake(0.7)


func _hide_all_ui() -> void:
	main_menu.visible = false
	hud.visible = false
	pause_menu.visible = false
	finish_screen.visible = false
	how_screen.visible = false
	settings_screen.visible = false
