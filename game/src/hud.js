// hud.js — canvas HUD and screens for Caldera Bay: Vice Tide: cash, health and
// armour bars, weapon + ammo, wanted stars with the CBPD dispatch line, mission
// tracker, district + respect rank, crew ability icons with cooldowns, the weapon
// wheel, service menus (garage/shop/safehouse), the canvas MINIMAP (districts,
// traffic, police including the helicopter, mission markers), toasts, and the
// start / pause / busted / wasted screens.

import { VIEW_W, VIEW_H, WEAPONS, CREW, WORLD_W, WORLD_H, DISTRICTS, districtAt } from './config.js';
import { totalAmmoLabel } from './combat.js';
import { menuItems, nextRankLabel } from './economy.js';
import { missionProgressLabel, currentMission } from './missions.js';
import { RACES, raceBestLabel } from './races.js';
import { roundRect } from './render.js';

export function drawHUD(ctx, S) {
  if (S.mode === 'title') { drawTitle(ctx, S); return; }
  drawTopLeft(ctx, S);
  drawTopRight(ctx, S);
  drawMissionTracker(ctx, S);
  drawCrewIcons(ctx, S);
  drawMinimap(ctx, S);
  drawToasts(ctx, S);
  if (S.arsenal.wheelOpen) drawWeaponWheel(ctx, S);
  if (S.eco.menu) drawServiceMenu(ctx, S);
  if (S.bustedMeter > 0.03) drawBustedMeter(ctx, S);
  if (S.mode === 'pause') drawPause(ctx, S);
  if (S.mode === 'busted') drawEndScreen(ctx, S, 'BUSTED', 'CBPD got cuffs on Rook. The cash for the lawyer stings.', '#3d7bd9');
  if (S.mode === 'wasted') drawEndScreen(ctx, S, 'WASTED', 'Rook wakes up outside Clinica Vida, lighter in the wallet.', '#d94f3d');
  if (S.race.countdown > 0 && S.race.active) drawCountdown(ctx, S);
  if (S.interactPrompt) drawInteractPrompt(ctx, S);
}

function panel(ctx, x, y, w, h, alpha = 0.62) {
  ctx.fillStyle = `rgba(16,10,20,${alpha})`;
  roundRect(ctx, x, y, w, h, 10); ctx.fill();
  ctx.strokeStyle = 'rgba(255,215,110,0.35)'; ctx.lineWidth = 1; ctx.stroke();
}

function drawTopLeft(ctx, S) {
  panel(ctx, 14, 14, 252, 104);
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffd76a'; ctx.font = 'bold 21px system-ui, sans-serif';
  ctx.fillText(`$${S.cash.toLocaleString()}`, 26, 42);
  // Health bar.
  bar(ctx, 26, 54, 160, 11, S.health / 100, '#e8452c', '#571f16');
  bar(ctx, 26, 70, 160, 8, S.armour / 100, '#7fb2e8', '#27405e');
  ctx.fillStyle = '#fff'; ctx.font = '11px system-ui, sans-serif';
  ctx.fillText(`HP ${Math.ceil(S.health)}`, 194, 64);
  ctx.fillText(`ARM ${Math.ceil(S.armour)}`, 194, 79);
  const w = WEAPONS[S.arsenal.current];
  ctx.fillStyle = '#ffe9b0'; ctx.font = 'bold 14px system-ui, sans-serif';
  ctx.fillText(`${w.name}  ·  ${totalAmmoLabel(S)}`, 26, 102);
  ctx.fillStyle = '#cbb8d9'; ctx.font = '10px system-ui, sans-serif';
  ctx.fillText('Q/Tab — weapon wheel', 150, 102);
}

function bar(ctx, x, y, w, h, frac, fill, back) {
  ctx.fillStyle = back; roundRect(ctx, x, y, w, h, 4); ctx.fill();
  ctx.fillStyle = fill; if (frac > 0.01) { roundRect(ctx, x, y, Math.max(6, w * Math.min(1, frac)), h, 4); ctx.fill(); }
}

