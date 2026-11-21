// config.js — Caldera Bay: Vice Tide. All tuning constants for the game in one place.
// The city is a tile-free continuous world measured in pixels. Roads sit on a regular
// grid; districts are rectangular regions laid over that grid; the sea borders the
// south edge and a causeway crosses the bay in the south-east.

export const VIEW_W = 1280;
export const VIEW_H = 720;
export const WORLD_W = 5200;
export const WORLD_H = 3600;

export const BLOCK = 340;          // distance between road centrelines
export const ROAD_W = 92;          // asphalt width
export const SIDEWALK = 16;        // pavement band around each block
export const SEA_Y = 3020;         // waterline: south of this is beach then sea
export const BEACH_Y = 2920;       // sand starts here

export const PLAYER_FOOT_SPEED = 178;
export const PLAYER_RUN_SPEED = 252;
export const PLAYER_RADIUS = 13;

export const DAY_LENGTH_SECONDS = 420;   // one full day cycle
export const GOLDEN_HOUR = 0.74;         // dayT value used for screenshots

export const WANTED_MAX = 5;
export const BUSTED_RANGE = 64;
export const BUSTED_FILL_SECONDS = 2.4;
export const HIDE_DECAY_SECONDS = 9;

export const DISTRICTS = [
  { id: 'marina',    name: 'Marina Vieja',    x: 120,  y: 2380, w: 1180, h: 520,  tint: '#3f7f8c' },
  { id: 'mercado',   name: 'Mercado Alto',    x: 120,  y: 1560, w: 1180, h: 760,  tint: '#b06a3b' },
  { id: 'palmera',   name: 'Palmera Heights', x: 1420, y: 1560, w: 1180, h: 760,  tint: '#7d9b57' },
  { id: 'centro',    name: 'Centro Coral',    x: 1420, y: 720,  w: 1180, h: 760,  tint: '#a04a5e' },
  { id: 'portazul',  name: 'Port Azul',       x: 2720, y: 1560, w: 1180, h: 1340, tint: '#4a6fa5' },
  { id: 'bahia',     name: 'Bahia Norte',     x: 2720, y: 240,  w: 1180, h: 1240, tint: '#8c7a3f' },
  { id: 'coralstrip',name: 'The Coral Strip', x: 120,  y: 720,  w: 1180, h: 760,  tint: '#c2557a' },
  { id: 'salinas',   name: 'Las Salinas',     x: 4020, y: 240,  w: 1060, h: 1660, tint: '#9b8a5a' },
  { id: 'faro',      name: 'Faro Point',      x: 4020, y: 1960, w: 1060, h: 940,  tint: '#5e8c6a' },
];

export const RESPECT_RANKS = [
  { rank: 0, name: 'Nobody',        need: 0 },
  { rank: 1, name: 'Runner',        need: 60 },
  { rank: 2, name: 'Wheelman',      need: 160 },
  { rank: 3, name: 'Fixer\u2019s Hand', need: 300 },
  { rank: 4, name: 'Made Name',     need: 480 },
  { rank: 5, name: 'Golden Hour King', need: 700 },
];

export const WEAPONS = [
  { id: 'fists',   name: 'Fists',   range: 46,  damage: 14, spread: 0.02, rate: 0.34, speed: 0,    ammoType: null,     pellets: 1, kick: 0 },
  { id: 'pistol',  name: 'Pistol',  range: 460, damage: 22, spread: 0.03, rate: 0.26, speed: 920,  ammoType: 'pistol', pellets: 1, kick: 2 },
  { id: 'smg',     name: 'SMG',     range: 400, damage: 13, spread: 0.09, rate: 0.085, speed: 980, ammoType: 'smg',    pellets: 1, kick: 1 },
  { id: 'shotgun', name: 'Shotgun', range: 300, damage: 11, spread: 0.16, rate: 0.78, speed: 840,  ammoType: 'shells', pellets: 6, kick: 6 },
  { id: 'rifle',   name: 'Rifle',   range: 680, damage: 34, spread: 0.012, rate: 0.42, speed: 1240, ammoType: 'rifle', pellets: 1, kick: 4 },
];

