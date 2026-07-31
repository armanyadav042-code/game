/* =====================================================================
   game.js — core state, economy, damage, progression, prestige,
   offline earnings, daily chest, achievements, save/load.
   ===================================================================== */
"use strict";

const SAVE_KEY = "idle-wall-destroyer-save-v1";
const SAVE_INTERVAL = 10;           // seconds between autosaves
const DAILY_COOLDOWN = 20 * 3600e3; // 20h between daily chests

/* ---------------- default state ---------------- */
function defaultState() {
  return {
    coins: 0,
    gems: 0,
    cores: 0,                 // prestige currency
    runCoins: 0,              // lifetime coins THIS run (prestige calc)

    world: 0,                 // current world index
    stage: 0,                 // current stage in world (0-based)
    bestWorld: 0,             // furthest world reached
    bestStage: 0,             // furthest stage in bestWorld
    wallHp: 0,                // current wall HP (0 = needs spawn)
    wallMaxHp: 1,

    tool: 0,                                        // equipped tool index
    toolsOwned: TOOLS.map((_, i) => i === 0),       // ownership flags
    upgrades: {},                                   // id -> level
    helpers: {},                                    // id -> count

    boosts: {},               // id -> seconds remaining
    lastDaily: 0,             // timestamp of last daily claim
    lastSeen: Date.now(),     // for offline earnings

    achDone: {},              // id -> true when claimed/awarded

    settings: { sfx: true, music: true, particles: true, shake: true, quality: "high" },

    stats: {
      taps: 0, crits: 0, wallsBroken: 0, bossKills: 0,
      lifetimeCoins: 0, upgradesBought: 0, prestiges: 0, dailyClaims: 0,
      toolsOwned: 1, helpersOwned: 0, worldsUnlocked: 1,
    },
  };
}

let S = defaultState();

/* ================= SAVE / LOAD ================= */
function saveGame() {
  try {
    S.lastSeen = Date.now();
    localStorage.setItem(SAVE_KEY, JSON.stringify(S));
  } catch (e) { /* storage blocked — play on without saving */ }
}

function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;
    const data = JSON.parse(raw);
    const base = defaultState();
    // shallow merge with nested merges so new fields survive old saves
    S = { ...base, ...data };
    S.settings = { ...base.settings, ...(data.settings || {}) };
    S.stats = { ...base.stats, ...(data.stats || {}) };
    S.upgrades = data.upgrades || {};
    S.helpers = data.helpers || {};
    S.boosts = data.boosts || {};
    S.achDone = data.achDone || {};
    // tool ownership array may be shorter than TOOLS after an update
    S.toolsOwned = TOOLS.map((_, i) => (data.toolsOwned && data.toolsOwned[i]) || i === 0);
    return true;
  } catch (e) { return false; }
}

function wipeSave() {
  try { localStorage.removeItem(SAVE_KEY); } catch (e) {}
  S = defaultState();
  spawnWall(true);
}

/* ================= DERIVED STATS ================= */
const upLvl = (id) => S.upgrades[id] || 0;
const upEff = (id) => UPGRADES.find((u) => u.id === id).effect(upLvl(id));

/** Global multiplier from prestige cores + timed boosts (damage). */
function damageBoostMult() {
  let m = 1 + S.cores * PRESTIGE_CORE_BONUS;
  if (S.boosts.frenzy > 0) m *= 3;
  if (S.boosts.overdrive > 0) m *= 5;
  return m;
}
/** Global coin multiplier from prestige + boosts. */
function coinBoostMult() {
  let m = 1 + S.cores * PRESTIGE_CORE_BONUS;
  if (S.boosts.goldrush > 0) m *= 3;
  if (S.boosts.overdrive > 0) m *= 5;
  return m;
}

/** Damage of one tap (before crit roll). */
function tapDamage() {
  return 1 * TOOLS[S.tool].mult * upEff("power") * damageBoostMult();
}

