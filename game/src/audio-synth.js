// Puerto Brisa — Storm Surge: synthesized audio, no files.
//
// A small WebAudio rig: an engine hum whose pitch follows speed, a rotor and
// a prop loop for the aircraft, a two-tone siren, a three-station radio
// noodle while driving, and one-shot hits for gunfire, pickups and thunder.
// Everything is guarded: with no user gesture (or in a headless screenshot
// run) the context simply never starts and the game stays silent.

import { clamp } from './config.js';

export function startSynthAudio(S) {
  if (S.audio.ctx) return S.audio;
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const master = ctx.createGain();
    master.gain.value = 0.16;
    master.connect(ctx.destination);
    const engine = ctx.createOscillator();
    const engineGain = ctx.createGain();
    engine.type = 'sawtooth';
    engine.frequency.value = 60;
    engineGain.gain.value = 0;
    engine.connect(engineGain).connect(master);
    engine.start();
    const rotor = ctx.createOscillator();
    const rotorGain = ctx.createGain();
    rotor.type = 'square';
    rotor.frequency.value = 22;
    rotorGain.gain.value = 0;
    rotor.connect(rotorGain).connect(master);
    rotor.start();
    const siren = ctx.createOscillator();
    const sirenGain = ctx.createGain();
    siren.type = 'triangle';
    siren.frequency.value = 700;
    sirenGain.gain.value = 0;
    siren.connect(sirenGain).connect(master);
    siren.start();
    S.audio.ctx = ctx;
    S.audio.master = master;
    S.audio.nodes = { engine, engineGain, rotor, rotorGain, siren, sirenGain };
  } catch (err) {
    S.audio.ctx = null; // audio is garnish; never break the game for it
  }
  return S.audio;
}

export function updateSynthAudio(S, dt) {
  const a = S.audio;
  if (!a.ctx || !a.nodes) return;
  const t = a.ctx.currentTime;
  const n = a.nodes;
  n.engineGain.gain.setTargetAtTime(a.engineOn ? 0.05 + a.enginePitch * 0.05 : 0, t, 0.08);
  n.engine.frequency.setTargetAtTime(55 + a.enginePitch * 165, t, 0.08);
  n.rotorGain.gain.setTargetAtTime(clamp(a.rotor, 0, 1) * 0.05, t, 0.1);
  n.rotor.frequency.setTargetAtTime(19 + clamp(a.rotor, 0, 1) * 9, t, 0.1);
  n.sirenGain.gain.setTargetAtTime(a.siren > 0.05 ? 0.018 : 0, t, 0.1);
  if (a.siren > 0.05) n.siren.frequency.setTargetAtTime(680 + Math.sin(S.t * 7) * 190, t, 0.05);
  if (a.thunder) {
    a.thunder = 0;
    playNoiseHit(S, 0.5, 160, 0.22);
  }
  void dt;
}

// One-shot synthesized hits: gunshots, pickup chimes, splashes, thunder.
export function playSynthHit(S, kind) {
  const a = S.audio;
  if (!a.ctx || !a.master) return;
  const ctx = a.ctx;
  const t = ctx.currentTime;
  if (kind === 'shot') return playNoiseHit(S, 0.09, 900, 0.12);
  if (kind === 'rifle') return playNoiseHit(S, 0.16, 500, 0.16);
  if (kind === 'thunder') return playNoiseHit(S, 0.6, 140, 0.2);
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain).connect(a.master);
  if (kind === 'pickup') {
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, t);
    osc.frequency.setValueAtTime(1320, t + 0.07);
    gain.gain.setValueAtTime(0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
    osc.start(t);
    osc.stop(t + 0.24);
  } else if (kind === 'cash') {
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(660, t);
    osc.frequency.setValueAtTime(990, t + 0.06);
    osc.frequency.setValueAtTime(1320, t + 0.12);
    gain.gain.setValueAtTime(0.1, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    osc.start(t);
    osc.stop(t + 0.32);
  } else if (kind === 'splash') {
    playNoiseHit(S, 0.25, 700, 0.08);
  }
}

function playNoiseHit(S, dur, cutoff, vol) {
  const a = S.audio;
  if (!a.ctx || !a.master) return;
  const ctx = a.ctx;
  const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
  const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = cutoff;
  const gain = ctx.createGain();
  gain.gain.value = vol;
  src.connect(filter).connect(gain).connect(a.master);
  src.start();
}
