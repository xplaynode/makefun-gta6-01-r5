// audio.js — all sound is procedural WebAudio: engine hum, shots, crashes, cash,
// sirens, and the in-game RADIO with three original procedural stations (R cycles).
// No audio files exist; every loop is generated from note tables in code.

import { RADIO_STATIONS } from './config.js';

const POP_SCALE = [0, 2, 4, 7, 9, 12, 14, 16];
const FUNK_SCALE = [0, 3, 5, 7, 10, 12, 15, 17];
const JAZZ_SCALE = [0, 2, 3, 7, 9, 12, 14, 15];
const SCALES = [POP_SCALE, FUNK_SCALE, JAZZ_SCALE];
const PROGRESSIONS = [
  [0, -4, 5, -2], [0, -2, 3, -4], [0, 3, -2, 5],
];

export class AudioEngine {
  constructor() {
    this.ctx = null; this.master = null; this.radioGain = null; this.sfxGain = null;
    this.station = 0; this.radioOn = true; this.step = 0; this.nextNoteAt = 0;
    this.engineOsc = null; this.engineGain = null; this.sirenOsc = null; this.sirenGain = null;
    this.muted = false;
  }
  ensure() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.master = this.ctx.createGain(); this.master.gain.value = 0.5; this.master.connect(this.ctx.destination);
      this.sfxGain = this.ctx.createGain(); this.sfxGain.gain.value = 0.8; this.sfxGain.connect(this.master);
      this.radioGain = this.ctx.createGain(); this.radioGain.gain.value = 0.34; this.radioGain.connect(this.master);
      this.nextNoteAt = this.ctx.currentTime + 0.1;
      // Engine hum: a sawtooth whose pitch follows the player's car speed.
      this.engineOsc = this.ctx.createOscillator(); this.engineOsc.type = 'sawtooth'; this.engineOsc.frequency.value = 40;
      const engineFilter = this.ctx.createBiquadFilter(); engineFilter.type = 'lowpass'; engineFilter.frequency.value = 300;
      this.engineGain = this.ctx.createGain(); this.engineGain.gain.value = 0;
      this.engineOsc.connect(engineFilter); engineFilter.connect(this.engineGain); this.engineGain.connect(this.sfxGain);
      this.engineOsc.start();
      // Siren: slow LFO'd triangle, gain follows the wanted level.
      this.sirenOsc = this.ctx.createOscillator(); this.sirenOsc.type = 'triangle'; this.sirenOsc.frequency.value = 700;
      this.sirenGain = this.ctx.createGain(); this.sirenGain.gain.value = 0;
      this.sirenOsc.connect(this.sirenGain); this.sirenGain.connect(this.sfxGain);
      this.sirenOsc.start();
    } catch (e) { this.ctx = null; }
  }
  update(S, dt) {
    if (!this.ctx) return;
    const speed = S.player.car ? Math.abs(S.player.car.speed) : 0;
    const nitro = S.boostT > 0 ? 30 : 0;
    this.engineOsc.frequency.value = 40 + speed * 0.55 + nitro;
    this.engineGain.gain.value = S.player.car && S.mode === 'play' ? 0.05 + Math.min(0.06, speed / 4000) : 0;
    const sirenLevel = S.mode === 'play' && S.wanted > 0 && S.cops.length ? 0.018 : 0;
    this.sirenGain.gain.value += (sirenLevel - this.sirenGain.gain.value) * Math.min(1, dt * 4);
    this.sirenOsc.frequency.value = 660 + Math.sin(S.time * 5.2) * 160;
    this.scheduleRadio(S);
  }
  scheduleRadio(S) {
    if (!this.radioOn || S.mode !== 'play') return;
    const st = RADIO_STATIONS[this.station];
    const spb = 60 / st.bpm / 2; // eighth notes
    while (this.nextNoteAt < this.ctx.currentTime + 0.18) {
      this.playStep(st, this.step, this.nextNoteAt);
      this.nextNoteAt += spb; this.step++;
    }
  }
  playStep(st, step, at) {
    const scale = SCALES[this.station];
    const prog = PROGRESSIONS[this.station];
    const bar = Math.floor(step / 8) % 4;
    const chordRoot = st.root * Math.pow(2, prog[bar] / 12);
    if (step % 8 === 0) this.tone(chordRoot / 2, 0.5, st.wave, 0.16, at, this.radioGain);
    if (step % 2 === 0) {
      const idx = scale[(step * 3 + bar) % scale.length];
      this.tone(chordRoot * Math.pow(2, idx / 12), 0.16, st.wave, 0.1, at, this.radioGain);
    }
    if (step % 4 === 2) this.noise(0.05, 0.05, at, this.radioGain, 6000); // hat
    if (step % 8 === 4) this.noise(0.11, 0.12, at, this.radioGain, 1200); // snare
    if (this.station === 2 && step % 16 === 14) this.tone(chordRoot * 1.5, 0.6, 'sine', 0.08, at, this.radioGain);
  }
  tone(freq, dur, type, vol, at, dest) {
    if (!this.ctx) return;
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(vol, at); g.gain.exponentialRampToValueAtTime(0.001, at + dur);
    o.connect(g); g.connect(dest || this.sfxGain); o.start(at); o.stop(at + dur + 0.02);
  }
  noise(dur, vol, at, dest, freq = 2000) {
    if (!this.ctx) return;
    const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource(); src.buffer = buf;
    const f = this.ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq;
    const g = this.ctx.createGain(); g.gain.value = vol;
    src.connect(f); f.connect(g); g.connect(dest || this.sfxGain); src.start(at);
  }
  now() { return this.ctx ? this.ctx.currentTime : 0; }
  shot(kind) { if (!this.ctx) return; const t = this.now(); if (kind === 'shotgun') { this.noise(0.22, 0.5, t, this.sfxGain, 700); this.tone(90, 0.18, 'square', 0.3, t); } else if (kind === 'smg') { this.noise(0.07, 0.3, t, this.sfxGain, 1800); } else if (kind === 'rifle') { this.noise(0.16, 0.44, t, this.sfxGain, 1100); this.tone(140, 0.1, 'square', 0.2, t); } else { this.noise(0.1, 0.36, t, this.sfxGain, 1500); } }
  dryFire() { if (this.ctx) this.tone(1200, 0.04, 'square', 0.12, this.now()); }
  click() { if (this.ctx) this.tone(880, 0.05, 'square', 0.1, this.now()); }
  honk() { if (this.ctx) { const t = this.now(); this.tone(370, 0.14, 'square', 0.07, t); this.tone(466, 0.14, 'square', 0.05, t); } }
  door() { if (this.ctx) this.noise(0.08, 0.2, this.now(), this.sfxGain, 500); }
  crash() { if (this.ctx) { const t = this.now(); this.noise(0.3, 0.4, t, this.sfxGain, 400); this.tone(70, 0.3, 'sine', 0.3, t); } }
  explosion() { if (this.ctx) { const t = this.now(); this.noise(0.8, 0.6, t, this.sfxGain, 220); this.tone(48, 0.7, 'sine', 0.5, t); } }
  crate() { if (this.ctx) this.noise(0.12, 0.25, this.now(), this.sfxGain, 900); }
  cash() { if (this.ctx) { const t = this.now(); this.tone(1320, 0.07, 'triangle', 0.14, t); this.tone(1760, 0.1, 'triangle', 0.12, t + 0.06); } }
  cashBig() { if (this.ctx) { const t = this.now(); [880, 1108, 1318, 1760].forEach((f, i) => this.tone(f, 0.14, 'triangle', 0.14, t + i * 0.09)); } }
  mission() { if (this.ctx) { const t = this.now(); this.tone(523, 0.12, 'triangle', 0.16, t); this.tone(784, 0.16, 'triangle', 0.16, t + 0.11); } }
  objective() { if (this.ctx) this.tone(1046, 0.1, 'triangle', 0.14, this.now()); }
  checkpoint() { if (this.ctx) { const t = this.now(); this.tone(988, 0.08, 'square', 0.12, t); this.tone(1318, 0.1, 'square', 0.12, t + 0.07); } }
  raceStart() { if (this.ctx) { const t = this.now(); [440, 440, 440, 880].forEach((f, i) => this.tone(f, 0.12, 'square', 0.14, t + i * 0.4)); } }
  raceWin() { if (this.ctx) { const t = this.now(); [523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.16, 'triangle', 0.15, t + i * 0.1)); } }
  raceLose() { if (this.ctx) { const t = this.now(); this.tone(392, 0.2, 'triangle', 0.14, t); this.tone(311, 0.3, 'triangle', 0.14, t + 0.18); } }
  rankUp() { if (this.ctx) { const t = this.now(); [659, 880, 1108].forEach((f, i) => this.tone(f, 0.12, 'triangle', 0.14, t + i * 0.08)); } }
  ability() { if (this.ctx) this.tone(1560, 0.12, 'sine', 0.16, this.now()); }
  menuOpen() { if (this.ctx) this.tone(740, 0.06, 'triangle', 0.12, this.now()); }
  menuClose() { if (this.ctx) this.tone(494, 0.06, 'triangle', 0.12, this.now()); }
  denied() { if (this.ctx) this.tone(196, 0.14, 'square', 0.14, this.now()); }
  busted() { if (this.ctx) { const t = this.now(); [330, 262, 196].forEach((f, i) => this.tone(f, 0.22, 'triangle', 0.16, t + i * 0.16)); } }
  wasted() { if (this.ctx) { const t = this.now(); this.tone(110, 0.8, 'sawtooth', 0.2, t); } }
  cycleRadio() {
    this.station = (this.station + 1) % RADIO_STATIONS.length;
    this.step = 0;
    if (this.ctx) this.nextNoteAt = this.ctx.currentTime + 0.05;
    return RADIO_STATIONS[this.station];
  }
  stationName() { return this.radioOn ? RADIO_STATIONS[this.station].name : 'RADIO OFF'; }
}
