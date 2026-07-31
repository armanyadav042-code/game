/* =====================================================================
   data.js — static game content: worlds, tools, helpers, upgrades,
   achievements, boosts. All balance numbers live here.
   ===================================================================== */
"use strict";

/* ---------------------------------------------------------------
   WORLDS — 8 themed worlds, 10 stages each (stage 10 = boss).
   The final world is endless (stages keep scaling forever).
   --------------------------------------------------------------- */
const WORLDS = [
  {
    id: "wood", name: "Wooden Yard", wallName: "Wooden Wall", icon: "🪵",
    hpMult: 1,
    face: "repeating-linear-gradient(0deg,#7a4a22 0 26px,#5d3417 26px 30px), linear-gradient(180deg,#8a5a2b,#6b3f1d)",
    glow: "rgba(255,170,80,.28)", bg: "radial-gradient(ellipse at 50% 40%, #241505 0%, #0a0a14 75%)",
    debris: ["#8a5a2b", "#a9723a", "#5d3417", "#c98d4f"], crack: "#2b1608",
  },
  {
    id: "stone", name: "Stone Quarry", wallName: "Stone Wall", icon: "🪨",
    hpMult: 22,
    face: "repeating-linear-gradient(0deg,#8d8d99 0 26px,#61616e 26px 30px), repeating-linear-gradient(90deg,transparent 0 44px,#61616e 44px 48px), linear-gradient(180deg,#9a9aa8,#6f6f7d)",
    glow: "rgba(190,190,220,.28)", bg: "radial-gradient(ellipse at 50% 40%, #1b1b24 0%, #0a0a14 75%)",
    debris: ["#8d8d99", "#b3b3c0", "#61616e", "#4c4c58"], crack: "#22222b",
  },
  {
    id: "metal", name: "Steel Foundry", wallName: "Steel Wall", icon: "⚙️",
    hpMult: 480,
    face: "repeating-linear-gradient(45deg,rgba(255,255,255,.07) 0 8px,transparent 8px 16px), repeating-linear-gradient(0deg,#5a6b80 0 34px,#3c4a5c 34px 38px), linear-gradient(180deg,#6e8199,#46556a)",
    glow: "rgba(120,180,255,.3)", bg: "radial-gradient(ellipse at 50% 40%, #101a26 0%, #0a0a14 75%)",
    debris: ["#7f93ab", "#a9bdd4", "#46556a", "#c8d6e8"], crack: "#141c26",
  },
  {
    id: "ice", name: "Frozen Peaks", wallName: "Glacier Wall", icon: "❄️",
    hpMult: 11000,
    face: "repeating-linear-gradient(60deg,rgba(255,255,255,.14) 0 12px,transparent 12px 30px), linear-gradient(180deg,#9fe6ff,#3fa4d8)",
    glow: "rgba(120,225,255,.4)", bg: "radial-gradient(ellipse at 50% 40%, #0a2030 0%, #0a0a14 75%)",
    debris: ["#bdeeff", "#7fd4f5", "#e8fbff", "#54b6e2"], crack: "#0d3a52",
  },
  {
    id: "neon", name: "Neon City", wallName: "Holo Wall", icon: "🌆",
    hpMult: 260000,
    face: "repeating-linear-gradient(0deg,#3b1060 0 24px,#28104a 24px 28px), repeating-linear-gradient(90deg,transparent 0 40px,rgba(255,45,149,.5) 40px 42px), linear-gradient(180deg,#4a1a78,#20093f)",
    glow: "rgba(255,45,149,.45)", bg: "radial-gradient(ellipse at 50% 40%, #1c0a30 0%, #0a0a14 75%)",
    debris: ["#ff2d95", "#00e5ff", "#7b5cff", "#ff9de0"], crack: "#ff2d95",
  },
  {
    id: "lava", name: "Molten Core", wallName: "Obsidian Wall", icon: "🌋",
    hpMult: 6200000,
    face: "repeating-linear-gradient(0deg,#301612 0 26px,#1c0b08 26px 30px), repeating-linear-gradient(90deg,transparent 0 44px,rgba(255,110,30,.55) 44px 47px), linear-gradient(180deg,#3d1b14,#170805)",
    glow: "rgba(255,110,30,.5)", bg: "radial-gradient(ellipse at 50% 40%, #2a0d02 0%, #0a0a14 75%)",
    debris: ["#ff6e1e", "#ffb340", "#8a2205", "#ffd76e"], crack: "#ff5a00",
  },
  {
    id: "crystal", name: "Crystal Caverns", wallName: "Crystal Wall", icon: "💎",
    hpMult: 150000000,
    face: "repeating-linear-gradient(120deg,rgba(255,255,255,.16) 0 10px,transparent 10px 26px), repeating-linear-gradient(60deg,rgba(0,229,255,.2) 0 14px,transparent 14px 34px), linear-gradient(180deg,#8f5cff,#2fb8c9)",
    glow: "rgba(160,110,255,.5)", bg: "radial-gradient(ellipse at 50% 40%, #180a33 0%, #0a0a14 75%)",
    debris: ["#b78cff", "#6ee7ff", "#ff9de0", "#e8dcff"], crack: "#efe6ff",
  },
  {
    id: "void", name: "The Void", wallName: "Void Wall", icon: "👁️", endless: true,
    hpMult: 3800000000,
    face: "repeating-linear-gradient(0deg,#1a1030 0 28px,#0c0618 28px 32px), repeating-linear-gradient(90deg,transparent 0 46px,rgba(123,92,255,.5) 46px 48px), linear-gradient(180deg,#241245,#05020d)",
    glow: "rgba(123,92,255,.55)", bg: "radial-gradient(ellipse at 50% 40%, #120826 0%, #05050a 75%)",
    debris: ["#7b5cff", "#c9a6ff", "#2b1a55", "#ff2d95"], crack: "#c9a6ff",
  },
];

