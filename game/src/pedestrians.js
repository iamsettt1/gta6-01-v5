// Puerto Brisa — Storm Surge: pedestrians — walkers, crowds and bystanders.
//
// Around sixty people live on the sidewalks: they stroll between waypoints,
// carry umbrellas in the rain, flee from gunfire and speeding cars, and
// cower when the storm or a shootout lands on their street. Mission givers
// stand at their markers; rivals and officers are driven by their own
// modules and skipped here.

import { S, clamp, dist } from './config.js';
import { isOnLand, isOnRoad } from './city-map.js';

export function spawnPedestrian(S2, x, y, role, opts) {
  const ped = {
    x, y,
    angle: Math.random() * Math.PI * 2,
    speed: 0,
    role: role || 'walker',
    shirt: (opts && opts.shirt) || pickShirt(),
    skin: ['#e8b98d', '#c98d64', '#8a5a3b', '#6e452a'][Math.floor(Math.random() * 4)],
    state: 'walk',
    wx: x,
    wy: y,
    waitT: 0,
    health: 100,
    name: (opts && opts.name) || '',
    umbrella: false,
    faction: (opts && opts.faction) || null,
    coverX: 0,
    coverY: 0,
  };
  S.peds.push(ped);
  return ped;
}

function pickShirt() {
  return ['#e33f4e', '#37b6ff', '#ffc845', '#7ec850', '#f2f2f2', '#ff4fd8', '#ff7a59', '#14c8bc'][Math.floor(Math.random() * 8)];
}

export function scatterPedestrians(S2, rand, count) {
  let placed = 0;
  let guard = 0;
  while (placed < count && guard < count * 40) {
    guard += 1;
    const road = rand.pick(S.city.roads);
    const x = road.x + rand.range(0, road.w);
    const y = road.y + rand.range(0, road.h);
    if (!isOnLand(S, x, y)) continue;
    const ped = spawnPedestrian(S2, x + rand.range(-26, 26), y + rand.range(-26, 26), 'walker');
    ped.umbrella = rand.chance(0.3);
    placed += 1;
  }
  return placed;
}

export function updatePedestrians(S2, dt) {
  const p = S.player;
  for (const ped of S.peds) {
    if (ped.health <= 0) continue;
    if (ped.role === 'rival' || ped.role === 'cop' || ped.role === 'target') continue;
    if (ped.role === 'giver' || ped.role === 'fare') {
      ped.state = 'stand';
      continue;
    }
    // Walkers react first, wander second.
    const dPlayer = dist(ped.x, ped.y, p.x, p.y);
    const danger = (p.inVehicle && Math.abs(p.inVehicle.speed) > 200 && dPlayer < 130) || S.combatNoiseT > S.t - 1.2 && dPlayer < 380;
    if (danger) ped.state = 'flee';
    else if (S.weather.storm > 0.75 && Math.random() < dt * 0.2) ped.state = 'cower';
    else if (ped.state === 'flee' && dPlayer > 460) ped.state = 'walk';
    else if (ped.state === 'cower' && S.weather.storm <= 0.75) ped.state = 'walk';

    if (ped.state === 'flee') {
      const a = Math.atan2(ped.y - p.y, ped.x - p.x);
      movePed(S2, ped, a, 265, dt);
    } else if (ped.state === 'walk') {
      if (ped.waitT > 0) {
        ped.waitT -= dt;
        ped.speed = 0;
        continue;
      }
      const d = dist(ped.x, ped.y, ped.wx, ped.wy);
      if (d < 18) {
        // New waypoint: a stroll of a block or two, staying on land.
        for (let tries = 0; tries < 6; tries++) {
          const nx = ped.x + (Math.random() - 0.5) * 520;
          const ny = ped.y + (Math.random() - 0.5) * 520;
          if (isOnLand(S, nx, ny) && !isOnRoad(S, nx, ny) || isOnRoad(S, nx, ny)) {
            ped.wx = nx;
            ped.wy = ny;
            break;
          }
        }
        if (Math.random() < 0.3) ped.waitT = 1 + Math.random() * 2.5;
      } else {
        movePed(S2, ped, Math.atan2(ped.wy - ped.y, ped.wx - ped.x), 92, dt);
      }
    } else {
      ped.speed = 0;
    }
    ped.umbrella = S.weather.rain > 0.25 ? ped.umbrella || Math.random() < dt * 0.1 : ped.umbrella && Math.random() > dt * 0.05;
  }
}

function movePed(S2, ped, angle, speed, dt) {
  ped.angle = angle;
  ped.speed = speed;
  const nx = ped.x + Math.cos(angle) * speed * dt;
  const ny = ped.y + Math.sin(angle) * speed * dt;
  if (isOnLand(S, nx, ny)) {
    ped.x = clamp(nx, 20, 6780);
    ped.y = clamp(ny, 20, 4580);
  } else {
    ped.wx = ped.x + (Math.random() - 0.5) * 200;
    ped.wy = ped.y + (Math.random() - 0.5) * 200;
  }
}

export function drawPedestrian(ctx, ped, S2) {
  if (ped.health <= 0) {
    // Down: a still shape, no gore.
    ctx.save();
    ctx.translate(ped.x, ped.y);
    ctx.rotate(ped.angle);
    ctx.fillStyle = 'rgba(30,30,36,0.55)';
    ctx.beginPath();
    ctx.ellipse(0, 0, 15, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }
  ctx.save();
  ctx.translate(ped.x, ped.y);
  ctx.fillStyle = 'rgba(10,12,16,0.3)';
  ctx.beginPath();
  ctx.ellipse(1, 4, 10, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.rotate(ped.angle);
  const stride = Math.sin(S.t * 10 + ped.x) * (ped.speed > 0 ? 3.5 : 0);
  ctx.fillStyle = '#2c3440';
  ctx.fillRect(-3, -8 + stride * 0.4, 7, 5);
  ctx.fillRect(-3, 3 - stride * 0.4, 7, 5);
  ctx.fillStyle = ped.role === 'cop' ? '#20344d' : ped.role === 'rival' ? '#7a1f28' : ped.role === 'target' ? '#ffd23e' : ped.shirt;
  ctx.beginPath();
  ctx.arc(0, 0, 9.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = ped.skin;
  ctx.beginPath();
  ctx.arc(2.5, 0, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  if (ped.umbrella && S.weather.rain > 0.2) {
    ctx.save();
    ctx.translate(ped.x, ped.y);
    ctx.fillStyle = 'rgba(30,60,110,0.85)';
    ctx.beginPath();
    ctx.arc(0, 0, 17, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  if (ped.role === 'giver') {
    // A fat gold ring so the giver reads from the contact sheet.
    ctx.save();
    ctx.strokeStyle = '#ffc845';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(ped.x, ped.y, 20 + Math.sin(S.t * 4) * 3, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
  void S2;
}
