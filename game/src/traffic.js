// traffic.js — dense civilian traffic for Caldera Bay: cars follow the road grid,
// stop at junctions, honk, brake for pedestrians and the player, and can be stolen.
// A stolen or wrecked car is removed from the traffic pool and respawned elsewhere
// so density stays high around the player without ever flooding the whole map.

import { CAR_MODELS, WORLD_W, BEACH_Y, clamp } from './config.js';
import { Rng } from './random.js';
import { roadCentresX, roadCentresY, isInSea } from './world.js';

let nextCarId = 1;

export function makeCar(rng, x, y, angle, modelIdx) {
  const model = CAR_MODELS[modelIdx ?? rng.int(0, CAR_MODELS.length - 1)];
  return {
    id: nextCarId++, kind: 'civilian', model, x, y, angle,
    speed: 0, steer: 0, w: model.w, h: model.h,
    color: rng.pick(model.colors), hp: 100, maxHp: 100,
    driver: true, locked: false, honkT: 0, brakeT: 0,
    route: null, routeStep: 0, waitT: 0, smokeT: 0, fireT: 0, dead: false, explodeT: 0,
  };
}

export function spawnTraffic(seed, count) {
  const rng = new Rng(seed * 31 + 101);
  const cars = [];
  const xs = roadCentresX(), ys = roadCentresY();
  for (let i = 0; i < count; i++) {
    const horizontal = rng.chance(0.5);
    let x, y, angle;
    if (horizontal) { y = rng.pick(ys); x = rng.range(120, WORLD_W - 120); angle = rng.chance(0.5) ? 0 : Math.PI; }
    else { x = rng.pick(xs); y = rng.range(120, BEACH_Y - 120); angle = rng.chance(0.5) ? Math.PI / 2 : -Math.PI / 2; }
    const car = makeCar(rng, x, y, angle);
    car.route = planRoute(rng, x, y);
    cars.push(car);
  }
  return cars;
}

export function planRoute(rng, x, y) {
  // A route is a list of grid waypoints: drive along roads, turn at junctions.
  const xs = roadCentresX(), ys = roadCentresY();
  const pts = [];
  let cx = x, cy = y;
  for (let i = 0; i < 6; i++) {
    if (rng.chance(0.5)) { cx = rng.pick(xs); pts.push({ x: cx, y: cy }); }
    else { cy = rng.pick(ys); pts.push({ x: cx, y: cy }); }
  }
  return pts;
}

function carAhead(cars, car, gap) {
  const fx = car.x + Math.cos(car.angle) * gap, fy = car.y + Math.sin(car.angle) * gap;
  for (const other of cars) {
    if (other === car || other.dead) continue;
    if (Math.abs(other.x - fx) < 34 && Math.abs(other.y - fy) < 34) return other;
  }
  return null;
}

export function updateTraffic(S, dt) {
  const rng = S.rng;
  for (const car of S.cars) {
    if (car.kind !== 'civilian' || car.dead || S.player.car === car) continue;
    if (!car.driver) { car.speed = Math.max(0, car.speed - 120 * dt); moveCar(car, dt); continue; }
    // Keep traffic near the player: recycle cars that fall far behind the camera.
    const dx = car.x - S.player.x, dy = car.y - S.player.y;
    if (dx * dx + dy * dy > 2400 * 2400) { recycleCar(S, car); continue; }
    const target = car.route[car.routeStep % car.route.length];
    const toT = Math.atan2(target.y - car.y, target.x - car.x);
    let da = toT - car.angle;
    while (da > Math.PI) da -= Math.PI * 2;
    while (da < -Math.PI) da += Math.PI * 2;
    car.steer = clamp(da * 2.2, -1, 1);
    car.angle += car.steer * car.model.grip * dt * clamp(car.speed / 120, 0.25, 1);
    const distT = Math.hypot(target.x - car.x, target.y - car.y);
    if (distT < 60) { car.routeStep++; if (car.routeStep % car.route.length === 0) car.route = planRoute(rng, car.x, car.y); }
    let want = car.model.top * 0.52;
    const blocker = carAhead(S.cars, car, 62) || pedAhead(S, car, 54);
    if (blocker) { want = 0; car.brakeT = 0.4; if (car.honkT <= 0) { car.honkT = rng.range(1.4, 3.4); S.audio?.honk(); } }
    if (car.waitT > 0) { car.waitT -= dt; want = 0; }
    else if (rng.chance(0.002)) car.waitT = rng.range(0.4, 1.1); // junction courtesy pause
    car.speed += clamp(want - car.speed, -car.model.accel * 1.6 * dt, car.model.accel * dt);
    car.honkT -= dt; car.brakeT -= dt;
    moveCar(car, dt);
    updateCarDamage(S, car, dt);
  }
}

function pedAhead(S, car, gap) {
  const fx = car.x + Math.cos(car.angle) * gap, fy = car.y + Math.sin(car.angle) * gap;
  for (const p of S.peds) if (Math.abs(p.x - fx) < 26 && Math.abs(p.y - fy) < 26) return p;
  if (Math.abs(S.player.x - fx) < 26 && Math.abs(S.player.y - fy) < 26 && !S.player.car) return S.player;
  return null;
}