const STAGES_PER_WORLD = 10;           // stage index 0..9, 9 = boss
const STAGE_HP_GROWTH  = 1.42;         // per-stage HP multiplier
const BOSS_HP_MULT     = 7;            // boss walls are beefy
const BOSS_REWARD_MULT = 9;            // ...but pay out big
const BASE_WALL_HP     = 14;
const COIN_PER_HP      = 0.32;         // coins on break ≈ hp * this

/* ---------------------------------------------------------------
   TOOLS — tap-damage multipliers. Bigger, louder, meaner.
   --------------------------------------------------------------- */
const TOOLS = [
  { id: "pickaxe", name: "Rusty Pickaxe",  icon: "⛏️", mult: 1,    cost: 0,    desc: "Old faithful. It chips away." },
  { id: "hammer",  name: "Steel Hammer",   icon: "🔨", mult: 3,    cost: 400,      desc: "A solid whack. 3× tap damage." },
  { id: "drill",   name: "Power Drill",    icon: "🪛", mult: 8,    cost: 6e3,      desc: "Spins through mortar. 8× tap damage." },
  { id: "sledge",  name: "Sledgehammer",   icon: "🛠️", mult: 22,   cost: 9e4,      desc: "Demolition classic. 22× tap damage." },
  { id: "laser",   name: "Laser Cutter",   icon: "🔦", mult: 60,   cost: 1.4e6,    desc: "Slices anything. 60× tap damage." },
  { id: "plasma",  name: "Plasma Blaster", icon: "☄️", mult: 170,  cost: 2.4e7,    desc: "Superheated fury. 170× tap damage." },
  { id: "rocket",  name: "Rocket Launcher",icon: "🚀", mult: 480,  cost: 4.5e8,    desc: "Overkill? Never. 480× tap damage." },
  { id: "nuke",    name: "Nuke Cannon",    icon: "💣", mult: 1400, cost: 1e10,     desc: "The final argument. 1400× tap damage." },
];

/* ---------------------------------------------------------------
   HELPERS — idle DPS units that orbit the wall.
   Cost grows 1.18^owned per unit.
   --------------------------------------------------------------- */
const HELPERS = [
  { id: "drone",   name: "Scout Drone",     icon: "🛸", dps: 1,     cost: 80,    costMult: 1.17, desc: "Pew pew. Chips the wall for you." },
  { id: "ahammer", name: "Auto Hammer",     icon: "🔨", dps: 9,     cost: 1200,  costMult: 1.18, desc: "Swings all day, never unionizes." },
  { id: "bot",     name: "Mini Bot",        icon: "🤖", dps: 62,    cost: 16e3,  costMult: 1.19, desc: "Small bot, big anger issues." },
  { id: "turret",  name: "Laser Turret",    icon: "📡", dps: 430,   cost: 2.2e5, costMult: 1.20, desc: "Continuous beam of destruction." },
  { id: "saw",     name: "Orbital Saw",     icon: "🛰️", dps: 3100,  cost: 3.2e6, costMult: 1.21, desc: "Grinds walls from orbit." },
  { id: "mech",    name: "Demolition Mech", icon: "🦾", dps: 24e3,  cost: 5e7,   costMult: 1.22, desc: "One punch. Many bricks." },
];