/** Total idle damage per second: helpers (boosted) + Auto Core (25% of tap dmg per level). */
function totalDps() {
  let helperDps = 0;
  for (const h of HELPERS) helperDps += (S.helpers[h.id] || 0) * h.dps;
  helperDps *= upEff("helper") * damageBoostMult();
  const coreDps = tapDamage() * upEff("autocore");
  return helperDps + coreDps;
}

const critChance = () => Math.min(0.8, upEff("critch"));
const critMult   = () => upEff("critdmg");
const holdRate   = () => upEff("speed");                 // hits per second while holding

/* ================= WALL / PROGRESSION ================= */
function isBossStage() { return S.stage === STAGES_PER_WORLD - 1; }

/** HP for the wall at (world, stage). Endless final world keeps scaling. */
function wallHpFor(world, stage) {
  const w = WORLDS[world];
  let hp = BASE_WALL_HP * w.hpMult * Math.pow(STAGE_HP_GROWTH, stage);
  if ((stage % STAGES_PER_WORLD) === STAGES_PER_WORLD - 1) hp *= BOSS_HP_MULT;
  return Math.ceil(hp);
}

/** Coin reward for breaking the wall at (world, stage). */
function wallRewardFor(world, stage) {
  let r = wallHpFor(world, stage) * COIN_PER_HP;
  // boss HP already includes BOSS_HP_MULT; top payout up to BOSS_REWARD_MULT total
  if ((stage % STAGES_PER_WORLD) === STAGES_PER_WORLD - 1) r *= BOSS_REWARD_MULT / BOSS_HP_MULT;
  r *= upEff("coins") * upEff("breaker") * coinBoostMult();
  return Math.ceil(r);
}

/** Spawn/reset the current wall. */
function spawnWall(silent = false) {
  S.wallMaxHp = wallHpFor(S.world, S.stage);
  S.wallHp = S.wallMaxHp;
  if (!silent) {
    UI.onWallSpawn();
    if (isBossStageIdx(S.stage)) AudioSys.play("boss");
  }
}
function isBossStageIdx(stage) { return (stage % STAGES_PER_WORLD) === STAGES_PER_WORLD - 1; }

/** Apply damage to the wall; returns actual damage dealt. */
function damageWall(amount, opts = {}) {
  if (S.wallHp <= 0) return 0;
  const dealt = Math.min(S.wallHp, amount);
  S.wallHp -= dealt;
  if (S.wallHp <= 0.0001) {
    S.wallHp = 0;
    onWallBroken();
  }
  return dealt;
}

/** Wall destroyed: pay out and advance. */
function onWallBroken() {
  const reward = wallRewardFor(S.world, S.stage);
  addCoins(reward);
  S.stats.wallsBroken++;
  const wasBoss = isBossStageIdx(S.stage);
  if (wasBoss) {
    S.stats.bossKills++;
    // bosses drop a couple of gems
    S.gems += randi(1, 3);
  }

  UI.onWallBreak(reward, wasBoss);
  AudioSys.play("break");

  // advance stage / world
  const w = WORLDS[S.world];
  if (w.endless) {
    S.stage++;
  } else if (S.stage + 1 >= STAGES_PER_WORLD) {
    if (S.world + 1 < WORLDS.length) {
      S.world++;
      S.stage = 0;
      S.stats.worldsUnlocked = Math.max(S.stats.worldsUnlocked, S.world + 1);
      UI.onWorldChange(true);
    } else {
      S.stage = 0; // shouldn't happen (last world is endless) but be safe
    }
  } else {
    S.stage++;
  }
  // record best progress
  if (S.world > S.bestWorld || (S.world === S.bestWorld && S.stage > S.bestStage)) {
    S.bestWorld = S.world; S.bestStage = S.stage;
  }

  // respawn after the break animation
  setTimeout(() => { spawnWall(); }, 480);
  checkAchievements();
}

