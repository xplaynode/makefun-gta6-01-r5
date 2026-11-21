// citylife.js — Caldera Bay's ambient life systems: scheduled city events
// (market rush, ferry arrival, beach crowds, night neon), wandering vendor carts,
// buskers who draw a crowd, gulls over the beach, tide and weather drift, and
// small world reactions (peds comment, traffic slows for events). These systems
// run on their own clocks and feed toasts, spawns and traffic modifiers so the
// city feels alive even between missions.

import { WORLD_W, BEACH_Y, SEA_Y, clamp } from './config.js';
import { Rng } from './random.js';

export const CITY_EVENTS = [
  { id: 'market-rush', name: 'Market Rush', district: 'mercado', duration: 90, pedBoost: 10, trafficSlow: 0.8, toast: 'Mercado Alto is packed — market rush hour.' },
  { id: 'ferry-in', name: 'Ferry Arrival', district: 'portazul', duration: 70, pedBoost: 8, trafficSlow: 0.9, toast: 'The Port Azul ferry just docked. Crowds on the quay.' },
  { id: 'beach-day', name: 'Beach Day', district: 'marina', duration: 120, pedBoost: 14, trafficSlow: 1, toast: 'Beach day on the Marina promenade.' },
  { id: 'neon-hour', name: 'Neon Hour', district: 'coralstrip', duration: 110, pedBoost: 9, trafficSlow: 0.85, toast: 'Neon hour on the Coral Strip — every sign is lit.' },
  { id: 'port-shift', name: 'Port Shift Change', district: 'portazul', duration: 80, pedBoost: 6, trafficSlow: 0.7, toast: 'Shift change at the port. Trucks everywhere.' },
  { id: 'siesta', name: 'Siesta', district: 'palmera', duration: 100, pedBoost: -8, trafficSlow: 1.1, toast: 'Siesta in Palmera Heights. The streets breathe out.' },
];

export function makeCityLife(seed) {
  const rng = new Rng(seed * 41 + 900);
  return {
    event: null, eventT: 0, nextEventAt: 45,
    weather: { kind: 'clear', wind: 0.2, cloud: 0.1, rain: 0, t: 0, nextChange: 180 },
    tide: 0, gulls: spawnGulls(rng), carts: spawnCarts(rng), buskers: spawnBuskers(rng),
    comments: [], lastCommentAt: 0,
  };
}

function spawnGulls(rng) {
  const gulls = [];
  for (let i = 0; i < 16; i++) {
    gulls.push({ x: rng.range(200, WORLD_W - 200), y: rng.range(SEA_Y - 260, SEA_Y - 40), phase: rng.range(0, 6.28), speed: rng.range(24, 48), radius: rng.range(60, 180), cx: 0, cy: 0 });
  }
  for (const g of gulls) { g.cx = g.x; g.cy = g.y; }
  return gulls;
}

function spawnCarts(rng) {
  const spots = [
    { x: 620, y: 1820, goods: ' churros', hue: '#e8a13a' }, { x: 980, y: 2460, goods: ' coconut', hue: '#37b8a5' },
    { x: 1640, y: 860, goods: ' coffee', hue: '#8c5a3b' }, { x: 2960, y: 2060, goods: ' fish rolls', hue: '#3d7bd9' },
    { x: 4300, y: 2300, goods: ' ice', hue: '#9fd4e8' }, { x: 700, y: 940, goods: ' flowers', hue: '#e85d8a' },
  ];
  return spots.map((s, i) => ({ ...s, id: i, bobPhase: rng.range(0, 6.28), stock: rng.int(4, 12), price: rng.int(4, 9) }));
}

function spawnBuskers(rng) {
  return [
    { x: 880, y: 1560, instrument: 'guitar', crowd: 0, tip: 0, phase: rng.range(0, 6.28) },
    { x: 1780, y: 940, instrument: 'sax', crowd: 0, tip: 0, phase: rng.range(0, 6.28) },
    { x: 3300, y: 2560, instrument: 'drums', crowd: 0, tip: 0, phase: rng.range(0, 6.28) },
  ];
}

