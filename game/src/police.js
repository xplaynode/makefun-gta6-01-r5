// police.js — CBPD dispatch: the named Caldera Bay Police Department response.
// Wanted 0-5 stars drives everything: patrol cars pursue and try to hold the player
// slow and close for a bust; at 3+ stars dispatch lays ROADBLOCKS across the road
// ahead; at 4+ stars RAM/PIT units join and try to spin the player's car; at 5 stars
// the CONDOR spotlight helicopter tracks from above and paints a light cone that
// keeps the player "seen". Hiding unseen decays the wanted level star by star.

import { COP_MODELS, WORLD_W, BEACH_Y, clamp, BUSTED_RANGE, BUSTED_FILL_SECONDS } from './config.js';
import { roadCentresX, roadCentresY, lineBlockedByBuildings } from './world.js';
import { moveCar, updateCarDamage } from './traffic.js';

export const DISPATCH_NAME = 'CBPD DISPATCH';
export const HELI_NAME = 'CONDOR-1';

let nextCopId = 5000;

export function makeCopCar(S, kind, x, y) {
  const model = COP_MODELS[kind];
  return {
    id: nextCopId++, kind, model, x, y, angle: 0, speed: 0, steer: 0,
    w: model.w, h: model.h, color: kind === 'ram' ? '#232a38' : '#e8ecf2',
    hp: 130, maxHp: 130, driver: true, dead: false, smokeT: 0, fireT: 0, explodeT: 0,
    pitCooldown: 0, stuckT: 0, lastX: x, lastY: y,
  };
}

export function desiredCopCount(wanted) {
  if (wanted <= 0) return 0;
  return [0, 2, 3, 5, 6, 8][Math.floor(wanted)] || 2;
}

export function updatePolice(S, dt) {
  const wanted = Math.floor(S.wanted);
  // --- spawn / despawn to the desired strength, off-screen on roads ---
  const active = S.cops.filter(c => !c.dead);
  const want = desiredCopCount(S.wanted);
  if (active.length < want && S.spawnCopT <= 0) {
    S.spawnCopT = 1.1;
    const kind = wanted >= 4 && active.filter(c => c.kind === 'ram').length < 2 ? 'ram' : 'patrol';
    const spot = spawnSpot(S);
    if (spot) S.cops.push(makeCopCar(S, kind, spot.x, spot.y));
  }
  S.spawnCopT -= dt;
  if (S.wanted <= 0) {
    for (const cop of S.cops) cop.leaving = true;
  }
  // --- helicopter at 5 stars ---
  if (wanted >= 5 && !S.heli) {
    S.heli = { x: S.player.x + 500, y: S.player.y - 420, angle: 0, rotor: 0, name: HELI_NAME };
    S.dispatch('CONDOR-1 is airborne. All units, the bird has the eye.');
  }
  if (wanted < 5 && S.heli) { S.heli.leaving = true; }
  if (S.heli) updateHeli(S, dt);
  // --- roadblocks at 3+ stars ---
  if (wanted >= 3 && S.roadblocks.length === 0 && S.roadblockCooldown <= 0) layRoadblock(S);
  S.roadblockCooldown -= dt;
  for (const rb of S.roadblocks) rb.age += dt;
  S.roadblocks = S.roadblocks.filter(rb => rb.age < 46 && Math.hypot(rb.x - S.player.x, rb.y - S.player.y) < 1500);
  if (wanted < 3) S.roadblocks = [];
  // --- pursuit driving ---
  let anySees = false;
  for (const cop of S.cops) {
    if (cop.dead) continue;
    const sees = copSeesPlayer(S, cop);
    if (sees) { anySees = true; cop.lastKnown = { x: S.player.x, y: S.player.y }; cop.searchT = 0; }
    else cop.searchT = (cop.searchT || 0) + dt;
    const target = cop.lastKnown || { x: S.player.x, y: S.player.y };
    if (cop.leaving) driveTo(S, cop, { x: cop.x + 900, y: cop.y - 500 }, dt, 0.6);
    else if (cop.kind === 'ram' && S.player.car) driveRam(S, cop, target, dt);
    else drivePursuit(S, cop, target, dt, sees);
    moveCar(cop, dt);
    updateCarDamage(S, cop, dt);
    // Unstick: if a cop barely moved, reverse briefly.
    if (Math.hypot(cop.x - cop.lastX, cop.y - cop.lastY) < 2 && Math.abs(cop.speed) > 30) cop.stuckT += dt; else cop.stuckT = 0;
    if (cop.stuckT > 0.9) { cop.speed = -120; cop.stuckT = 0; }
    cop.lastX = cop.x; cop.lastY = cop.y;
    cop.pitCooldown -= dt;
  }
  S.cops = S.cops.filter(c => !(c.leaving && Math.hypot(c.x - S.player.x, c.y - S.player.y) > 1600));
  // --- seen / hidden bookkeeping, bust meter, decay ---
  const heliSees = S.heli && !S.heli.leaving && Math.hypot(S.heli.x - S.player.x, S.heli.y - S.player.y) < 330;
  S.playerSeen = anySees || !!heliSees;
  if (S.playerSeen) { S.hideT = 0; S.jamT = Math.max(0, S.jamT); }
  else if (S.wanted > 0 && S.jamT <= 0) {
    S.hideT += dt;
    if (S.hideT > 9) { S.hideT = 0; S.wanted = Math.max(0, Math.floor(S.wanted) - 1 + 0.0); if (S.wanted > 0) S.wanted += 0.0; S.dispatch(S.wanted > 0 ? 'Suspect lost. Hold the level, keep searching.' : 'All units stand down. Suspect gone.'); if (S.wanted === 0) { S.cops.forEach(c => c.leaving = true); S.roadblocks = []; } }
  }
  updateBusted(S, dt, anySees);
}

