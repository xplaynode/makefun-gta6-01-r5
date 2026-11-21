// missions.js — the twelve staged story missions of Caldera Bay: Vice Tide.
// A chain for fixer Nadia Ferrer, gated by respect ranks. Each mission is a list of
// stages (go-to, deliver, survive, race, clear, escape) with a briefing, live
// objective text, a payout in cash and district respect, and a fail state that
// returns the player to free roam without losing the chain. After mission 12 the
// bay is open: free roam with races, shops and heat forever.

import { districtAt } from './config.js';

export const MISSIONS = [
  { id: 'first-tide', title: '1. First Tide', rank: 0, pay: 300, respect: 40, district: 'marina',
    brief: 'Nadia: "Rook. Take the Brisa by the pier, pick up my package at the marina kiosk, bring it to Taller Brasa. Quietly."',
    stages: [ { kind: 'goto', x: 420, y: 2560, label: 'Reach the Marina safehouse' }, { kind: 'goto', x: 1560, y: 900, label: 'Deliver the package to Taller Brasa' } ] },
  { id: 'market-muscle', title: '2. Market Muscle', rank: 0, pay: 420, respect: 50, district: 'mercado',
    brief: 'Nadia: "Three stall-holders in Mercado Alto owe protection money. Visit each stall. Be memorable, not messy."',
    stages: [ { kind: 'goto', x: 500, y: 1900, label: 'Visit stall one in Mercado Alto' }, { kind: 'goto', x: 760, y: 1900, label: 'Visit stall two' }, { kind: 'goto', x: 1020, y: 1900, label: 'Visit stall three' } ] },
  { id: 'glass-palms', title: '3. Glass Palms', rank: 1, pay: 550, respect: 60, district: 'palmera',
    brief: 'Nadia: "A Coral Cabrio sits on the Palmera valet row. It is mine by paperwork nobody signed. Take it to the garage."',
    stages: [ { kind: 'goto', x: 1900, y: 1900, label: 'Reach the Palmera valet row' }, { kind: 'deliver-car', x: 1560, y: 900, label: 'Deliver the car to Taller Brasa' } ] },
  { id: 'night-ferry', title: '4. Night Ferry', rank: 1, pay: 700, respect: 70, district: 'portazul',
    brief: 'Nadia: "Crates at Port Azul move on the last ferry. Load up, cross the port, drop them at Faro Point before dawn."',
    stages: [ { kind: 'goto', x: 3300, y: 2200, label: 'Collect the crates at Port Azul' }, { kind: 'goto', x: 4360, y: 2140, label: 'Drop the load at the Faro safehouse' } ] },
  { id: 'siren-test', title: '5. Siren Test', rank: 2, pay: 800, respect: 80, district: 'centro',
    brief: 'Nadia: "CBPD thinks you fold at three stars. Prove them wrong: draw the heat in Centro, survive it, then lose them."',
    stages: [ { kind: 'heat', stars: 3, label: 'Draw 3 stars in Centro Coral' }, { kind: 'escape', label: 'Lose the CBPD completely' } ] },
  { id: 'coral-run', title: '6. Coral Run', rank: 2, pay: 900, respect: 85, district: 'coralstrip',
    brief: 'Nadia: "The Strip respects one thing: speed. Win the Coral Run race. Pico tuned the route himself."',
    stages: [ { kind: 'race', race: 'coral', label: 'Win the Coral Run street race' } ] },
  { id: 'vault-of-salt', title: '7. Vault of Salt', rank: 3, pay: 1200, respect: 100, district: 'centro',
    brief: 'Sable: "Banco del Mar moves cash through its Centro depot at night. I open the door, you carry, Toro watches the street."',
    stages: [ { kind: 'goto', x: 1900, y: 1000, label: 'Reach the Banco del Mar depot' }, { kind: 'survive', seconds: 45, label: 'Hold the depot while Sable cracks the vault' }, { kind: 'escape', label: 'Lose the heat with the take' } ] },
  { id: 'roadblock-waltz', title: '8. Roadblock Waltz', rank: 3, pay: 1350, respect: 105, district: 'bahia',
    brief: 'Nadia: "A witness rolls to Bahia under escort. You will be seen. Four stars, roadblocks — dance through them to the safehouse."',
    stages: [ { kind: 'goto', x: 3300, y: 420, label: 'Reach the Bahia safehouse road' }, { kind: 'heat', stars: 4, label: 'Draw the 4-star escort response' }, { kind: 'goto', x: 3300, y: 420, label: 'Hold at the Bahia safehouse', needHidden: false }, { kind: 'escape', label: 'Shake the pursuit' } ] },
  { id: 'condor-season', title: '9. Condor Season', rank: 4, pay: 1600, respect: 120, district: 'faro',
    brief: 'Nadia: "CONDOR-1 hunts tonight. Draw the bird over Faro, cross the causeway under its light, and vanish into Las Salinas."',
    stages: [ { kind: 'heat', stars: 5, label: 'Draw CONDOR-1 at five stars' }, { kind: 'goto', x: 4500, y: 600, label: 'Cross into Las Salinas under the spotlight' }, { kind: 'escape', label: 'Lose CONDOR and every unit' } ] },
  { id: 'toros-debt', title: '10. Toro\u2019s Debt', rank: 4, pay: 1500, respect: 115, district: 'salinas',
    brief: 'Toro: "Yard crew in Las Salinas holds my marker. Clear the yard — crates, cars, all of it. Then we talk."',
    stages: [ { kind: 'goto', x: 4500, y: 900, label: 'Reach the Salinas yard' }, { kind: 'clear', count: 4, label: 'Wreck 4 yard cars and crates' } ] },
  { id: 'golden-hour-kings', title: '11. Golden Hour Kings', rank: 5, pay: 2000, respect: 140, district: 'bahia',
    brief: 'Nadia: "The hilltop relay above Bahia Norte decides who owns this bay\u2019s airwaves. Take it at golden hour. Hold it."',
    stages: [ { kind: 'goto', x: 3300, y: 420, label: 'Climb to the Bahia relay' }, { kind: 'survive', seconds: 60, label: 'Hold the relay for 60 seconds' } ] },
  { id: 'vice-tide', title: '12. Vice Tide', rank: 5, pay: 3500, respect: 220, district: 'marina',
    brief: 'Nadia: "One night, three legs: marina gold, port keys, faro light. Finish before dawn and Caldera Bay is ours. Vice tide, Rook."',
    stages: [ { kind: 'goto', x: 420, y: 2560, label: 'Leg one: the marina gold' }, { kind: 'goto', x: 3300, y: 2200, label: 'Leg two: the port keys' }, { kind: 'goto', x: 4360, y: 2140, label: 'Leg three: the faro light' }, { kind: 'escape', label: 'Vanish before dawn' } ] },
];

