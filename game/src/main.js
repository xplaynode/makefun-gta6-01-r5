// main.js — Caldera Bay: Vice Tide. Bootstrap and the game loop: player on foot
// and in cars, driving physics with collisions, wanted bookkeeping, damage and
// respawn, crew abilities, service menus, races, missions, police, combat, the
// day cycle, camera, and the deterministic ?shot= screenshot mode.

import { VIEW_W, VIEW_H, WORLD_W, WORLD_H, DAY_LENGTH_SECONDS, GOLDEN_HOUR, PLAYER_FOOT_SPEED, PLAYER_RUN_SPEED, clamp, lerp } from './config.js';
import { Rng } from './random.js';
import { generateWorld, collideBuildings, isInSea } from './world.js';
import { spawnTraffic, updateTraffic, stealNearestCar, exitCar, updateCarDamage } from './traffic.js';
import { spawnPeds, updatePeds } from './pedestrians.js';
import { updatePolice, dispatchLineFor } from './police.js';
import { makeArsenal, cycleWeapon, tryShoot, updateParticles } from './combat.js';
import { makeMissionState, updateMissions, objectiveText, objectiveTarget, currentStage } from './missions.js';
import { makeEconomy, makeCrewState, nearestService, openServiceMenu, closeServiceMenu, buyMenuItem, menuItems, updateCrew, useCrewAbility, recomputeRespect, saveGame, loadGame } from './economy.js';
import { makeRaceState, nearestRaceStart, startRace, updateRaces, RACES } from './races.js';
import { AudioEngine } from './audio.js';
import { drawWorld } from './render.js';
import { drawHUD } from './hud.js';
import { makeInput } from './input.js';
import { parseShotQuery, stageShotScene } from './shots.js';
import { makeCityLife, updateCityLife, drawCityLife } from './citylife.js';
import { updateVehicleState, effectiveTopSpeed } from './vehicles.js';
import { maybeBanter } from './narrative.js';
import { makeEffects, updateEffects, drawEffectsBelow, drawEffectsAbove } from './effects.js';
import { makeTutorialState, updateTutorial, drawTutorial } from './tutorial.js';
import { makeHarbour, updateHarbour, drawHarbour } from './harbour.js';

const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const shot = parseShotQuery();
const seed = shot ? shot.seed : 7;

const S = {
  mode: 'title', time: 0, dayT: GOLDEN_HOUR, rng: new Rng(seed * 1013 + 77),
  world: null, cars: [], peds: [], cops: [], roadblocks: [], heli: null,
  particles: [], pickups: [], toasts: [],
  player: { x: 540, y: 880, angle: 0, vx: 0, vy: 0, car: null },
  camera: { x: 540, y: 880 },
  cash: 250, health: 100, armour: 0,
  wanted: 0, hideT: 0, bustedMeter: 0, playerSeen: false,
  spawnCopT: 0, roadblockCooldown: 0, jamT: 0, boostT: 0, adrenalineT: 0,
  lastShotAt: -99, shake: 0, blink: true, saveLoaded: false,
  arsenal: makeArsenal(), missions: makeMissionState(),
  eco: makeEconomy(), garage: { armour: 0, engine: 0, nitro: 0 },
  crew: makeCrewState(), respect: {}, totalRespect: 0, respectRank: null,
  race: makeRaceState(), raceBest: {}, interactPrompt: '',
  dispatchLine: '', dispatchAt: -99, objectiveText: '', objectiveTarget: null,
  justBusted: false, justWasted: false, endT: 0,
};
S.cityLife = makeCityLife(seed);
S.effects = makeEffects();
S.harbour = makeHarbour(seed);
S.tutorial = makeTutorialState();
S.world = generateWorld(seed);
S.cars = spawnTraffic(seed, 46);
S.peds = spawnPeds(seed, 64);
// Pre-place two patrol cars so a 5-star shot scene has a RAM unit ready.
S.cops = [];
// Create initial cops lazily through a local factory mirroring police.makeCopCar.
function seedCops() {
  // Imported statically below via dynamic fallback: build plain cop objects.
  const base = { angle: 0, speed: 0, steer: 0, driver: true, dead: false, smokeT: 0, fireT: 0, explodeT: 0, pitCooldown: 0, stuckT: 0, hp: 130, maxHp: 130 };
  S.cops.push({ ...base, id: 9001, kind: 'patrol', model: { name: 'CBPD Patrol', w: 50, h: 24, top: 356, accel: 320, grip: 3.5 }, w: 50, h: 24, color: '#e8ecf2', x: 900, y: 1200, lastX: 900, lastY: 1200 });
  S.cops.push({ ...base, id: 9002, kind: 'patrol', model: { name: 'CBPD Patrol', w: 50, h: 24, top: 356, accel: 320, grip: 3.5 }, w: 50, h: 24, color: '#e8ecf2', x: 2000, y: 700, lastX: 2000, lastY: 700 });
  S.cops.forEach(c => c.leaving = true);
}
seedCops();
for (const d of ['marina', 'mercado', 'palmera', 'centro', 'portazul', 'bahia', 'coralstrip', 'salinas', 'faro']) S.respect[d] = 0;
recomputeRespect(S);