/** Manual stage navigation (farm earlier stages if stuck). */
function goStage(dir) {
  const canPrev = S.stage > 0 || S.world > 0;
  const atBest = S.world === S.bestWorld && S.stage === S.bestStage;
  if (dir < 0 && canPrev) {
    if (S.stage === 0) { S.world--; S.stage = STAGES_PER_WORLD - 1; }
    else S.stage--;
  } else if (dir > 0 && !atBest) {
    if (!WORLDS[S.world].endless && S.stage === STAGES_PER_WORLD - 1) { S.world++; S.stage = 0; }
    else S.stage++;
  } else return;
  spawnWall();
  UI.onWorldChange(false);
  AudioSys.play("ui");
}

/** Jump straight to a previously reached world. */
function goWorld(idx) {
  if (idx > S.bestWorld || idx === S.world) return;
  S.world = idx;
  S.stage = idx === S.bestWorld ? Math.min(S.bestStage, STAGES_PER_WORLD - 1) : 0;
  spawnWall();
  UI.onWorldChange(false);
  AudioSys.play("ui");
}

/* ================= CURRENCY ================= */
function addCoins(n) {
  S.coins += n;
  S.runCoins += n;
  S.stats.lifetimeCoins += n;
}
function spendCoins(n) {
  if (S.coins < n) return false;
  S.coins -= n;
  return true;
}

/* ================= PLAYER ACTIONS ================= */
/** One tap / hold-tick attack. Returns {dmg, crit} or null if wall down. */
function playerHit() {
  if (S.wallHp <= 0) return null;
  S.stats.taps++;
  const crit = Math.random() < critChance();
  let dmg = tapDamage();
  if (crit) { dmg *= critMult(); S.stats.crits++; }
  damageWall(dmg);
  return { dmg, crit };
}

/* ---- purchases ---- */
function upgradeCost(u, lvl) { return Math.ceil(u.baseCost * Math.pow(u.costMult, lvl)); }

function buyUpgrade(id, count = 1) {
  const u = UPGRADES.find((x) => x.id === id);
  let lvl = upLvl(id), bought = 0;
  for (let i = 0; i < count; i++) {
    if (u.maxLvl && lvl >= u.maxLvl) break;
    const c = upgradeCost(u, lvl);
    if (!spendCoins(c)) break;
    lvl++; bought++;
  }
  if (!bought) { AudioSys.play("deny"); return false; }
  S.upgrades[id] = lvl;
  S.stats.upgradesBought += bought;
  AudioSys.play("buy");
  checkAchievements();
  return true;
}

function maxAffordableUpgrades(u) {
  const lvl = upLvl(u.id);
  let n = geomMaxAffordable(u.baseCost, u.costMult, lvl, S.coins);
  if (u.maxLvl) n = Math.min(n, u.maxLvl - lvl);
  return n;
}

function buyTool(idx) {
  const t = TOOLS[idx];
  if (S.toolsOwned[idx]) { equipTool(idx); return true; }
  if (!spendCoins(t.cost)) { AudioSys.play("deny"); return false; }
  S.toolsOwned[idx] = true;
  S.stats.toolsOwned = S.toolsOwned.filter(Boolean).length;
  equipTool(idx);
  AudioSys.play("buy");
  UI.toast(`${t.icon} ${t.name} unlocked!`);
  checkAchievements();
  return true;
}
function equipTool(idx) {
  if (!S.toolsOwned[idx]) return;
  S.tool = idx;
  UI.onToolChange();
}

function helperCost(h) {
  return Math.ceil(h.cost * Math.pow(h.costMult, S.helpers[h.id] || 0));
}
function buyHelper(id, count = 1) {
  const h = HELPERS.find((x) => x.id === id);
  let owned = S.helpers[h.id] || 0, bought = 0;
  for (let i = 0; i < count; i++) {
    const c = Math.ceil(h.cost * Math.pow(h.costMult, owned));
    if (!spendCoins(c)) break;
    owned++; bought++;
  }
  if (!bought) { AudioSys.play("deny"); return false; }
  S.helpers[h.id] = owned;
  S.stats.helpersOwned = Object.values(S.helpers).reduce((a, b) => a + b, 0);
  AudioSys.play("buy");
  UI.onHelpersChange();
  checkAchievements();
  return true;
}

