// Puerto Brisa — Storm Surge: combat — four weapons and the crews that fight.
//
// Pistol, scattergun, SMG and the long rifle. Bullets are fast tracers with
// a range; crews (role 'rival') take cover behind buildings and parked cars,
// advance when they have the numbers and break when they do not. The player
// fires on foot with the mouse, or drive-by from a car or a boat.

import { S, clamp, dist } from './config.js';
import { burstSparks, muzzleFlash } from './effects-particles.js';
import { playSynthHit } from './audio-synth.js';
import { reportCrime } from './police-pursuit.js';

export function fireWeapon(S2, shooter, angle) {
  const w = WEAPONS[shooter.weapon || 'pistol'];
  if (!w) return;
  if (shooter.isPlayer) {
    if (S.player.ammo[shooter.weapon] <= 0) return;
    S.player.ammo[shooter.weapon] -= 1;
    S.stats.shotsFired += 1;
    S.combatNoiseT = S.t;
    if (!S.mission || !S.mission.noCrime) reportCrime(S, 'gunfire');
  }
  muzzleFlash(S, shooter.x, shooter.y, angle);
  playSynthHit(S, shooter.weapon === 'rifle' ? 'rifle' : 'shot');
  for (let i = 0; i < w.pellets; i++) {
    const a = angle + (Math.random() - 0.5) * w.spread;
    S.bullets.push({
      x: shooter.x + Math.cos(angle) * 18,
      y: shooter.y + Math.sin(angle) * 18,
      vx: Math.cos(a) * w.speed,
      vy: Math.sin(a) * w.speed,
      life: w.range / w.speed,
      dmg: w.damage,
      from: shooter.isPlayer ? 'player' : shooter.faction || 'rival',
    });
  }
}

export const WEAPONS = {
  pistol: { name: 'Pistol', damage: 16, rate: 0.32, spread: 0.05, range: 430, pellets: 1, speed: 1500, auto: false },
  scattergun: { name: 'Scattergun', damage: 11, rate: 0.85, spread: 0.24, range: 260, pellets: 6, speed: 1300, auto: false },
  smg: { name: 'SMG', damage: 10, rate: 0.09, spread: 0.11, range: 460, pellets: 1, speed: 1550, auto: true },
  rifle: { name: 'Rifle', damage: 55, rate: 0.95, spread: 0.008, range: 980, pellets: 1, speed: 2400, auto: false },
};

export function updateCombat(S2, dt, pressed) {
  const p = S.player;
  if (!p) return;
  p.fireT = Math.max(0, (p.fireT || 0) - dt);
  // Weapon switching on 1-4.
  const slots = ['pistol', 'scattergun', 'smg', 'rifle'];
  for (let i = 0; i < 4; i++) {
    if (pressed && pressed.has(String(i + 1))) p.weapon = slots[i];
  }
  // Player fire: on foot toward the mouse; drive-by from cars and boats.
  const inGroundVehicle = p.inVehicle && (p.inVehicle.kind === 'car' || p.inVehicle.kind === 'bike' || p.inVehicle.kind === 'boat');
  if ((S.input.mouse.down || S.input.keys.has(' ')) && (!p.inVehicle || inGroundVehicle) && S.screen === 'game') {
    const w = WEAPONS[p.weapon];
    if (p.fireT <= 0 && (w.auto || !(p.firedLatch))) {
      const wx = S.cam.x + S.input.mouse.x;
      const wy = S.cam.y + S.input.mouse.y;
      const angle = Math.atan2(wy - p.y, wx - p.x);
      p.angle = angle;
      fireWeapon(S, { x: p.x, y: p.y, weapon: p.weapon, isPlayer: true }, angle);
      p.fireT = w.rate;
      p.firedLatch = true;
    }
  }
  if (!S.input.mouse.down && !S.input.keys.has(' ')) p.firedLatch = false;
  updateBullets(S2, dt);
  updateRivalCrew(S2, dt);
}