export function updateCityLife(S, dt) {
  const life = S.cityLife;
  life.tide = Math.sin(S.time * 0.05) * 14;
  updateWeather(S, dt);
  updateEvents(S, dt);
  updateGulls(S, dt);
  updateBuskers(S, dt);
  updateComments(S, dt);
}

function updateWeather(S, dt) {
  const w = S.cityLife.weather;
  w.t += dt;
  w.wind = clamp(w.wind + (S.rng.next() - 0.5) * 0.02, 0, 1);
  if (w.t > w.nextChange) {
    w.t = 0; w.nextChange = S.rng.range(140, 260);
    const roll = S.rng.next();
    w.kind = roll < 0.62 ? 'clear' : roll < 0.85 ? 'breeze' : 'shower';
    w.rain = w.kind === 'shower' ? 0.7 : 0;
    w.cloud = w.kind === 'clear' ? 0.1 : w.kind === 'breeze' ? 0.35 : 0.7;
    if (w.kind === 'shower') S.toast('A warm bay shower rolls over Caldera Bay');
  }
}

function updateEvents(S, dt) {
  const life = S.cityLife;
  if (life.event) {
    life.eventT -= dt;
    if (life.eventT <= 0) { life.event = null; life.nextEventAt = S.rng.range(50, 110); }
    return;
  }
  life.nextEventAt -= dt;
  if (life.nextEventAt <= 0) {
    life.event = CITY_EVENTS[S.rng.int(0, CITY_EVENTS.length - 1)];
    life.eventT = life.event.duration;
    S.toast(life.event.toast);
  }
}

function updateGulls(S, dt) {
  for (const g of S.cityLife.gulls) {
    g.phase += dt * 0.7;
    g.x = g.cx + Math.cos(g.phase) * g.radius;
    g.y = g.cy + Math.sin(g.phase * 1.3) * 26;
    if (S.rng.chance(0.001)) { g.cx = clamp(g.cx + S.rng.range(-300, 300), 200, WORLD_W - 200); }
  }
}

function updateBuskers(S, dt) {
  for (const b of S.cityLife.buskers) {
    b.phase += dt * 2.2;
    let crowd = 0;
    for (const ped of S.peds) if (Math.hypot(ped.x - b.x, ped.y - b.y) < 90) crowd++;
    b.crowd = crowd;
    if (crowd >= 3 && S.rng.chance(0.01)) b.tip += S.rng.int(1, 4);
  }
}

const PED_COMMENTS = [
  '“Golden hour makes even the CBPD look romantic.”', '“Heard Nadia Ferrer is hiring wheelmen again.”',
  '“The ferry to Faro is late. Again.”', '“CONDOR-1 kept me up all night.”',
  '“Best churros in Mercado Alto, no contest.”', '“Respect is the only currency that never devalues here.”',
  '“They say Rook Salazar never pays for parking.”', '“Roadblock on the causeway yesterday. Waltzed right through.”',
];
function updateComments(S, dt) {
  const life = S.cityLife;
  if (S.time - life.lastCommentAt < 7) return;
  // A nearby chatting ped occasionally surfaces a line of bay gossip.
  for (const ped of S.peds) {
    if (ped.state === 'chat' && Math.hypot(ped.x - S.player.x, ped.y - S.player.y) < 150) {
      life.lastCommentAt = S.time;
      life.comments.push({ text: PED_COMMENTS[S.rng.int(0, PED_COMMENTS.length - 1)], at: S.time, x: ped.x, y: ped.y });
      if (life.comments.length > 2) life.comments.shift();
      return;
    }
  }
}

export function trafficSlowFactor(S) {
  return S.cityLife.event ? S.cityLife.event.trafficSlow : 1;
}
export function eventPedBoost(S) {
  return S.cityLife.event ? S.cityLife.event.pedBoost : 0;
}

