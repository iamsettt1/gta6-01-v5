// Puerto Brisa — Storm Surge: territory — three Herrera blocks in El Mirador.
//
// Take a block in mission 10 (or by clearing its corner crew any time) and
// the streets recolour from Herrera red to crew teal — on the ground, on the
// minimap and on the full-city map, all reading this one table. Holding all
// three pays a daily cut while you play.

import { CFG, S } from './config.js';
import { showMessage } from './player-on-foot.js';

export function claimTerritoryBlock(S2, index) {
  if (S.territory[index]) return false;
  S.territory[index] = 1;
  showMessage(S, `${TERRITORY_BLOCKS[index].name} flies the crew colours now.`);
  if (S.territory.every((t) => t === 1)) {
    S.progress.cash += 2500;
    showMessage(S, 'All of El Mirador held — $2,500 crew bonus.');
    if (S.hooks.onTerritoryComplete) S.hooks.onTerritoryComplete();
  }
  return true;
}

export const TERRITORY_BLOCKS = [
  { name: 'Plaza del Faro block', rect: { x: 420, y: 420, w: 380, h: 300 } },
  { name: 'Los Arcos block', rect: { x: 900, y: 420, w: 380, h: 300 } },
  { name: 'Mirador Alto block', rect: { x: 640, y: 820, w: 380, h: 300 } },
];

// The tint the renderer lays over a block: red while Herrera, teal once held.
export function territoryTintAt(S2, x, y) {
  for (let i = 0; i < TERRITORY_BLOCKS.length; i++) {
    const r = TERRITORY_BLOCKS[i].rect;
    if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) {
      return S.territory[i] ? 'rgba(20,200,188,0.13)' : 'rgba(227,63,78,0.13)';
    }
  }
  return null;
}

export function updateTerritory(S2, dt) {
  if (!S.territory.every((t) => t === 1)) return;
  S.territoryPayT += dt;
  if (S.territoryPayT > 240) {
    S.territoryPayT = 0;
    S.progress.cash += 400;
    showMessage(S, 'Territory cut: $400 from the Mirador blocks.');
  }
  void CFG;
}
