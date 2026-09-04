extends Node
## Global game state, timer, persistence, audio, and dynamic input actions.
## Works on the Web export: uses user:// persistence (IndexedDB in browsers) and
## generates every sound effect procedurally, so there are no external assets.

signal state_changed(state)
signal time_changed(time)
signal checkpoint_activated(index)
signal run_finished(time)
signal muted_changed(is_muted)

enum GameState {
	MENU,
	PLAYING,
	PAUSED,
	FINISHED,
}

const SAVE_PATH := "user://roadkill.cfg"
const BEST_KEY := "world/best_time"
const MUTE_KEY := "audio/muted"
const VOLUME_KEY := "audio/volume"

var state: int = GameState.MENU
var current_time: float = 0.0
var best_time: float = 0.0
var muted: bool = false
var volume_db: float = 0.0
var current_checkpoint: int = 0
var auto_start_next_run: bool = false

var _streams: Dictionary = {}
var _players: Array = []


func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	_load_settings()
	_build_input_map()
	_build_audio_streams()
	for i in range(6):
		var p := AudioStreamPlayer.new()
		p.bus = "Master"
		add_child(p)
		_players.append(p)
	_update_volume()


func _process(delta: float) -> void:
	if state == GameState.PLAYING:
		current_time += delta
		time_changed.emit(current_time)


func _unhandled_input(event: InputEvent) -> void:
	if event.is_action_pressed("mute"):
		toggle_mute()


func set_game_state(new_state: int) -> void:
	if state == new_state:
		return
	state = new_state
	state_changed.emit(state)


func start_run() -> void:
	current_time = 0.0
	current_checkpoint = 0
	set_game_state(GameState.PLAYING)


func pause_run() -> void:
	if state == GameState.PLAYING:
		set_game_state(GameState.PAUSED)


func resume_run() -> void:
	if state == GameState.PAUSED:
		set_game_state(GameState.PLAYING)


func finish_run() -> void:
	if state == GameState.FINISHED:
		return
	set_game_state(GameState.FINISHED)
	if best_time <= 0.0 or current_time < best_time:
		best_time = current_time
		_save_settings()
	run_finished.emit(current_time)


func back_to_menu() -> void:
	set_game_state(GameState.MENU)


func set_checkpoint(index: int) -> void:
	current_checkpoint = index
	checkpoint_activated.emit(index)


func get_formatted_time(seconds: float) -> String:
	var total_ms := int(round(seconds * 1000.0))
	var m := total_ms / 60000
	var s := (total_ms / 1000) % 60
	var ms := total_ms % 1000
	return "%02d:%02d.%03d" % [m, s, ms]


func toggle_mute() -> void:
	muted = not muted
	_update_volume()
	_save_settings()
	muted_changed.emit(muted)


func set_volume(value: float) -> void:
	volume_db = clampf(value, -30.0, 0.0)
	_update_volume()
	_save_settings()


func play_sfx(name: String, pitch_scale: float = 1.0) -> void:
	if muted:
		return
	if not _streams.has(name):
		return
	for p in _players:
		if not p.playing:
			p.stream = _streams[name]
			p.pitch_scale = pitch_scale
			p.play()
			return


# ---------------------------------------------------------------------------
# Persistence
# ---------------------------------------------------------------------------

func _load_settings() -> void:
	var cfg := ConfigFile.new()
	var err := cfg.load(SAVE_PATH)
	if err == OK:
		best_time = float(cfg.get_value("world", "best_time", 0.0))
		muted = bool(cfg.get_value("audio", "muted", false))
		volume_db = float(cfg.get_value("audio", "volume", 0.0))


func _save_settings() -> void:
	var cfg := ConfigFile.new()
	cfg.load(SAVE_PATH)
	cfg.set_value("world", "best_time", best_time)
	cfg.set_value("audio", "muted", muted)
	cfg.set_value("audio", "volume", volume_db)
	cfg.save(SAVE_PATH)


func _update_volume() -> void:
	var bus := AudioServer.get_bus_index("Master")
	if muted:
		AudioServer.set_bus_mute(bus, true)
	else:
		AudioServer.set_bus_mute(bus, false)
	AudioServer.set_bus_volume_db(bus, volume_db)


# ---------------------------------------------------------------------------
# Runtime input actions (works without relying on project.godot serialization,
# which keeps the project clean and web-friendly).
# ---------------------------------------------------------------------------

