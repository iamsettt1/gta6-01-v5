// Puerto Brisa — Storm Surge: safehouses — buy, save, patch up.
//
// Three houses: a Mirador flat, a Playa Brisa beach house, an Isla Ancla
// hideout. F at the door buys an unowned house; F at your own door saves
// the game, refills armour and shows the garage stats — the numbers the
// empire screenshot quotes.

import { S, dist } from './config.js';
import { showMessage } from './player-on-foot.js';
import { saveBrisaProgress } from './save-game.js';
import { playSynthHit } from './audio-synth.js';

export function buySafehouse(S2, id) {
  const house = SAFEHOUSES.find((h) => h.id === id);
  if (!house || S.safehousesOwned[id]) return false;
  if (S.progress.cash < house.price) {
    showMessage(S, `${house.name} costs $${house.price} — the crew is not there yet.`);
    return false;
  }
  S.progress.cash -= house.price;
  S.safehousesOwned[id] = true;
  saveBrisaProgress(S);
  playSynthHit(S, 'cash');
  showMessage(S, `${house.name} is yours. F at the door saves and patches you up.`);
  return true;
}

export const SAFEHOUSES = [
  { id: 'mirador', name: 'Mirador Flat', x: 520, y: 900, price: 4000 },
  { id: 'playa', name: 'Playa Brisa Beach House', x: 3980, y: 1620, price: 6500 },
  { id: 'isla', name: 'Isla Ancla Hideout', x: 5480, y: 2300, price: 9000 },
];

export function nearestSafehouse(S2, x, y) {
  let best = null;
  let bestD = 90;
  for (const h of SAFEHOUSES) {
    const d = dist(x, y, h.x, h.y);
    if (d < bestD) {
      bestD = d;
      best = h;
    }
  }
  return best;
}

export function updateSafehouses(S2, dt, pressed) {
  const p = S.player;
  if (!p || p.inVehicle) return;
  const house = nearestSafehouse(S, p.x, p.y);
  if (!house) return;
  if (!pressed.has('f')) return;
  if (!S.safehousesOwned[house.id]) {
    buySafehouse(S, house.id);
    return;
  }
  // Home: save, armour, and a breath.
  S.player.armour = 100;
  saveBrisaProgress(S);
  playSynthHit(S, 'pickup');
  showMessage(S, `${house.name} — saved. Armour refilled. Cars driven ${S.stats.carsDriven} · boats ${S.stats.boatsDriven} · flights ${S.stats.flights}.`);
  void dt;
}

export function garageStatsLine(S2) {
  const s = S.stats;
  return `Cars ${s.carsDriven} · Boats ${s.boatsDriven} · Flights ${s.flights} · ${(s.distance / 1000).toFixed(1)} km`;
}
