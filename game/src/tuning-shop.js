// Puerto Brisa — Storm Surge: the tuning shop — neon, wheels, spoilers.
//
// One workshop in Barrio Iris. Roll in, and the keys cycle the catalogue:
// T fits the next neon underglow colour, U bolts a spoiler, Y swaps the
// wheels. The underglow shows on the car and on its minimap blip, which is
// why the race screenshot can prove the shop exists in a single frame.

import { S } from './config.js';
import { showMessage } from './player-on-foot.js';
import { playSynthHit } from './audio-synth.js';

export function fitNeonUnderglow(veh, colour) {
  veh.underglow = colour;
  return veh;
}

export const UNDERGLOW_COLOURS = ['#14c8bc', '#ff4fd8', '#37b6ff', '#ffc845', '#e33f4e', '#7ec850', null];
export const TUNING_SPOT = { x: 2820, y: 2040, w: 240, h: 170, name: 'Taller Iris — Tuning' };

export function inTuningShop(S2, veh) {
  const t = TUNING_SPOT;
  return veh && veh.x > t.x && veh.x < t.x + t.w && veh.y > t.y && veh.y < t.y + t.h;
}

export function updateTuningShop(S2, dt, pressed) {
  const veh = S.player.inVehicle;
  if (!veh || (veh.kind !== 'car' && veh.kind !== 'bike')) return;
  if (!inTuningShop(S, veh)) return;
  if (!S.tuningHintT || S.t < S.tuningHintT) {
    showMessage(S, 'TALLER IRIS — T: underglow $150 · U: spoiler $200 · Y: wheels $120', 1.2);
    S.tuningHintT = S.t + 1.4;
  }
  if (pressed.has('t')) {
    const idx = UNDERGLOW_COLOURS.indexOf(veh.underglow);
    const next = UNDERGLOW_COLOURS[(idx + 1) % UNDERGLOW_COLOURS.length];
    if (S.progress.cash >= 150 || next === veh.underglow) {
      if (next !== veh.underglow) S.progress.cash -= 150;
      fitNeonUnderglow(veh, next);
      playSynthHit(S, 'cash');
      showMessage(S, next ? `Neon underglow fitted — glow on.` : 'Underglow removed.');
    } else showMessage(S, 'Not enough cash for neon.');
  }
  if (pressed.has('u') && veh.kind === 'car') {
    if (!veh.spoiler && S.progress.cash >= 200) {
      S.progress.cash -= 200;
      veh.spoiler = true;
      playSynthHit(S, 'cash');
      showMessage(S, 'Spoiler bolted on.');
    } else if (veh.spoiler) showMessage(S, 'Spoiler already fitted.');
    else showMessage(S, 'Not enough cash for a spoiler.');
  }
  if (pressed.has('y')) {
    if (S.progress.cash >= 120) {
      S.progress.cash -= 120;
      veh.wheels = veh.wheels === 'sport' ? 'stock' : 'sport';
      playSynthHit(S, 'cash');
      showMessage(S, `Wheels swapped — ${veh.wheels}.`);
    } else showMessage(S, 'Not enough cash for wheels.');
  }
  void dt;
}