func _build_input_map() -> void:
	if not InputMap.has_action("move_left"):
		InputMap.add_action("move_left")
		InputMap.add_action("move_right")
		InputMap.add_action("move_forward")
		InputMap.add_action("move_back")
		InputMap.add_action("jump")
		InputMap.add_action("pause")
		InputMap.add_action("restart")
		InputMap.add_action("mute")

	_add_key("move_left", KEY_A)
	_add_key("move_left", KEY_LEFT)
	_add_key("move_right", KEY_D)
	_add_key("move_right", KEY_RIGHT)
	_add_key("move_forward", KEY_W)
	_add_key("move_forward", KEY_UP)
	_add_key("move_back", KEY_S)
	_add_key("move_back", KEY_DOWN)
	_add_key("jump", KEY_SPACE)
	_add_key("pause", KEY_ESCAPE)
	_add_key("restart", KEY_R)
	_add_key("mute", KEY_M)


func _add_key(action: String, keycode: int) -> void:
	var ev := InputEventKey.new()
	ev.keycode = keycode
	InputMap.action_add_event(action, ev)


# ---------------------------------------------------------------------------
# Procedural audio
# ---------------------------------------------------------------------------

func _build_audio_streams() -> void:
	_streams["jump"] = _make_tone(300.0, 620.0, 0.16, 0.32)
	_streams["land_soft"] = _make_noise(0.13, 0.18, 0.28)
	_streams["land_hard"] = _make_noise(0.24, 0.55, 0.38)
	_streams["hit"] = _make_noise(0.16, 0.9, 0.32)
	_streams["fall"] = _make_tone(600.0, 120.0, 0.34, 0.30)
	_streams["checkpoint"] = _make_chime()
	_streams["button"] = _make_tone(520.0, 880.0, 0.08, 0.22)
	_streams["finish"] = _make_fanfare()
	_streams["launch"] = _make_tone(180.0, 900.0, 0.24, 0.30)


func _make_tone(start_freq: float, end_freq: float, dur: float, vol: float) -> AudioStreamWAV:
	var mix_rate := 22050
	var sample_count := int(dur * mix_rate)
	var data := PackedByteArray()
	data.resize(sample_count * 2)
	var phase := 0.0
	for i in range(sample_count):
		var t := float(i) / float(mix_rate)
		var f := lerpf(start_freq, end_freq, t / dur)
		phase += TAU * f / float(mix_rate)
		var sample := sin(phase) * vol
		data.encode_s16(i * 2, int(clampf(sample, -1.0, 1.0) * 32767.0))
	return _make_wav(data, mix_rate)


func _make_noise(dur: float, vol: float, lowpass: float) -> AudioStreamWAV:
	var mix_rate := 22050
	var sample_count := int(dur * mix_rate)
	var data := PackedByteArray()
	data.resize(sample_count * 2)
	var rng := RandomNumberGenerator.new()
	rng.seed = 1337
	var prev := 0.0
	for i in range(sample_count):
		var t := float(i) / float(mix_rate)
		var decay := 1.0 - (t / dur)
		var n := rng.randf_range(-1.0, 1.0)
		prev = lerpf(prev, n, lowpass)
		var sample := prev * vol * decay
		data.encode_s16(i * 2, int(clampf(sample, -1.0, 1.0) * 32767.0))
	return _make_wav(data, mix_rate)


func _make_chime() -> AudioStreamWAV:
	var mix_rate := 22050
	var dur := 0.38
	var sample_count := int(dur * mix_rate)
	var data := PackedByteArray()
	data.resize(sample_count * 2)
	for i in range(sample_count):
		var t := float(i) / float(mix_rate)
		var env := 1.0 - t / dur
		var s1 := sin(TAU * 660.0 * t) * 0.22 * env
		var s2 := sin(TAU * 990.0 * t) * 0.18 * env
		var s3 := sin(TAU * 1320.0 * t) * 0.12 * env
		data.encode_s16(i * 2, int(clampf(s1 + s2 + s3, -1.0, 1.0) * 32767.0))
	return _make_wav(data, mix_rate)


func _make_fanfare() -> AudioStreamWAV:
	var mix_rate := 22050
	var dur := 0.72
	var sample_count := int(dur * mix_rate)
	var data := PackedByteArray()
	data.resize(sample_count * 2)
	var notes := [523.25, 659.25, 783.99, 1046.5]
	for i in range(sample_count):
		var t := float(i) / float(mix_rate)
		var env := 1.0 - t / dur
		var f := notes[mini(int(t * 6.0), notes.size() - 1)]
		var s := sin(TAU * f * t) * 0.28 * env
		var s2 := sin(TAU * f * 2.0 * t) * 0.08 * env
		data.encode_s16(i * 2, int(clampf(s + s2, -1.0, 1.0) * 32767.0))
	return _make_wav(data, mix_rate)


func _make_wav(data: PackedByteArray, mix_rate: int) -> AudioStreamWAV:
	var wav := AudioStreamWAV.new()
	wav.format = AudioStreamWAV.FORMAT_16_BITS
	wav.mix_rate = mix_rate
	wav.stereo = false
	wav.data = data
	return wav
