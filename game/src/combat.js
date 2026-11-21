// combat.js — the five-weapon wheel, mouse-aim shooting, cover, and car damage.
// Weapons differ in range, damage, spread, rate, pellets and kick. Bullets are
// hitscan-stepped projectiles so walls and cover crates genuinely block shots:
// the first thing a step touches (building, crate, car, ped, cop, player) takes it.

import { WEAPONS, clamp } from './config.js';
import { buildingAt } from './world.js';
import { scarePeds } from './pedestrians.js';
import { addCasing, addDecal } from './effects.js';

export function makeArsenal() {
  return {
    current: 1, // pistol in hand at the start
    owned: { fists: true, pistol: true, smg: true, shotgun: true, rifle: true },
    ammo: { pistol: 96, smg: 180, shells: 32, rifle: 90 },
    cooldown: 0, muzzle: 0, wheelOpen: false,
  };
}

export function cycleWeapon(S, dir) {
  const a = S.arsenal;
  for (let step = 0; step < WEAPONS.length; step++) {
    a.current = (a.current + dir + WEAPONS.length) % WEAPONS.length;
    if (a.owned[WEAPONS[a.current].id]) break;
  }
  a.wheelOpen = true; a.wheelT = 1.4;
  S.audio?.click();
}

export function tryShoot(S, dt) {
  const a = S.arsenal;
  a.cooldown -= dt; a.muzzle -= dt; a.wheelT = Math.max(0, (a.wheelT || 0) - dt);
  if (a.wheelT === 0) a.wheelOpen = false;
  if (!S.mouse.down || S.player.car || S.mode !== 'play') return;
  const w = WEAPONS[a.current];
  if (a.cooldown > 0) return;
  if (w.ammoType && a.ammo[w.ammoType] <= 0) { a.cooldown = 0.3; S.audio?.dryFire(); return; }
  a.cooldown = w.rate * (S.adrenalineT > 0 ? 0.72 : 1);
  a.muzzle = 0.06;
  if (w.ammoType && S.effects) addCasing(S, S.player.x, S.player.y);
  if (w.ammoType) a.ammo[w.ammoType]--;
  const baseAngle = Math.atan2(S.mouse.wy - S.player.y, S.mouse.wx - S.player.x);
  S.player.angle = baseAngle;
  S.lastShotAt = S.time;
  S.audio?.shot(w.id);
  S.shake = Math.min(8, (S.shake || 0) + w.kick * 0.4);
  scarePeds(S, S.player.x, S.player.y, 300, true);
  if (S.wanted < 1) S.addWanted(1, 'shots fired');
  for (let p = 0; p < w.pellets; p++) {
    const ang = baseAngle + (S.rng.next() - 0.5) * 2 * w.spread + (S.rng.next() - 0.5) * 0.01;
    fireBullet(S, w, ang);
  }
}

function fireBullet(S, w, ang) {
  if (w.id === 'fists') { meleeHit(S, w, ang); return; }
  const step = 14;
  let x = S.player.x + Math.cos(ang) * 20, y = S.player.y + Math.sin(ang) * 20;
  const dx = Math.cos(ang) * step, dy = Math.sin(ang) * step;
  const steps = Math.floor(w.range / step);
  for (let i = 0; i < steps; i++) {
    x += dx; y += dy;
    if (buildingAt(S.world, x, y)) { spark(S, x, y); return; }
    const crate = crateAt(S, x, y);
    if (crate) { crate.hp -= w.damage; spark(S, x, y); if (crate.hp <= 0) breakCrate(S, crate); return; }
    const car = carAt(S, x, y);
    if (car && car !== S.player.car) { damageCar(S, car, w.damage); spark(S, x, y); return; }
    const ped = pedAt(S, x, y);
    if (ped) { hurtPed(S, ped, w.damage); return; }
    const cop = copCarAt(S, x, y);
    if (cop) { damageCar(S, cop, w.damage); S.addWanted(0.5, 'shot at police'); spark(S, x, y); return; }
  }
  S.particles.push({ kind: 'tracer', x, y, vx: 0, vy: 0, life: 0.08, t: 0, size: 2 });
}

