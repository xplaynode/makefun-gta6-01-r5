// render.js — the Caldera Bay look: pseudo-height buildings extruded toward the
// light with cast shadows, a golden-hour/dusk palette driven by a slow day cycle,
// road markings, palms, lamps that glow at night, market stalls, beach and animated
// sea, cars with brake lights and damage smoke, the CONDOR spotlight cone, and the
// player on foot with a drawn-weapon aim line. Pure canvas, no images.

import { ROAD_W, SEA_Y, BEACH_Y, clamp, lerp, VIEW_W, VIEW_H } from './config.js';
import { roadCentresX, roadCentresY } from './world.js';

export function dayPalette(dayT) {
  // dayT: 0 = dawn, 0.25 = noon, 0.5 = afternoon, 0.74 = golden hour, 0.9 = night.
  const stops = [
    { t: 0.0, sky: '#e8906a', ground: '#8a7a5c', road: '#4c4450', sun: 0.5 },
    { t: 0.25, sky: '#ffe9b0', ground: '#a89a6c', road: '#5a5260', sun: 1.0 },
    { t: 0.5, sky: '#ffc98a', ground: '#9c8a60', road: '#554c5a', sun: 0.85 },
    { t: 0.74, sky: '#ff9a5c', ground: '#8a7452', road: '#4a4250', sun: 0.55 },
    { t: 0.88, sky: '#7a4a7a', ground: '#5e5248', road: '#38323e', sun: 0.25 },
    { t: 1.0, sky: '#e8906a', ground: '#8a7a5c', road: '#4c4450', sun: 0.5 },
  ];
  let a = stops[0], b = stops[stops.length - 1];
  for (let i = 0; i < stops.length - 1; i++) if (dayT >= stops[i].t && dayT <= stops[i + 1].t) { a = stops[i]; b = stops[i + 1]; break; }
  const f = clamp((dayT - a.t) / Math.max(0.001, b.t - a.t), 0, 1);
  return { ground: mix(a.ground, b.ground, f), road: mix(a.road, b.road, f), sun: lerp(a.sun, b.sun, f), sky: mix(a.sky, b.sky, f) };
}
function mix(c1, c2, f) {
  const a = parseInt(c1.slice(1), 16), b = parseInt(c2.slice(1), 16);
  const r = Math.round(lerp(a >> 16, b >> 16, f)), g = Math.round(lerp((a >> 8) & 255, (b >> 8) & 255, f)), bl = Math.round(lerp(a & 255, b & 255, f));
  return `rgb(${r},${g},${bl})`;
}
export function sunVector(dayT) {
  const ang = Math.PI * (0.15 + dayT * 0.7);
  return { x: Math.cos(ang), y: Math.sin(ang) * 0.6 + 0.25 };
}

export function drawWorld(ctx, S) {
  const pal = dayPalette(S.dayT);
  const cam = S.camera;
  const vx = cam.x - VIEW_W / 2, vy = cam.y - VIEW_H / 2;
  ctx.fillStyle = pal.ground;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  drawSeaAndBeach(ctx, S, vx, vy);
  drawRoads(ctx, S, vx, vy, pal);
  drawStalls(ctx, S, vx, vy);
  drawCrates(ctx, S, vx, vy);
  drawPalms(ctx, S, vx, vy, false);
  drawBuildings(ctx, S, vx, vy, pal);
  drawLamps(ctx, S, vx, vy, pal);
  drawServiceMarkers(ctx, S, vx, vy);
  drawObjectiveMarker(ctx, S, vx, vy);
  for (const car of S.cars) drawCar(ctx, S, car, vx, vy, pal);
  for (const cop of S.cops) drawCar(ctx, S, cop, vx, vy, pal, true);
  if (S.race.active) for (const r of S.race.racers) drawCar(ctx, S, r, vx, vy, pal);
  for (const ped of S.peds) drawPed(ctx, S, ped, vx, vy);
  drawRoadblocks(ctx, S, vx, vy);
  if (!S.player.car) drawPlayer(ctx, S, vx, vy);
  else drawPlayerInCar(ctx, S, vx, vy);
  drawParticles(ctx, S, vx, vy);
  drawPickups(ctx, S, vx, vy);
  if (S.heli) drawHeli(ctx, S, vx, vy);
  drawDayOverlay(ctx, S, pal);
}

