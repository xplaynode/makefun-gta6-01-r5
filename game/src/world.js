// world.js — Caldera Bay city generation: road grid, blocks, signed buildings with
// pseudo-height, palms, lamps, market stalls, beach, sea, causeway, cover crates,
// and the named service buildings (garage, shop, safehouses) the economy uses.
// Everything is generated deterministically from the run seed.

import { BLOCK, ROAD_W, WORLD_W, WORLD_H, SEA_Y, BEACH_Y, DISTRICTS, districtAt } from './config.js';
import { Rng } from './random.js';

export const BUILDING_SIGNS = [
  'BANCO DEL MAR', 'HOTEL CALDERA', 'CAFE ONDA', 'FARMACIA SOL', 'TALLER BRASA',
  'MERCADO CENTRAL', 'CINE FARO', 'JOYERIA CORAL', 'LIBROS MAREA', 'PANADERIA ALTO',
  'CLINICA VIDA', 'BAR LA SIRENA', 'GIMNASIO TORO', 'FLORERIA PALMA', 'OFICINAS PUERTO',
  'TIENDA MAREA', 'RESTAURANTE SAL', 'PELUQUERIA LUZ', 'TATUAJES FARO', 'DISCOS ONDA',
];

export const SERVICE_BUILDINGS = [
  { kind: 'garage',    name: 'TALLER BRASA — GARAGE', x: 1560, y: 900,  district: 'centro' },
  { kind: 'shop',      name: 'ARMERIA SOL — SHOP',    x: 420,  y: 1740, district: 'mercado' },
  { kind: 'shop',      name: 'DEPORTES PUERTO',       x: 3300, y: 2200, district: 'portazul' },
  { kind: 'safehouse', name: 'SAFEHOUSE — MARINA',    x: 420,  y: 2560, district: 'marina' },
  { kind: 'safehouse', name: 'SAFEHOUSE — FARO',      x: 4360, y: 2140, district: 'faro' },
  { kind: 'safehouse', name: 'SAFEHOUSE — BAHIA',     x: 3300, y: 420,  district: 'bahia' },
];

const ROOF_PALETTES = [
  ['#c96f4a', '#a85638'], ['#d9a441', '#b57f2c'], ['#7fb069', '#5d8a4a'],
  ['#4a90a4', '#35707f'], ['#c2557a', '#9c3f5e'], ['#e8e0d0', '#c9bda3'],
  ['#5e6fa5', '#47567f'], ['#d97b3d', '#b85c28'], ['#37b8a5', '#2a8f80'],
];
const WALL_PALETTES = ['#f2e3c9', '#e8cfa8', '#dfb48c', '#f0d9d9', '#d9e2ec', '#efe6d5', '#e5c9a8'];

export function roadCentresX() {
  const xs = [];
  for (let x = 200; x < WORLD_W; x += BLOCK) xs.push(x);
  return xs;
}
export function roadCentresY() {
  const ys = [];
  for (let y = 200; y < SEA_Y; y += BLOCK) ys.push(y);
  return ys;
}
export function isOnRoad(x, y) {
  if (y >= BEACH_Y) return false;
  for (const rx of roadCentresX()) if (Math.abs(x - rx) < ROAD_W / 2) return true;
  for (const ry of roadCentresY()) if (Math.abs(y - ry) < ROAD_W / 2) return true;
  return false;
}
export function isInSea(x, y) { return y > SEA_Y + 60; }
export function isOnBeach(x, y) { return y >= BEACH_Y && y <= SEA_Y + 60; }
export function nearestRoadPoint(x, y) {
  let best = { x, y }, bestD = Infinity;
  for (const rx of roadCentresX()) { const d = Math.abs(x - rx); if (d < bestD) { bestD = d; best = { x: rx, y }; } }
  for (const ry of roadCentresY()) { const d = Math.abs(y - ry); if (d < bestD) { bestD = d; best = { x, y: ry }; } }
  return best;
}