function buyBoost(id) {
  const b = BOOSTS.find((x) => x.id === id);
  if (S.gems < b.cost) { AudioSys.play("deny"); return false; }
  S.gems -= b.cost;
  S.boosts[id] = (S.boosts[id] > 0 ? S.boosts[id] : 0) + b.dur;
  AudioSys.play("buy");
  UI.toast(`${b.icon} ${b.name} active!`, "gold");
  return true;
}

/* ================= PRESTIGE ================= */
function prestigeCoresAvailable() {
  return S.runCoins >= PRESTIGE_MIN_COINS ? coresForRun(S.runCoins) : 0;
}

function doPrestige() {
  const gain = prestigeCoresAvailable();
  if (gain <= 0) return false;
  const keep = {
    gems: S.gems,
    cores: S.cores + gain,
    lastDaily: S.lastDaily,
    achDone: S.achDone,
    settings: S.settings,
    stats: S.stats,
  };
  S = defaultState();
  Object.assign(S, keep);
  S.stats.prestiges++;
  spawnWall(true);
  AudioSys.play("prestige");
  checkAchievements();
  saveGame();
  return true;
}

/* ================= OFFLINE EARNINGS ================= */
/**
 * Estimate coins earned while away: idle DPS chews through current-stage
 * walls at the offline efficiency rate, capped by Dream Crew.
 */
function computeOffline() {
  const now = Date.now();
  const away = Math.max(0, (now - (S.lastSeen || now)) / 1000);
  if (away < 60) return null; // ignore short absences
  const capSec = 7200 + upLvl("offline") * 1800;
  const t = Math.min(away, capSec);
  const dps = totalDps();
  if (dps <= 0) return null;
  const hp = wallHpFor(S.world, S.stage);
  const rewardPerWall = wallRewardFor(S.world, S.stage);
  const walls = Math.floor((dps * t) / hp);
  if (walls <= 0) return null;
  const coins = Math.floor(walls * rewardPerWall * upEff("offline"));
  return { coins, walls, seconds: t };
}

/* ================= DAILY CHEST ================= */
function dailyReady() { return Date.now() - S.lastDaily >= DAILY_COOLDOWN; }

function claimDaily() {
  if (!dailyReady()) return null;
  S.lastDaily = Date.now();
  S.stats.dailyClaims++;
  // reward scales with current wall value so it always feels relevant
  const coins = Math.ceil(wallRewardFor(S.world, S.stage) * randi(8, 15));
  const gems = randi(3, 8);
  addCoins(coins);
  S.gems += gems;
  checkAchievements();
  return { coins, gems };
}

/* ================= ACHIEVEMENTS ================= */
function checkAchievements() {
  for (const a of ACHIEVEMENTS) {
    if (S.achDone[a.id]) continue;
    if ((S.stats[a.metric] || 0) >= a.target) {
      S.achDone[a.id] = true;
      S.gems += a.gems;
      AudioSys.play("ach");
      UI.toast(`🏆 ${a.name} — +${a.gems} 💎`, "gold");
      UI.markAwardsDot();
    }
  }
}

/* ================= TICK ================= */
let autoCarry = 0;   // fractional auto damage carried between frames
let saveTimer = 0;

/** Advance simulation by dt seconds. */
function gameTick(dt) {
  // timed boosts
  for (const k of Object.keys(S.boosts)) {
    if (S.boosts[k] > 0) {
      S.boosts[k] -= dt;
      if (S.boosts[k] <= 0) {
        delete S.boosts[k];
        UI.toast(`${BOOSTS.find((b) => b.id === k).icon} boost expired`);
      }
    }
  }

  // idle damage
  const dps = totalDps();
  if (dps > 0 && S.wallHp > 0) {
    autoCarry += dps * dt;
    if (autoCarry >= Math.max(1, S.wallMaxHp * 0.002)) {
      const dealt = damageWall(autoCarry);
      if (dealt > 0) UI.onAutoDamage(dealt);
      autoCarry = 0;
    }
  }

  // autosave
  saveTimer += dt;
  if (saveTimer >= SAVE_INTERVAL) { saveTimer = 0; saveGame(); }
}
