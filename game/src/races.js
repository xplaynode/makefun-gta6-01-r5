// races.js — three repeatable street races against two AI racers each.
// Checkpoint circuits on the road grid; AI racers follow the same checkpoints with
// rubber-banding so a race stays close. Best times persist in the save.

import { clamp } from './config.js';
import { makeCar } from './traffic.js';

export const RACES = [
  { id: 'coral', name: 'Coral Run', start: { x: 540, y: 880 }, checkpoints: [ { x: 540, y: 880 }, { x: 1220, y: 880 }, { x: 1220, y: 1560 }, { x: 540, y: 1560 }, { x: 540, y: 880 } ], entry: 100, prize: 650 },
  { id: 'port', name: 'Port Azul Dash', start: { x: 2880, y: 1900 }, checkpoints: [ { x: 2880, y: 1900 }, { x: 3740, y: 1900 }, { x: 3740, y: 2580 }, { x: 2880, y: 2580 }, { x: 2880, y: 1900 } ], entry: 150, prize: 900 },
  { id: 'faro', name: 'Faro Night Circuit', start: { x: 4080, y: 2240 }, checkpoints: [ { x: 4080, y: 2240 }, { x: 4760, y: 2240 }, { x: 4760, y: 2920 }, { x: 4080, y: 2920 }, { x: 4080, y: 2240 } ], entry: 200, prize: 1200 },
];

export function makeRaceState() {
  return { active: false, race: null, name: '', checkpoints: [], checkpoint: 0, racers: [], time: 0, countdown: 0, finished: false, lastResult: null, forMission: null, offered: false, place: 0 };
}

export function nearestRaceStart(S, range = 90) {
  for (const r of RACES) if (Math.hypot(S.player.x - r.start.x, S.player.y - r.start.y) < range) return r;
  return null;
}

export function startRace(S, def) {
  if (S.cash < def.entry) { S.toast(`Race entry is $${def.entry}`); return false; }
  S.cash -= def.entry;
  const rs = S.race;
  rs.active = true; rs.race = def; rs.name = def.name;
  rs.checkpoints = def.checkpoints; rs.checkpoint = 1; rs.time = 0; rs.countdown = 2.2; rs.finished = false;
  rs.forMission = S.missions.active && currentStageIsRace(S) ? 'coral-run' : null;
  if (def.id === 'coral') rs.forMission = 'coral-run';
  rs.racers = [];
  for (let i = 0; i < 2; i++) {
    const car = makeCar(S.rng, def.start.x + (i + 1) * 54, def.start.y + 26, 0, i + 1);
    car.kind = 'racer'; car.raceCp = 1; car.raceSkill = 0.9 + i * 0.07;
    rs.racers.push(car); S.cars.push(car);
  }
  S.toast(`${def.name} — 3, 2, 1… GO when the light drops!`);
  S.audio?.raceStart();
  return true;
}
function currentStageIsRace(S) {
  const m = S.missions;
  return m.active; // stage check is handled by missions via race result
}

export function updateRaces(S, dt) {
  const rs = S.race;
  if (!rs.active) return;
  if (rs.countdown > 0) { rs.countdown -= dt; return; }
  rs.time += dt;
  // Player progress.
  const target = rs.checkpoints[rs.checkpoint];
  if (target && Math.hypot(S.player.x - target.x, S.player.y - target.y) < 110) {
    rs.checkpoint++;
    S.audio?.checkpoint();
    if (rs.checkpoint >= rs.checkpoints.length) finishRace(S, true);
  }
  // AI racers.
  for (const car of rs.racers) {
    const cp = rs.checkpoints[car.raceCp];
    if (!cp) continue;
    const toT = Math.atan2(cp.y - car.y, cp.x - car.x);
    let da = toT - car.angle;
    while (da > Math.PI) da -= Math.PI * 2;
    while (da < -Math.PI) da += Math.PI * 2;
    car.angle += clamp(da * 2.2, -1, 1) * car.model.grip * dt;
    // Rubber band: racers near the player's pace, a touch slower when ahead.
    const playerProg = rs.checkpoint + progressFraction(S, rs);
    const myProg = car.raceCp;
    let skill = car.raceSkill;
    if (myProg > playerProg) skill *= 0.94;
    if (myProg < playerProg - 1) skill *= 1.05;
    const want = car.model.top * 0.86 * skill;
    car.speed += clamp(want - car.speed, -300 * dt, 240 * dt);
    car.x += Math.cos(car.angle) * car.speed * dt;
    car.y += Math.sin(car.angle) * car.speed * dt;
    if (Math.hypot(cp.x - car.x, cp.y - car.y) < 110) {
      car.raceCp++;
      if (car.raceCp >= rs.checkpoints.length && !rs.finished) finishRace(S, false);
    }
  }
  if (rs.time > 240 && !rs.finished) finishRace(S, false, 'timeout');
}
function progressFraction(S, rs) {
  const prev = rs.checkpoints[Math.max(0, rs.checkpoint - 1)], next = rs.checkpoints[rs.checkpoint];
  if (!prev || !next) return 0;
  const total = Math.hypot(next.x - prev.x, next.y - prev.y) || 1;
  return 1 - Math.hypot(next.x - S.player.x, next.y - S.player.y) / total;
}

function finishRace(S, playerWon, why) {
  const rs = S.race;
  if (rs.finished) return;
  rs.finished = true; rs.active = false;
  rs.lastResult = playerWon ? 'win' : 'lose';
  for (const car of rs.racers) { car.kind = 'civilian'; car.driver = true; }
  if (playerWon) {
    S.cash += rs.race.prize;
    const best = S.raceBest[rs.race.id];
    if (!best || rs.time < best) { S.raceBest[rs.race.id] = Math.round(rs.time * 10) / 10; S.toast(`WIN — ${rs.name} in ${rs.time.toFixed(1)}s (new best!) +$${rs.race.prize}`); }
    else S.toast(`WIN — ${rs.name} in ${rs.time.toFixed(1)}s +$${rs.race.prize}`);
    S.audio?.raceWin();
  } else {
    S.toast(why === 'timeout' ? 'Race timed out.' : 'Beaten on the line. The bay remembers.');
    S.audio?.raceLose();
  }
  S.saveGame();
}

export function raceBestLabel(S, raceId) {
  const b = S.raceBest[raceId];
  return b ? `${b.toFixed(1)}s` : '—';
}