function drawSeaAndBeach(ctx, S, vx, vy) {
  const sandY = BEACH_Y - vy, seaY = SEA_Y - vy;
  if (seaY < VIEW_H) {
    ctx.fillStyle = '#e6cf9a';
    ctx.fillRect(0, Math.max(0, sandY), VIEW_W, Math.max(0, seaY - Math.max(0, sandY)));
    const grad = ctx.createLinearGradient(0, seaY, 0, VIEW_H);
    grad.addColorStop(0, '#3fa7b8'); grad.addColorStop(1, '#1d5e7a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, Math.max(0, seaY), VIEW_W, VIEW_H - Math.max(0, seaY));
    ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 2;
    for (let i = 0; i < 7; i++) {
      const wy = seaY + 14 + i * 26 + Math.sin(S.time * 1.4 + i) * 4;
      ctx.beginPath();
      for (let x = 0; x <= VIEW_W; x += 42) ctx.lineTo(x, wy + Math.sin(S.time * 2 + x * 0.02 + i * 2) * 3);
      ctx.stroke();
    }
    // Causeway to Faro Point.
    ctx.fillStyle = '#554c5a';
    ctx.fillRect(3980 - vx, seaY - 8, 1100, 20);
  }
}

function drawRoads(ctx, S, vx, vy, pal) {
  ctx.fillStyle = pal.road;
  for (const rx of roadCentresX()) ctx.fillRect(rx - ROAD_W / 2 - vx, 0, ROAD_W, Math.min(VIEW_H, BEACH_Y - vy));
  for (const ry of roadCentresY()) ctx.fillRect(0, ry - ROAD_W / 2 - vy, VIEW_W, ROAD_W);
  // Sidewalk edges.
  ctx.fillStyle = 'rgba(240,230,210,0.35)';
  for (const rx of roadCentresX()) { ctx.fillRect(rx - ROAD_W / 2 - 5 - vx, 0, 4, VIEW_H); ctx.fillRect(rx + ROAD_W / 2 + 1 - vx, 0, 4, VIEW_H); }
  // Centre dashes.
  ctx.fillStyle = '#f2d13d';
  for (const rx of roadCentresX()) for (let y = -vy % 64; y < VIEW_H; y += 64) ctx.fillRect(rx - 2 - vx, y, 4, 30);
  for (const ry of roadCentresY()) for (let x = -vx % 64; x < VIEW_W; x += 64) ctx.fillRect(x, ry - 2 - vy, 30, 4);
  // Crosswalks at junctions.
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  for (const rx of roadCentresX()) for (const ry of roadCentresY()) {
    if (rx - vx < -80 || rx - vx > VIEW_W + 80 || ry - vy < -80 || ry - vy > VIEW_H + 80) continue;
    for (let i = -2; i <= 2; i++) ctx.fillRect(rx - ROAD_W / 2 - vx, ry + i * 14 - 3 - vy, ROAD_W, 6);
  }
}

function drawBuildings(ctx, S, vx, vy, pal) {
  const sun = sunVector(S.dayT);
  // Shadows first, offset by sun direction and building height.
  ctx.fillStyle = 'rgba(30,16,30,0.34)';
  for (const b of S.world.buildings) {
    const sx = b.x - vx + sun.x * b.height * 0.9, sy = b.y - vy + sun.y * b.height * 0.9;
    if (sx < -260 || sx > VIEW_W + 260 || sy < -260 || sy > VIEW_H + 260) continue;
    ctx.fillRect(sx, sy, b.w, b.h);
  }
  for (const b of S.world.buildings) {
    const x = b.x - vx, y = b.y - vy;
    if (x < -260 || x > VIEW_W + 260 || y < -260 || y > VIEW_H + 260) continue;
    // Pseudo-height: draw the wall face offset up-left, then the roof on top.
    const lift = b.height * 0.42;
    ctx.fillStyle = b.wall;
    ctx.fillRect(x - lift * 0.4, y - lift * 0.4, b.w, b.h);
    ctx.fillStyle = b.roof;
    ctx.fillRect(x - lift * 0.55, y - lift * 0.55, b.w, b.h);
    ctx.fillStyle = b.roofDark;
    ctx.fillRect(x - lift * 0.55, y - lift * 0.55 + b.h - 8, b.w, 8);
    // Windows: lit at dusk.
    const lit = pal.sun < 0.7;
    ctx.fillStyle = lit ? '#ffd76a' : 'rgba(40,50,70,0.65)';
    const cols = Math.max(2, Math.floor(b.w / 26)), rows = Math.max(2, Math.floor(b.h / 26));
    for (let cx = 0; cx < cols; cx++) for (let cy = 0; cy < rows; cy++) {
      if ((cx * 7 + cy * 13 + b.windows) % 3 === 0) continue;
      ctx.fillRect(x - lift * 0.55 + 8 + cx * 24, y - lift * 0.55 + 8 + cy * 24, 11, 13);
    }
    if (b.awning) { ctx.fillStyle = '#c2557a'; ctx.fillRect(x - lift * 0.55, y - lift * 0.55 + b.h - 20, b.w, 9); }
    if (b.sign) {
      ctx.font = 'bold 11px system-ui, sans-serif'; ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(20,12,20,0.72)';
      const tw = ctx.measureText(b.sign).width + 12;
      ctx.fillRect(x + b.w / 2 - tw / 2 - lift * 0.55, y - lift * 0.55 - 2, tw, 16);
      ctx.fillStyle = '#ffe9b0';
      ctx.fillText(b.sign, x + b.w / 2 - lift * 0.55, y - lift * 0.55 + 10);
    }
  }
}

function drawPalms(ctx, S, vx, vy) {
  for (const p of S.world.palms) {
    const x = p.x - vx, y = p.y - vy;
    if (x < -50 || x > VIEW_W + 50 || y < -50 || y > VIEW_H + 50) continue;
    ctx.strokeStyle = '#7a5a38'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + p.lean * 30, y - 16 * p.s, x + p.lean * 52, y - 26 * p.s); ctx.stroke();
    ctx.strokeStyle = '#3f8c4f'; ctx.lineWidth = 3;
    const topX = x + p.lean * 52, topY = y - 26 * p.s;
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + 0.4;
      ctx.beginPath(); ctx.moveTo(topX, topY); ctx.quadraticCurveTo(topX + Math.cos(a) * 15 * p.s, topY + Math.sin(a) * 8 * p.s - 4, topX + Math.cos(a) * 24 * p.s, topY + Math.sin(a) * 13 * p.s + 4); ctx.stroke();
    }
  }
}