export function generateWorld(seed) {
  const rng = new Rng(seed * 7919 + 13);
  const buildings = [];
  const palms = [];
  const lamps = [];
  const stalls = [];
  const crates = [];
  const signs = [];
  // Blocks sit between roads. Each block holds 1-4 buildings with a height used by
  // the renderer for pseudo-3D extrusion and shadow casting.
  const xs = roadCentresX();
  const ys = roadCentresY();
  let signIdx = 0;
  for (let bi = 0; bi < xs.length - 1; bi++) {
    for (let bj = 0; bj < ys.length - 1; bj++) {
      const bx = xs[bi] + ROAD_W / 2 + 14;
      const by = ys[bj] + ROAD_W / 2 + 14;
      const bw = BLOCK - ROAD_W - 28;
      const bh = BLOCK - ROAD_W - 28;
      const district = districtAt(bx + bw / 2, by + bh / 2);
      const density = district.id === 'centro' || district.id === 'coralstrip' ? 0.95 : 0.78;
      if (!rng.chance(density)) {
        // Plaza: palms and stalls instead of a building.
        for (let p = 0; p < 5; p++) palms.push({ x: bx + rng.range(20, bw - 20), y: by + rng.range(20, bh - 20), s: rng.range(0.8, 1.3), lean: rng.range(-0.14, 0.14) });
        if (district.id === 'mercado' || district.id === 'marina') {
          for (let sIdx = 0; sIdx < 4; sIdx++) stalls.push({ x: bx + 30 + sIdx * 52, y: by + bh / 2, hue: rng.pick(['#d94f3d', '#e8a13a', '#37b8a5', '#c2557a']), goods: rng.pick(['fruit', 'cloth', 'fish', 'flowers']) });
        }
        continue;
      }
      const split = rng.chance(0.45) ? 2 : 1;
      for (let sIdx = 0; sIdx < split; sIdx++) {
        const w = split === 2 ? bw / 2 - 10 : bw * rng.range(0.72, 0.96);
        const h = bh * rng.range(0.7, 0.96);
        const x = split === 2 ? bx + sIdx * (bw / 2 + 4) : bx + rng.range(0, bw - w);
        const y = by + rng.range(0, bh - h);
        const floors = district.id === 'centro' ? rng.int(4, 9) : district.id === 'palmera' ? rng.int(1, 3) : rng.int(2, 6);
        const palette = rng.pick(ROOF_PALETTES);
        buildings.push({
          x, y, w, h, floors, height: floors * 9,
          roof: palette[0], roofDark: palette[1], wall: rng.pick(WALL_PALETTES),
          sign: rng.chance(0.55) ? BUILDING_SIGNS[signIdx++ % BUILDING_SIGNS.length] : null,
          district: district.id, windows: rng.int(6, 18), awning: rng.chance(0.4),
        });
        if (rng.chance(0.5)) crates.push({ x: x + w + 6, y: y + rng.range(0, Math.max(10, h - 24)), size: 22, hp: 40, cover: true });
      }
      for (let p = 0; p < 3; p++) if (rng.chance(0.7)) palms.push({ x: bx + rng.range(6, bw), y: by + rng.range(6, bh), s: rng.range(0.75, 1.25), lean: rng.range(-0.12, 0.12) });
    }
  }
  // Street lamps along every road, both sides, staggered.
  for (const rx of xs) for (let y = 120; y < BEACH_Y; y += 150) lamps.push({ x: rx - ROAD_W / 2 - 8, y: y + (Math.floor(y / 150) % 2) * 40 });
  for (const ry of ys) for (let x = 120; x < WORLD_W - 100; x += 170) lamps.push({ x: x + (Math.floor(x / 170) % 2) * 46, y: ry - ROAD_W / 2 - 8 });
  // Beach palms and crates near the port.
  for (let i = 0; i < 90; i++) palms.push({ x: rng.range(80, WORLD_W - 80), y: rng.range(BEACH_Y + 8, SEA_Y - 6), s: rng.range(0.9, 1.5), lean: rng.range(-0.2, 0.2) });
  for (let i = 0; i < 26; i++) crates.push({ x: rng.range(2760, 3980), y: rng.range(1700, 2800), size: rng.int(20, 30), hp: 50, cover: true });
  // Service markers are fixed so missions and the economy always agree on places.
  const services = SERVICE_BUILDINGS.map(s => ({ ...s, w: 120, h: 74 }));
  for (const s of services) signs.push({ x: s.x, y: s.y - 16, text: s.name, kind: s.kind });
  return { buildings, palms, lamps, stalls, crates, signs, services, seed };
}

export function buildingAt(world, x, y) {
  for (const b of world.buildings) {
    if (x >= b.x - 4 && x <= b.x + b.w + 4 && y >= b.y - 4 && y <= b.y + b.h + 4) return b;
  }
  return null;
}
export function collideBuildings(world, x, y, r) {
  // Push a circle out of every building footprint; returns corrected position.
  let nx = x, ny = y;
  for (const b of world.buildings) {
    if (nx > b.x - r && nx < b.x + b.w + r && ny > b.y - r && ny < b.y + b.h + r) {
      const left = Math.abs(nx - (b.x - r)), right = Math.abs(nx - (b.x + b.w + r));
      const top = Math.abs(ny - (b.y - r)), bot = Math.abs(ny - (b.y + b.h + r));
      const m = Math.min(left, right, top, bot);
      if (m === left) nx = b.x - r; else if (m === right) nx = b.x + b.w + r;
      else if (m === top) ny = b.y - r; else ny = b.y + b.h + r;
    }
  }
  return { x: nx, y: ny };
}
export function lineBlockedByBuildings(world, x1, y1, x2, y2) {
  // Sampled line-of-sight: walls and cover crates block shots and police vision.
  const steps = Math.ceil(Math.hypot(x2 - x1, y2 - y1) / 18);
  for (let i = 1; i < steps; i++) {
    const t = i / steps, x = x1 + (x2 - x1) * t, y = y1 + (y2 - y1) * t;
    if (buildingAt(world, x, y)) return true;
    for (const c of world.crates) {
      if (c.hp > 0 && x > c.x && x < c.x + c.size && y > c.y && y < c.y + c.size) return true;
    }
  }
  return false;
}
export function districtRespectSeed() {
  const out = {};
  for (const d of DISTRICTS) out[d.id] = 0;
  return out;
}