const input = makeInput(canvas);
S.mouse = input.mouse;
S.audio = new AudioEngine();
S.input = input;

// --- state helpers used by modules -----------------------------------------
S.toast = (text) => { S.toasts.push({ text, at: S.time }); if (S.toasts.length > 5) S.toasts.shift(); };
S.dispatch = (text) => { S.dispatchLine = text; S.dispatchAt = S.time; };
S.addWanted = (amount, why) => {
  if (S.mode !== 'play') return;
  const before = Math.floor(S.wanted);
  S.wanted = clamp(S.wanted + amount, 0, 5.99);
  const after = Math.floor(S.wanted);
  if (after > before) S.dispatch(dispatchLineFor(after));
};
S.damagePlayer = (amount) => {
  if (S.mode !== 'play') return;
  const cut = S.adrenalineT > 0 ? 0.55 : 1;
  let dmg = amount * cut;
  if (S.armour > 0) { const absorbed = Math.min(S.armour, dmg * 0.6); S.armour -= absorbed; dmg -= absorbed; }
  S.health -= dmg;
  if (S.health <= 0) S.wastePlayer();
};
S.bustPlayer = () => {
  if (S.mode !== 'play') return;
  S.mode = 'busted'; S.endT = 0; S.justBusted = true;
  const fine = Math.min(S.cash, 200 + Math.floor(S.wanted) * 150);
  S.cash -= fine; S.wanted = 0; S.bustedMeter = 0;
  S.cops.forEach(c => c.leaving = true); S.roadblocks = [];
  S.audio.busted(); S.toast(`Busted — $${fine} in lawyer fees`);
};
S.wastePlayer = () => {
  if (S.mode !== 'play') return;
  S.mode = 'wasted'; S.endT = 0; S.justWasted = true; S.health = 0;
  const bill = Math.min(S.cash, 300); S.cash -= bill;
  S.audio.wasted(); S.toast(`Wasted — $${bill} clinic bill`);
};
S.saveGame = () => saveGame(S);
S.computeObjectiveText = () => objectiveText(S);
S.computeObjectiveTarget = () => objectiveTarget(S);

S.saveLoaded = loadGame(S);
recomputeRespect(S);

if (shot) {
  stageShotScene(S, shot.scene);
  S.mode = 'play';
}