export const CAR_MODELS = [
  { name: 'Brisa Coupe',    w: 46, h: 22, top: 330, accel: 300, grip: 3.4, colors: ['#d94f3d', '#e8a13a', '#3d7bd9'] },
  { name: 'Salina Sedan',   w: 50, h: 24, top: 285, accel: 240, grip: 3.0, colors: ['#c9ccd4', '#5a6270', '#7a4a8c'] },
  { name: 'Faro Pickup',    w: 54, h: 26, top: 262, accel: 225, grip: 2.7, colors: ['#4a7a4f', '#8c6a3b', '#37424e'] },
  { name: 'Coral Cabrio',   w: 47, h: 22, top: 348, accel: 322, grip: 3.6, colors: ['#e85d8a', '#f2d13d', '#37b8a5'] },
  { name: 'Marina Van',     w: 56, h: 27, top: 238, accel: 198, grip: 2.5, colors: ['#e8e4da', '#b8523d', '#4a6fa5'] },
  { name: 'Alto Hatch',     w: 44, h: 21, top: 272, accel: 252, grip: 3.1, colors: ['#6ab04c', '#d97b3d', '#888f9c'] },
];

export const COP_MODELS = {
  patrol: { name: 'CBPD Patrol',   w: 50, h: 24, top: 356, accel: 320, grip: 3.5 },
  ram:    { name: 'CBPD RAM Unit', w: 56, h: 27, top: 372, accel: 348, grip: 3.2 },
};

export const GARAGE_UPGRADES = [
  { id: 'armour', name: 'Armour Plating', levels: [0, 350, 800, 1500], desc: 'Car takes less damage per level.' },
  { id: 'engine', name: 'Engine Tune',    levels: [0, 400, 900, 1700], desc: 'Higher top speed and acceleration.' },
  { id: 'nitro',  name: 'Nitro Kit',      levels: [0, 500, 1100, 1900], desc: 'Shift boosts; bigger tanks per level.' },
];

export const SHOP_ITEMS = [
  { id: 'vest',   name: 'Kevlar Vest',   price: 250, desc: 'Armour to 100.' },
  { id: 'health', name: 'Clinic Patch',  price: 120, desc: 'Health to full.' },
  { id: 'pistol', name: 'Pistol Ammo x24', price: 60, desc: 'Pistol rounds.' },
  { id: 'smg',    name: 'SMG Ammo x60',  price: 90, desc: 'SMG rounds.' },
  { id: 'shells', name: 'Shells x12',    price: 80, desc: 'Shotgun shells.' },
  { id: 'rifle',  name: 'Rifle Ammo x30', price: 110, desc: 'Rifle rounds.' },
];

export const RADIO_STATIONS = [
  { id: 'onda',   name: 'ONDA 98.1 — Coral Pop',   bpm: 112, root: 220.0, wave: 'triangle' },
  { id: 'brasa',  name: 'BRASA FM — Bay Funk',     bpm: 96,  root: 174.6, wave: 'square' },
  { id: 'faros',  name: 'FARO NOCTURNA — Night Jazz', bpm: 76, root: 196.0, wave: 'sine' },
];

export const SAVE_KEY = 'caldera-bay-vice-tide-save-v1';

export const CREW = [
  { id: 'pico',  name: 'Pico Andrade', role: 'Driver',  key: 'Z', ability: 'Overdrive',  cooldown: 26, desc: 'Burst of speed in any car.' },
  { id: 'sable', name: 'Sable Okafor', role: 'Hacker',  key: 'X', ability: 'Dispatch Jam', cooldown: 34, desc: 'Police lose you for 6 seconds.' },
  { id: 'toro',  name: 'Toro Delgado', role: 'Muscle',  key: 'C', ability: 'Adrenaline', cooldown: 30, desc: 'Slow damage, fast fists, 8 seconds.' },
];

export const FIXER = { name: 'Nadia Ferrer', title: 'The Fixer of Caldera Bay' };

export function districtAt(x, y) {
  for (const d of DISTRICTS) {
    if (x >= d.x && x < d.x + d.w && y >= d.y && y < d.y + d.h) return d;
  }
  return DISTRICTS[3];
}

export function respectRankFor(points) {
  let current = RESPECT_RANKS[0];
  for (const r of RESPECT_RANKS) if (points >= r.need) current = r;
  return current;
}

export function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
export function lerp(a, b, t) { return a + (b - a) * t; }
export function dist2(ax, ay, bx, by) { const dx = ax - bx, dy = ay - by; return dx * dx + dy * dy; }
export function angleLerp(a, b, t) {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}