// Bullets fly, spark on buildings, and wound whoever they meet.
function updateBullets(S2, dt) {
  const list = S.bullets;
  for (let i = list.length - 1; i >= 0; i--) {
    const b = list[i];
    b.life -= dt;
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    if (b.life <= 0) {
      list.splice(i, 1);
      continue;
    }
    let dead = false;
    // Against people.
    for (const ped of S.peds) {
      if (ped.health <= 0) continue;
      if (b.from === 'player' && ped.role === 'giver') continue;
      if (b.from !== 'player' && ped.role === 'rival') continue;
      const d = dist(b.x, b.y, ped.x, ped.y);
      if (d < 13) {
        if (b.from === 'player' || ped.role === 'rival' || ped.role === 'target' || ped.role === 'cop') {
          ped.health -= b.dmg;
          burstSparks(S, b.x, b.y, 3, '#e33f4e');
          if (ped.health <= 0 && b.from === 'player') {
            if (ped.role === 'cop') reportCrime(S, 'assault');
            if (S.hooks.onPedDown) S.hooks.onPedDown(ped);
          }
          dead = true;
          break;
        }
      }
    }
    if (dead) {
      list.splice(i, 1);
      continue;
    }
    // Against the player.
    if (b.from !== 'player') {
      const p = S.player;
      const target = p.inVehicle || p;
      if (dist(b.x, b.y, target.x, target.y) < (p.inVehicle ? 30 : 13)) {
        hurtPlayer(S, b.dmg);
        list.splice(i, 1);
        continue;
      }
    }
    // Against vehicles.
    for (const veh of S.vehicles) {
      if (veh.driver === 'player') continue;
      if (Math.abs(b.x - veh.x) < veh.w / 2 && Math.abs(b.y - veh.y) < veh.h / 2 + 4) {
        veh.health -= b.dmg * 0.7;
        burstSparks(S, b.x, b.y, 3, '#ffd76a');
        dead = true;
        break;
      }
    }
    if (dead) list.splice(i, 1);
  }
}

export function hurtPlayer(S2, dmg) {
  const p = S.player;
  if (!p || p.health <= 0) return;
  if (p.armour > 0) {
    const absorbed = Math.min(p.armour, dmg * 0.7);
    p.armour -= absorbed;
    dmg -= absorbed;
  }
  p.health -= dmg;
  S.cam.shake = Math.min(9, S.cam.shake + 2.5);
  if (p.health <= 0 && S.hooks.onWasted) S.hooks.onWasted();
}

// The Herrera crew: cover, advance, shoot, break.
function updateRivalCrew(S2, dt) {
  const p = S.player;
  for (const ped of S.peds) {
    if (ped.role !== 'rival' || ped.health <= 0) continue;
    const d = dist(ped.x, ped.y, p.x, p.y);
    ped.fireT = Math.max(0, (ped.fireT || 0) - dt);
    const allies = S.peds.filter((q) => q.role === 'rival' && q.health > 0).length;
    if (ped.health < 25 || (allies <= 1 && d < 200)) {
      // Break and run.
      const a = Math.atan2(ped.y - p.y, ped.x - p.x);
      ped.x += Math.cos(a) * 240 * dt;
      ped.y += Math.sin(a) * 240 * dt;
      ped.angle = a;
      continue;
    }
    if (d > 300) {
      const a = Math.atan2(p.y - ped.y, p.x - ped.x);
      ped.x += Math.cos(a) * 175 * dt;
      ped.y += Math.sin(a) * 175 * dt;
      ped.angle = a;
    } else if (d < 130) {
      // Fall back to cover: sidestep toward the nearest building edge.
      const a = Math.atan2(ped.y - p.y, ped.x - p.x);
      ped.x += Math.cos(a) * 120 * dt;
      ped.y += Math.sin(a) * 120 * dt;
      ped.angle = Math.atan2(p.y - ped.y, p.x - ped.x);
    } else {
      ped.angle = Math.atan2(p.y - ped.y, p.x - ped.x);
      if (Math.random() < dt * 0.8) {
        ped.x += (Math.random() - 0.5) * 130 * dt;
        ped.y += (Math.random() - 0.5) * 130 * dt;
      }
    }
    if (d < 430 && ped.fireT <= 0) {
      fireWeapon(S, { x: ped.x, y: ped.y, weapon: Math.random() < 0.3 ? 'smg' : 'pistol', faction: 'rival' }, ped.angle + (Math.random() - 0.5) * 0.16);
      ped.fireT = 0.7 + Math.random() * 0.9;
    }
    ped.speed = 150;
  }
}

export function drawBullets(ctx, S2) {
  ctx.strokeStyle = 'rgba(255,220,120,0.9)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (const b of S.bullets) {
    ctx.moveTo(b.x - b.vx * 0.012, b.y - b.vy * 0.012);
    ctx.lineTo(b.x, b.y);
  }
  ctx.stroke();
  void clamp;
  void S2;
}
