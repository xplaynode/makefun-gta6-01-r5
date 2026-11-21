// harbour.js — Caldera Bay's working harbour: moored fishing boats that bob on
// the tide, the Port Azul ferry that crosses the bay on a timetable and docks at
// Faro Point, channel buoys, the Faro lighthouse with its rotating beam at dusk,
// pier planks and mooring posts, and gull perches. The ferry is a real moving
// object: its position is a function of the game clock, it slows near docks,
// sounds its horn on departure, and its timetable is shown at both piers.

import { WORLD_W, SEA_Y, clamp } from './config.js';
import { Rng } from './random.js';

export const FERRY_ROUTE = {
  from: { x: 3560, y: 3160, name: 'Port Azul Pier' },
  to: { x: 4520, y: 3160, name: 'Faro Point Pier' },
  crossingSeconds: 46, dockSeconds: 16,
};
export const LIGHTHOUSE = { x: 4920, y: 3060, height: 86 };

export function makeHarbour(seed) {
  const rng = new Rng(seed * 67 + 300);
  const boats = [];
  const boatNames = ['MARISOL', 'ONDINA', 'SALITRE', 'BRISA II', 'CORALINA', 'FARITO', 'MAREA ALTA', 'PESCADOR', 'LUZ DEL SUR', 'CALDERA QUEEN', 'VIEJA GLORIA', 'SOLSTICIO'];
  for (let i = 0; i < boatNames.length; i++) {
    boats.push({
      name: boatNames[i], x: 260 + i * 390 + rng.range(-70, 70), y: SEA_Y + rng.range(90, 210),
      angle: rng.range(-0.3, 0.3), len: rng.range(44, 74), hue: rng.pick(['#e8e4da', '#d94f3d', '#3d7bd9', '#37b8a5', '#e8a13a']),
      bobPhase: rng.range(0, 6.28), mast: rng.chance(0.7), nets: rng.chance(0.5),
    });
  }
  const buoys = [];
  for (let i = 0; i < 9; i++) buoys.push({ x: 500 + i * 540, y: SEA_Y + 300 + (i % 2) * 60, phase: rng.range(0, 6.28), red: i % 2 === 0 });
  const piers = [
    { x: 3480, y: 2980, w: 170, h: 26, name: 'PORT AZUL PIER' },
    { x: 4440, y: 2980, w: 170, h: 26, name: 'FARO PIER' },
    { x: 300, y: 2980, w: 220, h: 26, name: 'MARINA VIEJA PIER' },
  ];
  return {
    boats, buoys, piers,
    ferry: { x: FERRY_ROUTE.from.x, y: FERRY_ROUTE.from.y, angle: 0, state: 'docked', t: 6, hornAt: -99, wake: [] },
    beamAngle: 0,
  };
}

export function ferryTimetable() {
  const cycle = FERRY_ROUTE.crossingSeconds + FERRY_ROUTE.dockSeconds;
  return `Ferry: Port Azul ⇄ Faro Point — crossing ${FERRY_ROUTE.crossingSeconds}s, every ${cycle * 2}s round trip`;
}

export function updateHarbour(S, dt) {
  const h = S.harbour;
  const f = h.ferry;
  const cycle = FERRY_ROUTE.crossingSeconds + FERRY_ROUTE.dockSeconds;
  f.t += dt;
  // State machine: docked -> crossing-to -> docked -> crossing-back.
  const phase = f.t % (cycle * 2);
  let from = FERRY_ROUTE.from, to = FERRY_ROUTE.to;
  let local = phase;
  if (phase >= cycle) { from = FERRY_ROUTE.to; to = FERRY_ROUTE.from; local = phase - cycle; }
  if (local < FERRY_ROUTE.dockSeconds) {
    f.state = 'docked'; f.x = from.x; f.y = from.y; f.angle = Math.atan2(to.y - from.y, to.x - from.x);
    if (local > FERRY_ROUTE.dockSeconds - 0.12 && f.hornAt !== Math.floor(f.t)) { f.hornAt = Math.floor(f.t); }
  } else {
    const ct = (local - FERRY_ROUTE.dockSeconds) / FERRY_ROUTE.crossingSeconds;
    const ease = ct < 0.14 ? ct * ct / 0.14 : ct > 0.86 ? 1 - (1 - ct) * (1 - ct) / 0.14 : ct;
    f.state = 'crossing';
    f.x = from.x + (to.x - from.x) * ease;
    f.y = from.y + (to.y - from.y) * ease + Math.sin(ct * Math.PI) * -18;
    f.angle = Math.atan2(to.y - from.y, to.x - from.x);
    if (S.time % 0.12 < dt) f.wake.push({ x: f.x - Math.cos(f.angle) * 44, y: f.y - Math.sin(f.angle) * 44, age: 0 });
  }
  for (const w of f.wake) w.age += dt;
  f.wake = f.wake.filter(w => w.age < 2.6);
  h.beamAngle += dt * (S.dayT > 0.62 || S.dayT < 0.1 ? 0.55 : 0.12);
  for (const b of h.boats) b.bobPhase += dt * 0.9;
  for (const bu of h.buoys) bu.phase += dt * 1.3;
}

