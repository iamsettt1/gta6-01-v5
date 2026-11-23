// Puerto Brisa — Storm Surge: the bounty board — six names, six prices.
//
// The board stands at the marina. F posts the next name; the target walks
// his district until Rosa gets close, then runs. Brought in alive (F, up
// close) pays the full poster; brought down pays sixty percent and a
// colder conscience.

import { S, dist } from './config.js';
import { spawnPedestrian } from './pedestrians.js';
import { showMessage } from './player-on-foot.js';
import { playSynthHit } from './audio-synth.js';

export function postBountyTarget(S2, name) {
  const bounty = S.bounties.find((b) => b.name === name) || S.bounties.find((b) => !b.caught && !b.active);
  if (!bounty || bounty.caught) return null;
  const ped = spawnPedestrian(S, bounty.x, bounty.y, 'target', { name: bounty.name, shirt: '#ffd23e' });
  bounty.active = true;
  bounty.ped = ped;
  showMessage(S, `BOUNTY POSTED — ${bounty.name}, $${bounty.reward} alive. Last seen: ${bounty.district}.`);
  return bounty;
}

export const BOUNTY_BOARD_SPOT = { x: 520, y: 2150 };

export const BOUNTIES = [
  { name: 'El Cuervo', reward: 6500, district: 'El Mirador', x: 820, y: 960 },
  { name: 'La Víbora', reward: 5200, district: 'Barrio Iris', x: 2900, y: 1900 },
  { name: 'El Martillo', reward: 4800, district: 'Puerto Brisa Marina', x: 1300, y: 1750 },
  { name: 'Doble Cara', reward: 5600, district: 'Avenida Coral', x: 2500, y: 700 },
  { name: 'El Fantasma', reward: 7200, district: 'Zona Libre', x: 5900, y: 900 },
  { name: 'Madre Monte', reward: 8000, district: 'Isla Ancla', x: 5900, y: 2400 },
];

export function initBountyBoard(S2) {
  S.bounties = BOUNTIES.map((b) => ({ ...b, active: false, caught: false, ped: null }));
}

export function updateBountyBoard(S2, dt, pressed) {
  const p = S.player;
  if (!p) return;
  // Posting the next name happens at the board itself.
  if (!p.inVehicle && pressed.has('f') && dist(p.x, p.y, BOUNTY_BOARD_SPOT.x, BOUNTY_BOARD_SPOT.y) < 90) {
    if (!S.bounties.some((b) => b.active && !b.caught)) postBountyTarget(S);
  }
  for (const bounty of S.bounties) {
    if (!bounty.active || bounty.caught || !bounty.ped) continue;
    const ped = bounty.ped;
    if (ped.health <= 0) {
      bounty.caught = true;
      bounty.active = false;
      const pay = Math.round(bounty.reward * 0.6);
      S.progress.cash += pay;
      S.progress.bountiesCaught += 1;
      playSynthHit(S, 'cash');
      showMessage(S, `${bounty.name} brought down — $${pay}. Alive pays better.`);
      continue;
    }
    const d = dist(p.x, p.y, ped.x, ped.y);
    // The target walks until Rosa is close, then runs for it.
    if (d < 300) {
      const a = Math.atan2(ped.y - p.y, ped.x - p.x);
      ped.x += Math.cos(a) * 235 * dt;
      ped.y += Math.sin(a) * 235 * dt;
      ped.angle = a;
      ped.speed = 235;
    } else {
      ped.wx = ped.wx || ped.x;
      ped.wy = ped.wy || ped.y;
      if (dist(ped.x, ped.y, ped.wx, ped.wy) < 16) {
        ped.wx = bounty.x + (Math.random() - 0.5) * 360;
        ped.wy = bounty.y + (Math.random() - 0.5) * 360;
      }
      const a = Math.atan2(ped.wy - ped.y, ped.wx - ped.x);
      ped.x += Math.cos(a) * 80 * dt;
      ped.y += Math.sin(a) * 80 * dt;
      ped.angle = a;
      ped.speed = 80;
    }
    // Alive capture: on foot, close, F.
    if (!p.inVehicle && d < 38 && pressed.has('f')) {
      bounty.caught = true;
      bounty.active = false;
      ped.health = -999;
      S.progress.cash += bounty.reward;
      S.progress.bountiesCaught += 1;
      playSynthHit(S, 'cash');
      showMessage(S, `${bounty.name} brought in ALIVE — $${bounty.reward}. ${S.progress.bountiesCaught}/6.`);
    }
  }
}