function copSeesPlayer(S, cop) {
  if (S.jamT > 0) return false;
  const d = Math.hypot(S.player.x - cop.x, S.player.y - cop.y);
  if (d > 520) return false;
  return !lineBlockedByBuildings(S.world, cop.x, cop.y, S.player.x, S.player.y);
}

function drivePursuit(S, cop, target, dt, sees) {
  // Aim at a point just behind the player's car so patrols box rather than ram.
  const px = S.player.car ? S.player.car.x : S.player.x;
  const py = S.player.car ? S.player.car.y : S.player.y;
  const pa = S.player.car ? S.player.car.angle : 0;
  const aim = sees ? { x: px - Math.cos(pa) * 54, y: py - Math.sin(pa) * 54 } : target;
  driveTo(S, cop, aim, dt, 1);
}

function driveRam(S, cop, target, dt) {
  // RAM/PIT: aim at the player's rear quarter; on contact, shove and spin.
  const car = S.player.car;
  const aim = { x: car.x - Math.cos(car.angle) * 30 + Math.cos(car.angle + Math.PI / 2) * 26, y: car.y - Math.sin(car.angle) * 30 + Math.sin(car.angle + Math.PI / 2) * 26 };
  driveTo(S, cop, aim, dt, 1.06);
  const d = Math.hypot(car.x - cop.x, car.y - cop.y);
  if (d < 52 && cop.pitCooldown <= 0) {
    cop.pitCooldown = 2.6;
    car.angle += (S.rng.next() > 0.5 ? 1 : -1) * 0.55;
    car.speed *= 0.55; car.hp -= 9;
    S.shake = Math.min(12, (S.shake || 0) + 5);
    S.audio?.crash();
    S.dispatch('RAM unit made contact. Spin him out.');
  }
}

function driveTo(S, cop, aim, dt, aggression) {
  const toT = Math.atan2(aim.y - cop.y, aim.x - cop.x);
  let da = toT - cop.angle;
  while (da > Math.PI) da -= Math.PI * 2;
  while (da < -Math.PI) da += Math.PI * 2;
  cop.steer = clamp(da * 2.4, -1, 1);
  cop.angle += cop.steer * cop.model.grip * dt * clamp(Math.abs(cop.speed) / 130, 0.3, 1.1);
  const distA = Math.hypot(aim.x - cop.x, aim.y - cop.y);
  let want = cop.model.top * aggression;
  if (distA < 60 && !S.player.car) want = 60; // on foot: close in slowly for the bust
  if (Math.abs(da) > 2.4 && distA < 90) want = -140; // reverse out of a bad angle
  cop.speed += clamp(want - cop.speed, -cop.model.accel * 1.7 * dt, cop.model.accel * dt);
}