export function makeMissionState() {
  return { index: 0, stage: 0, active: false, briefingT: 0, surviveT: 0, clearCount: 0, done: false, failedT: 0 };
}

export function currentMission(S) {
  return S.missions.index < MISSIONS.length ? MISSIONS[S.missions.index] : null;
}
export function currentStage(S) {
  const m = currentMission(S);
  return m ? m.stages[S.missions.stage] : null;
}
export function objectiveText(S) {
  if (S.race.active) return `Race: ${S.race.name} — checkpoint ${Math.min(S.race.checkpoint + 1, S.race.checkpoints.length)}/${S.race.checkpoints.length}`;
  const m = currentMission(S), st = currentStage(S);
  if (!m) return 'Free roam — the bay is yours. Races, shops and heat await.';
  if (!S.missions.active) return `Next: ${m.title} — go to the gold marker to start`;
  return st ? st.label : m.title;
}
export function objectiveTarget(S) {
  if (S.race.active) return S.race.checkpoints[S.race.checkpoint] || null;
  const m = currentMission(S), st = currentStage(S);
  if (!m) return null;
  if (!S.missions.active) return startMarker(S);
  if (!st) return null;
  if (st.kind === 'goto' || st.kind === 'deliver-car') return { x: st.x, y: st.y };
  return null;
}
export function startMarker(S) {
  const m = currentMission(S);
  if (!m) return null;
  const first = m.stages[0];
  return { x: first.x ?? 420, y: first.y ?? 2560 };
}

