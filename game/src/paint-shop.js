// Puerto Brisa — Storm Surge: paint shops — respray, repair, lose the heat.
//
// Two shops (marina and Zona Libre). R cycles the colour chart; a respray
// repairs the car to full and — the old trick — a fresh colour is a fresh
// car to the LPD, so the wanted level goes with the old paint, for a fee
// that grows with your stars.

import { S } from './config.js';
import { showMessage } from './player-on-foot.js';
import { playSynthHit } from './audio-synth.js';
import { clearWanted } from './police-pursuit.js';

export function resprayAtPaintShop(S2, veh, colour) {
  const stars = S.wanted.stars;
  const fee = 250 + stars * 120;
  if (S.progress.cash < fee) {
    showMessage(S, `Respray costs $${fee} with your heat — come back richer.`);
    return false;
  }
  S.progress.cash -= fee;
  veh.colour = colour;
  veh.health = 100;
  if (stars > 0) clearWanted(S, 'respray');
  playSynthHit(S, 'cash');
  showMessage(S, stars > 0 ? `Fresh paint, fixed panels — and nobody knows the car. $${fee}.` : `Fresh paint and a full repair. $${fee}.`);
  return true;
}

export const PAINT_SPOTS = [
  { x: 1560, y: 1560, w: 230, h: 160, name: 'Pintura del Puerto' },
  { x: 5560, y: 1420, w: 230, h: 160, name: 'Pintura Libre' },
];

export const RESPRAY_COLOURS = ['#e33f4e', '#37b6ff', '#ffc845', '#7ec850', '#ff4fd8', '#f2f2f2', '#22262e', '#ff7a59', '#14c8bc'];

export function updatePaintShop(S2, dt, pressed) {
  const veh = S.player.inVehicle;
  if (!veh || (veh.kind !== 'car' && veh.kind !== 'bike')) return;
  const spot = PAINT_SPOTS.find((s) => veh.x > s.x && veh.x < s.x + s.w && veh.y > s.y && veh.y < s.y + s.h);
  if (!spot) return;
  if (!S.paintHintT || S.t < S.paintHintT) {
    showMessage(S, `${spot.name.toUpperCase()} — R: respray + repair + lose the heat`, 1.2);
    S.paintHintT = S.t + 1.4;
  }
  if (pressed.has('r')) {
    const idx = RESPRAY_COLOURS.indexOf(veh.colour);
    const next = RESPRAY_COLOURS[(idx + 1) % RESPRAY_COLOURS.length];
    resprayAtPaintShop(S, veh, next);
  }
  void dt;
}
