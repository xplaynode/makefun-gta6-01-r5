// narrative.js — Caldera Bay's writing layer: Nadia Ferrer's phone calls between
// missions, crew banter lines keyed to game events, district lore for the map,
// CBPD dispatch flavour beyond the wanted announcements, and the epilogue beats
// after the final mission. All original names, places and dialogue.

export const DISTRICT_LORE = {
  marina: 'Marina Vieja: fishing boats, ferry queues, and Nadia\u2019s first safehouse above the chandlery.',
  mercado: 'Mercado Alto: three hundred stalls, one protection ledger, zero patience for late payers.',
  palmera: 'Palmera Heights: valet rows, glass villas, and cars that are easier to borrow than to buy.',
  centro: 'Centro Coral: banks, the Banco del Mar depot, and the CBPD\u2019s favourite hunting ground.',
  portazul: 'Port Azul: cranes, crates and the last ferry — everything in the bay moves through here once.',
  bahia: 'Bahia Norte: the hilltop relay, the rich view, and the roadblock waltz\u2019s home straight.',
  coralstrip: 'The Coral Strip: neon, races, and the only jury whose verdict is a stopwatch.',
  salinas: 'Las Salinas: salt flats, scrap yards, and debts collected in person.',
  faro: 'Faro Point: the lighthouse, the causeway, and CONDOR-1\u2019s favourite perch.',
};

export const NADIA_CALLS = [
  { after: 0, line: 'Nadia (phone): “You made the bay, Rook. The gold markers are mine. Follow them, get paid, stay breathing.”' },
  { after: 1, line: 'Nadia (phone): “Mercado paid up. Word travels — Palmera\u2019s valet row is careless with keys.”' },
  { after: 2, line: 'Nadia (phone): “That Cabrio looks good at the Taller. The port job is heavier. Bring Sable.”' },
  { after: 3, line: 'Nadia (phone): “Ferry manifest was clean. CBPD is bored, Rook. Let\u2019s give them a siren test.”' },
  { after: 4, line: 'Nadia (phone): “Three stars and you walked away smiling. The Strip wants a race next.”' },
  { after: 5, line: 'Nadia (phone): “Strip respect earned. Now the real money: Banco del Mar\u2019s depot, with Sable on the door.”' },
  { after: 6, line: 'Nadia (phone): “The vault sang. A witness rolls to Bahia under escort — you know what to do.”' },
  { after: 7, line: 'Nadia (phone): “You waltzed through four stars. CONDOR season opens next. I almost feel sorry for the bird.”' },
  { after: 8, line: 'Nadia (phone): “The bird lost you in the salt. Toro has a personal matter in those same flats.”' },
  { after: 9, line: 'Nadia (phone): “Toro\u2019s marker is ashes. One relay left, Rook. Golden hour. Make it ours.”' },
  { after: 10, line: 'Nadia (phone): “The relay is ours. One night left: the Vice Tide run. Three legs. Dawn deadline.”' },
  { after: 11, line: 'Nadia (phone): “Caldera Bay is ours, Rook. Keep the engine warm — the bay always calls back.”' },
];

export const CREW_BANTER = {
  wantedRise: [
    'Pico: “That\u2019s the CBPD\u2019s favourite song. Drive it off.”',
    'Sable: “I can deafen dispatch for six seconds. Say the word — X.”',
    'Toro: “Let them come close. I\u2019ve got adrenaline and opinions — C.”',
  ],
  carStolen: [
    'Pico: “Borrowed, not stolen. We\u2019re returning it… eventually.”',
    'Toro: “Nice wheels. Shame about the owner\u2019s day.”',
  ],
  raceWin: [
    'Pico: “THAT is how the Strip learns your name.”',
    'Sable: “Telemetry says you were flawless. Telemetry lies, but still.”',
  ],
  raceLose: [
    'Pico: “The bay remembers losses too. Run it back.”',
  ],
  lowHealth: [
    'Toro: “You\u2019re leaking, Rook. Shop, safehouse, or stubborn — pick two.”',
    'Nadia (phone): “Clinica Vida patches questions later. Get patched.”',
  ],
  rich: [
    'Sable: “That balance could buy the marina. Or a very quiet boat.”',
  ],
  night: [
    'Pico: “Neon hour. The whole bay glows and nobody sleeps.”',
  ],
};

export const DISPATCH_FLAVOUR = [
  'CBPD: “Unit 4, he\u2019s in a borrowed Coral Cabrio, proceed with envy.”',
  'CBPD: “Dispatch reminds all units: the suspect tips well at carts.”',
  'CBPD: “Air One reports the suspect drives like he pays for the roads.”',
  'CBPD: “Be advised, the suspect\u2019s crew includes a hacker. Radios may hiccup.”',
  'CBPD: “RAM unit, positive contact authorised. Paint is already ruined.”',
];

export function nadiaCallFor(missionIndex) {
  const call = NADIA_CALLS.find(c => c.after === missionIndex - 1) || NADIA_CALLS.find(c => c.after === missionIndex);
  return call ? call.line : null;
}
export function banterFor(S, event) {
  const lines = CREW_BANTER[event];
  if (!lines || !lines.length) return null;
  return lines[S.rng.int(0, lines.length - 1)];
}
export function loreFor(districtId) { return DISTRICT_LORE[districtId] || ''; }
export function dispatchFlavour(S) {
  if (S.rng.chance(0.5)) return DISPATCH_FLAVOUR[S.rng.int(0, DISPATCH_FLAVOUR.length - 1)];
  return null;
}

export function maybeBanter(S, event) {
  // Banter is rate-limited so the radio channel stays readable.
  if (S.time - (S.lastBanterAt || -99) < 16) return;
  const line = banterFor(S, event);
  if (!line) return;
  S.lastBanterAt = S.time;
  S.dispatch(line);
}

export const EPILOGUE_LINES = [
  'The ferry leaves Faro at dawn, gold light on flat water.',
  'Nadia Ferrer\u2019s ledger closes the season with one name on top: Rook Salazar.',
  'CONDOR-1 returns to its perch. The bay keeps its secrets one more night.',
  'Free roam: races, shops, safehouses and heat remain — Caldera Bay never really sleeps.',
];
export function epilogueLine(index) { return EPILOGUE_LINES[index % EPILOGUE_LINES.length]; }