function drawTopRight(ctx, S) {
  const w = 300;
  panel(ctx, VIEW_W - w - 14, 14, w, 86);
  ctx.textAlign = 'right';
  // Wanted stars.
  ctx.font = '24px system-ui, sans-serif';
  for (let i = 0; i < 5; i++) {
    ctx.fillStyle = i < Math.floor(S.wanted) ? '#ffd21f' : 'rgba(255,255,255,0.22)';
    ctx.fillText('★', VIEW_W - 34 - (4 - i) * 30, 44);
  }
  ctx.fillStyle = S.playerSeen ? '#ff6a5e' : '#9fe8a8';
  ctx.font = 'bold 11px system-ui, sans-serif';
  ctx.fillText(S.wanted <= 0 ? 'CBPD: no active call' : S.playerSeen ? 'CBPD: IN PURSUIT' : 'CBPD: searching… hide to cool off', VIEW_W - 26, 64);
  ctx.fillStyle = '#e8dff2'; ctx.font = '11px system-ui, sans-serif';
  const d = districtAt(S.player.x, S.player.y);
  ctx.fillText(`${d.name} — Respect ${S.respect[d.id] || 0}`, VIEW_W - 26, 82);
  ctx.fillText(`Rank: ${S.respectRank.name} (next: ${nextRankLabel(S)})`, VIEW_W - 26, 96);
}

function drawMissionTracker(ctx, S) {
  panel(ctx, 14, 130, 330, 62, 0.55);
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffd76a'; ctx.font = 'bold 12px system-ui, sans-serif';
  ctx.fillText(missionProgressLabel(S), 26, 152);
  ctx.fillStyle = '#fff'; ctx.font = '12px system-ui, sans-serif';
  wrapText(ctx, S.objectiveText, 26, 170, 306, 14, 2);
  if (S.missions.briefingT > 0) {
    const m = currentMission(S);
    if (m) { ctx.fillStyle = '#ffe9b0'; ctx.font = 'italic 11px system-ui, sans-serif'; wrapText(ctx, m.brief, 26, 196, 500, 13, 2); }
  }
}

function drawCrewIcons(ctx, S) {
  const y = VIEW_H - 66;
  CREW.forEach((c, i) => {
    const x = 14 + i * 118;
    panel(ctx, x, y, 108, 52, 0.55);
    const cd = S.crew[c.id].cooldownT;
    ctx.fillStyle = cd > 0 ? '#8a8296' : '#ffd76a';
    ctx.font = 'bold 12px system-ui, sans-serif'; ctx.textAlign = 'left';
    ctx.fillText(`${c.key} ${c.name.split(' ')[0]}`, x + 9, y + 19);
    ctx.fillStyle = '#fff'; ctx.font = '10px system-ui, sans-serif';
    ctx.fillText(c.ability, x + 9, y + 34);
    ctx.fillStyle = cd > 0 ? '#ff9a8a' : '#9fe8a8'; ctx.font = 'bold 10px system-ui, sans-serif';
    ctx.fillText(cd > 0 ? `${cd.toFixed(0)}s` : 'READY', x + 9, y + 47);
  });
  // Radio readout.
  panel(ctx, 14 + 3 * 118 + 8, y, 250, 52, 0.55);
  ctx.fillStyle = '#ffe9b0'; ctx.font = 'bold 11px system-ui, sans-serif'; ctx.textAlign = 'left';
  ctx.fillText(`RADIO (R): ${S.audio.stationName()}`, 14 + 3 * 118 + 18, y + 21);
  ctx.fillStyle = '#cbb8d9'; ctx.font = '10px system-ui, sans-serif';
  const car = S.player.car;
  ctx.fillText(car ? `In: ${car.model.name} — HP ${Math.max(0, Math.ceil(car.hp))}${S.garage.nitro > 0 ? ' · Shift = nitro' : ''}` : 'On foot — E steals the nearest car', 14 + 3 * 118 + 18, y + 38);
}