export function drawHarbour(ctx, S, vx, vy) {
  const h = S.harbour;
  // Piers.
  for (const pier of h.piers) {
    const x = pier.x - vx, y = pier.y - vy;
    if (x < -260 || x > 1540 || y < -80 || y > 800) continue;
    ctx.fillStyle = '#8a6a44'; ctx.fillRect(x, y, pier.w, pier.h);
    ctx.strokeStyle = '#6a4e2e'; ctx.lineWidth = 2;
    for (let px = 0; px < pier.w; px += 18) { ctx.beginPath(); ctx.moveTo(x + px, y); ctx.lineTo(x + px, y + pier.h); ctx.stroke(); }
    ctx.fillStyle = '#fff'; ctx.font = 'bold 10px system-ui'; ctx.textAlign = 'center';
    ctx.fillText(pier.name, x + pier.w / 2, y - 6);
    ctx.fillStyle = '#5e4630';
    for (let px = 8; px < pier.w; px += 42) ctx.fillRect(x + px, y + pier.h - 4, 6, 12);
  }
  // Moored boats.
  for (const b of h.boats) {
    const bob = Math.sin(b.bobPhase) * 2.2;
    const x = b.x - vx, y = b.y - vy + bob;
    if (x < -110 || x > 1390 || y < -80 || y > 800) continue;
    ctx.save(); ctx.translate(x, y); ctx.rotate(b.angle + Math.sin(b.bobPhase * 0.6) * 0.03);
    ctx.fillStyle = 'rgba(10,40,60,0.35)'; ctx.beginPath(); ctx.ellipse(0, 8, b.len * 0.55, 8, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = b.hue;
    ctx.beginPath(); ctx.moveTo(-b.len / 2, 0); ctx.lineTo(-b.len * 0.3, -9); ctx.lineTo(b.len * 0.34, -9); ctx.lineTo(b.len / 2, 0); ctx.lineTo(b.len * 0.3, 7); ctx.lineTo(-b.len * 0.34, 7); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#e8e0d0'; ctx.fillRect(-8, -17, 17, 9);
    if (b.mast) { ctx.strokeStyle = '#4a3a28'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(2, -8); ctx.lineTo(2, -30); ctx.stroke(); }
    if (b.nets) { ctx.strokeStyle = 'rgba(240,240,230,0.6)'; ctx.lineWidth = 1; ctx.strokeRect(-b.len * 0.3, 2, 16, 6); }
    ctx.fillStyle = '#fff'; ctx.font = 'bold 8px system-ui'; ctx.textAlign = 'center';
    ctx.fillText(b.name, 0, 18);
    ctx.restore();
  }
  // Buoys.
  for (const bu of h.buoys) {
    const x = bu.x - vx, y = bu.y - vy + Math.sin(bu.phase) * 3;
    if (x < -30 || x > 1310 || y < -30 || y > 750) continue;
    ctx.fillStyle = bu.red ? '#d94f3d' : '#3fae5a';
    ctx.beginPath(); ctx.moveTo(x, y - 10); ctx.lineTo(x + 7, y + 5); ctx.lineTo(x - 7, y + 5); ctx.closePath(); ctx.fill();
    if (S.dayT > 0.62) { ctx.fillStyle = Math.sin(S.time * 3 + bu.phase) > 0 ? '#ffd76a' : 'rgba(255,215,110,0.2)'; ctx.beginPath(); ctx.arc(x, y - 11, 2.6, 0, Math.PI * 2); ctx.fill(); }
  }
  // The ferry, with wake.
  const f = h.ferry;
  for (const w of f.wake) {
    ctx.fillStyle = `rgba(255,255,255,${0.3 * (1 - w.age / 2.6)})`;
    ctx.beginPath(); ctx.ellipse(w.x - vx, w.y - vy, 16 + w.age * 13, 5 + w.age * 3, 0, 0, Math.PI * 2); ctx.fill();
  }
  const fx = f.x - vx, fy = f.y - vy;
  if (fx > -160 && fx < 1440 && fy > -120 && fy < 840) {
    ctx.save(); ctx.translate(fx, fy); ctx.rotate(f.angle);
    ctx.fillStyle = 'rgba(10,40,60,0.4)'; ctx.fillRect(-52, 6, 108, 16);
    ctx.fillStyle = '#e8e4da'; ctx.fillRect(-54, -13, 108, 24);
    ctx.fillStyle = '#d94f3d'; ctx.fillRect(-54, 5, 108, 6);
    ctx.fillStyle = '#9fd4e8'; for (let i = 0; i < 6; i++) ctx.fillRect(-44 + i * 16, -8, 10, 7);
    ctx.fillStyle = '#2c2830'; ctx.fillRect(28, -22, 12, 10);
    ctx.restore();
    ctx.fillStyle = '#fff'; ctx.font = 'bold 11px system-ui'; ctx.textAlign = 'center';
    ctx.fillText(f.state === 'docked' ? 'FERRY — DOCKED' : 'FERRY — CROSSING', fx, fy - 26);
  }
  drawLighthouse(ctx, S, vx, vy);
}

function drawLighthouse(ctx, S, vx, vy) {
  const x = LIGHTHOUSE.x - vx, y = LIGHTHOUSE.y - vy;
  if (x < -320 || x > 1600 || y < -200 || y > 920) return;
  // Rotating beam at dusk/night.
  const dark = S.dayT > 0.6 || S.dayT < 0.12;
  if (dark) {
    const a = S.harbour.beamAngle;
    const grad = ctx.createRadialGradient(x, y - LIGHTHOUSE.height, 4, x, y - LIGHTHOUSE.height, 330);
    grad.addColorStop(0, 'rgba(255,240,170,0.4)'); grad.addColorStop(1, 'rgba(255,240,170,0)');
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.moveTo(x, y - LIGHTHOUSE.height);
    ctx.lineTo(x + Math.cos(a - 0.16) * 330, y - LIGHTHOUSE.height + Math.sin(a - 0.16) * 330);
    ctx.lineTo(x + Math.cos(a + 0.16) * 330, y - LIGHTHOUSE.height + Math.sin(a + 0.16) * 330);
    ctx.closePath(); ctx.fill();
  }
  // Tower: striped cone on the point.
  ctx.fillStyle = '#e8e4da';
  ctx.beginPath(); ctx.moveTo(x - 15, y); ctx.lineTo(x - 9, y - LIGHTHOUSE.height); ctx.lineTo(x + 9, y - LIGHTHOUSE.height); ctx.lineTo(x + 15, y); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#d94f3d';
  ctx.beginPath(); ctx.moveTo(x - 12.4, y - 28); ctx.lineTo(x - 10.8, y - 48); ctx.lineTo(x + 10.8, y - 48); ctx.lineTo(x + 12.4, y - 28); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#2c2830'; ctx.fillRect(x - 10, y - LIGHTHOUSE.height - 12, 20, 12);
  ctx.fillStyle = dark ? '#ffd76a' : '#ffeeb0'; ctx.beginPath(); ctx.arc(x, y - LIGHTHOUSE.height - 6, 5.4, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.font = 'bold 10px system-ui'; ctx.textAlign = 'center';
  ctx.fillText('FARO', x, y + 14);
}
export { clamp };