/* ---------------------------------------------------------------
   UPGRADES — the core stat ladder.
   effect(lvl) returns the current bonus, effDesc renders it.
   --------------------------------------------------------------- */
const UPGRADES = [
  { id: "power",   name: "Tap Power",      icon: "👊", baseCost: 12,   costMult: 1.28, maxLvl: 0,
    desc: "+30% tap damage per level (compounding).",
    effect: (l) => Math.pow(1.30, l), effDesc: (l) => `×${fmt(Math.pow(1.30, l))} tap damage` },
  { id: "autocore",name: "Auto Core",      icon: "⚡", baseCost: 60,   costMult: 1.45, maxLvl: 0,
    desc: "Each level adds auto damage equal to 25% of your tap damage per second.",
    effect: (l) => 0.25 * l, effDesc: (l) => `+${Math.round(l * 25)}% of tap dmg as DPS` },
  { id: "critch",  name: "Crit Chance",    icon: "🎯", baseCost: 150,  costMult: 1.55, maxLvl: 30,
    desc: "+1.5% chance to land a critical hit. Base 3%.",
    effect: (l) => 0.03 + 0.015 * l, effDesc: (l) => `${Math.round((0.03 + 0.015 * l) * 100)}% crit chance` },
  { id: "critdmg", name: "Crit Damage",    icon: "💥", baseCost: 220,  costMult: 1.50, maxLvl: 0,
    desc: "+30% critical hit damage. Base 3×.",
    effect: (l) => 3 + 0.3 * l, effDesc: (l) => `×${(3 + 0.3 * l).toFixed(1)} crit damage` },
  { id: "speed",   name: "Attack Speed",   icon: "🌀", baseCost: 300,  costMult: 1.7,  maxLvl: 20,
    desc: "+6% hold-attack speed. Base 3.5 hits/sec.",
    effect: (l) => 3.5 * Math.pow(1.06, l), effDesc: (l) => `${(3.5 * Math.pow(1.06, l)).toFixed(1)} hits/sec` },
  { id: "coins",   name: "Coin Magnet",    icon: "🪙", baseCost: 200,  costMult: 1.5,  maxLvl: 0,
    desc: "+12% coins from every broken wall.",
    effect: (l) => Math.pow(1.12, l), effDesc: (l) => `×${fmt(Math.pow(1.12, l))} coins` },
  { id: "helper",  name: "Helper Rally",   icon: "🤖", baseCost: 500,  costMult: 1.5,  maxLvl: 0,
    desc: "+20% helper damage per level.",
    effect: (l) => Math.pow(1.20, l), effDesc: (l) => `×${fmt(Math.pow(1.20, l))} helper DPS` },
  { id: "breaker", name: "Break Bonus",    icon: "🧨", baseCost: 800,  costMult: 1.65, maxLvl: 25,
    desc: "+15% bonus coins when a wall shatters.",
    effect: (l) => 1 + 0.15 * l, effDesc: (l) => `×${(1 + 0.15 * l).toFixed(2)} break payout` },
  { id: "offline", name: "Dream Crew",     icon: "🌙", baseCost: 1000, costMult: 1.9,  maxLvl: 15,
    desc: "+8% offline earnings and +30 min offline cap. Base 25%, 2h cap.",
    effect: (l) => 0.25 + 0.08 * l, effDesc: (l) => `${Math.round((0.25 + 0.08 * l) * 100)}% rate · ${fmtTime(7200 + l * 1800)} cap` },
];

/* ---------------------------------------------------------------
   GEM BOOSTS — temporary power-ups bought with gems.
   --------------------------------------------------------------- */
const BOOSTS = [
  { id: "frenzy",  name: "Damage Frenzy", icon: "🔥", cost: 8,  dur: 45, desc: "×3 ALL damage for 45 seconds." },
  { id: "goldrush",name: "Gold Rush",     icon: "🤑", cost: 8,  dur: 60, desc: "×3 coins for 60 seconds." },
  { id: "overdrive",name:"Overdrive",     icon: "⚡", cost: 20, dur: 60, desc: "×5 ALL damage AND coins for 60 seconds." },
];