export function drawMinimap(ctx, S) {
  const mw = 218, mh = 150, x = VIEW_W - mw - 14, y = VIEW_H - mh - 14;
  panel(ctx, x - 4, y - 4, mw + 8, mh + 8, 0.66);
  const sx = mw / WORLD_W, sy = mh / WORLD_H;
  ctx.fillStyle = '#3a5e46'; ctx.fillRect(x, y, mw, mh);
  for (const d of DISTRICTS) { ctx.fillStyle = d.tint; ctx.globalAlpha = 0.55; ctx.fillRect(x + d.x * sx, y + d.y * sy, d.w * sx, d.h * sy); ctx.globalAlpha = 1; }
  ctx.fillStyle = '#1d5e7a'; ctx.fillRect(x, y + 3020 * sy, mw, mh - 3020 * sy);
  ctx.fillStyle = '#e6cf9a'; ctx.fillRect(x, y + 2920 * sy, mw, 100 * sy);
  // Traffic dots.
  ctx.fillStyle = 'rgba(255,255,255,0.65)';
  for (const car of S.cars) ctx.fillRect(x + car.x * sx - 1, y + car.y * sy - 1, 2.4, 2.4);
  // Police: blue, helicopter: cyan ring.
  for (const cop of S.cops) { ctx.fillStyle = '#3d7bd9'; ctx.beginPath(); ctx.arc(x + cop.x * sx, y + cop.y * sy, 3, 0, Math.PI * 2); ctx.fill(); }
  if (S.heli) { ctx.strokeStyle = '#37e0e8'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(x + S.heli.x * sx, y + S.heli.y * sy, 5, 0, Math.PI * 2); ctx.stroke(); }
  for (const rb of S.roadblocks) { ctx.fillStyle = '#f2792a'; ctx.fillRect(x + rb.x * sx - 3, y + rb.y * sy - 2, 6, 4); }
  // Services.
  for (const svc of S.world.services) { ctx.fillStyle = svc.kind === 'garage' ? '#ffd76a' : svc.kind === 'shop' ? '#e85d8a' : '#9fe8a8'; ctx.fillRect(x + svc.x * sx - 2, y + svc.y * sy - 2, 4, 4); }
  // Mission marker.
  if (S.objectiveTarget) { ctx.fillStyle = '#ffd21f'; ctx.beginPath(); ctx.arc(x + S.objectiveTarget.x * sx, y + S.objectiveTarget.y * sy, 4 + Math.sin(S.time * 5) * 1.2, 0, Math.PI * 2); ctx.fill(); }
  if (S.race.active) for (const cp of S.race.checkpoints) { ctx.fillStyle = '#fff'; ctx.fillRect(x + cp.x * sx - 1.5, y + cp.y * sy - 1.5, 3, 3); }
  // Player arrow.
  const px = x + S.player.x * sx, py = y + S.player.y * sy;
  ctx.save(); ctx.translate(px, py); ctx.rotate(S.player.car ? S.player.car.angle : S.player.angle);
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(6, 0); ctx.lineTo(-4, -4); ctx.lineTo(-4, 4); ctx.closePath(); ctx.fill();
  ctx.restore();
  ctx.fillStyle = '#fff'; ctx.font = 'bold 9px system-ui'; ctx.textAlign = 'left';
  ctx.fillText('CALDERA BAY', x + 5, y + 12);
}

