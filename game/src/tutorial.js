// tutorial.js — onboarding and side challenges for Caldera Bay: Vice Tide.
// First-session prompts teach one control at a time in context (they appear when
// the relevant situation first happens, never as a wall of text), and a set of
// repeatable side challenges (drift time, near misses, cart snacks, gull-scares)
// pays small cash and respect so free roam always has a next thing to do.

import { clamp } from './config.js';

export const PROMPTS = [
  { id: 'move', when: S => S.mode === 'play' && !S.player.car, text: 'WASD — walk. Head for the gold marker.' },
  { id: 'steal', when: S => !S.player.car && S.nearCar, text: 'E — steal this car. Nadia does not ask where cars come from.' },
  { id: 'drive', when: S => !!S.player.car && Math.abs(S.player.car.speed) < 5, text: 'W accelerate · S brake/reverse · A/D steer.' },
  { id: 'nitro', when: S => !!S.player.car && S.garage.nitro > 0, text: 'SHIFT — burn nitro.' },
  { id: 'weapon', when: S => !S.player.car && S.wanted >= 1, text: 'Mouse aims · click shoots · Q/Tab cycles the weapon wheel.' },
  { id: 'wanted', when: S => S.wanted >= 2, text: 'Stars fill as CBPD watches. Break line of sight and hide to cool off.' },
  { id: 'crew', when: S => S.wanted >= 3, text: 'Crew: Z Pico boost · X Sable jam · C Toro adrenaline.' },
  { id: 'service', when: S => !!S.nearService, text: 'E — use this place: garage, shop or safehouse.' },
  { id: 'race', when: S => !!S.nearRace, text: 'E — enter the street race. Best times are saved.' },
  { id: 'busted', when: S => S.bustedMeter > 0.15, text: 'They are cuffing you — MOVE, fast and far.' },
];

export const CHALLENGES = [
  { id: 'drift-10', name: 'Drift 10 seconds total', metric: 'driftT', goal: 10, pay: 200, respect: 15 },
  { id: 'near-8', name: '8 near misses in traffic', metric: 'nearMiss', goal: 8, pay: 220, respect: 15 },
  { id: 'snack-3', name: 'Eat at 3 vendor carts', metric: 'snacks', goal: 3, pay: 120, respect: 10 },
  { id: 'stars-5', name: 'Reach 5 stars and escape', metric: 'fiveStarEscape', goal: 1, pay: 600, respect: 60 },
  { id: 'distance-25', name: 'Drive 25 km in the bay', metric: 'distanceKm', goal: 25, pay: 300, respect: 20 },
  { id: 'crates-12', name: 'Break 12 cover crates', metric: 'crates', goal: 12, pay: 180, respect: 12 },
];

export function makeTutorialState() {
  return { seen: {}, activePrompt: null, promptT: 0, stats: { driftT: 0, nearMiss: 0, snacks: 0, fiveStarEscape: 0, distanceKm: 0, crates: 0 }, doneChallenges: {}, wasFiveStars: false, nearMissCooldown: 0 };
}

export function updateTutorial(S, dt) {
  const tut = S.tutorial;
  // Context flags the prompts read.
  S.nearCar = !S.player.car && S.cars.some(c => !c.dead && Math.hypot(c.x - S.player.x, c.y - S.player.y) < 70);
  // Prompt selection: first unseen prompt whose situation is live.
  tut.promptT = Math.max(0, tut.promptT - dt);
  if (!tut.activePrompt) {
    for (const p of PROMPTS) {
      if (tut.seen[p.id]) continue;
      let live = false;
      try { live = p.when(S); } catch (e) { live = false; }
      if (live) { tut.activePrompt = p; tut.promptT = 5.5; tut.seen[p.id] = true; break; }
    }
  } else if (tut.promptT <= 0) tut.activePrompt = null;
  // Challenge metrics.
  if (S.player.car) {
    tut.stats.distanceKm += Math.abs(S.player.car.speed) * dt / 3800;
    const vs = S.player.car.vstate;
    if (vs && vs.driftT > 0) tut.stats.driftT += dt;
    tut.nearMissCooldown -= dt;
    if (Math.abs(S.player.car.speed) > 200 && tut.nearMissCooldown <= 0) {
      for (const other of S.cars) {
        if (other === S.player.car || other.dead) continue;
        const d = Math.hypot(other.x - S.player.x, other.y - S.player.y);
        if (d > 52 && d < 74) { tut.stats.nearMiss++; tut.nearMissCooldown = 1.4; S.toast('Near miss!'); break; }
      }
    }
  }
  tut.stats.crates = S.world.crates.filter(c => c.hp <= 0).length;
  if (Math.floor(S.wanted) >= 5) tut.wasFiveStars = true;
  if (tut.wasFiveStars && S.wanted <= 0) { tut.stats.fiveStarEscape = 1; tut.wasFiveStars = false; S.toast('Five stars, zero cuffs — challenge progress'); }
  // Completions pay out once each, then the challenge retires.
  for (const ch of CHALLENGES) {
    if (tut.doneChallenges[ch.id]) continue;
    if (tut.stats[ch.metric] >= ch.goal) {
      tut.doneChallenges[ch.id] = true;
      S.cash += ch.pay;
      const d = 'centro'; S.respect[d] = (S.respect[d] || 0) + ch.respect;
      S.toast(`Challenge complete: ${ch.name} — +$${ch.pay}`);
      S.audio?.cashBig();
      S.saveGame();
    }
  }
}

export function drawTutorial(ctx, S) {
  const tut = S.tutorial;
  if (tut.activePrompt && S.mode === 'play') {
    const text = tut.activePrompt.text;
    ctx.font = 'bold 14px system-ui, sans-serif';
    const w = ctx.measureText(text).width + 36;
    ctx.fillStyle = 'rgba(16,10,20,0.78)';
    ctx.beginPath(); ctx.roundRect(640 - w / 2, 636, w, 34, 9); ctx.fill();
    ctx.strokeStyle = 'rgba(255,215,110,0.5)'; ctx.stroke();
    ctx.fillStyle = '#ffe9b0'; ctx.textAlign = 'center';
    ctx.fillText(text, 640, 658);
  }
  // Challenge progress lives under the mission tracker.
  const open = CHALLENGES.filter(c => !tut.doneChallenges[c.id]).slice(0, 2);
  if (open.length && S.mode === 'play') {
    ctx.textAlign = 'left'; ctx.font = '11px system-ui, sans-serif';
    open.forEach((ch, i) => {
      const val = Math.min(ch.goal, Math.floor(tut.stats[ch.metric] * 10) / 10);
      ctx.fillStyle = 'rgba(16,10,20,0.5)';
      ctx.beginPath(); ctx.roundRect(14, 200 + i * 24, 330, 20, 6); ctx.fill();
      ctx.fillStyle = '#cbb8e8';
      ctx.fillText(`◇ ${ch.name} — ${val}/${ch.goal} · $${ch.pay}`, 24, 214 + i * 24);
    });
  }
}
export { clamp };
