// pedestrians.js — Caldera Bay's walkers: they stroll the pavements, pause at stalls,
// chat in pairs, cross at junctions, and flee from gunfire, explosions and fast cars.
// A ped who sees a crime remembers it and can raise the wanted level by reporting.

import { WORLD_W, BEACH_Y, clamp } from './config.js';
import { Rng } from './random.js';
import { roadCentresX, roadCentresY, collideBuildings } from './world.js';

const SHIRTS = ['#e85d8a', '#37b8a5', '#f2d13d', '#d94f3d', '#6ab04c', '#e8e4da', '#7a4a8c', '#3d7bd9', '#f0f0f0', '#22262e'];
const SKINS = ['#8c5a3b', '#c98a5a', '#6a4230', '#e0aa7a', '#4a3226'];
let nextPedId = 1;

export function makePed(rng, x, y) {
  return {
    id: nextPedId++, x, y, angle: rng.range(0, Math.PI * 2),
    speed: 0, walkSpeed: rng.range(52, 86), state: 'stroll',
    shirt: rng.pick(SHIRTS), skin: rng.pick(SKINS), hair: rng.pick(['#1c1410', '#3a2a18', '#777', '#b8523d', '#e8d9a0']),
    target: null, waitT: 0, chatT: 0, fleeT: 0, hp: 100, phase: rng.range(0, 6.28),
    reported: false, name: rng.pick(['Ana', 'Luis', 'Marta', 'Diego', 'Sofia', 'Pablo', 'Lucia', 'Marco', 'Elena', 'Raul', 'Nina', 'Tomas']),
  };
}

export function spawnPeds(seed, count) {
  const rng = new Rng(seed * 17 + 55);
  const peds = [];
  const xs = roadCentresX(), ys = roadCentresY();
  for (let i = 0; i < count; i++) {
    // Walkers hug the road network and the beach promenade.
    let x, y;
    if (rng.chance(0.22)) { x = rng.range(80, WORLD_W - 80); y = rng.range(2900, 3010); }
    else if (rng.chance(0.5)) { x = rng.pick(xs) + rng.pick([-58, 58]); y = rng.range(120, BEACH_Y - 60); }
    else { y = rng.pick(ys) + rng.pick([-58, 58]); x = rng.range(120, WORLD_W - 120); }
    peds.push(makePed(rng, x, y));
  }
  return peds;
}

function pickStrollTarget(S, ped) {
  const rng = S.rng;
  const xs = roadCentresX(), ys = roadCentresY();
  if (rng.chance(0.3)) return { x: clamp(ped.x + rng.range(-320, 320), 60, WORLD_W - 60), y: rng.pick(ys) + rng.pick([-58, 58]) };
  return { x: rng.pick(xs) + rng.pick([-58, 58]), y: clamp(ped.y + rng.range(-320, 320), 60, BEACH_Y - 30) };
}