function drawLamps(ctx, S, vx, vy, pal) {
  const night = pal.sun < 0.62;
  for (const l of S.world.lamps) {
    const x = l.x - vx, y = l.y - vy;
    if (x < -60 || x > VIEW_W + 60 || y < -60 || y > VIEW_H + 60) continue;
    ctx.fillStyle = '#2c2830'; ctx.fillRect(x - 2, y - 14, 4, 16);
    if (night) {
      const g = ctx.createRadialGradient(x, y - 16, 2, x, y - 16, 44);
      g.addColorStop(0, 'rgba(255,205,110,0.55)'); g.addColorStop(1, 'rgba(255,205,110,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y - 16, 44, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = night ? '#ffd76a' : '#d9d4c5';
    ctx.beginPath(); ctx.arc(x, y - 16, 4, 0, Math.PI * 2); ctx.fill();
  }
}

function drawStalls(ctx, S, vx, vy) {
  for (const st of S.world.stalls) {
    const x = st.x - vx, y = st.y - vy;
    if (x < -70 || x > VIEW_W + 70 || y < -70 || y > VIEW_H + 70) continue;
    ctx.fillStyle = 'rgba(30,16,30,0.25)'; ctx.fillRect(x - 18, y + 8, 44, 18);
    ctx.fillStyle = '#8a6a44'; ctx.fillRect(x - 20, y - 4, 44, 20);
    ctx.fillStyle = st.hue; ctx.fillRect(x - 24, y - 14, 52, 10);
    ctx.fillStyle = '#fff';
    for (let i = 0; i < 4; i++) ctx.fillRect(x - 24 + i * 13, y - 14, 6, 10);
    ctx.fillStyle = st.goods === 'fish' ? '#9fd4e8' : st.goods === 'fruit' ? '#f2a13d' : st.goods === 'flowers' ? '#e85d8a' : '#7fb069';
    ctx.fillRect(x - 14, y, 32, 7);
  }
}

function drawCrates(ctx, S, vx, vy) {
  for (const c of S.world.crates) {
    if (c.hp <= 0) continue;
    const x = c.x - vx, y = c.y - vy;
    if (x < -50 || x > VIEW_W + 50 || y < -50 || y > VIEW_H + 50) continue;
    ctx.fillStyle = 'rgba(30,16,30,0.3)'; ctx.fillRect(x + 4, y + 5, c.size, c.size);
    ctx.fillStyle = '#a87c4c'; ctx.fillRect(x, y, c.size, c.size);
    ctx.strokeStyle = '#7a5a30'; ctx.lineWidth = 2; ctx.strokeRect(x + 1, y + 1, c.size - 2, c.size - 2);
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + c.size, y + c.size); ctx.moveTo(x + c.size, y); ctx.lineTo(x, y + c.size); ctx.stroke();
  }
}

function drawServiceMarkers(ctx, S, vx, vy) {
  for (const svc of S.world.services) {
    const x = svc.x - vx, y = svc.y - vy;
    if (x < -160 || x > VIEW_W + 160 || y < -120 || y > VIEW_H + 120) continue;
    ctx.fillStyle = svc.kind === 'garage' ? '#37424e' : svc.kind === 'shop' ? '#5e3a5e' : '#3f5e46';
    ctx.fillRect(x, y, svc.w, svc.h);
    ctx.fillStyle = '#ffd76a'; ctx.font = 'bold 12px system-ui, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(svc.kind.toUpperCase(), x + svc.w / 2, y + 26);
    ctx.fillStyle = '#fff'; ctx.font = '10px system-ui, sans-serif';
    ctx.fillText(svc.name, x + svc.w / 2, y + 44);
    const pulse = 3 + Math.sin(S.time * 4) * 1.6;
    ctx.strokeStyle = '#ffd76a'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x + svc.w / 2, y + svc.h / 2, 52 + pulse, 0, Math.PI * 2); ctx.stroke();
  }
}

