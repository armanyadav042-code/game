# 🧱 Idle Wall Destroyer

A complete, polished browser idle game. Smash walls, earn coins, buy upgrades,
unlock tools, hire helper bots, travel through 8 themed worlds, and prestige
for permanent power. Built for a CrazyGames-style upload.

## ▶️ Play

Open `index.html` in any modern browser — no build step, no dependencies,
no assets to download. Everything (including sound) is generated in code.

```bash
# or serve it locally:
python3 -m http.server 8080
# then visit http://localhost:8080
```

## 🎮 How to play

- **Tap / click / hold** the wall to attack (or press **Space**)
- Break walls → earn 🪙 coins → buy **Upgrades**, **Tools**, and **Helpers**
- Helpers deal idle damage every second — even while you're offline
- Clear 10 stages per world (stage 10 is a 💀 **boss wall** that drops 💎 gems)
- Progress through 8 worlds: Wood → Stone → Steel → Ice → Neon → Lava → Crystal → The Void (endless)
- At 500K run-coins, **Prestige** for 🔮 Cores: +5% damage & coins each, forever
- Claim the 🎁 **daily chest** and complete 22 **achievements** for gem rewards
- Spend 💎 gems on temporary boosts (Damage Frenzy, Gold Rush, Overdrive)

## ✨ Features

- Tap + hold attacks, crits, combo counter, attack-speed scaling
- Procedural wall cracks, debris particles, screen shake, floating damage numbers
- 9 upgrade tracks · 8 tools · 6 helper types · 3 gem boosts
- Offline earnings (capped, upgradeable via Dream Crew)
- Auto-save every 10s + on tab close (localStorage), full save/load
- Generative WebAudio SFX & ambient music — zero audio files
- Fully responsive: desktop side-drawer UI, mobile bottom-sheet UI
- Delta-timed game loop, no fixed canvas size, no external assets or links

## 🗂 Structure

```
index.html        — page shell & screen markup
css/style.css     — full UI theme (dark + neon)
js/utils.js       — number formatting & math helpers
js/data.js        — all balance data: worlds, tools, helpers, upgrades, achievements
js/audio.js       — WebAudio synth (SFX + generative music)
js/game.js        — state, economy, damage, progression, prestige, save/load
js/fx.js          — particles, cracks, screen shake, helper orbits
js/ui.js          — HUD, panels, modals, toasts, floating text
js/main.js        — boot, input, delta-time main loop
```
