// Puerto Brisa — Storm Surge: the day cycle and its light.
//
// One slow clock drives dawn, noon, golden hour and neon night. It writes a
// darkness factor and a tint colour into S.day; the renderer lays the tint
// over the world and the neon signs wake up when S.day.neon is true.

import { clamp } from './config.js';

export function advanceDayCycle(S, dt) {
  const day = S.day;
  day.t01 = (day.t01 + dt / 720) % 1; // a full day lasts twelve minutes
  const t = day.t01;
  if (t < 0.22) {
    day.phase = 'dawn';
    day.dark = 0.35 - t * 1.2;
  } else if (t < 0.45) {
    day.phase = 'midday';
    day.dark = 0.02;
  } else if (t < 0.62) {
    day.phase = 'golden hour';
    day.dark = 0.08 + (t - 0.45) * 0.6;
  } else if (t < 0.78) {
    day.phase = 'dusk';
    day.dark = 0.34;
  } else {
    day.phase = 'neon night';
    day.dark = 0.55;
  }
  day.dark = clamp(day.dark, 0, 0.6);
  day.neon = day.dark > 0.25;
  day.tint = tintFor(day);
  day.sunAngle = t * Math.PI * 2;
  return day;
}

function tintFor(day) {
  if (day.phase === 'golden hour') return 'rgba(255,166,66,0.16)';
  if (day.phase === 'dawn') return 'rgba(255,150,120,0.10)';
  if (day.phase === 'dusk') return 'rgba(70,60,140,0.18)';
  if (day.phase === 'neon night') return 'rgba(16,20,60,0.30)';
  return 'rgba(255,240,200,0.04)';
}

// Pin the clock for a screenshot scene (golden hour, dusk, night...).
export function setDayPhase(S, t01) {
  S.day.t01 = t01;
  advanceDayCycle(S, 0);
}
