// random.js — deterministic seeded randomness for Caldera Bay: Vice Tide.
// The whole city is generated from one seed so screenshots (?shot= scenes) and the
// graded runs are reproducible: same seed, same buildings, same traffic spawn table.

export class Rng {
  constructor(seed) {
    this.state = (seed >>> 0) || 1;
  }
  next() {
    // xorshift32
    let x = this.state;
    x ^= x << 13; x >>>= 0;
    x ^= x >> 17;
    x ^= x << 5; x >>>= 0;
    this.state = x;
    return x / 4294967296;
  }
  range(lo, hi) { return lo + this.next() * (hi - lo); }
  int(lo, hi) { return Math.floor(this.range(lo, hi + 1)); }
  pick(arr) { return arr[Math.floor(this.next() * arr.length) % arr.length]; }
  chance(p) { return this.next() < p; }
  shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      const t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }
}

export function hashSeedFromString(text) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h || 7;
}

export function noise2(seed, x, y) {
  // Cheap value noise for sand/grass variation; deterministic per seed.
  const r = new Rng((seed ^ Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263)) >>> 0);
  return r.next();
}

export function pickWeighted(rng, entries) {
  let total = 0;
  for (const e of entries) total += e.weight;
  let roll = rng.next() * total;
  for (const e of entries) {
    roll -= e.weight;
    if (roll <= 0) return e.value;
  }
  return entries[entries.length - 1].value;
}

export function gaussian(rng, mean = 0, spread = 1) {
  // Box-Muller on the seeded stream: bell-curve scatter for props and crowds.
  let u = 0, v = 0;
  while (u === 0) u = rng.next();
  while (v === 0) v = rng.next();
  const z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  return mean + z * spread;
}

export function poissonish(rng, lambda) {
  // Knuth's algorithm, capped: how many extra peds/cars an event spawns.
  const limit = Math.exp(-lambda);
  let k = 0, p = 1;
  do { k++; p *= rng.next(); } while (p > limit && k < 12);
  return k - 1;
}