// --- player ------------------------------------------------------------------
function updatePlayer(dt) {
  const p = S.player;
  if (p.car) { updateDriving(dt); return; }
  const axis = input.moveAxis();
  const running = input.isDown('ShiftLeft') || input.isDown('ShiftRight');
  const speed = (running ? PLAYER_RUN_SPEED : PLAYER_FOOT_SPEED) * (S.adrenalineT > 0 ? 1.25 : 1);
  p.vx = axis.x * speed; p.vy = axis.y * speed;
  if (axis.x || axis.y) p.angle = Math.atan2(axis.y, axis.x);
  p.x += p.vx * dt; p.y += p.vy * dt;
  const fixed = collideBuildings(S.world, p.x, p.y, 13);
  p.x = clamp(fixed.x, 24, WORLD_W - 24); p.y = clamp(fixed.y, 24, WORLD_H - 60);
  if (isInSea(p.x, p.y)) { p.y = 3060; S.damagePlayer(6 * dt * 10); }
  // Car collisions on foot: a moving car hurts.
  for (const car of S.cars) {
    if (!car.dead && Math.abs(car.speed) > 120 && Math.abs(car.x - p.x) < 30 && Math.abs(car.y - p.y) < 22) {
      S.damagePlayer(18); p.x += Math.cos(car.angle) * 26; p.y += Math.sin(car.angle) * 26;
    }
  }
}

function updateDriving(dt) {
  const car = S.player.car;
  const model = car.model;
  const engineLvl = S.garage.engine;
  const top = effectiveTopSpeed(S, car);
  const accel = model.accel * (1 + engineLvl * 0.1);
  const fwd = input.isDown('KeyW') || input.isDown('ArrowUp');
  const back = input.isDown('KeyS') || input.isDown('ArrowDown');
  const left = input.isDown('KeyA') || input.isDown('ArrowLeft');
  const right = input.isDown('KeyD') || input.isDown('ArrowRight');
  if (fwd) car.speed += accel * dt;
  else if (back) car.speed -= (car.speed > 10 ? accel * 1.7 : accel * 0.6) * dt;
  else car.speed -= Math.sign(car.speed) * Math.min(Math.abs(car.speed), 60 * dt);
  // Nitro on Shift burns the tank while held.
  if ((input.isDown('ShiftLeft') || input.isDown('ShiftRight')) && S.garage.nitro > 0 && fwd) {
    car.speed += 340 * dt; S.boostT = Math.max(S.boostT, 0.2);
    S.particles.push({ kind: 'fire', x: car.x - Math.cos(car.angle) * 28, y: car.y - Math.sin(car.angle) * 28, vx: 0, vy: 0, life: 0.18, t: 0, size: 7 });
  }
  car.speed = clamp(car.speed, -130, top);
  const steerInput = (left ? -1 : 0) + (right ? 1 : 0);
  if (Math.abs(car.speed) > 4) car.angle += steerInput * model.grip * dt * clamp(car.speed / 170, -1, 1) * (car.speed < 0 ? -1 : 1);
  const oldX = car.x, oldY = car.y;
  car.x += Math.cos(car.angle) * car.speed * dt;
  car.y += Math.sin(car.angle) * car.speed * dt;
  car.x = clamp(car.x, 30, WORLD_W - 30); car.y = clamp(car.y, 30, 3380);
  // Building collision: stop and take a little damage at speed.
  const hit = collideBuildings(S.world, car.x, car.y, 20);
  if (Math.abs(hit.x - car.x) > 0.5 || Math.abs(hit.y - car.y) > 0.5) {
    if (Math.abs(car.speed) > 130) { car.hp -= 8; S.audio.crash(); S.shake = Math.min(10, S.shake + 4); S.addWanted(0.3, 'collision'); }
    car.x = oldX; car.y = oldY; car.speed *= -0.25;
  }
  // Car-to-car collisions.
  for (const other of [...S.cars, ...S.cops]) {
    if (other === car || other.dead) continue;
    const d = Math.hypot(other.x - car.x, other.y - car.y);
    if (d < 44) {
      const push = (44 - d) / 2, a = Math.atan2(other.y - car.y, other.x - car.x);
      other.x += Math.cos(a) * push; other.y += Math.sin(a) * push;
      car.x -= Math.cos(a) * push; car.y -= Math.sin(a) * push;
      if (Math.abs(car.speed) > 120) { other.hp -= 10; car.hp -= 5; S.audio.crash(); S.addWanted(0.4, 'hit and run'); if (other.kind === 'civilian') other.driver = false; }
      car.speed *= 0.82;
    }
  }
  if (isInSea(car.x, car.y)) { car.y = 3050; car.speed = 0; car.hp -= 20; S.toast('The bay claims another car'); }
  S.player.x = car.x; S.player.y = car.y; S.player.angle = car.angle;
  updateCarDamage(S, car, dt);
  if (car.dead) { exitCar(S); S.damagePlayer(12); S.toast('Your ride is wrecked — get out!'); }
}