export function moveCar(car, dt) {
  car.x += Math.cos(car.angle) * car.speed * dt;
  car.y += Math.sin(car.angle) * car.speed * dt;
  car.x = clamp(car.x, 40, WORLD_W - 40);
  car.y = clamp(car.y, 40, 3400);
  if (isInSea(car.x, car.y)) { car.y = 3060; car.speed = 0; car.hp -= 30; }
}

export function recycleCar(S, car) {
  const rng = S.rng;
  const xs = roadCentresX(), ys = roadCentresY();
  const horizontal = rng.chance(0.5);
  const px = S.player.x, py = S.player.y;
  if (horizontal) { car.y = ys[rng.int(0, ys.length - 1)]; car.x = clamp(px + (rng.chance(0.5) ? -1 : 1) * rng.range(700, 1100), 80, WORLD_W - 80); car.angle = rng.chance(0.5) ? 0 : Math.PI; }
  else { car.x = xs[rng.int(0, xs.length - 1)]; car.y = clamp(py + (rng.chance(0.5) ? -1 : 1) * rng.range(700, 1100), 80, BEACH_Y - 80); car.angle = rng.chance(0.5) ? Math.PI / 2 : -Math.PI / 2; }
  car.hp = car.maxHp; car.dead = false; car.fireT = 0; car.explodeT = 0; car.driver = true;
  car.route = planRoute(rng, car.x, car.y); car.routeStep = 0;
}

export function updateCarDamage(S, car, dt) {
  if (car.hp <= 55 && car.hp > 25) { car.smokeT -= dt; if (car.smokeT <= 0) { car.smokeT = 0.12; S.particles.push({ kind: 'smoke', x: car.x, y: car.y, vx: 0, vy: -22, life: 0.9, t: 0, size: 9 }); } }
  if (car.hp <= 25 && car.hp > 0) {
    car.fireT += dt;
    S.particles.push({ kind: 'fire', x: car.x + (S.rng.next() - 0.5) * 20, y: car.y + (S.rng.next() - 0.5) * 12, vx: 0, vy: -34, life: 0.4, t: 0, size: 8 });
    if (car.fireT > 2.2 && car.explodeT === 0) car.explodeT = 0.6;
  }
  if (car.explodeT > 0) {
    car.explodeT -= dt;
    if (car.explodeT <= 0 && !car.dead) explodeCar(S, car);
  }
}

export function explodeCar(S, car) {
  car.dead = true; car.hp = 0; car.speed = 0;
  S.particles.push({ kind: 'boom', x: car.x, y: car.y, vx: 0, vy: 0, life: 0.55, t: 0, size: 74 });
  for (let i = 0; i < 18; i++) {
    const a = S.rng.range(0, Math.PI * 2), sp = S.rng.range(40, 220);
    S.particles.push({ kind: 'spark', x: car.x, y: car.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: S.rng.range(0.3, 0.8), t: 0, size: 3 });
  }
  S.audio?.explosion();
  S.shake = Math.min(14, (S.shake || 0) + 8);
  // Chain: nearby damaged cars catch, nearby people and the player take damage.
  for (const other of S.cars) {
    if (other === car || other.dead) continue;
    const d = Math.hypot(other.x - car.x, other.y - car.y);
    if (d < 120) { other.hp -= 55; if (other.hp <= 25 && other.explodeT === 0) other.explodeT = S.rng.range(0.5, 1.3); }
  }
  const pd = Math.hypot(S.player.x - car.x, S.player.y - car.y);
  if (pd < 110 && !S.player.car) S.damagePlayer(34 * (1 - pd / 130));
  if (S.player.car && Math.hypot(S.player.car.x - car.x, S.player.car.y - car.y) < 120) S.damagePlayer(18);
  for (const p of S.peds) if (Math.hypot(p.x - car.x, p.y - car.y) < 100) { p.state = 'flee'; p.hp -= 40; }
  S.addWanted(1, 'explosion');
}

export function stealNearestCar(S) {
  let best = null, bestD = 70 * 70;
  for (const car of S.cars) {
    if (car.dead) continue;
    const d = (car.x - S.player.x) ** 2 + (car.y - S.player.y) ** 2;
    if (d < bestD) { bestD = d; best = car; }
  }
  if (!best) return null;
  best.driver = false;
  S.player.car = best;
  S.player.x = best.x; S.player.y = best.y;
  if (best.kind === 'civilian' && Math.abs(best.speed) > 20) S.addWanted(1, 'carjacking');
  else if (best.kind === 'civilian') S.addWanted(0.5, 'carjacking');
  S.audio?.door();
  return best;
}

export function exitCar(S) {
  const car = S.player.car;
  if (!car) return;
  S.player.car = null;
  S.player.x = car.x - Math.sin(car.angle) * 30;
  S.player.y = car.y + Math.cos(car.angle) * 30;
  S.audio?.door();
}