export function updateMissions(S, dt) {
  const ms = S.missions;
  const m = currentMission(S);
  if (!m) { ms.done = true; return; }
  if (ms.failedT > 0) { ms.failedT -= dt; return; }
  if (!ms.active) {
    // Standing on the gold start marker with the required rank begins the briefing.
    const marker = startMarker(S);
    const rank = S.respectRank.rank;
    if (marker && Math.hypot(S.player.x - marker.x, S.player.y - marker.y) < 56) {
      if (rank >= m.rank) { ms.active = true; ms.stage = 0; ms.briefingT = 6; S.toast(m.title); S.dispatch(m.brief); S.audio?.mission(); }
      else if (!ms.rankWarnT || S.time - ms.rankWarnT > 4) { ms.rankWarnT = S.time; S.toast(`Respect rank too low — need ${m.rank}, you are ${rank}`); }
    }
    return;
  }
  ms.briefingT = Math.max(0, ms.briefingT - dt);
  const st = currentStage(S);
  if (!st) { completeMission(S); return; }
  switch (st.kind) {
    case 'goto':
      if (Math.hypot(S.player.x - st.x, S.player.y - st.y) < 62) advanceStage(S);
      break;
    case 'deliver-car':
      if (S.player.car && Math.hypot(S.player.x - st.x, S.player.y - st.y) < 90) advanceStage(S);
      else if (!S.player.car && Math.hypot(S.player.x - st.x, S.player.y - st.y) < 62 && ms.stageWarnT === undefined) { /* must arrive by car */ }
      break;
    case 'heat':
      if (Math.floor(S.wanted) >= st.stars) advanceStage(S);
      break;
    case 'escape':
      if (S.wanted <= 0) advanceStage(S);
      break;
    case 'survive':
      ms.surviveT += dt;
      if (S.health <= 20) { /* danger, but holding on counts double drama */ }
      if (ms.surviveT >= st.seconds) { ms.surviveT = 0; advanceStage(S); }
      break;
    case 'race':
      if (S.race.lastResult === 'win' && S.race.forMission === m.id) advanceStage(S);
      else if (!S.race.active && !S.race.offered) { S.race.offered = true; S.toast('Go to the race start on the Strip'); }
      break;
    case 'clear':
      if (ms.clearCount >= st.count) advanceStage(S);
      break;
  }
  // Fail: busted or wasted during an active mission restarts the stage chain.
  if (S.justBusted || S.justWasted) {
    ms.active = false; ms.stage = 0; ms.surviveT = 0; ms.failedT = 3;
    S.toast(`${m.title} failed — Nadia will call again.`);
  }
}

function advanceStage(S) {
  const ms = S.missions;
  ms.stage++; ms.surviveT = 0; ms.clearCount = 0;
  S.audio?.objective();
  const m = currentMission(S);
  if (ms.stage >= m.stages.length) completeMission(S);
  else S.toast(`Objective: ${m.stages[ms.stage].label}`);
}

function completeMission(S) {
  const ms = S.missions;
  const m = currentMission(S);
  S.cash += m.pay;
  const d = districtAt(S.player.x, S.player.y);
  S.respect[d.id] = (S.respect[d.id] || 0) + Math.floor(m.respect / 2);
  S.respect[m.district] = (S.respect[m.district] || 0) + Math.ceil(m.respect / 2);
  S.totalRespect = Object.values(S.respect).reduce((a, b) => a + b, 0);
  ms.index++; ms.stage = 0; ms.active = false;
  S.toast(`${m.title} complete — +$${m.pay}, +${m.respect} respect`);
  S.dispatch(`Nadia: "Clean work, Rook. ${ms.index >= MISSIONS.length ? 'The bay is ours.' : 'Next job is on your map.'}"`);
  S.audio?.cashBig();
  S.saveGame();
  if (ms.index >= MISSIONS.length) { ms.done = true; S.toast('VICE TIDE COMPLETE — free roam unlocked forever'); }
}

export function missionProgressLabel(S) {
  const m = currentMission(S);
  if (!m) return 'Story complete';
  return `Mission ${S.missions.index + 1}/12 — ${m.title}`;
}