// --- interaction ---------------------------------------------------------------
function updateInteraction(dt) {
  S.interactPrompt = '';
  if (S.eco.menu) {
    if (input.wasPressed('KeyW') || input.wasPressed('ArrowUp')) S.eco.menuIndex = Math.max(0, S.eco.menuIndex - 1);
    if (input.wasPressed('KeyS') || input.wasPressed('ArrowDown')) S.eco.menuIndex = Math.min(menuItems(S).length - 1, S.eco.menuIndex + 1);
    if (input.wasPressed('Enter')) buyMenuItem(S);
    if (input.wasPressed('KeyE') || input.wasPressed('Escape')) closeServiceMenu(S);
    return;
  }
  const svc = nearestService(S);
  const race = nearestRaceStart(S);
  if (svc && !S.player.car) S.interactPrompt = `E — ${svc.kind.toUpperCase()}: ${svc.name}`;
  else if (race) S.interactPrompt = `E — Start race: ${race.name} ($${race.entry}, best ${S.raceBest[race.id] ? S.raceBest[race.id].toFixed(1) + 's' : '—'})`;
  else if (!S.player.car) S.interactPrompt = nearestCarPrompt();
  else S.interactPrompt = 'E — exit car';
  if (input.wasPressed('KeyE')) {
    if (S.player.car) exitCar(S);
    else if (svc) openServiceMenu(S, svc);
    else if (race) startRace(S, race);
    else stealNearestCar(S);
  }
}
function nearestCarPrompt() {
  for (const car of S.cars) if (!car.dead && Math.hypot(car.x - S.player.x, car.y - S.player.y) < 70) return `E — steal the ${car.model.name}`;
  return '';
}

// --- per-frame update ------------------------------------------------------------
function update(dt) {
  S.time += dt;
  S.blink = Math.floor(S.time * 1.6) % 2 === 0;
  S.dayT = (GOLDEN_HOUR + S.time / DAY_LENGTH_SECONDS * 0.12) % 1;
  if (shot) S.dayT = GOLDEN_HOUR;
  S.justBusted = false; S.justWasted = false;
  if (S.mode === 'title') {
    if (input.wasPressed('Enter')) { S.mode = 'play'; S.audio.ensure(); S.toast('Nadia: "Gold marker, Rook. Move."'); }
    updateCamera(dt); input.endFrame(); return;
  }
  if (S.mode === 'busted' || S.mode === 'wasted') {
    S.endT += dt;
    if (input.wasPressed('Enter')) respawn();
    input.endFrame(); return;
  }
  if (input.wasPressed('KeyP') || (input.wasPressed('Escape') && !S.eco.menu)) {
    S.mode = S.mode === 'pause' ? 'play' : 'pause';
  }
  if (S.mode === 'pause') { input.endFrame(); return; }
  S.audio.ensure();
  // Global keys.
  if (input.wasPressed('KeyQ') || input.wasPressed('Tab')) cycleWeapon(S, input.isDown('ShiftLeft') ? -1 : 1);
  if (input.wasPressed('KeyR')) { const st = S.audio.cycleRadio(); S.toast(`Radio: ${st.name}`); }
  if (input.wasPressed('KeyZ')) useCrewAbility(S, 'pico');
  if (input.wasPressed('KeyX')) useCrewAbility(S, 'sable');
  if (input.wasPressed('KeyC')) useCrewAbility(S, 'toro');
  updatePlayer(dt);
  updateInteraction(dt);
  // Mouse in world space.
  S.mouse.wx = S.camera.x - VIEW_W / 2 + S.mouse.x;
  S.mouse.wy = S.camera.y - VIEW_H / 2 + S.mouse.y;
  if (!S.player.car) S.player.angle = Math.atan2(S.mouse.wy - S.player.y, S.mouse.wx - S.player.x);
  tryShoot(S, dt);
  const traffic = awaitlessTraffic(dt);
  updatePeds(S, dt);
  updatePolice(S, dt);
  updateMissions(S, dt);
  updateRaces(S, dt);
  updateCrew(S, dt);
  updateCityLife(S, dt);
  updateEffects(S, dt);
  updateHarbour(S, dt);
  updateTutorial(S, dt);
  if (S.player.car) updateVehicleState(S, S.player.car, dt, (input.isDown('KeyW') || input.isDown('ArrowUp')) ? 1 : 0);
  if (S.wanted >= 3) maybeBanter(S, 'wantedRise');
  if (S.health < 30) maybeBanter(S, 'lowHealth');
  updateParticles(S, dt);
  recomputeRespect(S);
  // Mission 'clear' stages count wrecked cars and broken crates bay-wide.
  if (S.missions.active) {
    const st = currentStage(S);
    if (st && st.kind === 'clear') {
      const wrecked = S.cars.filter(c => c.dead).length + S.cops.filter(c => c.dead).length;
      const broken = S.world.crates.filter(c => c.hp <= 0).length;
      S.missions.clearCount = wrecked + broken;
    }
  }
  S.objectiveText = objectiveText(S);
  S.objectiveTarget = objectiveTarget(S);
  S.toasts = S.toasts.filter(t => S.time - t.at < 3.4);
  updateCamera(dt);
  S.audio.update(S, dt);
  // Autosave every 20 seconds of play.
  if (Math.floor(S.time) % 20 === 0 && S.time - (S.lastSaveAt || 0) > 19) { S.lastSaveAt = S.time; saveGame(S); }
  input.endFrame();
}
function awaitlessTraffic(dt) { updateTraffic(S, dt); return true; }

