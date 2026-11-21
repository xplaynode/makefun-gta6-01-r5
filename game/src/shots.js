// shots.js — deterministic screenshot scenes for Caldera Bay: Vice Tide.
// A ?shot=<scene>&seed=<n> URL builds the same city, stages one readable moment
// per scene, runs a few simulated seconds so traffic/peds/police settle, and sets
// window.__shotReady when the frame on screen is the promised one. No shot is a
// menu: every scene is live gameplay with HUD and minimap visible.

import { GOLDEN_HOUR } from './config.js';

export function parseShotQuery() {
  const q = new URLSearchParams(location.search);
  if (!q.has('shot')) return null;
  return { scene: q.get('shot'), seed: parseInt(q.get('seed') || '7', 10) || 7 };
}

export function stageShotScene(S, scene) {
  S.dayT = GOLDEN_HOUR;
  S.mode = 'play';
  if (scene === 'cover') {
    // Dense city vista at golden hour, player car mid-street in Centro Coral.
    S.player.x = 1560; S.player.y = 880;
    const car = S.cars[0];
    car.x = 1560; car.y = 880; car.angle = 0.3; car.speed = 120; car.driver = false;
    S.player.car = car;
    S.wanted = 1.2; S.missions.active = true; S.missions.index = 0;
    S.camera.x = 1560; S.camera.y = 880;
  } else if (scene === 'foot') {
    // On foot mid-mission among pedestrians in Mercado Alto, tracker + respect UI.
    S.player.x = 760; S.player.y = 1880; S.player.car = null;
    S.missions.index = 1; S.missions.active = true; S.missions.stage = 1;
    for (let i = 0; i < 10; i++) {
      const ped = S.peds[i];
      ped.x = 760 + Math.cos(i * 1.7) * (50 + i * 9); ped.y = 1880 + Math.sin(i * 1.7) * (40 + i * 7);
      ped.state = i % 3 === 0 ? 'chat' : 'stroll';
    }
    S.respect.mercado = 130; S.camera.x = 760; S.camera.y = 1880;
  } else if (scene === 'chase') {
    // 4-5 star chase: roadblock ahead, RAM unit alongside, CONDOR spotlight above.
    S.player.x = 1220; S.player.y = 1560;
    const car = S.cars[1];
    car.x = 1220; car.y = 1560; car.angle = 0; car.speed = 240; car.driver = false;
    S.player.car = car;
    S.wanted = 5; S.playerSeen = true;
    S.heli = { x: 1330, y: 1440, angle: 2.6, rotor: 2, name: 'CONDOR-1' };
    S.roadblocks = [{ x: 1560, y: 1560, age: 3, units: [ { x: 1560, y: 1534, angle: Math.PI / 2 }, { x: 1560, y: 1586, angle: Math.PI / 2 } ] }];
    const ram = S.cops[0];
    if (ram) { ram.kind = 'ram'; ram.x = 1150; ram.y = 1610; ram.angle = 0.2; ram.speed = 230; ram.lastKnown = { x: 1220, y: 1560 }; }
    S.camera.x = 1300; S.camera.y = 1560;
  } else if (scene === 'combat') {
    // Mid-firefight: weapon wheel open, burning wreck, cover crates, sparks.
    S.player.x = 1900; S.player.y = 1180; S.player.car = null;
    S.player.angle = 0.4; S.mouse.wx = 2080; S.mouse.wy = 1120;
    S.arsenal.current = 2; S.arsenal.wheelOpen = true; S.arsenal.wheelT = 99; S.arsenal.muzzle = 0.05;
    S.wanted = 2.4;
    const wreck = S.cars[2];
    wreck.x = 2050; wreck.y = 1100; wreck.hp = 12; wreck.fireT = 1; wreck.angle = 0.8;
    S.world.crates.push({ x: 1960, y: 1210, size: 26, hp: 40, cover: true }, { x: 1994, y: 1210, size: 26, hp: 40, cover: true });
    for (let i = 0; i < 8; i++) S.particles.push({ kind: 'spark', x: 2030, y: 1120, vx: 0, vy: 0, life: 9, t: 0, size: 3 });
    S.camera.x = 1960; S.camera.y = 1150;
  } else {
    S.camera.x = S.player.x; S.camera.y = S.player.y;
  }
  S.objectiveText = S.computeObjectiveText();
  S.objectiveTarget = S.computeObjectiveTarget();
}

// Extra staging helpers kept separate so each scene reads as a small script:
// traffic is parked into readable lanes, pedestrians are grouped into natural
// clusters, and the light is pinned so every retake renders the same frame.
export function stageTrafficLane(S, cx, cy, count, angle) {
  for (let i = 0; i < count && i < S.cars.length; i++) {
    const car = S.cars[S.cars.length - 1 - i];
    if (S.player.car === car) continue;
    car.x = cx + Math.cos(angle) * i * 120 + (i % 2) * 18;
    car.y = cy + Math.sin(angle) * i * 120 + (i % 2) * 26;
    car.angle = angle; car.speed = 0; car.driver = true;
  }
}
export function stagePedCluster(S, cx, cy, count, radius) {
  for (let i = 0; i < count && i < S.peds.length; i++) {
    const ped = S.peds[i];
    const a = (i / Math.max(1, count)) * Math.PI * 2;
    ped.x = cx + Math.cos(a) * radius * (0.5 + (i % 3) * 0.3);
    ped.y = cy + Math.sin(a) * radius * (0.5 + (i % 3) * 0.3);
    ped.state = i % 4 === 0 ? 'chat' : 'stroll';
    ped.target = { x: ped.x + Math.cos(a) * 60, y: ped.y + Math.sin(a) * 60 };
  }
}
export function pinGoldenLight(S) {
  // Screenshots always render at the same dusk: warm sun, lit windows, lamps on.
  S.dayT = GOLDEN_HOUR;
  if (S.harbour) S.harbour.beamAngle = 2.2;
}
export function shotSceneList() {
  return [
    { scene: 'cover', file: '1-cover.jpg', promise: 'dense city vista, player car mid-street, HUD + minimap' },
    { scene: 'foot', file: '2-foot.jpg', promise: 'on foot mid-mission among pedestrians, tracker + respect UI' },
    { scene: 'chase', file: '3-chase.jpg', promise: 'roadblock ahead, RAM unit alongside, helicopter spotlight, stars' },
    { scene: 'combat', file: '4-combat.jpg', promise: 'weapon wheel visible, burning wreck, cover crates, mid-firefight' },
  ];
}
