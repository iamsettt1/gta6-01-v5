// Puerto Brisa — Storm Surge: traffic — the city's moving bloodstream.
//
// Each traffic car owns a route: one road, one direction, one lane offset.
// It steers by pure pursuit toward a look-ahead point on its lane, slows for
// the car in front, and at the end of its road picks any road that crosses
// there — bridges included, so the whole map, island and all, stays alive.

import { S, clamp, angDiff } from './config.js';
import { createCar, CAR_CLASSES, updateVehiclePhysics } from './vehicles-cars.js';

export function spawnTraffic(S2, rand, count) {
  const classes = Object.keys(CAR_CLASSES).filter((c) => c !== 'interceptor');
  const made = [];
  for (let i = 0; i < count; i++) {
    const road = rand.pick(S.city.roads);
    const cls = rand.pick(classes);
    const car = createCar(cls, 0, 0, 0, rand.pick(CAR_CLASSES[cls].colours));
    car.driver = 'traffic';
    placeOnRoad(S2, car, road, rand.range(0.1, 0.9), rand.chance(0.5) ? 1 : -1);
    S.vehicles.push(car);
    made.push(car);
  }
  return made;
}

function placeOnRoad(S2, car, road, t, dirSign) {
  car.route = { road, dirSign };
  if (road.dir === 'h') {
    car.x = road.x + road.w * t;
    car.y = road.y + road.h / 2 + dirSign * 23;
    car.angle = dirSign > 0 ? 0 : Math.PI;
  } else {
    car.x = road.x + road.w / 2 - dirSign * 23;
    car.y = road.y + road.h * t;
    car.angle = dirSign > 0 ? Math.PI / 2 : -Math.PI / 2;
  }
  car.speed = 120;
}

export function updateTraffic(S2, dt) {
  for (const car of S.vehicles) {
    if (car.driver !== 'traffic' || car.kind !== 'car' && car.kind !== 'bike') continue;
    if (!car.route) continue;
    const road = car.route.road;
    const dirSign = car.route.dirSign;
    // Look-ahead point on the lane.
    let lx;
    let ly;
    if (road.dir === 'h') {
      lx = car.x + dirSign * 150;
      ly = road.y + road.h / 2 + dirSign * 23;
    } else {
      lx = road.x + road.w / 2 - dirSign * 23;
      ly = car.y + dirSign * 150;
    }
    const desired = Math.atan2(ly - car.y, lx - car.x);
    const steer = clamp(angDiff(car.angle, desired) * 2.2, -1, 1);
    // Slow for whoever is ahead.
    let throttle = 0.75;
    for (const other of S.vehicles) {
      if (other === car) continue;
      const fx = car.x + Math.cos(car.angle) * 64;
      const fy = car.y + Math.sin(car.angle) * 64;
      const dx = other.x - fx;
      const dy = other.y - fy;
      if (dx * dx + dy * dy < 46 * 46) {
        throttle = 0;
        break;
      }
    }
    // Flee gunfire and sirens: if the player is hot nearby, traffic scatters.
    if (S.wanted.stars >= 2) {
      const dx = car.x - S.player.x;
      const dy = car.y - S.player.y;
      if (dx * dx + dy * dy < 420 * 420) throttle = 1;
    }
    updateVehiclePhysics(S2, car, dt, { throttle, steer, brake: throttle === 0 && Math.abs(car.speed) > 160 });
    // End of the road? Pick a crossing road and keep going.
    if (road.dir === 'h') {
      const endX = dirSign > 0 ? road.x + road.w - 30 : road.x + 30;
      if ((dirSign > 0 && car.x > endX) || (dirSign < 0 && car.x < endX)) switchRoad(S2, car);
    } else {
      const endY = dirSign > 0 ? road.y + road.h - 30 : road.y + 30;
      if ((dirSign > 0 && car.y > endY) || (dirSign < 0 && car.y < endY)) switchRoad(S2, car);
    }
  }
}

function switchRoad(S2, car) {
  const here = car.route.road;
  const candidates = [];
  for (const r of S.city.roads) {
    if (r === here) continue;
    // Roads that cross near this car's position.
    const nx = Math.max(r.x, Math.min(car.x, r.x + r.w));
    const ny = Math.max(r.y, Math.min(car.y, r.y + r.h));
    const dx = nx - car.x;
    const dy = ny - car.y;
    if (dx * dx + dy * dy < 130 * 130) candidates.push(r);
  }
  if (!candidates.length) {
    car.route.dirSign *= -1; // dead end: turn around
    return;
  }
  const next = candidates[Math.floor(Math.random() * candidates.length)];
  const dirSign = Math.random() < 0.5 ? 1 : -1;
  car.route = { road: next, dirSign };
  // Nudge onto the new lane so the pursuit steering swings the car around.
  if (next.dir === 'h') car.y = next.y + next.h / 2 + dirSign * 23;
  else car.x = next.x + next.w / 2 - dirSign * 23;
}
