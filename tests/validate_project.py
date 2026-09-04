#!/usr/bin/env python3
"""Static validation for the Ragdoll Rooftop Rush Godot project.

This is deliberately environment-light so it can run without Godot installed:
it checks that resources referenced by scenes/scripts exist, that .tscn/.tres
files look well-formed, and that the project entry points are present.
"""
from __future__ import annotations

import os
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def tscn_ext_resources(path: Path) -> list[str]:
    text = path.read_text(encoding="utf-8")
    refs = []
    for m in re.finditer(r'\[ext_resource[^\]]*path="([^"]+)"', text):
        refs.append(m.group(1))
    for m in re.finditer(r'load\("(res://[^"]+)"\)', text):
        refs.append(m.group(1))
    for m in re.finditer(r'preload\("(res://[^"]+)"\)', text):
        refs.append(m.group(1))
    return refs


def gd_resource_refs(path: Path) -> list[str]:
    text = path.read_text(encoding="utf-8")
    refs = []
    for m in re.finditer(r'load\("(res://[^"]+)"\)', text):
        refs.append(m.group(1))
    for m in re.finditer(r'preload\("(res://[^"]+)"\)', text):
        refs.append(m.group(1))
    return refs


def main() -> int:
    errors = []
    warnings = []

    main_scene = ROOT / "scenes/main.tscn"
    if not main_scene.exists():
        errors.append("Missing main scene: scenes/main.tscn")

    project = (ROOT / "project.godot").read_text(encoding="utf-8")
    ms = re.search(r'run/main_scene="([^"]+)"', project)
    if ms:
        rel = ms.group(1).replace("res://", "")
        if not (ROOT / rel).exists():
            errors.append(f"Main scene referenced by project.godot missing: {rel}")

    tscn_files = sorted(ROOT.rglob("*.tscn"))
    gd_files = sorted(ROOT.rglob("*.gd"))
    if not tscn_files:
        errors.append("No .tscn scene files found.")

    for f in tscn_files:
        text = f.read_text(encoding="utf-8")
        if not text.lstrip().startswith("[gd_scene"):
            errors.append(f"{f.relative_to(ROOT)}: does not start with [gd_scene]")
        for ref in tscn_ext_resources(f):
            if not ref.startswith("res://"):
                warnings.append(f"{f.relative_to(ROOT)}: non-res:// reference {ref}")
                continue
            rel = ref.replace("res://", "")
            if not (ROOT / rel).exists():
                errors.append(f"{f.relative_to(ROOT)}: missing resource {ref}")

    for f in gd_files:
        for ref in gd_resource_refs(f):
            rel = ref.replace("res://", "")
            if not (ROOT / rel).exists():
                errors.append(f"{f.relative_to(ROOT)}: missing resource {ref}")

    required = [
        "scenes/main.tscn",
        "scenes/player/player.tscn",
        "scenes/level/level.tscn",
        "scenes/ui/main_menu.tscn",
        "scenes/ui/hud.tscn",
        "scenes/checkpoints/checkpoint.tscn",
        "scenes/finish/finish.tscn",
        "scenes/obstacles/moving_platform.tscn",
        "scenes/obstacles/rotating_bar.tscn",
        "scenes/obstacles/falling_platform.tscn",
        "scenes/obstacles/launch_pad.tscn",
    ]
    for rel in required:
        if not (ROOT / rel).exists():
            errors.append(f"Required project file missing: {rel}")

    if not (ROOT / "export_presets.cfg").exists():
        warnings.append("No export_presets.cfg found")

    for err in errors:
        print("ERROR:", err)
    for warn in warnings:
        print("WARN:", warn)
    print(f"Validated {len(tscn_files)} scene files and {len(gd_files)} script files.")
    if errors:
        print("Validation FAILED.")
        return 1
    print("Validation PASSED.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
