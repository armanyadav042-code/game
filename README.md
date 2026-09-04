# Ragdoll Rooftop Rush

A complete, physics-based 3D rooftop platformer for Godot 4, built from scratch
for desktop and browser/Web export.

**Run → jump → avoid spinning bars and moving walls → grab checkpoints → hit the finish.**

The player is a real ragdoll made of joined rigid bodies. The ragdoll stays
funny and floppy on impacts, but a built-in upright stabiliser and arcade
movement keep it feel responsive rather than broken.

## Features

- Full 10-section rooftop course: starting roofs, small gaps, large jumps,
  moving platforms, narrow beams, rotating bars, falling platforms, moving
  barriers, a difficult high-roof sequence, and a launch-pad finish.
- Real `RigidBody3D` ragdoll (head, torso, arms, legs) connected with
  `ConeTwistJoint3D` joints.
- Responsive movement: acceleration, deceleration, air control, coyote time,
  jump buffering, ground detection, fall detection.
- 7 checkpoints with visual activation, particles, sound, and respawn.
- Obstacles: rotating bars, moving walls, moving platforms, falling platforms,
  launch pads, and pushable crates.
- Speedrun timer with best-time persistence through `user://` (IndexedDB on
  Web).
- Polished UI: animated main menu, how-to-play, settings, HUD, pause menu,
  finish screen.
- Procedural audio (no external/music assets): jump, landing, hard collision,
  checkpoint, falling, button, launch, and finish sounds.
- Dust/impact particles, checkpoint bursts, finish confetti, camera shake,
  smooth third-person follow camera.
- Mobile touch controls for left, right, and jump.
- Web-friendly: `gl_compatibility` renderer, generated audio, `user://` saves,
  `AnimatableBody3D` obstacles, runtime input actions.

## Controls

**Desktop**

| Action | Keys |
| --- | --- |
| Move left / right | `A` / `D`, `Left` / `Right` |
| Run forward / back | `W` / `S`, `Up` / `Down` |
| Jump | `Space` |
| Restart at checkpoint | `R` |
| Pause | `Esc` |
| Mute | `M` |

**Mobile / touch**

Large on-screen `LEFT`, `RIGHT`, and `JUMP` buttons appear automatically on
touch devices.

## Opening / running

1. Open Godot 4.x (`4.7+` recommended).
2. Import this folder as a project.
3. Press `F5` to run `scenes/main.tscn`.

The project is configured for Web export (`export_presets.cfg`). In the editor
**Project → Export** and choose the **Web** preset, then **Export Project**. The
output goes to `build/web/`.

## Project structure

```
res://
├── project.godot
├── export_presets.cfg
├── icon.svg
├── scenes/
│   ├── main.tscn
│   ├── player/player.tscn
│   ├── level/level.tscn
│   ├── camera_rig.tscn
│   ├── checkpoints/checkpoint.tscn
│   ├── finish/finish.tscn
│   ├── obstacles/
│   │   ├── moving_platform.tscn
│   │   ├── rotating_bar.tscn
│   │   ├── falling_platform.tscn
│   │   ├── launch_pad.tscn
│   │   └── push_crate.tscn
│   └── ui/**
├── scripts/
│   ├── game_manager.gd        (autoload: state, timer, audio, persistence)
│   ├── main.gd
│   ├── camera_rig.gd
│   ├── effects.gd
│   ├── player/ragdoll_player.gd
│   ├── level/level.gd
│   ├── checkpoints/checkpoint.gd
│   ├── finish/finish.gd
│   ├── obstacles/*
│   └── ui/*
└── tests/validate_project.py
```

## Technical implementation

- **Player**: `RigidBody3D` torso plus 5 child rigid-body limbs linked by
  `ConeTwistJoint3D`. Movement uses smoothed horizontal velocity control and
  keeps the vertical axis for gravity. An upright controller nudges the torso
  back toward `+Y` while grounded.
- **Course**: procedural low-poly boxes and cylinders, built by `Level` from
  section data with reachability-safe gaps.
- **Obstacles**: moving traps use `AnimatableBody3D` so they properly push the
  physics ragdoll on Web. Rotating bars are `StaticBody3D` bars on rotating
  pivots. Falling platforms trigger on the player and respawn.
- **Audio**: all SFX are generated at runtime as `AudioStreamWAV` PCM, so there
  are no copyrighted assets to bundle.
- **Persistence**: `ConfigFile` in `user://`, which maps to IndexedDB in the
  browser export.

## Testing performed

A Godot engine binary was not available inside the build sandbox and the
official Linux release asset could not be downloaded from the restricted
environment, so full runtime play-testing could not be performed here. The
project was validated statically instead:

- Every GDScript file parsed with a Godot GDScript grammar (tree-sitter).
- Every `.tscn` parsed with a Godot 4 scene/resource parser and each
  `ext_resource`/`load`/`preload` path confirmed to exist.
- `project.godot`, the main scene entry point, and `export_presets.cfg` were
  checked.
- `tests/validate_project.py` passes (run with `python3 tests/validate_project.py`).

Known limitations / next steps for a full QA pass in the Godot editor:

- Joint tuning and platform gap difficulty should be play-tested on real
  hardware and adjusted for feel.
- The Godot editor will need to run an initial import (`F5` once) before the
  first export.