function meleeHit(S, w, ang) {
  const hx = S.player.x + Math.cos(ang) * w.range, hy = S.player.y + Math.sin(ang) * w.range;
  const ped = pedAt(S, hx, hy, 22);
  if (ped) { hurtPed(S, ped, w.damage * (S.adrenalineT > 0 ? 1.7 : 1)); return; }
  const car = carAt(S, hx, hy, 14);
  if (car) damageCar(S, car, w.damage);
}

export function crateAt(S, x, y, pad = 0) {
  for (const c of S.world.crates) if (c.hp > 0 && x > c.x - pad && x < c.x + c.size + pad && y > c.y - pad && y < c.y + c.size + pad) return c;
  return null;
}
export function carAt(S, x, y, pad = 0) {
  for (const car of S.cars) if (!car.dead && Math.abs(car.x - x) < car.w / 2 + pad && Math.abs(car.y - y) < car.h / 2 + pad + 6) return car;
  return null;
}
export function copCarAt(S, x, y, pad = 0) {
  for (const cop of S.cops) if (!cop.dead && Math.abs(cop.x - x) < cop.w / 2 + pad && Math.abs(cop.y - y) < cop.h / 2 + pad + 6) return cop;
  return null;
}
export function pedAt(S, x, y, pad = 10) {
  for (const ped of S.peds) if (ped.hp > 0 && Math.hypot(ped.x - x, ped.y - y) < pad + 8) return ped;
  return null;
}

export function damageCar(S, car, amount) {
  const armourCut = car === S.player.car ? (S.garage?.armour || 0) * 0.12 : 0;
  car.hp -= amount * (1 - armourCut);
  if (S.effects) addDecal(S, car, car.x, car.y);
  if (car.hp < 0) car.hp = 0;
  if (car.kind === 'civilian' && car.driver) { car.driver = false; scarePeds(S, car.x, car.y, 140, false); }
}

function hurtPed(S, ped, amount) {
  ped.hp -= amount;
  ped.state = 'flee'; ped.fleeT = 3.4;
  ped.target = { x: ped.x + (ped.x - S.player.x) * 2, y: ped.y + (ped.y - S.player.y) * 2 };
  S.addWanted(0.5, 'assault');
  if (ped.hp <= 0) S.addWanted(1, 'a person is down');
}

function breakCrate(S, crate) {
  S.particles.push({ kind: 'splinter', x: crate.x + crate.size / 2, y: crate.y + crate.size / 2, vx: 0, vy: 0, life: 0.4, t: 0, size: crate.size });
  S.audio?.crate();
  if (S.rng.chance(0.3)) S.pickups.push({ kind: 'cash', x: crate.x + 10, y: crate.y + 10, amount: S.rng.int(15, 60), t: 0 });
}

export function spark(S, x, y) {
  for (let i = 0; i < 3; i++) S.particles.push({ kind: 'spark', x, y, vx: S.rng.range(-90, 90), vy: S.rng.range(-90, 90), life: 0.22, t: 0, size: 2 });
}

export function updateParticles(S, dt) {
  for (const p of S.particles) { p.t += dt; p.x += (p.vx || 0) * dt; p.y += (p.vy || 0) * dt; }
  S.particles = S.particles.filter(p => p.t < p.life);
  for (const pk of S.pickups) pk.t += dt;
  // Cash pickups are collected on foot or by car.
  S.pickups = S.pickups.filter(pk => {
    if (Math.hypot(pk.x - S.player.x, pk.y - S.player.y) < 30) { S.cash += pk.amount; S.audio?.cash(); S.toast(`+$${pk.amount}`); return false; }
    return pk.t < 90;
  });
}

export function weaponById(id) { return WEAPONS.find(w => w.id === id) || WEAPONS[0]; }
export function totalAmmoLabel(S) {
  const w = WEAPONS[S.arsenal.current];
  return w.ammoType ? String(S.arsenal.ammo[w.ammoType]) : '\u221e';
}
export { clamp };