function drawObjectiveMarker(ctx, S, vx, vy) {
  const target = S.objectiveTarget;
  if (!target || S.mode !== 'play') return;
  const x = target.x - vx, y = target.y - vy;
  const bob = Math.sin(S.time * 3.4) * 6;
  ctx.fillStyle = '#ffd21f';
  ctx.beginPath(); ctx.arc(x, y, 26 + bob * 0.3, 0, Math.PI * 2); ctx.globalAlpha = 0.3; ctx.fill(); ctx.globalAlpha = 1;
  ctx.beginPath(); ctx.moveTo(x, y - 44 + bob); ctx.lineTo(x - 13, y - 20 + bob); ctx.lineTo(x + 13, y - 20 + bob); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#1c1410'; ctx.font = 'bold 15px system-ui, sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('!', x, y - 26 + bob);
  // Off-screen arrow at the view edge.
  if (x < 0 || x > VIEW_W || y < 0 || y > VIEW_H) {
    const cx = clamp(x, 40, VIEW_W - 40), cy = clamp(y, 40, VIEW_H - 40);
    const a = Math.atan2(y - VIEW_H / 2, x - VIEW_W / 2);
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(a);
    ctx.fillStyle = '#ffd21f'; ctx.beginPath(); ctx.moveTo(18, 0); ctx.lineTo(-10, -11); ctx.lineTo(-10, 11); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
}

export function drawCar(ctx, S, car, vx, vy, pal, isCop = false) {
  const x = car.x - vx, y = car.y - vy;
  if (x < -90 || x > VIEW_W + 90 || y < -90 || y > VIEW_H + 90) return;
  ctx.save(); ctx.translate(x, y); ctx.rotate(car.angle);
  ctx.fillStyle = 'rgba(20,10,20,0.4)'; ctx.fillRect(-car.w / 2 + 5, -car.h / 2 + 6, car.w, car.h);
  ctx.fillStyle = car.dead ? '#2e2a2e' : car.color;
  roundRect(ctx, -car.w / 2, -car.h / 2, car.w, car.h, 6); ctx.fill();
  ctx.fillStyle = 'rgba(20,30,46,0.9)';
  roundRect(ctx, -car.w * 0.08, -car.h / 2 + 3, car.w * 0.34, car.h - 6, 4); ctx.fill();
  ctx.fillStyle = 'rgba(180,220,240,0.85)';
  roundRect(ctx, car.w * 0.3, -car.h / 2 + 4, car.w * 0.12, car.h - 8, 3); ctx.fill();
  ctx.fillStyle = '#191919';
  for (const [wx, wy] of [[-car.w / 2 + 8, -car.h / 2 - 2], [car.w / 2 - 8, -car.h / 2 - 2], [-car.w / 2 + 8, car.h / 2 - 2], [car.w / 2 - 8, car.h / 2 - 2]]) { ctx.fillRect(wx - 4, wy, 8, 5); }
  // Brake lights and headlights.
  ctx.fillStyle = car.brakeT > 0 || car.speed < 4 && car.driver ? '#ff2a1a' : '#8c1f16';
  ctx.fillRect(-car.w / 2 - 2, -car.h / 2 + 2, 3, 6); ctx.fillRect(-car.w / 2 - 2, car.h / 2 - 8, 3, 6);
  ctx.fillStyle = '#ffeeb0';
  ctx.fillRect(car.w / 2 - 1, -car.h / 2 + 2, 3, 6); ctx.fillRect(car.w / 2 - 1, car.h / 2 - 8, 3, 6);
  if (isCop) {
    ctx.fillStyle = '#274b9f'; ctx.fillRect(-car.w * 0.28, -car.h / 2, car.w * 0.56, car.h);
    ctx.fillStyle = (Math.floor(S.time * 6) % 2 === 0) ? '#ff3b30' : '#3d7bd9';
    ctx.fillRect(-6, -4, 12, 8);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 8px system-ui'; ctx.textAlign = 'center';
    ctx.fillText(car.kind === 'ram' ? 'RAM' : 'CBPD', 0, car.h / 2 + 11);
  }
  if (car.hp < 60 && !car.dead) { ctx.fillStyle = 'rgba(30,30,30,0.5)'; ctx.fillRect(-car.w / 2, -car.h / 2, car.w * (1 - car.hp / 100), 4); }
  ctx.restore();
}

function drawRoadblocks(ctx, S, vx, vy) {
  for (const rb of S.roadblocks) {
    for (const u of rb.units) {
      drawCar(ctx, S, { x: u.x, y: u.y, angle: u.angle, w: 50, h: 24, color: '#e8ecf2', dead: false, hp: 130, driver: false, brakeT: 1, speed: 0, kind: 'patrol' }, vx, vy, null, true);
    }
    ctx.fillStyle = '#f2792a';
    const bx = rb.x - vx, by = rb.y - vy;
    for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(bx + i * 30, by - 8); ctx.lineTo(bx + i * 30 + 7, by + 8); ctx.lineTo(bx + i * 30 - 7, by + 8); ctx.closePath(); ctx.fill(); }
  }
}

