/* =====================================================================
   utils.js — helpers: number formatting, math, DOM shortcuts
   ===================================================================== */
"use strict";

const $  = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

/** Random float in [a, b) */
const rand = (a, b) => a + Math.random() * (b - a);
/** Random int in [a, b] inclusive */
const randi = (a, b) => Math.floor(rand(a, b + 1));
/** Pick a random element of an array */
const choose = (arr) => arr[Math.floor(Math.random() * arr.length)];
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const lerp = (a, b, t) => a + (b - a) * t;

/** Suffixes for big-number formatting */
const NUM_SUFFIX = ["", "K", "M", "B", "T", "Qa", "Qi", "Sx", "Sp", "Oc", "No", "Dc", "UDc", "DDc"];

/**
 * Format a number in idle-game style: 12.3K, 4.56M, 1.02B ...
 */
function fmt(n) {
  if (!isFinite(n)) return "∞";
  if (n < 0) return "-" + fmt(-n);
  if (n < 1000) return n < 100 && n % 1 !== 0 ? n.toFixed(1) : Math.floor(n).toString();
  let tier = Math.floor(Math.log10(n) / 3);
  tier = Math.min(tier, NUM_SUFFIX.length - 1);
  const scaled = n / Math.pow(10, tier * 3);
  const digits = scaled >= 100 ? 0 : scaled >= 10 ? 1 : 2;
  return scaled.toFixed(digits) + NUM_SUFFIX[tier];
}

/** Format seconds as "1h 23m" / "4m 05s" */
function fmtTime(sec) {
  sec = Math.max(0, Math.floor(sec));
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${String(s).padStart(2, "0")}s`;
  return `${s}s`;
}

/** Format a percentage like +25% */
const fmtPct = (v) => (v >= 0 ? "+" : "") + Math.round(v * 100) + "%";

/** Sum of a geometric series: base * mult^start + ... (count terms) */
function geomSum(base, mult, start, count) {
  if (mult === 1) return base * count;
  return base * Math.pow(mult, start) * (Math.pow(mult, count) - 1) / (mult - 1);
}

/** Max affordable count of a geometric-cost item given budget */
function geomMaxAffordable(base, mult, start, budget) {
  let n = 0, cost = base * Math.pow(mult, start);
  while (budget >= cost && n < 10000) { budget -= cost; cost *= mult; n++; }
  return n;
}