function respawn() {
  S.health = 100; S.mode = 'play'; S.wanted = 0; S.bustedMeter = 0;
  S.player.car = null; S.player.x = 420; S.player.y = 2560;
  S.cops.forEach(c => c.leaving = true); S.roadblocks = []; S.heli = null;
  saveGame(S);
}

function updateCamera(dt) {
  const lead = S.player.car ? clamp(S.player.car.speed * 0.35, -90, 130) : 0;
  const tx = clamp(S.player.x + (S.player.car ? Math.cos(S.player.car.angle) * lead : 0), VIEW_W / 2 - 60, WORLD_W - VIEW_W / 2 + 60);
  const ty = clamp(S.player.y + (S.player.car ? Math.sin(S.player.car.angle) * lead : 0), VIEW_H / 2 - 40, WORLD_H - VIEW_H / 2 + 40);
  S.camera.x = lerp(S.camera.x, tx, Math.min(1, dt * 4.2));
  S.camera.y = lerp(S.camera.y, ty, Math.min(1, dt * 4.2));
  S.shake = Math.max(0, (S.shake || 0) - dt * 26);
}

// --- loop -------------------------------------------------------------------------
let last = performance.now();
let shotFrames = 0;
function frame(now) {
  let dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  update(dt);
  ctx.save();
  if (S.shake > 0.3) ctx.translate((Math.random() - 0.5) * S.shake, (Math.random() - 0.5) * S.shake);
  drawEffectsBelow(ctx, S, S.camera.x - VIEW_W / 2, S.camera.y - VIEW_H / 2);
  drawWorld(ctx, S);
  drawHarbour(ctx, S, S.camera.x - VIEW_W / 2, S.camera.y - VIEW_H / 2);
  drawCityLife(ctx, S, S.camera.x - VIEW_W / 2, S.camera.y - VIEW_H / 2);
  drawEffectsAbove(ctx, S, S.camera.x - VIEW_W / 2, S.camera.y - VIEW_H / 2);
  ctx.restore();
  drawHUD(ctx, S);
  drawTutorial(ctx, S);
  if (shot) {
    shotFrames++;
    if (shotFrames > 40) window.__shotReady = true;
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