function drawPed(ctx, S, ped, vx, vy) {
  const x = ped.x - vx, y = ped.y - vy;
  if (x < -30 || x > VIEW_W + 30 || y < -30 || y > VIEW_H + 30) return;
  if (ped.hp <= 0) { ctx.fillStyle = '#5e3a3a'; ctx.beginPath(); ctx.ellipse(x, y, 13, 6, ped.angle, 0, Math.PI * 2); ctx.fill(); return; }
  const bob = ped.speed > 4 ? Math.sin(ped.phase) * 2.4 : 0;
  ctx.fillStyle = 'rgba(20,10,20,0.3)'; ctx.beginPath(); ctx.ellipse(x, y + 8, 9, 4, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#2c3440'; ctx.fillRect(x - 5, y + 1 + Math.abs(bob) * 0.4, 4, 9); ctx.fillRect(x + 1, y + 1 - Math.abs(bob) * 0.4, 4, 9);
  ctx.fillStyle = ped.shirt; roundRect(ctx, x - 7, y - 8 + bob * 0.3, 14, 12, 4); ctx.fill();
  ctx.fillStyle = ped.skin; ctx.beginPath(); ctx.arc(x, y - 12 + bob * 0.3, 6, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = ped.hair; ctx.beginPath(); ctx.arc(x, y - 14 + bob * 0.3, 6, Math.PI, Math.PI * 2); ctx.fill();
  if (ped.state === 'flee') { ctx.fillStyle = '#fff'; ctx.font = 'bold 11px system-ui'; ctx.textAlign = 'center'; ctx.fillText('!', x, y - 24); }
}

function drawPlayer(ctx, S, vx, vy) {
  const x = S.player.x - vx, y = S.player.y - vy;
  ctx.fillStyle = 'rgba(20,10,20,0.35)'; ctx.beginPath(); ctx.ellipse(x, y + 9, 10, 4.5, 0, 0, Math.PI * 2); ctx.fill();
  // Aim line and weapon.
  const aimA = Math.atan2(S.mouse.wy - S.player.y, S.mouse.wx - S.player.x);
  ctx.strokeStyle = 'rgba(255,80,60,0.5)'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(aimA) * 34, y + Math.sin(aimA) * 34); ctx.stroke();
  ctx.save(); ctx.translate(x, y); ctx.rotate(aimA);
  ctx.fillStyle = '#20242c'; ctx.fillRect(6, -2, 17, 4);
  if (S.arsenal.muzzle > 0) { ctx.fillStyle = '#ffd21f'; ctx.beginPath(); ctx.arc(27, 0, 7, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
  ctx.fillStyle = '#31435e'; ctx.fillRect(x - 5, y + 1, 4, 10); ctx.fillRect(x + 1, y + 1, 4, 10);
  ctx.fillStyle = '#d94f3d'; roundRect(ctx, x - 8, y - 9, 16, 13, 5); ctx.fill();
  ctx.fillStyle = '#c98a5a'; ctx.beginPath(); ctx.arc(x, y - 13, 6.5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#1c1410'; ctx.beginPath(); ctx.arc(x, y - 15.5, 6.5, Math.PI, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.font = 'bold 10px system-ui'; ctx.textAlign = 'center';
  ctx.fillText('ROOK', x, y - 26);
}
function drawPlayerInCar(ctx, S, vx, vy) { /* the car itself carries the player visually */ }

function drawParticles(ctx, S, vx, vy) {
  for (const p of S.particles) {
    const x = p.x - vx, y = p.y - vy, f = 1 - p.t / p.life;
    if (p.kind === 'smoke') { ctx.fillStyle = `rgba(60,56,60,${0.4 * f})`; ctx.beginPath(); ctx.arc(x, y, p.size * (1.6 - f * 0.6), 0, Math.PI * 2); ctx.fill(); }
    else if (p.kind === 'fire') { ctx.fillStyle = `rgba(255,${120 + Math.floor(100 * f)},30,${0.8 * f})`; ctx.beginPath(); ctx.arc(x, y, p.size * f + 2, 0, Math.PI * 2); ctx.fill(); }
    else if (p.kind === 'boom') { ctx.fillStyle = `rgba(255,160,40,${0.75 * f})`; ctx.beginPath(); ctx.arc(x, y, p.size * (1.2 - f * 0.4), 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = `rgba(255,240,190,${0.9 * f})`; ctx.beginPath(); ctx.arc(x, y, p.size * 0.5 * f + 4, 0, Math.PI * 2); ctx.fill(); }
    else if (p.kind === 'spark') { ctx.fillStyle = `rgba(255,215,90,${f})`; ctx.fillRect(x - 1.5, y - 1.5, 3, 3); }
    else if (p.kind === 'splinter') { ctx.fillStyle = `rgba(168,124,76,${f})`; ctx.fillRect(x - p.size / 2, y - p.size / 2, p.size, p.size); }
    else if (p.kind === 'tracer') { ctx.fillStyle = `rgba(255,240,170,${f})`; ctx.fillRect(x - 2, y - 2, 4, 4); }
  }
}
function drawPickups(ctx, S, vx, vy) {
  for (const pk of S.pickups) {
    const x = pk.x - vx, y = pk.y - vy + Math.sin(S.time * 5 + pk.x) * 3;
    ctx.fillStyle = '#3fae5a'; roundRect(ctx, x - 9, y - 6, 18, 12, 2); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = 'bold 9px system-ui'; ctx.textAlign = 'center'; ctx.fillText('$', x, y + 3);
  }
}

function drawHeli(ctx, S, vx, vy) {
  const heli = S.heli, x = heli.x - vx, y = heli.y - vy;
  // Spotlight cone to the player.
  const px = S.player.x - vx, py = S.player.y - vy;
  const grad = ctx.createRadialGradient(px, py, 8, px, py, 190);
  grad.addColorStop(0, 'rgba(255,246,190,0.5)'); grad.addColorStop(1, 'rgba(255,246,190,0)');
  ctx.fillStyle = grad;
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(px - 120, py + 40); ctx.lineTo(px + 120, py + 40); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.arc(px, py, 120, 0, Math.PI * 2); ctx.fill();
  // Body and rotor.
  ctx.save(); ctx.translate(x, y); ctx.rotate(heli.angle);
  ctx.fillStyle = 'rgba(20,10,20,0.3)'; ctx.beginPath(); ctx.ellipse(14, 20, 30, 10, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#232a38'; roundRect(ctx, -24, -11, 48, 22, 9); ctx.fill();
  ctx.fillRect(-46, -3, 24, 6);
  ctx.fillStyle = '#9fd4e8'; roundRect(ctx, 8, -8, 14, 16, 4); ctx.fill();
  ctx.strokeStyle = 'rgba(230,230,230,0.85)'; ctx.lineWidth = 3;
  const r = Math.sin(heli.rotor) * 34;
  ctx.beginPath(); ctx.moveTo(-Math.abs(r), 0); ctx.lineTo(Math.abs(r), 0); ctx.stroke();
  ctx.restore();
  ctx.fillStyle = '#fff'; ctx.font = 'bold 11px system-ui'; ctx.textAlign = 'center';
  ctx.fillText('CONDOR-1', x, y - 24);
}

function drawDayOverlay(ctx, S, pal) {
  if (pal.sun < 0.45) { ctx.fillStyle = `rgba(24,16,54,${(0.45 - pal.sun) * 0.5})`; ctx.fillRect(0, 0, VIEW_W, VIEW_H); }
  else if (pal.sun < 0.75) { ctx.fillStyle = 'rgba(255,140,50,0.07)'; ctx.fillRect(0, 0, VIEW_W, VIEW_H); }
  // Vignette.
  const g = ctx.createRadialGradient(VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.45, VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.95);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(20,8,20,0.32)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
}

export function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
