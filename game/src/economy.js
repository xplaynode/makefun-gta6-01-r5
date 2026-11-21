// economy.js — cash, the GARAGE, the SHOP, SAFEHOUSES, district respect, crew
// abilities, and the localStorage save. Menus are canvas panels opened by standing
// on a service marker and pressing E; every purchase is real state the game reads.

import { GARAGE_UPGRADES, SHOP_ITEMS, SAVE_KEY, RESPECT_RANKS, respectRankFor, CREW } from './config.js';

export function makeEconomy() {
  return {
    garage: { armour: 0, engine: 0, nitro: 0 },
    menu: null, // { kind: 'garage'|'shop'|'safehouse', service }
    menuIndex: 0,
  };
}
export function makeCrewState() {
  const out = {};
  for (const c of CREW) out[c.id] = { cooldownT: 0 };
  return out;
}

export function nearestService(S, range = 84) {
  for (const svc of S.world.services) {
    if (Math.hypot(S.player.x - (svc.x + 60), S.player.y - (svc.y + 37)) < range) return svc;
  }
  return null;
}

export function openServiceMenu(S, svc) {
  S.eco.menu = { kind: svc.kind, service: svc };
  S.eco.menuIndex = 0;
  S.audio?.menuOpen();
}
export function closeServiceMenu(S) { S.eco.menu = null; S.audio?.menuClose(); }

export function menuItems(S) {
  const menu = S.eco.menu;
  if (!menu) return [];
  if (menu.kind === 'garage') {
    return GARAGE_UPGRADES.map(u => {
      const lvl = S.garage[u.id];
      const price = lvl < 3 ? u.levels[lvl + 1] : null;
      return { label: `${u.name} — Lv${lvl}${price ? ` → Lv${lvl + 1} ($${price})` : ' MAX'}`, desc: u.desc, price, id: u.id };
    });
  }
  if (menu.kind === 'shop') return SHOP_ITEMS.map(i => ({ label: `${i.name} — $${i.price}`, desc: i.desc, price: i.price, id: i.id }));
  if (menu.kind === 'safehouse') {
    const price = heatPrice(S);
    return [{ label: `Lay low — clear all heat ($${price})`, desc: 'Wanted level to zero, police stand down.', price, id: 'laylow' },
            { label: 'Rest — heal to full ($60)', desc: 'A quiet room and a hot meal.', price: 60, id: 'rest' }];
  }
  return [];
}

export function heatPrice(S) { return 150 + Math.floor(S.wanted) * 220; }

export function buyMenuItem(S) {
  const items = menuItems(S);
  const item = items[S.eco.menuIndex];
  if (!item || item.price === null) { S.toast('Already at max level'); return; }
  if (S.cash < item.price) { S.toast('Not enough cash'); S.audio?.denied(); return; }
  S.cash -= item.price;
  applyPurchase(S, item.id);
  S.audio?.cash();
  S.saveGame();
}
function applyPurchase(S, id) {
  switch (id) {
    case 'armour': case 'engine': case 'nitro': S.garage[id]++; S.toast(`${id.toUpperCase()} upgraded to Lv${S.garage[id]}`); break;
    case 'vest': S.armour = 100; S.toast('Kevlar vest fitted'); break;
    case 'health': case 'rest': S.health = 100; S.toast('Patched up — health full'); break;
    case 'pistol': S.arsenal.ammo.pistol += 24; S.toast('+24 pistol rounds'); break;
    case 'smg': S.arsenal.ammo.smg += 60; S.toast('+60 SMG rounds'); break;
    case 'shells': S.arsenal.ammo.shells += 12; S.toast('+12 shells'); break;
    case 'rifle': S.arsenal.ammo.rifle += 30; S.toast('+30 rifle rounds'); break;
    case 'laylow': S.wanted = 0; S.cops.forEach(c => c.leaving = true); S.roadblocks = []; S.toast('Heat cleared — the bay forgets'); break;
  }
}

// --- crew abilities -------------------------------------------------------
export function updateCrew(S, dt) {
  for (const c of CREW) S.crew[c.id].cooldownT = Math.max(0, S.crew[c.id].cooldownT - dt);
  S.boostT = Math.max(0, (S.boostT || 0) - dt);
  S.jamT = Math.max(0, (S.jamT || 0) - dt);
  S.adrenalineT = Math.max(0, (S.adrenalineT || 0) - dt);
}
export function useCrewAbility(S, crewId) {
  const def = CREW.find(c => c.id === crewId);
  const st = S.crew[crewId];
  if (!def || st.cooldownT > 0) { if (def) S.toast(`${def.name}: "${def.ability} needs ${Math.ceil(st.cooldownT)}s"`); return; }
  st.cooldownT = def.cooldown;
  if (crewId === 'pico') { S.boostT = 3.2; if (S.player.car) S.player.car.speed *= 1.35; S.toast('Pico: "Overdrive! Hold on."'); }
  if (crewId === 'sable') { S.jamT = 6; S.toast('Sable: "Dispatch is deaf for six seconds."'); }
  if (crewId === 'toro') { S.adrenalineT = 8; S.toast('Toro: "Adrenaline up. Swing hard."'); }
  S.audio?.ability();
}

// --- respect ---------------------------------------------------------------
export function recomputeRespect(S) {
  S.totalRespect = Object.values(S.respect).reduce((a, b) => a + b, 0);
  const before = S.respectRank;
  S.respectRank = respectRankFor(S.totalRespect);
  if (before && S.respectRank.rank > before.rank) { S.toast(`Respect rank up: ${S.respectRank.name}`); S.audio?.rankUp(); }
}
export function nextRankLabel(S) {
  const next = RESPECT_RANKS[S.respectRank.rank + 1];
  return next ? `${next.name} at ${next.need}` : 'Top rank';
}

// --- save / load -------------------------------------------------------------
export function saveGame(S) {
  try {
    const data = {
      cash: S.cash, respect: S.respect, totalRespect: S.totalRespect,
      missionIndex: S.missions.index, garage: S.garage,
      ammo: S.arsenal.ammo, raceBest: S.raceBest, health: S.health, armour: S.armour,
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch (e) { /* storage unavailable: the run continues unsaved */ }
}
export function loadGame(S) {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;
    const d = JSON.parse(raw);
    S.cash = d.cash ?? S.cash;
    S.respect = d.respect ?? S.respect;
    S.missions.index = d.missionIndex ?? 0;
    S.garage = d.garage ?? S.garage;
    if (d.ammo) S.arsenal.ammo = d.ammo;
    S.raceBest = d.raceBest ?? {};
    S.health = d.health ?? 100; S.armour = d.armour ?? 0;
    recomputeRespect(S);
    return true;
  } catch (e) { return false; }
}
export function wipeSave() { try { localStorage.removeItem(SAVE_KEY); } catch (e) {} }