export function drawCityLife(ctx, S, vx, vy) {
  // Gulls over the sea.
  ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 1.6;
  for (const g of S.cityLife.gulls) {
    const x = g.x - vx, y = g.y - vy;
    if (x < -30 || x > 1310 || y < -30 || y > 750) continue;
    const flap = Math.sin(S.time * 9 + g.phase * 4) * 4;
    ctx.beginPath(); ctx.moveTo(x - 7, y + flap); ctx.quadraticCurveTo(x, y - 3, x, y); ctx.quadraticCurveTo(x, y - 3, x + 7, y + flap); ctx.stroke();
  }
  // Vendor carts.
  for (const cart of S.cityLife.carts) {
    const x = cart.x - vx, y = cart.y - vy + Math.sin(S.time * 2 + cart.bobPhase) * 0.8;
    if (x < -60 || x > 1340 || y < -60 || y > 780) continue;
    ctx.fillStyle = 'rgba(20,10,20,0.3)'; ctx.fillRect(x - 14, y + 10, 34, 8);
    ctx.fillStyle = '#e8e0d0'; ctx.fillRect(x - 16, y - 6, 36, 16);
    ctx.fillStyle = cart.hue; ctx.fillRect(x - 19, y - 15, 42, 9);
    ctx.fillStyle = '#2c2830'; ctx.beginPath(); ctx.arc(x - 8, y + 12, 4, 0, Math.PI * 2); ctx.arc(x + 12, y + 12, 4, 0, Math.PI * 2); ctx.fill();
  }
  // Buskers with their crowd ring.
  for (const b of S.cityLife.buskers) {
    const x = b.x - vx, y = b.y - vy;
    if (x < -60 || x > 1340 || y < -60 || y > 780) continue;
    ctx.strokeStyle = 'rgba(255,215,110,0.5)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x, y, 20 + Math.sin(b.phase) * 2, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#7a4a8c'; ctx.fillRect(x - 5, y - 8, 10, 13);
    ctx.fillStyle = '#c98a5a'; ctx.beginPath(); ctx.arc(x, y - 12, 5.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffd76a'; ctx.font = '10px system-ui'; ctx.textAlign = 'center';
    ctx.fillText(b.instrument === 'guitar' ? '♪ guitar' : b.instrument === 'sax' ? '♪ sax' : '♪ drums', x, y + 24);
  }
  // Rain.
  if (S.cityLife.weather.rain > 0) {
    ctx.strokeStyle = 'rgba(190,220,240,0.4)'; ctx.lineWidth = 1;
    for (let i = 0; i < 60; i++) {
      const rx = ((i * 173 + S.time * 620) % 1300) - 10, ry = ((i * 251 + S.time * 880) % 740) - 10;
      ctx.beginPath(); ctx.moveTo(rx, ry); ctx.lineTo(rx - 3, ry + 11); ctx.stroke();
    }
  }
  // Floating gossip comments.
  ctx.font = 'italic 11px system-ui'; ctx.textAlign = 'center';
  for (const c of S.cityLife.comments) {
    const age = S.time - c.at;
    if (age > 5) continue;
    ctx.globalAlpha = Math.max(0, 1 - age / 5);
    ctx.fillStyle = '#fff';
    ctx.fillText(c.text, c.x - vx, c.y - vy - 34 - age * 3);
    ctx.globalAlpha = 1;
  }
}

export function buyFromCart(S, cart) {
  if (S.cash < cart.price || cart.stock <= 0) return false;
  S.cash -= cart.price; cart.stock--;
  S.health = clamp(S.health + 18, 0, 100);
  S.toast(`Cart snack${cart.goods}: +18 health, -$${cart.price}`);
  S.audio?.cash();
  return true;
}
export function nearestCart(S, range = 60) {
  for (const cart of S.cityLife.carts) if (Math.hypot(cart.x - S.player.x, cart.y - S.player.y) < range) return cart;
  return null;
}
