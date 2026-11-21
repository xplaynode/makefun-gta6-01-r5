// effects.js — transient visual effects for Caldera Bay: Vice Tide: tyre skid
// marks that fade over a minute, ejected shell casings, muzzle smoke, impact
// decals on cars, speed lines at nitro pace, heat shimmer over burning wrecks,
// and the red/blue police light wash that tints the frame during a pursuit.
// Effects are capped pools so a long session never grows memory without bound.

import { clamp } from './config.js';

const MAX_SKIDS = 420;
const MAX_CASINGS = 120;
const MAX_DECALS = 160;

export function makeEffects() {
  return { skids: [], casings: [], decals: [], speedLines: [], shimmerT: 0, lightWashPhase: 0 };
}

export function addSkid(S, x, y, angle, strength) {
  const fx = S.effects;
  fx.skids.push({ x, y, angle, strength, age: 0, life: 55 });
  if (fx.skids.length > MAX_SKIDS) fx.skids.splice(0, fx.skids.length - MAX_SKIDS);
}
export function addCasing(S, x, y) {
  const fx = S.effects;
  const a = S.rng.range(0, Math.PI * 2);
  fx.casings.push({ x, y, vx: Math.cos(a) * S.rng.range(20, 60), vy: Math.sin(a) * S.rng.range(20, 60) - 12, rot: S.rng.range(0, 6.28), age: 0, life: 7 });
  if (fx.casings.length > MAX_CASINGS) fx.casings.splice(0, fx.casings.length - MAX_CASINGS);
}
export function addDecal(S, car, x, y) {
  const fx = S.effects;
  fx.decals.push({ carId: car.id, lx: x - car.x, ly: y - car.y, size: S.rng.range(4, 9), age: 0 });
  if (fx.decals.length > MAX_DECALS) fx.decals.splice(0, fx.decals.length - MAX_DECALS);
}

export function updateEffects(S, dt) {
  const fx = S.effects;
  fx.lightWashPhase += dt * 7;
  // Skid marks from the player's car under hard steering, braking or nitro.
  const car = S.player.car;
  if (car && Math.abs(car.speed) > 130) {
    const steerHard = Math.abs(Math.sin(car.angle - (car.lastAngle ?? car.angle))) > 0.002;
    if (steerHard || S.boostT > 0) {
      const backX = car.x - Math.cos(car.angle) * 16, backY = car.y - Math.sin(car.angle) * 16;
      const sideX = Math.cos(car.angle + Math.PI / 2) * 10, sideY = Math.sin(car.angle + Math.PI / 2) * 10;
      addSkid(S, backX + sideX, backY + sideY, car.angle, clamp(Math.abs(car.speed) / 340, 0.2, 1));
      addSkid(S, backX - sideX, backY - sideY, car.angle, clamp(Math.abs(car.speed) / 340, 0.2, 1));
    }
  }
  if (car) car.lastAngle = car.angle;
  for (const sk of fx.skids) sk.age += dt;
  fx.skids = fx.skids.filter(sk => sk.age < sk.life);
  for (const c of fx.casings) {
    c.age += dt; c.x += c.vx * dt; c.y += c.vy * dt;
    c.vx *= 0.86; c.vy *= 0.86; c.rot += dt * 4;
  }
  fx.casings = fx.casings.filter(c => c.age < c.life);
  // Speed lines while nitro burns.
  fx.speedLines = fx.speedLines.filter(l => (l.age += dt) < 0.32);
  if (S.boostT > 0 && car) {
    for (let i = 0; i < 3; i++) {
      fx.speedLines.push({ x: S.player.x + S.rng.range(-260, 260), y: S.player.y + S.rng.range(-160, 160), age: 0, len: S.rng.range(26, 60), angle: car.angle });
    }
  }
}

export function drawEffectsBelow(ctx, S, vx, vy) {
  const fx = S.effects;
  // Skid marks lie on the asphalt, under everything else.
  for (const sk of fx.skids) {
    const x = sk.x - vx, y = sk.y - vy;
    if (x < -30 || x > 1310 || y < -30 || y > 750) continue;
    ctx.save(); ctx.translate(x, y); ctx.rotate(sk.angle);
    ctx.fillStyle = `rgba(18,14,18,${0.4 * sk.strength * (1 - sk.age / sk.life)})`;
    ctx.fillRect(-7, -2, 14, 4);
    ctx.restore();
  }
  // Shell casings glint on the ground.
  ctx.fillStyle = '#d9a441';
  for (const c of fx.casings) {
    const x = c.x - vx, y = c.y - vy;
    if (x < -10 || x > 1290 || y < -10 || y > 730) continue;
    ctx.save(); ctx.translate(x, y); ctx.rotate(c.rot); ctx.fillRect(-2.4, -1, 4.8, 2); ctx.restore();
  }
}

export function drawEffectsAbove(ctx, S, vx, vy) {
  const fx = S.effects;
  // Impact decals ride on their cars.
  ctx.fillStyle = 'rgba(24,20,24,0.65)';
  for (const d of fx.decals) {
    const car = S.cars.find(c => c.id === d.carId) || S.cops.find(c => c.id === d.carId);
    if (!car) continue;
    const x = car.x + d.lx - vx, y = car.y + d.ly - vy;
    if (x < -40 || x > 1320 || y < -40 || y > 760) continue;
    ctx.beginPath(); ctx.arc(x, y, d.size, 0, Math.PI * 2); ctx.fill();
  }
  // Speed lines.
  ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 2;
  for (const l of fx.speedLines) {
    const x = l.x - vx, y = l.y - vy;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - Math.cos(l.angle) * l.len, y - Math.sin(l.angle) * l.len); ctx.stroke();
  }
  // Police light wash: alternating red/blue tint at the frame edges in pursuit.
  if (S.wanted >= 1 && S.cops.some(c => !c.dead)) {
    const phase = Math.sin(fx.lightWashPhase) > 0;
    ctx.fillStyle = phase ? 'rgba(255,40,30,0.05)' : 'rgba(50,110,255,0.05)';
    ctx.fillRect(0, 0, 1280, 720);
  }
  // Heat shimmer ticks above burning wrecks are drawn as rising wavy strokes.
  ctx.strokeStyle = 'rgba(255,200,120,0.35)'; ctx.lineWidth = 1.4;
  for (const car of [...S.cars, ...S.cops]) {
    if (car.dead || car.hp > 25 || car.hp <= 0) continue;
    const x = car.x - vx, y = car.y - vy - 18;
    if (x < -40 || x > 1320 || y < -40 || y > 760) continue;
    ctx.beginPath();
    for (let i = 0; i < 4; i++) ctx.lineTo(x - 9 + i * 6, y - i * 5 + Math.sin(S.time * 11 + i * 2 + car.id) * 2);
    ctx.stroke();
  }
}
