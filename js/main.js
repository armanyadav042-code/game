/* =====================================================================
   main.js — boot, input handling (tap & hold), main loop (delta time),
   resize, visibility/offline handling.
   ===================================================================== */
"use strict";

(() => {
  let started = false;
  let holding = false;
  let holdPos = { x: 0, y: 0 };
  let holdCd = 0;              // seconds until next hold-attack

  /* ---------------- boot ---------------- */
  function boot() {
    loadGame();
    if (S.wallHp <= 0 || S.wallMaxHp <= 0) spawnWall(true);
    bindInput();
    window.addEventListener("resize", onResize);
    onResize();
  }

  function startGame() {
    if (started) return;
    started = true;

    AudioSys.init();
    AudioSys.setSfx(S.settings.sfx);
    AudioSys.setMusic(S.settings.music);
    if (S.settings.music) AudioSys.startMusic();

    $("#title-screen").style.display = "none";
    $("#game").classList.remove("hidden");

    onResize();
    UI.applyWorldSkin();
    UI.refreshPips();
    UI.refreshHp();
    UI.refreshHud();
    UI.onToolChange();
    FX.rebuildHelpers();

    // offline earnings prompt (after everything is visible)
    const off = computeOffline();
    if (off && off.coins > 0) setTimeout(() => UI.showOffline(off), 350);

    requestAnimationFrame(loop);
  }

  /* ---------------- input ---------------- */
  function bindInput() {
    $("#btn-start").addEventListener("click", startGame);
    // any first interaction also unlocks audio
    document.addEventListener("pointerdown", () => AudioSys.resume(), { passive: true });

    const wall = $("#wall");

    wall.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      holding = true;
      holdPos = { x: e.clientX, y: e.clientY };
      holdCd = 1 / holdRate();       // first repeat comes after one interval
      doHit(e.clientX, e.clientY);   // immediate hit on press
    });
    wall.addEventListener("pointermove", (e) => {
      if (holding) holdPos = { x: e.clientX, y: e.clientY };
    });
    const stop = () => { holding = false; };
    window.addEventListener("pointerup", stop);
    window.addEventListener("pointercancel", stop);
    window.addEventListener("blur", stop);
    wall.addEventListener("contextmenu", (e) => e.preventDefault());

    // keyboard: space to smash
    window.addEventListener("keydown", (e) => {
      if (e.code === "Space") e.preventDefault();   // stop page scroll/button re-trigger
      if (e.repeat) return;
      if (e.code === "Space" || e.code === "Enter") {
        if (!started) { startGame(); return; }
        const r = wall.getBoundingClientRect();
        doHit(r.left + r.width * rand(0.3, 0.7), r.top + r.height * rand(0.3, 0.7));
      }
      if (e.code === "Escape") UI.closePanel();
    });

    // bottom nav
    $$(".nav-btn").forEach((b) => b.addEventListener("click", () => UI.openTab(b.dataset.tab)));
    $("#panel-close").addEventListener("click", () => { UI.closePanel(); AudioSys.play("ui"); });

    // stage navigation
    $("#btn-stage-prev").addEventListener("click", () => goStage(-1));
    $("#btn-stage-next").addEventListener("click", () => goStage(1));

    // daily chest
    $("#btn-daily").addEventListener("click", () => UI.openDaily());

    // modal veil click closes (only on the veil itself)
    $("#modal-veil").addEventListener("click", (e) => {
      if (e.target.id === "modal-veil") UI.closeModal();
    });

    // save on leave / handle return-from-background offline gains
    window.addEventListener("beforeunload", saveGame);
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        saveGame();
      } else if (started) {
        const off = computeOffline();
        S.lastSeen = Date.now();
        if (off && off.coins > 0) UI.showOffline(off);
        last = performance.now();   // avoid a giant dt spike
      }
    });
  }

  /** Execute one player attack with full feedback. */
  function doHit(x, y) {
    const res = playerHit();
    if (!res) return;
    UI.onPlayerHit(res, x, y);
  }

  /* ---------------- main loop ---------------- */
  let last = performance.now();
  let hudCd = 0;

  function loop(now) {
    let dt = (now - last) / 1000;
    last = now;
    dt = Math.min(dt, 0.1);          // clamp: tab-switch spikes handled elsewhere

    // hold-to-attack repeats
    if (holding && S.wallHp > 0) {
      holdCd -= dt;
      while (holdCd <= 0) {
        doHit(holdPos.x + rand(-10, 10), holdPos.y + rand(-10, 10));
        holdCd += 1 / holdRate();
      }
    }

    gameTick(dt);        // economy & idle damage
    FX.update(dt);       // particles, shake, helper orbits
    UI.uiTick(dt);       // combo timers, float throttles
    UI.panelTick(dt);    // panel refresh

    // HUD refresh ~5x/sec is plenty
    hudCd -= dt;
    if (hudCd <= 0) { hudCd = 0.2; UI.refreshHud(); }

    requestAnimationFrame(loop);
  }

  /* ---------------- resize ---------------- */
  let resizeT = null;
  function onResize() {
    FX.resize();
    // crack canvas needs the wall's laid-out size; defer a frame
    clearTimeout(resizeT);
    resizeT = setTimeout(() => FX.resizeCrack(), 60);
  }

  /* go! */
  boot();
})();
