// Puerto Brisa — Storm Surge: Rosa on foot — walking, sprinting, carjacking.
//
// The player is a body in the world whenever she is not inside a vehicle.
// This module moves her, keeps her out of buildings, keeps her out of the
// sea (a dunking costs a dock fine), and handles getting into and out of
// every vehicle kind — including pulling a traffic driver out of his seat.

import { CFG, S, clamp, dist } from './config.js';
import { moveAxes } from './input-controls.js';
import { collideWithBuildings, isWaterAt } from './city-map.js';
import { sprayWater } from './effects-particles.js';
import { playSynthHit } from './audio-synth.js';

export function createPlayer(S2, x, y) {
  const player = {
    x, y,
    angle: -Math.PI / 2,
    speed: 0,
    radius: 15,
    health: 100,
    armour: 0,
    stamina: 100,
    weapon: 'pistol',
    ammo: { pistol: 90, scattergun: 24, smg: 160, rifle: 40 },
    inVehicle: null,
    enterCooldown: 0,
    dead: false,
  };
  S.player = player;
  return player;
}

export function updatePlayerOnFoot(S2, dt) {
  const p = S.player;
  if (!p || p.inVehicle) return;
  p.enterCooldown = Math.max(0, p.enterCooldown - dt);
  const axes = moveAxes();
  const sprinting = (S.input.keys.has('shift')) && p.stamina > 2 && (axes.x !== 0 || axes.y !== 0);
  const speed = CFG.PLAYER_SPEED * (sprinting ? CFG.PLAYER_RUN_MULT : 1);
  p.stamina = clamp(p.stamina + (sprinting ? -26 : 15) * dt, 0, 100);
  if (axes.x !== 0 || axes.y !== 0) {
    p.angle = Math.atan2(axes.y, axes.x);
    p.speed = speed;
  } else {
    p.speed = 0;
    // Face the mouse when standing and aiming.
    const wx = S.cam.x + S.input.mouse.x;
    const wy = S.cam.y + S.input.mouse.y;
    if (S.input.mouse.down) p.angle = Math.atan2(wy - p.y, wx - p.x);
  }
  const nx = p.x + axes.x * speed * dt;
  const ny = p.y + axes.y * speed * dt;
  const hit = collideWithBuildings(S, nx, ny, p.radius);
  p.x = clamp(hit.x, 24, CFG.WORLD_W - 24);
  p.y = clamp(hit.y, 24, CFG.WORLD_H - 24);
  // Water is not for walking: splash, fine, back to the nearest dock.
  if (isWaterAt(S, p.x, p.y)) {
    sprayWater(S, p.x, p.y, 16, 1.2);
    playSynthHit(S, 'splash');
    S.progress.cash = Math.max(0, S.progress.cash - CFG.WATER_FINE);
    showMessage(S, `The harbour patrol fishes you out — ${'$' + CFG.WATER_FINE} fine.`);
    const dock = nearestDock(S, p.x, p.y);
    p.x = dock.x;
    p.y = dock.y - 26;
  }
  S.stats.distance += Math.abs(p.speed) * dt;
}

export function nearestDock(S2, x, y) {
  let best = S.city.docks[0] || { x: 420, y: 2200 };
  let bestD = Infinity;
  for (const d of S.city.docks) {
    const dd = dist(x, y, d.x, d.y);
    if (dd < bestD) {
      bestD = dd;
      best = d;
    }
  }
  return best;
}

// Enter the nearest vehicle (E). A traffic driver is pulled out and runs.
export function tryEnterVehicle(S2) {
  const p = S.player;
  if (!p || p.inVehicle || p.enterCooldown > 0) return false;
  let best = null;
  let bestD = 86;
  for (const veh of S.vehicles) {
    if (veh.health <= 0) continue;
    const d = dist(p.x, p.y, veh.x, veh.y);
    if (d < bestD) {
      bestD = d;
      best = veh;
    }
  }
  if (!best) return false;
  if (best.driver === 'traffic' || best.driver === 'rival') {
    if (S.hooks.onCarjack) S.hooks.onCarjack(S, best);
    best.driver = null;
  }
  best.driver = 'player';
  best.parked = false;
  p.inVehicle = best;
  p.enterCooldown = 0.35;
  if (best.kind === 'car' || best.kind === 'bike') S.stats.carsDriven += 1;
  if (best.kind === 'boat') S.stats.boatsDriven += 1;
  if (best.kind === 'heli' || best.kind === 'plane') S.stats.flights += 1;
  return true;
}

export function exitVehicle(S2) {
  const p = S.player;
  if (!p || !p.inVehicle) return;
  const veh = p.inVehicle;
  veh.driver = null;
  if (Math.abs(veh.speed) < 12) veh.parked = true;
  // Step out beside the vehicle, on the side away from its centre line.
  const side = Math.PI / 2;
  p.x = veh.x + Math.cos(veh.angle + side) * (veh.h / 2 + 22);
  p.y = veh.y + Math.sin(veh.angle + side) * (veh.h / 2 + 22);
  const hit = collideWithBuildings(S, p.x, p.y, p.radius);
  p.x = hit.x;
  p.y = hit.y;
  p.inVehicle = null;
  p.enterCooldown = 0.35;
  S.audio.engineOn = false;
}

export function showMessage(S2, text, seconds) {
  S.message = text;
  S.messageT = seconds || 3.4;
}

export function drawPlayer(ctx, S2) {
  const p = S.player;
  if (!p || p.inVehicle) return;
  ctx.save();
  ctx.translate(p.x, p.y);
  // Soft shadow.
  ctx.fillStyle = 'rgba(10,12,16,0.35)';
  ctx.beginPath();
  ctx.ellipse(2, 5, 15, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.rotate(p.angle);
  // Legs in motion.
  ctx.fillStyle = '#2c3440';
  const stride = Math.sin(S.t * 11) * (p.speed > 0 ? 5 : 0);
  ctx.fillRect(-6, -11 + stride * 0.4, 10, 6);
  ctx.fillRect(-6, 5 - stride * 0.4, 10, 6);
  // Torso — Rosa's teal jacket.
  ctx.fillStyle = '#0f7a72';
  ctx.beginPath();
  ctx.arc(0, 0, 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#14c8bc';
  ctx.beginPath();
  ctx.arc(1, 0, 9, 0, Math.PI * 2);
  ctx.fill();
  // Head.
  ctx.fillStyle = '#c98d64';
  ctx.beginPath();
  ctx.arc(3, 0, 6.4, 0, Math.PI * 2);
  ctx.fill();
  // Gun arm toward the aim.
  ctx.strokeStyle = '#22262e';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(6, 4);
  ctx.lineTo(19, 5);
  ctx.stroke();
  ctx.restore();
  void S2;
}
