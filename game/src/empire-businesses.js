// Puerto Brisa — Storm Surge: empire businesses — own the city's night.
//
// Four businesses can be bought at their doors with F: the Iris nightclub,
// the marina boatyard, the taxi depot and the chop shop. Each pays its
// takings while you play, the pause screen's empire panel lists them, and
// owning all four unlocks the Storm Surge finale's best escape.

import { S, dist } from './config.js';
import { showMessage } from './player-on-foot.js';
import { playSynthHit } from './audio-synth.js';

export function buyNightclub(S2) {
  return buyBusiness(S2, 'nightclub');
}

export const BUSINESSES = [
  { id: 'nightclub', name: 'Club Iris', kind: 'Nightclub', price: 12000, income: 340, x: 2620, y: 1500 },
  { id: 'boatyard', name: 'Astillería Brisa', kind: 'Boatyard', price: 9000, income: 260, x: 980, y: 1560 },
  { id: 'taxidepot', name: 'Brisa Taxi Depot', kind: 'Taxi depot', price: 8000, income: 220, x: 2050, y: 900 },
  { id: 'chopshop', name: 'Taller Clandestino', kind: 'Chop shop', price: 10000, income: 300, x: 5750, y: 1300 },
];

export function initEmpireBusinesses(S2) {
  S.businesses = BUSINESSES.map((b) => ({ ...b, owned: false }));
  S.empireComplete = false;
}

export function buyBusiness(S2, id) {
  const biz = S.businesses.find((b) => b.id === id);
  if (!biz || biz.owned) return false;
  if (S.progress.cash < biz.price) {
    showMessage(S, `${biz.name} is $${biz.price} — the empire waits for no broke driver.`);
    return false;
  }
  S.progress.cash -= biz.price;
  biz.owned = true;
  playSynthHit(S, 'cash');
  showMessage(S, `${biz.name} is yours — $${biz.income} an hour, every hour.`);
  if (S.businesses.every((b) => b.owned)) {
    S.empireComplete = true;
    showMessage(S, 'THE WHOLE EMPIRE. The Storm Surge escape is yours to take.');
    if (S.hooks.onEmpireComplete) S.hooks.onEmpireComplete();
  }
  return true;
}

export function empireIncomePerHour(S2) {
  return S.businesses.filter((b) => b.owned).reduce((sum, b) => sum + b.income, 0);
}

export function updateEmpireBusinesses(S2, dt, pressed) {
  // Takings land every ninety seconds of play per owned business.
  S.businessIncomeT += dt;
  if (S.businessIncomeT > 90) {
    S.businessIncomeT = 0;
    const due = Math.round(empireIncomePerHour(S) / 4);
    if (due > 0) {
      S.progress.cash += due;
      showMessage(S, `Business takings: $${due} across the empire.`);
    }
  }
  // Buying happens at the door, on foot, with F.
  const p = S.player;
  if (!p || p.inVehicle || !pressed.has('f')) return;
  for (const biz of S.businesses) {
    if (biz.owned) continue;
    if (dist(p.x, p.y, biz.x, biz.y) < 90) {
      buyBusiness(S, biz.id);
      return;
    }
  }
}