/* ---------------------------------------------------------------
   PRESTIGE
   --------------------------------------------------------------- */
const PRESTIGE_MIN_COINS = 5e5;                 // lifetime coins this run to unlock
const PRESTIGE_CORE_BONUS = 0.05;               // +5% dmg & coins per core
const coresForRun = (coins) => Math.floor(Math.pow(coins / PRESTIGE_MIN_COINS, 0.5));

/* ---------------------------------------------------------------
   ACHIEVEMENTS — metric keys read from S.stats
   --------------------------------------------------------------- */
const ACHIEVEMENTS = [
  { id: "walls1",   name: "First Blood",      icon: "🧱", metric: "wallsBroken",  target: 10,   gems: 5,  desc: "Break 10 walls" },
  { id: "walls2",   name: "Demolition Crew",  icon: "🧱", metric: "wallsBroken",  target: 100,  gems: 10, desc: "Break 100 walls" },
  { id: "walls3",   name: "Nothing Left",     icon: "🧱", metric: "wallsBroken",  target: 1000, gems: 25, desc: "Break 1,000 walls" },
  { id: "taps1",    name: "Knuckle Up",       icon: "👊", metric: "taps",         target: 500,  gems: 5,  desc: "Tap 500 times" },
  { id: "taps2",    name: "Carpal Champion",  icon: "👊", metric: "taps",         target: 5000, gems: 15, desc: "Tap 5,000 times" },
  { id: "coins1",   name: "Pocket Money",     icon: "🪙", metric: "lifetimeCoins",target: 1e4,  gems: 5,  desc: "Earn 10K coins (lifetime)" },
  { id: "coins2",   name: "Millionaire",      icon: "💰", metric: "lifetimeCoins",target: 1e6,  gems: 15, desc: "Earn 1M coins (lifetime)" },
  { id: "coins3",   name: "Billionaire",      icon: "🏦", metric: "lifetimeCoins",target: 1e9,  gems: 40, desc: "Earn 1B coins (lifetime)" },
  { id: "crit1",    name: "Lucky Strike",     icon: "🎯", metric: "crits",        target: 50,   gems: 5,  desc: "Land 50 critical hits" },
  { id: "crit2",    name: "Critical Mass",    icon: "🎯", metric: "crits",        target: 1000, gems: 15, desc: "Land 1,000 critical hits" },
  { id: "upg1",     name: "Handy Shopper",    icon: "⬆️", metric: "upgradesBought",target: 20,  gems: 10, desc: "Buy 20 upgrade levels" },
  { id: "upg2",     name: "Min-Maxer",        icon: "⬆️", metric: "upgradesBought",target: 100, gems: 25, desc: "Buy 100 upgrade levels" },
  { id: "tool1",    name: "New Toy",          icon: "🔨", metric: "toolsOwned",   target: 2,    gems: 5,  desc: "Own 2 tools" },
  { id: "tool2",    name: "Full Arsenal",     icon: "💣", metric: "toolsOwned",   target: 8,    gems: 50, desc: "Unlock every tool" },
  { id: "help1",    name: "Team Player",      icon: "🤖", metric: "helpersOwned", target: 10,   gems: 10, desc: "Hire 10 helpers" },
  { id: "help2",    name: "Robot Army",       icon: "🦾", metric: "helpersOwned", target: 100,  gems: 30, desc: "Hire 100 helpers" },
  { id: "world1",   name: "Tourist",          icon: "🌍", metric: "worldsUnlocked",target: 3,   gems: 10, desc: "Reach world 3" },
  { id: "world2",   name: "World Eater",      icon: "🌍", metric: "worldsUnlocked",target: 8,   gems: 50, desc: "Reach the final world" },
  { id: "boss1",    name: "Boss Basher",      icon: "💀", metric: "bossKills",    target: 5,    gems: 15, desc: "Destroy 5 boss walls" },
  { id: "prest1",   name: "Born Again",       icon: "🔮", metric: "prestiges",    target: 1,    gems: 25, desc: "Prestige once" },
  { id: "prest2",   name: "Eternal Return",   icon: "🔮", metric: "prestiges",    target: 5,    gems: 60, desc: "Prestige 5 times" },
  { id: "daily1",   name: "Regular",          icon: "🎁", metric: "dailyClaims",  target: 3,    gems: 20, desc: "Claim 3 daily chests" },
];
