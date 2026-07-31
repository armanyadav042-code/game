/* =====================================================================
   fx.js — particles, procedural cracks, screen shake, helper orbits.
   All canvas work is delta-timed and pooled for smooth performance.
   ===================================================================== */
"use strict";

const FX = (() => {
  /* ---------- FX canvas (particles) ---------- */
  const canvas = $("#fx-canvas");
  const ctx = canvas.getContext("2d");
  let W = 0, H = 0, dpr = 1;

  const MAX_PARTICLES = 260;
  const parts = [];           // active particle objects

  function resize() {
    const r = canvas.parentElement.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = r.width; H = r.height;
    canvas.width = Math.floor(W * dpr);
    canvas.height = Math.floor(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  /** Spawn debris chunks flying out of a point (in main-area coords). */
  function burst(x, y, colors, count, power = 1) {
    if (!S.settings.particles) count = Math.floor(count / 3);
    for (let i = 0; i < count; i++) {
      if (parts.length >= MAX_PARTICLES) parts.shift();
      const ang = rand(0, Math.PI * 2);
      const spd = rand(90, 380) * power;
      parts.push({
        x, y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd - rand(60, 160) * power,
        size: rand(3, 8) * (power > 1.4 ? 1.5 : 1),
        rot: rand(0, Math.PI * 2),
        vr: rand(-8, 8),
        life: rand(0.45, 0.95),
        t: 0,
        color: choose(colors),
        shape: Math.random() < 0.7 ? "rect" : "tri",
      });
    }
  }

  /** Spark ring for crits. */
  function sparkRing(x, y, color = "#ffcf40") {
    for (let i = 0; i < 14; i++) {
      if (parts.length >= MAX_PARTICLES) parts.shift();
      const ang = (i / 14) * Math.PI * 2;
      parts.push({
        x, y,
        vx: Math.cos(ang) * 320, vy: Math.sin(ang) * 320,
        size: rand(2, 4), rot: 0, vr: 0,
        life: 0.35, t: 0, color, shape: "spark",
      });
    }
  }

  function update(dt) {
    ctx.clearRect(0, 0, W, H);
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.t += dt;
      if (p.t >= p.life) { parts.splice(i, 1); continue; }
      p.vy += 900 * dt;               // gravity
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.vr * dt;
      const a = 1 - p.t / p.life;
      ctx.globalAlpha = a;
      ctx.fillStyle = p.color;
      if (p.shape === "spark") {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * a + 0.5, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        if (p.shape === "tri") {
          ctx.beginPath();
          ctx.moveTo(0, -p.size);
          ctx.lineTo(p.size, p.size);
          ctx.lineTo(-p.size, p.size);
          ctx.closePath();
          ctx.fill();
        } else {
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.8);
        }
        ctx.restore();
      }
    }
    ctx.globalAlpha = 1;
    updateShake(dt);
    updateHelpers(dt);
  }

  /* ---------- Screen shake ---------- */
  const shakeEl = $("#shake-layer");
  let shakeAmt = 0;
  function shake(amount) {
    if (!S.settings.shake) return;
    shakeAmt = Math.min(18, shakeAmt + amount);
  }
  function updateShake(dt) {
    if (shakeAmt <= 0.2) {
      if (shakeAmt !== 0) { shakeAmt = 0; shakeEl.style.transform = ""; }
      return;
    }
    shakeAmt *= Math.pow(0.0005, dt); // fast decay
    shakeEl.style.transform = `translate(${rand(-shakeAmt, shakeAmt)}px, ${rand(-shakeAmt, shakeAmt)}px)`;
  }

  /* ---------- Procedural cracks on the wall ---------- */
  const crackCanvas = $("#crack-canvas");
  const cctx = crackCanvas.getContext("2d");
  let crackSeeds = [];     // persisted crack polylines for current wall

  function resizeCrack() {
    const r = crackCanvas.getBoundingClientRect();
    crackCanvas.width = Math.floor(r.width * dpr);
    crackCanvas.height = Math.floor(r.height * dpr);
    cctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    redrawCracks();
  }

  /** Generate a jagged crack polyline from a start point. */
  function makeCrack(sx, sy) {
    const pts = [{ x: sx, y: sy }];
    let ang = rand(0, Math.PI * 2);
    const segs = randi(4, 8);
    let x = sx, y = sy;
    for (let i = 0; i < segs; i++) {
      ang += rand(-0.9, 0.9);
      const len = rand(10, 34);
      x += Math.cos(ang) * len;
      y += Math.sin(ang) * len;
      pts.push({ x, y });
    }
    return pts;
  }

  /** Sync visible cracking with wall HP ratio (0..1 damage taken). */
  function setCrackLevel(dmgRatio) {
    const want = Math.floor(dmgRatio * 26);      // up to 26 cracks
    const r = crackCanvas.getBoundingClientRect();
    while (crackSeeds.length < want) {
      crackSeeds.push(makeCrack(rand(r.width * 0.12, r.width * 0.88), rand(r.height * 0.12, r.height * 0.88)));
    }
    redrawCracks();
  }
  function clearCracks() { crackSeeds = []; redrawCracks(); }

  function redrawCracks() {
    const r = crackCanvas.getBoundingClientRect();
    cctx.clearRect(0, 0, r.width, r.height);
    const col = WORLDS[S.world].crack;
    cctx.lineCap = "round";
    for (const pts of crackSeeds) {
      // dark core line
      cctx.strokeStyle = col;
      cctx.lineWidth = 2.4;
      cctx.globalAlpha = 0.9;
      strokePath(pts);
      // light edge highlight
      cctx.strokeStyle = "rgba(255,255,255,.25)";
      cctx.lineWidth = 1;
      cctx.globalAlpha = 0.6;
      strokePath(pts, 1, 1);
    }
    cctx.globalAlpha = 1;
  }
  function strokePath(pts, ox = 0, oy = 0) {
    cctx.beginPath();
    cctx.moveTo(pts[0].x + ox, pts[0].y + oy);
    for (let i = 1; i < pts.length; i++) cctx.lineTo(pts[i].x + ox, pts[i].y + oy);
    cctx.stroke();
  }

  /* ---------- Helper units orbiting the wall ---------- */
  const ring = $("#helper-ring");
  let helperEls = [];      // { el, angle, radius, speed, wobble }
  let helperT = 0;

  /** Rebuild orbit sprites to reflect owned helpers (max 14 shown). */
  function rebuildHelpers() {
    ring.innerHTML = "";
    helperEls = [];
    const shown = [];
    for (const h of HELPERS) {
      const n = Math.min(S.helpers[h.id] || 0, 4);
      for (let i = 0; i < n && shown.length < 14; i++) shown.push(h.icon);
    }
    shown.forEach((icon, i) => {
      const el = document.createElement("div");
      el.className = "helper-unit";
      el.textContent = icon;
      ring.appendChild(el);
      helperEls.push({
        el,
        angle: (i / shown.length) * Math.PI * 2,
        radius: 0.72 + (i % 3) * 0.13,
        speed: rand(0.5, 0.9) * (i % 2 ? 1 : -1),
        wobble: rand(0, Math.PI * 2),
      });
    });
  }

  function updateHelpers(dt) {
    if (!helperEls.length) return;
    helperT += dt;
    const wall = $("#wall").getBoundingClientRect();
    const zone = ring.getBoundingClientRect();
    const cx = wall.left - zone.left + wall.width / 2;
    const cy = wall.top - zone.top + wall.height / 2;
    const R = wall.width * 0.5;
    for (const h of helperEls) {
      h.angle += h.speed * dt;
      const rr = R * h.radius + Math.sin(helperT * 2 + h.wobble) * 7;
      const x = cx + Math.cos(h.angle) * rr * 1.35;
      const y = cy + Math.sin(h.angle) * rr;
      h.el.style.transform = `translate(${x - 14}px, ${y - 14}px)`;
    }
  }

  /** A helper "zaps" the wall — small flash from a random orbiter. */
  function helperZap() {
    if (!helperEls.length) return;
    const h = choose(helperEls);
    h.el.style.filter = "drop-shadow(0 0 14px #fff) brightness(2)";
    setTimeout(() => { h.el.style.filter = ""; }, 120);
  }

  return { resize, resizeCrack, update, burst, sparkRing, shake, setCrackLevel, clearCracks, rebuildHelpers, helperZap };
})();