export function updatePeds(S, dt) {
  for (const ped of S.peds) {
    if (ped.hp <= 0) { ped.state = 'down'; continue; }
    ped.phase += dt * (ped.speed > 4 ? 9 : 2);
    // Threat scan: gunfire memory, nearby fast cars, explosions, a drawn weapon.
    const threat = senseThreat(S, ped);
    if (threat && ped.state !== 'flee') {
      ped.state = 'flee'; ped.fleeT = S.rng.range(2.2, 4.2);
      ped.target = { x: ped.x - threat.dx * 260, y: ped.y - threat.dy * 260 };
      if (!ped.reported && threat.crime) { ped.reported = true; S.addWanted(0.5, 'witness'); }
    }
    switch (ped.state) {
      case 'stroll': {
        if (!ped.target) ped.target = pickStrollTarget(S, ped);
        walkToward(S, ped, ped.target, ped.walkSpeed, dt);
        if (reached(ped, ped.target)) {
          ped.target = null;
          const roll = S.rng.next();
          if (roll < 0.24) { ped.state = 'pause'; ped.waitT = S.rng.range(1, 3.4); }
          else if (roll < 0.34) { ped.state = 'chat'; ped.chatT = S.rng.range(2, 5); }
        }
        break;
      }
      case 'pause': ped.speed = 0; ped.waitT -= dt; if (ped.waitT <= 0) ped.state = 'stroll'; break;
      case 'chat': {
        ped.speed = 0; ped.chatT -= dt;
        const partner = nearestPed(S, ped, 60);
        if (partner) ped.angle = Math.atan2(partner.y - ped.y, partner.x - ped.x);
        if (ped.chatT <= 0) ped.state = 'stroll';
        break;
      }
      case 'flee': {
        ped.fleeT -= dt;
        if (ped.target) walkToward(S, ped, ped.target, 196, dt);
        if (ped.fleeT <= 0) { ped.state = 'stroll'; ped.target = null; ped.reported = false; }
        break;
      }
      default: ped.speed = 0;
    }
    // Keep peds out of the sea and out of buildings.
    ped.y = Math.min(ped.y, 3060);
    const fixed = collideBuildings(S.world, ped.x, ped.y, 10);
    ped.x = fixed.x; ped.y = fixed.y;
  }
  // Recycle distant peds toward the player so streets always feel lived-in.
  for (const ped of S.peds) {
    const d2 = (ped.x - S.player.x) ** 2 + (ped.y - S.player.y) ** 2;
    if (d2 > 2300 * 2300 && ped.state !== 'flee') {
      const fresh = makePed(S.rng, S.player.x + S.rng.range(-800, 800), clamp(S.player.y + S.rng.range(-800, 800), 80, 3000));
      Object.assign(ped, fresh);
    }
  }
}

function senseThreat(S, ped) {
  const dxp = ped.x - S.player.x, dyp = ped.y - S.player.y;
  const dp = Math.hypot(dxp, dyp);
  if (S.lastShotAt && S.time - S.lastShotAt < 1.2 && dp < 340) return { dx: dxp / (dp || 1), dy: dyp / (dp || 1), crime: true };
  if (S.player.car && Math.abs(S.player.car.speed) > 190 && dp < 120) return { dx: dxp / (dp || 1), dy: dyp / (dp || 1), crime: false };
  for (const car of S.cars) if (car.dead && Math.hypot(car.x - ped.x, car.y - ped.y) < 130) return { dx: dxp / (dp || 1), dy: dyp / (dp || 1), crime: false };
  if (S.wanted >= 2 && dp < 90 && !S.player.car) return { dx: dxp / (dp || 1), dy: dyp / (dp || 1), crime: false };
  return null;
}

function walkToward(S, ped, target, speed, dt) {
  const dx = target.x - ped.x, dy = target.y - ped.y;
  const d = Math.hypot(dx, dy);
  if (d < 6) { ped.speed = 0; return; }
  const want = Math.atan2(dy, dx);
  let da = want - ped.angle;
  while (da > Math.PI) da -= Math.PI * 2;
  while (da < -Math.PI) da += Math.PI * 2;
  ped.angle += clamp(da, -6 * dt, 6 * dt);
  ped.speed = speed;
  ped.x += Math.cos(ped.angle) * speed * dt;
  ped.y += Math.sin(ped.angle) * speed * dt;
  ped.x = clamp(ped.x, 30, WORLD_W - 30);
  ped.y = clamp(ped.y, 30, 3080);
}

function reached(ped, target) { return Math.hypot(target.x - ped.x, target.y - ped.y) < 16; }
function nearestPed(S, self, range) {
  let best = null, bd = range * range;
  for (const p of S.peds) { if (p === self) continue; const d = (p.x - self.x) ** 2 + (p.y - self.y) ** 2; if (d < bd) { bd = d; best = p; } }
  return best;
}

export function scarePeds(S, x, y, radius, crime) {
  for (const ped of S.peds) {
    const d = Math.hypot(ped.x - x, ped.y - y);
    if (d < radius) {
      ped.state = 'flee'; ped.fleeT = S.rng.range(2, 4);
      ped.target = { x: ped.x + (ped.x - x) * 1.6, y: ped.y + (ped.y - y) * 1.6 };
      if (crime && !ped.reported) { ped.reported = true; S.addWanted(0.5, 'witness'); }
    }
  }
}