function drawWeaponWheel(ctx, S) {
  const cx = VIEW_W / 2, cy = VIEW_H / 2, r = 118;
  ctx.fillStyle = 'rgba(10,6,14,0.55)'; ctx.beginPath(); ctx.arc(cx, cy, r + 26, 0, Math.PI * 2); ctx.fill();
  WEAPONS.forEach((w, i) => {
    const a = -Math.PI / 2 + (i / WEAPONS.length) * Math.PI * 2;
    const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
    const selected = i === S.arsenal.current;
    ctx.fillStyle = selected ? '#ffd21f' : 'rgba(255,255,255,0.14)';
    ctx.beginPath(); ctx.arc(x, y, selected ? 36 : 30, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = selected ? '#1c1410' : '#fff'; ctx.font = 'bold 11px system-ui'; ctx.textAlign = 'center';
    ctx.fillText(w.name, x, y - 2);
    ctx.font = '10px system-ui';
    ctx.fillText(w.ammoType ? `${S.arsenal.ammo[w.ammoType]}` : '∞', x, y + 13);
  });
  ctx.fillStyle = '#fff'; ctx.font = 'bold 13px system-ui'; ctx.textAlign = 'center';
  ctx.fillText('WEAPON WHEEL', cx, cy + 5);
}

function drawServiceMenu(ctx, S) {
  const items = menuItems(S);
  const w = 480, h = 120 + items.length * 52;
  const x = VIEW_W / 2 - w / 2, y = VIEW_H / 2 - h / 2;
  panel(ctx, x, y, w, h, 0.88);
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffd76a'; ctx.font = 'bold 19px system-ui';
  const kind = S.eco.menu.kind;
  ctx.fillText(kind === 'garage' ? 'TALLER BRASA — GARAGE' : kind === 'shop' ? 'SHOP' : 'SAFEHOUSE', x + 22, y + 36);
  ctx.fillStyle = '#cbb8d9'; ctx.font = '12px system-ui';
  ctx.fillText(`Cash $${S.cash} · W/S choose · Enter buy · E/Esc leave`, x + 22, y + 58);
  items.forEach((item, i) => {
    const iy = y + 78 + i * 52;
    const selected = i === S.eco.menuIndex;
    if (selected) { ctx.fillStyle = 'rgba(255,210,31,0.2)'; roundRect(ctx, x + 12, iy - 20, w - 24, 46, 8); ctx.fill(); }
    ctx.fillStyle = selected ? '#ffd76a' : '#fff'; ctx.font = 'bold 14px system-ui';
    ctx.fillText(item.label, x + 24, iy);
    ctx.fillStyle = '#cbb8d9'; ctx.font = '11px system-ui';
    ctx.fillText(item.desc, x + 24, iy + 17);
  });
}

function drawBustedMeter(ctx, S) {
  const w = 260, x = VIEW_W / 2 - w / 2, y = 120;
  panel(ctx, x - 10, y - 26, w + 20, 52, 0.7);
  ctx.fillStyle = '#ff6a5e'; ctx.font = 'bold 14px system-ui'; ctx.textAlign = 'center';
  ctx.fillText('CBPD IS CUFFING YOU — MOVE!', VIEW_W / 2, y - 6);
  ctx.fillStyle = '#571f16'; roundRect(ctx, x, y + 2, w, 10, 5); ctx.fill();
  ctx.fillStyle = '#ff3b30'; roundRect(ctx, x, y + 2, w * Math.min(1, S.bustedMeter), 10, 5); ctx.fill();
}

function drawToasts(ctx, S) {
  ctx.textAlign = 'center';
  S.toasts.slice(-3).forEach((t, i) => {
    const age = S.time - t.at;
    ctx.globalAlpha = Math.max(0, 1 - Math.max(0, age - 2.4));
    ctx.fillStyle = '#ffe9b0'; ctx.font = 'bold 15px system-ui';
    ctx.fillText(t.text, VIEW_W / 2, 150 + i * 22);
    ctx.globalAlpha = 1;
  });
  if (S.dispatchLine && S.time - S.dispatchAt < 5) {
    ctx.fillStyle = '#9fd4e8'; ctx.font = 'italic 13px system-ui';
    ctx.fillText(`📻 ${S.dispatchLine}`, VIEW_W / 2, VIEW_H - 84);
  }
}

function drawInteractPrompt(ctx, S) {
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(16,10,20,0.7)'; roundRect(ctx, VIEW_W / 2 - 170, VIEW_H - 118, 340, 30, 8); ctx.fill();
  ctx.fillStyle = '#ffd76a'; ctx.font = 'bold 13px system-ui';
  ctx.fillText(S.interactPrompt, VIEW_W / 2, VIEW_H - 98);
}

function drawCountdown(ctx, S) {
  ctx.fillStyle = '#ffd21f'; ctx.font = 'bold 74px system-ui'; ctx.textAlign = 'center';
  ctx.fillText(S.race.countdown > 0.6 ? String(Math.ceil(S.race.countdown)) : 'GO!', VIEW_W / 2, VIEW_H / 2 - 60);
}

function drawTitle(ctx, S) {
  const grad = ctx.createLinearGradient(0, 0, 0, VIEW_H);
  grad.addColorStop(0, '#2b1030'); grad.addColorStop(0.55, '#8c3f5e'); grad.addColorStop(1, '#ff9a5c');
  ctx.fillStyle = grad; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.fillStyle = '#ffd76a'; ctx.font = 'bold 64px system-ui'; ctx.textAlign = 'center';
  ctx.fillText('CALDERA BAY', VIEW_W / 2, 190);
  ctx.fillStyle = '#fff'; ctx.font = 'bold 34px system-ui';
  ctx.fillText('V I C E   T I D E', VIEW_W / 2, 242);
  ctx.font = '16px system-ui'; ctx.fillStyle = '#ffe9b0';
  wrapText(ctx, 'Twelve jobs for fixer Nadia Ferrer. Nine districts, one bay, and the CBPD between you and the money.', VIEW_W / 2 - 330, 300, 660, 22, 2, true);
  panel(ctx, VIEW_W / 2 - 300, 360, 600, 168, 0.66);
  ctx.fillStyle = '#fff'; ctx.font = '14px system-ui'; ctx.textAlign = 'left';
  const lines = ['WASD drive / walk · E steal car & interact · Mouse aim, click shoot', 'Q/Tab weapon wheel · Shift nitro · Z Pico · X Sable · C Toro', 'R radio · P pause · Wanted 0–5 stars: roadblocks, RAM units, CONDOR-1', `Races: ${RACES.map(r => `${r.name} (best ${raceBestLabel(S, r.id)})`).join(' · ')}`, S.saveLoaded ? 'Save found — your bay remembers you.' : 'No save yet — the bay is fresh.'];
  lines.forEach((l, i) => ctx.fillText(l, VIEW_W / 2 - 276, 396 + i * 26));
  ctx.fillStyle = '#ffd21f'; ctx.font = 'bold 22px system-ui'; ctx.textAlign = 'center';
  ctx.fillText(S.blink ? 'PRESS ENTER TO PLAY' : '', VIEW_W / 2, 586);
}

function drawPause(ctx, S) {
  ctx.fillStyle = 'rgba(10,6,14,0.66)'; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.fillStyle = '#fff'; ctx.font = 'bold 40px system-ui'; ctx.textAlign = 'center';
  ctx.fillText('PAUSED', VIEW_W / 2, 300);
  ctx.font = '16px system-ui'; ctx.fillStyle = '#ffe9b0';
  ctx.fillText('P / Esc to resume · Progress saves automatically at every mission and purchase.', VIEW_W / 2, 344);
}

function drawEndScreen(ctx, S, title, line, color) {
  ctx.fillStyle = 'rgba(10,6,14,0.6)'; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.fillStyle = color; ctx.font = 'bold 72px system-ui'; ctx.textAlign = 'center';
  ctx.fillText(title, VIEW_W / 2, 320);
  ctx.fillStyle = '#fff'; ctx.font = '17px system-ui';
  ctx.fillText(line, VIEW_W / 2, 366);
  ctx.fillStyle = '#ffd76a'; ctx.font = 'bold 18px system-ui';
  ctx.fillText('Press ENTER to get back to the bay', VIEW_W / 2, 412);
}

export function wrapText(ctx, text, x, y, maxW, lineH, maxLines, center = false) {
  const words = String(text).split(' ');
  let line = '', lines = 0;
  for (const word of words) {
    const test = line ? line + ' ' + word : word;
    if (ctx.measureText(test).width > maxW && line) {
      if (center) { const w = ctx.measureText(line).width; ctx.fillText(line, x + (maxW - w) / 2, y + lines * lineH); }
      else ctx.fillText(line, x, y + lines * lineH);
      line = word; lines++;
      if (lines >= maxLines) return;
    } else line = test;
  }
  if (line) { if (center) { const w = ctx.measureText(line).width; ctx.fillText(line, x + (maxW - w) / 2, y + lines * lineH); } else ctx.fillText(line, x, y + lines * lineH); }
}
