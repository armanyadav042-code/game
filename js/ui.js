/* =====================================================================
   ui.js — HUD, panels (upgrades/tools/helpers/worlds/prestige/awards/
   settings), floating numbers, toasts, modals, daily chest.
   ===================================================================== */
"use strict";

const UI = (() => {
  /* cached elements */
  const el = {
    coins: $("#coins-val"), gems: $("#gems-val"), cores: $("#cores-val"),
    curCoins: $("#cur-coins"), curCores: $("#cur-cores"),
    statTap: $("#stat-tap"), statDps: $("#stat-dps"), statWorld: $("#stat-world"), statBoost: $("#stat-boost"),
    wall: $("#wall"), wallFace: $("#wall-face"), wallFlash: $("#wall-flash"), wallDamage: $("#wall-damage"),
    wallName: $("#wall-name"), hpFill: $("#hp-fill"), hpText: $("#hp-text"),
    pips: $("#stage-pips"), bossBanner: $("#boss-banner"),
    tool: $("#tool-sprite"), combo: $("#combo-box"), comboCount: $("#combo-count"),
    floatLayer: $("#float-layer"), worldBg: $("#world-bg"),
    panel: $("#panel"), panelTitle: $("#panel-title"), panelBody: $("#panel-body"),
    toastZone: $("#toast-zone"),
    modalVeil: $("#modal-veil"), modalIcon: $("#modal-icon"), modalTitle: $("#modal-title"),
    modalBody: $("#modal-body"), modalActions: $("#modal-actions"),
    btnDaily: $("#btn-daily"),
    prevBtn: $("#btn-stage-prev"), nextBtn: $("#btn-stage-next"),
  };

  let activeTab = null;        // currently open panel tab
  let multiBuy = 1;            // 1 | 10 | "max"
  let combo = 0, comboTimer = 0;

  /* =============== HUD =============== */
  let lastCoins = -1;
  function refreshHud() {
    if (S.coins !== lastCoins) {
      el.coins.textContent = fmt(S.coins);
      lastCoins = S.coins;
    }
    el.gems.textContent = fmt(S.gems);
    if (S.cores > 0 || S.stats.prestiges > 0) {
      el.curCores.classList.remove("hidden");
      el.cores.textContent = fmt(S.cores);
    }
    el.statTap.textContent = `👊 ${fmt(tapDamage())}`;
    el.statDps.textContent = `⚡ ${fmt(totalDps())}/s`;
    const w = WORLDS[S.world];
    el.statWorld.textContent = `${w.icon} ${w.name} · Stage ${S.stage + 1}${w.endless ? "" : "/" + STAGES_PER_WORLD}`;

    // boost countdowns
    const act = BOOSTS.filter((b) => S.boosts[b.id] > 0);
    if (act.length) {
      el.statBoost.classList.remove("hidden");
      el.statBoost.textContent = act.map((b) => `${b.icon}${Math.ceil(S.boosts[b.id])}s`).join(" ");
    } else el.statBoost.classList.add("hidden");

    // daily glow
    el.btnDaily.classList.toggle("ready", dailyReady());

    // stage nav availability
    el.prevBtn.disabled = S.world === 0 && S.stage === 0;
    el.nextBtn.disabled = S.world === S.bestWorld && S.stage === S.bestStage;
  }

  function refreshHp() {
    const ratio = S.wallMaxHp > 0 ? S.wallHp / S.wallMaxHp : 0;
    el.hpFill.style.width = (ratio * 100) + "%";
    el.hpFill.className = ratio < 0.25 ? "low" : ratio < 0.55 ? "mid" : "";
    el.hpText.textContent = `${fmt(Math.ceil(S.wallHp))} / ${fmt(S.wallMaxHp)}`;
    FX.setCrackLevel(1 - ratio);
    // damage stages: bruise overlay deepens as the wall weakens
    el.wallDamage.style.opacity = Math.min(1, (1 - ratio) * 1.15).toFixed(2);
  }

  function refreshPips() {
    el.pips.innerHTML = "";
    const w = WORLDS[S.world];
    const total = w.endless ? Math.max(STAGES_PER_WORLD, S.stage + 2) : STAGES_PER_WORLD;
    const shown = Math.min(total, 14);
    const offset = Math.max(0, S.stage - shown + 2);
    for (let i = offset; i < offset + shown; i++) {
      const p = document.createElement("span");
      p.className = "pip";
      if ((i % STAGES_PER_WORLD) === STAGES_PER_WORLD - 1) p.classList.add("boss");
      if (i < S.stage) p.classList.add("done");
      if (i === S.stage) p.classList.add("cur");
      el.pips.appendChild(p);
    }
  }

  /* =============== WALL VISUALS =============== */
  function applyWorldSkin() {
    const w = WORLDS[S.world];
    el.wallFace.style.background = w.face;
    el.wall.style.setProperty("--wall-glow", w.glow);
    el.worldBg.style.background = w.bg;
    // world accent tints the beams, floor grid, wall name and HP glow
    document.documentElement.style.setProperty("--world-accent", w.accent || "#00e5ff");
    el.wallName.style.textShadow = `0 0 12px ${w.accent || "#00e5ff"}66`;
    el.wallName.textContent = (isBossStageIdx(S.stage) ? "💀 BOSS · " : "") + w.wallName + " " + roman(S.stage + 1);
    el.bossBanner.classList.toggle("hidden", !isBossStageIdx(S.stage));
    el.wall.classList.toggle("boss-wall", isBossStageIdx(S.stage));
    FX.setAmbient(w);
  }
  function roman(n) {
    if (n > 30) return "#" + n;
    const R = [[10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]];
    let s = "";
    for (const [v, sym] of R) while (n >= v) { s += sym; n -= v; }
    return s;
  }

  function onWallSpawn() {
    FX.clearCracks();
    applyWorldSkin();
    refreshPips();
    refreshHp();
    el.wall.classList.remove("break-anim");
    void el.wall.offsetWidth;             // restart CSS animation
    el.wall.classList.add("spawn-anim");
    setTimeout(() => el.wall.classList.remove("spawn-anim"), 400);
  }

  function onWallBreak(reward, wasBoss) {
    el.wall.classList.remove("hit-anim", "crit-anim");
    el.wall.classList.add("break-anim");
    const c = centerOfWall();
    FX.burst(c.x, c.y, WORLDS[S.world].debris, wasBoss ? 90 : 55, wasBoss ? 1.8 : 1.3);
    FX.shake(wasBoss ? 14 : 8);
    floatText(`+${fmt(reward)} 🪙`, c.x, c.y - 40, "coin");
    bumpCurrency(el.curCoins);
    AudioSys.play("coin");
    if (wasBoss) toast(`💀 Boss destroyed! +${fmt(reward)} 🪙 & bonus 💎`, "gold");
  }

  function onWorldChange(isNew) {
    applyWorldSkin();
    refreshPips();
    if (isNew) {
      const w = WORLDS[S.world];
      toast(`${w.icon} New world unlocked: ${w.name}!`, "gold");
    }
    if (activeTab === "worlds") renderPanel();
  }

  function onToolChange() {
    el.tool.textContent = TOOLS[S.tool].icon;
    if (activeTab === "tools") renderPanel();
  }
  function onHelpersChange() {
    FX.rebuildHelpers();
    if (activeTab === "helpers") renderPanel();
  }

  function centerOfWall() {
    const wr = el.wall.getBoundingClientRect();
    const mr = $("#main-area").getBoundingClientRect();
    return { x: wr.left - mr.left + wr.width / 2, y: wr.top - mr.top + wr.height / 2 };
  }

  /* =============== PLAYER HIT FEEDBACK =============== */
  function onPlayerHit(res, px, py) {
    // swing tool
    el.tool.classList.remove("swing");
    void el.tool.offsetWidth;
    el.tool.classList.add("swing");

    // wall reaction
    el.wall.classList.remove("hit-anim", "crit-anim");
    void el.wall.offsetWidth;
    el.wall.classList.add(res.crit ? "crit-anim" : "hit-anim");

    // flash
    el.wallFlash.style.opacity = res.crit ? 0.5 : 0.22;
    setTimeout(() => { el.wallFlash.style.opacity = 0; }, 60);

    // particles at hit point
    const mr = $("#main-area").getBoundingClientRect();
    const x = px - mr.left, y = py - mr.top;
    FX.burst(x, y, WORLDS[S.world].debris, res.crit ? 16 : 7, res.crit ? 1.3 : 0.9);
    if (res.crit) { FX.sparkRing(x, y); FX.shake(6); }
    else FX.shake(1.4);

    floatText(res.crit ? `CRIT ${fmt(res.dmg)}!` : fmt(res.dmg), x + rand(-24, 24), y + rand(-16, 6), res.crit ? "crit" : "");
    AudioSys.play(res.crit ? "crit" : "hit");

    // combo
    combo++;
    comboTimer = 1.2;
    if (combo >= 5) {
      el.combo.classList.remove("hidden");
      el.comboCount.textContent = "x" + combo;
      el.combo.classList.remove("pop");
      void el.combo.offsetWidth;
      el.combo.classList.add("pop");
    }
    refreshHp();
  }

  let autoFloatCd = 0;
  function onAutoDamage(dealt) {
    refreshHp();
    // throttle the auto-damage floaters so they don't spam
    if (autoFloatCd <= 0 && dealt >= 1) {
      autoFloatCd = 0.55;
      const c = centerOfWall();
      floatText(fmt(dealt), c.x + rand(-60, 60), c.y + rand(-50, 50), "auto");
      FX.helperZap();
    }
  }

  function uiTick(dt) {
    if (autoFloatCd > 0) autoFloatCd -= dt;
    if (comboTimer > 0) {
      comboTimer -= dt;
      if (comboTimer <= 0) { combo = 0; el.combo.classList.add("hidden"); }
    }
  }

  /* =============== FLOATING TEXT =============== */
  function floatText(text, x, y, cls = "") {
    if (el.floatLayer.childElementCount > 40) el.floatLayer.firstChild.remove();
    const d = document.createElement("div");
    d.className = "dmg-float " + cls;
    d.textContent = text;
    d.style.left = x + "px";
    d.style.top = y + "px";
    el.floatLayer.appendChild(d);
    setTimeout(() => d.remove(), 950);
  }

  function bumpCurrency(elm) {
    elm.classList.remove("bump");
    void elm.offsetWidth;
    elm.classList.add("bump");
  }

  /* =============== TOASTS =============== */
  function toast(msg, kind = "") {
    const t = document.createElement("div");
    t.className = "toast " + kind;
    t.innerHTML = `<span>${msg}</span>`;
    el.toastZone.appendChild(t);
    if (el.toastZone.childElementCount > 3) el.toastZone.firstChild.remove();
    setTimeout(() => t.classList.add("out"), 2600);
    setTimeout(() => t.remove(), 2950);
  }

  function markAwardsDot() {
    const btn = $('.nav-btn[data-tab="awards"]');
    if (!btn.querySelector(".nav-dot")) {
      const d = document.createElement("span");
      d.className = "nav-dot";
      btn.appendChild(d);
    }
  }

  /* =============== MODAL =============== */
  function modal({ icon, title, bodyHtml, actions }) {
    el.modalIcon.textContent = icon;
    el.modalTitle.textContent = title;
    el.modalBody.innerHTML = bodyHtml;
    el.modalActions.innerHTML = "";
    for (const a of actions) {
      const b = document.createElement("button");
      b.className = "buy-btn " + (a.cls || "");
      b.textContent = a.label;
      b.onclick = () => { closeModal(); if (a.fn) a.fn(); };
      el.modalActions.appendChild(b);
    }
    el.modalVeil.classList.remove("hidden");
  }
  function closeModal() { el.modalVeil.classList.add("hidden"); }

  /* =============== PANEL SYSTEM =============== */
  const TAB_TITLES = {
    upgrades: "⬆️ Upgrades", tools: "⛏️ Tools", helpers: "🤖 Helpers",
    worlds: "🌍 Worlds", prestige: "🔮 Prestige", awards: "🏆 Achievements", settings: "⚙️ Settings",
  };

  function openTab(tab) {
    if (activeTab === tab) { closePanel(); return; }
    activeTab = tab;
    el.panelTitle.textContent = TAB_TITLES[tab];
    $$(".nav-btn").forEach((b) => b.classList.toggle("active", b.dataset.tab === tab));
    if (tab === "awards") $('.nav-btn[data-tab="awards"] .nav-dot')?.remove();
    renderPanel();
    el.panel.classList.add("open");
    el.panel.classList.remove("closed");
    AudioSys.play("ui");
  }
  function closePanel() {
    activeTab = null;
    el.panel.classList.remove("open");
    $$(".nav-btn").forEach((b) => b.classList.remove("active"));
  }

  function renderPanel() {
    if (!activeTab) return;
    const fn = {
      upgrades: renderUpgrades, tools: renderTools, helpers: renderHelpers,
      worlds: renderWorlds, prestige: renderPrestige, awards: renderAwards, settings: renderSettings,
    }[activeTab];
    el.panelBody.innerHTML = "";
    fn(el.panelBody);
    panelSig = affordSig();
  }

  /* refresh affordability without full re-render every frame */
  let panelRefreshCd = 0;
  let panelSig = "";

  /** Signature of "can I afford it" states — re-render only when it changes. */
  function affordSig() {
    switch (activeTab) {
      case "upgrades":
        return (multiBuy === "max" ? fmt(S.coins) + "~" : "") + UPGRADES.map((u) => {
          const lvl = upLvl(u.id);
          return (u.maxLvl && lvl >= u.maxLvl) ? "M" : (S.coins >= upgradeCost(u, lvl) ? 1 : 0);
        }).join("") + "|" + BOOSTS.map((b) => (S.gems >= b.cost ? 1 : 0) + ":" + Math.ceil(S.boosts[b.id] || 0)).join(",");
      case "tools":
        return TOOLS.map((t, i) => S.toolsOwned[i] ? "o" : (S.coins >= t.cost ? 1 : 0)).join("");
      case "helpers":
        return (multiBuy === "max" ? fmt(S.coins) + "~" : "") + HELPERS.map((h) => S.coins >= helperCost(h) ? 1 : 0).join("");
      case "prestige":
        return String(prestigeCoresAvailable());
      default:
        return "";
    }
  }

  function panelTick(dt) {
    if (!activeTab) return;
    panelRefreshCd -= dt;
    if (panelRefreshCd <= 0) {
      panelRefreshCd = 0.3;
      if (["upgrades", "tools", "helpers", "prestige"].includes(activeTab)) {
        const sig = affordSig();
        if (sig !== panelSig) { panelSig = sig; renderPanel(); }
      }
    }
  }

  /* ---------- upgrades tab ---------- */
  function renderUpgrades(root) {
    root.appendChild(multiBuyRow());
    for (const u of UPGRADES) {
      const lvl = upLvl(u.id);
      const maxed = u.maxLvl && lvl >= u.maxLvl;
      let count = multiBuy === "max" ? Math.max(1, maxAffordableUpgrades(u)) : multiBuy;
      if (u.maxLvl) count = Math.min(count, Math.max(1, u.maxLvl - lvl));
      const cost = geomSum(u.baseCost, u.costMult, lvl, count);
      const afford = !maxed && S.coins >= upgradeCost(u, lvl);

      root.appendChild(card({
        icon: u.icon,
        name: u.name,
        tag: `Lv ${lvl}${u.maxLvl ? "/" + u.maxLvl : ""}`,
        desc: u.desc,
        effect: u.effDesc(lvl),
        btn: maxed
          ? { label: "MAX", disabled: true }
          : { label: `Buy ${count > 1 ? "×" + count : ""}`, cost: `🪙 ${fmt(Math.ceil(cost))}`, disabled: S.coins < upgradeCost(u, lvl), fn: () => { buyUpgrade(u.id, count === 0 ? 1 : count); renderPanel(); refreshHud(); } },
        cls: afford ? "affordable" : "",
      }));
    }
    // gem boosts section
    const st = document.createElement("div");
    st.className = "section-title";
    st.textContent = "💎 Gem Boosts";
    root.appendChild(st);
    for (const b of BOOSTS) {
      const active = S.boosts[b.id] > 0;
      root.appendChild(card({
        icon: b.icon, name: b.name, tag: active ? `${Math.ceil(S.boosts[b.id])}s left` : "",
        desc: b.desc,
        btn: { label: active ? "Extend" : "Activate", cost: `💎 ${b.cost}`, disabled: S.gems < b.cost, cls: "gold-btn", fn: () => { buyBoost(b.id); renderPanel(); refreshHud(); } },
        cls: S.gems >= b.cost ? "affordable" : "",
      }));
    }
  }

  function multiBuyRow() {
    const row = document.createElement("div");
    row.className = "multibuy";
    for (const v of [1, 10, "max"]) {
      const b = document.createElement("button");
      b.textContent = v === "max" ? "MAX" : "×" + v;
      if (multiBuy === v) b.classList.add("sel");
      b.onclick = () => { multiBuy = v; AudioSys.play("ui"); renderPanel(); };
      row.appendChild(b);
    }
    return row;
  }

  /* ---------- tools tab ---------- */
  function renderTools(root) {
    const note = document.createElement("div");
    note.className = "panel-note";
    note.innerHTML = `Tools multiply your <b>tap damage</b>. Buy once, keep forever. Tap an owned tool to equip it.`;
    root.appendChild(note);
    TOOLS.forEach((t, i) => {
      const owned = S.toolsOwned[i];
      const equipped = S.tool === i;
      root.appendChild(card({
        icon: t.icon, name: t.name, tag: `×${fmt(t.mult)} dmg`,
        desc: t.desc,
        btn: equipped
          ? { label: "Equipped", disabled: true }
          : owned
            ? { label: "Equip", cls: "green-btn", fn: () => { equipTool(i); AudioSys.play("ui"); renderPanel(); refreshHud(); } }
            : { label: "Unlock", cost: `🪙 ${fmt(t.cost)}`, disabled: S.coins < t.cost, fn: () => { buyTool(i); renderPanel(); refreshHud(); } },
        cls: equipped ? "equipped" : (!owned && S.coins >= t.cost ? "affordable" : owned ? "" : "locked"),
      }));
    });
  }

  /* ---------- helpers tab ---------- */
  function renderHelpers(root) {
    const note = document.createElement("div");
    note.className = "panel-note";
    note.innerHTML = `Helpers deal <b>damage every second</b>, even while you idle. They also power your <b>offline earnings</b>.`;
    root.appendChild(note);
    root.appendChild(multiBuyRow());
    for (const h of HELPERS) {
      const owned = S.helpers[h.id] || 0;
      let count = multiBuy === "max" ? Math.max(1, geomMaxAffordable(h.cost, h.costMult, owned, S.coins)) : multiBuy;
      const cost = geomSum(h.cost, h.costMult, owned, count);
      const unitDps = h.dps * upEff("helper") * damageBoostMult();
      root.appendChild(card({
        icon: h.icon, name: h.name, tag: owned ? `×${owned}` : "",
        desc: h.desc,
        effect: owned ? `${fmt(owned * unitDps)}/s total · ${fmt(unitDps)}/s each` : `${fmt(unitDps)}/s each`,
        btn: { label: `Hire ${count > 1 ? "×" + count : ""}`, cost: `🪙 ${fmt(Math.ceil(cost))}`, disabled: S.coins < helperCost(h), fn: () => { buyHelper(h.id, count); renderPanel(); refreshHud(); } },
        cls: S.coins >= helperCost(h) ? "affordable" : "",
      }));
    }
  }

  /* ---------- worlds tab ---------- */
  function renderWorlds(root) {
    WORLDS.forEach((w, i) => {
      const unlocked = i <= S.bestWorld;
      const current = i === S.world;
      root.appendChild(card({
        icon: unlocked ? w.icon : "🔒",
        name: w.name,
        tag: current ? "HERE" : "",
        desc: unlocked
          ? `${w.wallName}s · ${w.endless ? "Endless stages" : STAGES_PER_WORLD + " stages"} · base HP ×${fmt(w.hpMult)}`
          : `Clear ${WORLDS[i - 1].name} to unlock.`,
        btn: unlocked && !current
          ? { label: "Travel", cls: "green-btn", fn: () => { goWorld(i); renderPanel(); } }
          : { label: current ? "Active" : "Locked", disabled: true },
        cls: current ? "equipped" : unlocked ? "" : "locked",
      }));
    });
  }

  /* ---------- prestige tab ---------- */
  function renderPrestige(root) {
    const gain = prestigeCoresAvailable();
    const bonusNow = S.cores * PRESTIGE_CORE_BONUS;
    const bonusAfter = (S.cores + gain) * PRESTIGE_CORE_BONUS;

    const note = document.createElement("div");
    note.className = "panel-note";
    note.innerHTML =
      `Prestige resets your <b>coins, upgrades, tools, helpers and world progress</b> — ` +
      `but grants permanent <b>🔮 Cores</b>.<br><br>` +
      `Each Core gives <b>+${Math.round(PRESTIGE_CORE_BONUS * 100)}% damage AND coins</b>, forever.<br>` +
      `💎 Gems and achievements are kept.`;
    root.appendChild(note);

    const stat = document.createElement("div");
    stat.innerHTML = `
      <div class="center" style="margin:14px 0 4px;color:var(--text-dim);font-size:12px">CURRENT BONUS</div>
      <div class="big-stat">🔮 ${S.cores} · ${fmtPct(bonusNow)}</div>
      <div class="center" style="margin:16px 0 4px;color:var(--text-dim);font-size:12px">PRESTIGE NOW FOR</div>
      <div class="big-stat" style="color:var(--accent)">+${gain} 🔮 → ${fmtPct(bonusAfter)}</div>
      <div class="center" style="margin:10px 0 16px;font-size:12.5px;color:var(--text-dim)">
        This run: ${fmt(S.runCoins)} / ${fmt(PRESTIGE_MIN_COINS)} coins needed<br>
        Next core at ${fmt(Math.pow(gain + 1, 2) * PRESTIGE_MIN_COINS)} run coins
      </div>`;
    root.appendChild(stat);

    const btn = document.createElement("button");
    btn.className = "buy-btn red-btn";
    btn.style.cssText = "width:100%;padding:14px;font-size:16px";
    btn.disabled = gain <= 0;
    btn.textContent = gain > 0 ? `🔮 PRESTIGE (+${gain} Cores)` : `Need ${fmt(PRESTIGE_MIN_COINS)} run coins`;
    btn.onclick = () => {
      modal({
        icon: "🔮", title: "Prestige?",
        bodyHtml: `You will gain <b style="color:#c9a6ff">+${gain} Cores</b> (${fmtPct(bonusAfter)} total bonus) and reset this run.`,
        actions: [
          { label: "Cancel", cls: "red-btn" },
          { label: "PRESTIGE", cls: "gold-btn", fn: () => {
              doPrestige();
              closePanel();
              onWallSpawn(); refreshHud();
              FX.rebuildHelpers(); onToolChange();
              toast(`🔮 Reborn! Permanent bonus: ${fmtPct((S.cores) * PRESTIGE_CORE_BONUS)}`, "gold");
            } },
        ],
      });
    };
    root.appendChild(btn);
  }

  /* ---------- achievements tab ---------- */
  function renderAwards(root) {
    const done = ACHIEVEMENTS.filter((a) => S.achDone[a.id]).length;
    const note = document.createElement("div");
    note.className = "panel-note";
    note.innerHTML = `<b>${done} / ${ACHIEVEMENTS.length}</b> unlocked. Each achievement pays 💎 gems automatically.`;
    root.appendChild(note);
    // sort: in-progress first, done last
    const sorted = [...ACHIEVEMENTS].sort((a, b) => (S.achDone[a.id] ? 1 : 0) - (S.achDone[b.id] ? 1 : 0));
    for (const a of sorted) {
      const cur = Math.min(S.stats[a.metric] || 0, a.target);
      const doneA = !!S.achDone[a.id];
      const c = card({
        icon: a.icon, name: a.name, tag: doneA ? "✓ DONE" : "",
        desc: `${a.desc} — 💎 ${a.gems}`,
        btn: null,
        cls: doneA ? "ach-done" : "",
      });
      if (!doneA) {
        const bar = document.createElement("div");
        bar.className = "ach-progress";
        bar.innerHTML = `<i style="width:${(cur / a.target) * 100}%"></i>`;
        c.querySelector(".card-info").appendChild(bar);
        const lbl = document.createElement("div");
        lbl.className = "card-effect";
        lbl.textContent = `${fmt(cur)} / ${fmt(a.target)}`;
        c.querySelector(".card-info").appendChild(lbl);
      }
      root.appendChild(c);
    }
  }

  /* ---------- settings tab ---------- */
  function renderSettings(root) {
    /* --- helpers to build grouped rows --- */
    const section = (label, icon) => {
      const s = document.createElement("div");
      s.className = "section-title";
      s.textContent = `${icon} ${label}`;
      root.appendChild(s);
      const g = document.createElement("div");
      g.className = "setting-group";
      root.appendChild(g);
      return g;
    };
    const toggleRow = (group, icon, label, key, cb) => {
      const r = document.createElement("div");
      r.className = "setting-row";
      r.innerHTML = `<span class="set-lbl"><span class="set-ico">${icon}</span>${label}</span>`;
      const t = document.createElement("button");
      t.className = "toggle" + (S.settings[key] ? " on" : "");
      t.setAttribute("aria-label", label);
      t.onclick = () => {
        S.settings[key] = !S.settings[key];
        t.classList.toggle("on", S.settings[key]);
        if (cb) cb(S.settings[key]);
        AudioSys.play("ui");
        saveGame();
      };
      r.appendChild(t);
      group.appendChild(r);
    };

    /* --- AUDIO --- */
    const gAudio = section("Audio", "🔊");
    toggleRow(gAudio, "🔔", "Sound Effects", "sfx", (v) => AudioSys.setSfx(v));
    toggleRow(gAudio, "🎵", "Music", "music", (v) => AudioSys.setMusic(v));

    /* --- GRAPHICS --- */
    const gGfx = section("Graphics", "✨");
    toggleRow(gGfx, "💥", "Particles", "particles", null);
    toggleRow(gGfx, "📳", "Screen Shake", "shake", null);

    // quality segmented control
    const qr = document.createElement("div");
    qr.className = "setting-row";
    qr.innerHTML = `<span class="set-lbl"><span class="set-ico">🖥️</span>Quality</span>`;
    const seg = document.createElement("div");
    seg.className = "seg-control";
    for (const [val, lbl] of [["low", "Low"], ["med", "Medium"], ["high", "High"]]) {
      const b = document.createElement("button");
      b.textContent = lbl;
      b.classList.toggle("sel", S.settings.quality === val);
      b.onclick = () => {
        S.settings.quality = val;
        applyQuality();
        AudioSys.play("ui");
        saveGame();
        renderPanel();
      };
      seg.appendChild(b);
    }
    qr.appendChild(seg);
    gGfx.appendChild(qr);

    const qNote = document.createElement("div");
    qNote.className = "setting-hint";
    qNote.textContent = S.settings.quality === "low"
      ? "Low: no ambient effects or animations — best battery life."
      : S.settings.quality === "med"
        ? "Medium: reduced particles and effects."
        : "High: all effects on — full visual experience.";
    gGfx.appendChild(qNote);

    /* --- SAVE DATA --- */
    const gSave = section("Save Data", "💾");

    const saveBtn = document.createElement("button");
    saveBtn.className = "buy-btn green-btn setting-action";
    saveBtn.textContent = "💾 Save Now";
    saveBtn.onclick = () => { saveGame(); toast("💾 Game saved"); };
    gSave.appendChild(saveBtn);

    const resetBtn = document.createElement("button");
    resetBtn.className = "buy-btn red-btn setting-action";
    resetBtn.textContent = "🗑️ Reset ALL Progress";
    resetBtn.onclick = () => {
      modal({
        icon: "⚠️", title: "Delete everything?",
        bodyHtml: "This wipes your save completely — coins, cores, gems, achievements. There is no undo.",
        actions: [
          { label: "Keep Playing", cls: "green-btn" },
          { label: "DELETE", cls: "red-btn", fn: () => {
              wipeSave();
              closePanel();
              onWallSpawn(); refreshHud();
              FX.rebuildHelpers(); onToolChange();
              applyQuality();
              toast("Save wiped. Fresh start!");
            } },
        ],
      });
    };
    gSave.appendChild(resetBtn);

    const info = document.createElement("div");
    info.className = "setting-hint";
    info.innerHTML = `Autosaves every ${SAVE_INTERVAL}s and when you leave the page.<br>Offline earnings cap: ${fmtTime(7200 + upLvl("offline") * 1800)}.`;
    gSave.appendChild(info);
  }

  /** Apply graphics quality: low disables heavy CSS animations too. */
  function applyQuality() {
    document.body.classList.toggle("q-low", S.settings.quality === "low");
    document.body.classList.toggle("q-med", S.settings.quality === "med");
  }

  /* ---------- generic card builder ---------- */
  function card({ icon, name, tag, desc, effect, btn, cls = "" }) {
    const c = document.createElement("div");
    c.className = "card " + cls;
    c.innerHTML = `
      <div class="card-icon">${icon}</div>
      <div class="card-info">
        <div class="card-name">${name}${tag ? ` <span class="card-lvl">${tag}</span>` : ""}</div>
        ${desc ? `<div class="card-desc">${desc}</div>` : ""}
        ${effect ? `<div class="card-effect">${effect}</div>` : ""}
      </div>`;
    if (btn) {
      const b = document.createElement("button");
      b.className = "buy-btn " + (btn.cls || "");
      b.disabled = !!btn.disabled;
      b.innerHTML = btn.label + (btn.cost ? `<span class="buy-cost">${btn.cost}</span>` : "");
      if (btn.fn) b.onclick = (e) => { e.stopPropagation(); btn.fn(); };
      c.appendChild(b);
    }
    return c;
  }

  /* =============== DAILY CHEST =============== */
  function openDaily() {
    if (dailyReady()) {
      const r = claimDaily();
      modal({
        icon: "🎁", title: "Daily Chest!",
        bodyHtml: `You cracked it open and found:<div class="reward-line">🪙 ${fmt(r.coins)} &nbsp; 💎 ${r.gems}</div>`,
        actions: [{ label: "Sweet!", cls: "gold-btn", fn: () => { refreshHud(); } }],
      });
      AudioSys.play("ach");
      saveGame();
    } else {
      const left = DAILY_COOLDOWN - (Date.now() - S.lastDaily);
      modal({
        icon: "⏳", title: "Chest recharging",
        bodyHtml: `Come back in <b>${fmtTime(left / 1000)}</b> for your next daily chest.`,
        actions: [{ label: "OK" }],
      });
    }
  }

  /* =============== OFFLINE MODAL =============== */
  function showOffline(off) {
    modal({
      icon: "🌙", title: "Welcome back!",
      bodyHtml: `Your helpers kept smashing for <b>${fmtTime(off.seconds)}</b> and broke <b>${fmt(off.walls)}</b> walls.` +
        `<div class="reward-line">+${fmt(off.coins)} 🪙</div>`,
      actions: [{ label: "Collect", cls: "gold-btn", fn: () => { addCoins(off.coins); refreshHud(); AudioSys.play("coin"); saveGame(); } }],
    });
  }

  return {
    refreshHud, refreshHp, refreshPips, applyWorldSkin,
    onWallSpawn, onWallBreak, onWorldChange, onToolChange, onHelpersChange,
    onPlayerHit, onAutoDamage, uiTick, panelTick,
    toast, modal, closeModal, markAwardsDot,
    openTab, closePanel, openDaily, showOffline,
    floatText, centerOfWall, applyQuality,
  };
})();