function spawnSpot(S) {
  const xs = roadCentresX(), ys = roadCentresY();
  for (let tries = 0; tries < 12; tries++) {
    const horizontal = S.rng.chance(0.5);
    const x = horizontal ? clamp(S.player.x + (S.rng.chance(0.5) ? -1 : 1) * S.rng.range(640, 900), 80, WORLD_W - 80) : xs[S.rng.int(0, xs.length - 1)];
    const y = horizontal ? ys[S.rng.int(0, ys.length - 1)] : clamp(S.player.y + (S.rng.chance(0.5) ? -1 : 1) * S.rng.range(640, 900), 80, BEACH_Y - 80);
    if (Math.hypot(x - S.player.x, y - S.player.y) > 560) return { x, y };
  }
  return null;
}

function layRoadblock(S) {
  // Place two patrol hulks + a spike gap across the road ahead of the player.
  const heading = S.player.car ? S.player.car.angle : S.player.angle;
  const ahead = { x: S.player.x + Math.cos(heading) * 430, y: S.player.y + Math.sin(heading) * 430 };
  const xs = roadCentresX(), ys = roadCentresY();
  const onVertical = xs.some(rx => Math.abs(ahead.x - rx) < 60);
  const units = [];
  if (onVertical) {
    const rx = xs.reduce((a, b) => Math.abs(b - ahead.x) < Math.abs(a - ahead.x) ? b : a);
    units.push({ x: rx - 26, y: ahead.y, angle: Math.PI / 2 }, { x: rx + 26, y: ahead.y + 8, angle: Math.PI / 2 });
  } else {
    const ry = ys.reduce((a, b) => Math.abs(b - ahead.y) < Math.abs(a - ahead.y) ? b : a, ys[0]);
    units.push({ x: ahead.x, y: ry - 26, angle: 0 }, { x: ahead.x + 8, y: ry + 26, angle: 0 });
  }
  S.roadblocks.push({ x: ahead.x, y: ahead.y, units, age: 0 });
  S.roadblockCooldown = 26;
  S.dispatch('Roadblock laid ahead of the suspect. Spike gap on the left.');
}

function updateHeli(S, dt) {
  const heli = S.heli;
  heli.rotor += dt * 42;
  if (heli.leaving) {
    heli.x += 260 * dt; heli.y -= 200 * dt;
    if (Math.hypot(heli.x - S.player.x, heli.y - S.player.y) > 1700) S.heli = null;
    return;
  }
  // CONDOR orbits the player, keeping the spotlight cone on them when close.
  const orbitA = S.time * 0.35;
  const tx = S.player.x + Math.cos(orbitA) * 150, ty = S.player.y + Math.sin(orbitA) * 150;
  heli.x += clamp(tx - heli.x, -320 * dt, 320 * dt);
  heli.y += clamp(ty - heli.y, -320 * dt, 320 * dt);
  heli.angle = Math.atan2(S.player.y - heli.y, S.player.x - heli.x);
  if (S.jamT > 0) { heli.x += 300 * dt; }
}

function updateBusted(S, dt, anySees) {
  const playerSpeed = S.player.car ? Math.abs(S.player.car.speed) : Math.hypot(S.player.vx || 0, S.player.vy || 0);
  let nearCop = false;
  for (const cop of S.cops) {
    if (cop.dead) continue;
    if (Math.hypot(cop.x - S.player.x, cop.y - S.player.y) < BUSTED_RANGE) nearCop = true;
  }
  if (S.wanted > 0 && nearCop && playerSpeed < 42 && anySees) {
    S.bustedMeter += dt / BUSTED_FILL_SECONDS;
    if (S.bustedMeter >= 1) S.bustPlayer();
  } else {
    S.bustedMeter = Math.max(0, S.bustedMeter - dt * 0.7);
  }
}

export function dispatchLineFor(stars) {
  return [
    '', 'CBPD: patrol dispatched, bring him in quiet.',
    'CBPD: two units rolling. Do not let him reach the Strip.',
    'CBPD: roadblocks authorised. Box the bay roads.',
    'CBPD: RAM units cleared to make contact.',
    'CBPD: CONDOR-1 airborne. Nobody outruns the light.',
  ][clamp(Math.floor(stars), 0, 5)];
}
