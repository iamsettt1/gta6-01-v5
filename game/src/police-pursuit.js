// Puerto Brisa — Storm Surge: the wanted level and the LPD response.
//
// Crimes add heat; heat becomes stars; stars dispatch a response sized to
// the level — foot officers, patrol cars, interceptors and roadblocks,
// police boats on the water and, at five stars, the helicopter with its
// searchlight. Break line of sight long enough and the stars blink out.

import { S, clamp, dist, angDiff } from './config.js';
import { nearestRoadPoint } from './city-map.js';
import { createCar, updateVehiclePhysics } from './vehicles-cars.js';
import { launchBoat } from './boats.js';
import { createHelicopter } from './helicopter.js';
import { spawnPedestrian } from './pedestrians.js';

export function dispatchPoliceResponse(S2) {
  const stars = S.wanted.stars;
  if (stars <= 0) return;
  const wantCars = [0, 0, 2, 3, 4, 5][stars];
  const copCars = S.vehicles.filter((v) => v.cop && v.kind === 'car');
  for (let i = copCars.length; i < wantCars; i++) spawnCopCar(S2);
  if (stars >= 4 && S.player.inVehicle && S.player.inVehicle.kind === 'boat') {
    const copBoats = S.vehicles.filter((v) => v.cop && v.kind === 'boat');
    if (!copBoats.length) spawnCopBoat(S2);
  }
  if (stars >= 5) {
    const heli = S.vehicles.find((v) => v.cop && v.kind === 'heli' && v.driver === 'cop');
    if (!heli) spawnCopHelicopter(S2);
  }
  if (stars >= 1 && !S.player.inVehicle) {
    const foot = S.peds.filter((p) => p.role === 'cop');
    if (foot.length < 2) {
      const a = Math.random() * Math.PI * 2;
      spawnPedestrian(S, S.player.x + Math.cos(a) * 420, S.player.y + Math.sin(a) * 420, 'cop', { shirt: '#20344d' });
    }
  }
}

export function reportCrime(S2, kind) {
  const heat = { carjack: 26, assault: 22, gunfire: 30, hitrun: 34, mission: 40, theft: 18 }[kind] || 15;
  S.wanted.heat += heat;
  S.wanted.lastCrime = kind;
  while (S.wanted.heat >= 60 && S.wanted.stars < 5) {
    S.wanted.stars += 1;
    S.wanted.heat -= 60;
    S.wanted.bribeUsed = false;
    if (S.hooks.onWantedRise) S.hooks.onWantedRise(S, S.wanted.stars);
  }
  dispatchPoliceResponse(S2);
}

export function clearWanted(S2, why) {
  S.wanted.stars = 0;
  S.wanted.heat = 0;
  S.wanted.blinkT = 0;
  S.wanted.hiddenT = 0;
  for (const v of S.vehicles) {
    if (v.cop && v.driver === 'cop') v.driver = 'traffic';
    if (v.cop) v.cop = false;
  }
  S.peds = S.peds.filter((p) => p.role !== 'cop');
  void why;
}

function spawnCopCar(S2) {
  const p = S.player;
  const a = Math.random() * Math.PI * 2;
  const near = nearestRoadPoint(S, p.x + Math.cos(a) * 760, p.y + Math.sin(a) * 760);
  if (!near) return;
  const car = createCar('interceptor', near.x, near.y, 0, '#f2f4f6');
  car.cop = true;
  car.driver = 'cop';
  S.vehicles.push(car);
}

function spawnCopBoat(S2) {
  const boat = launchBoat(S, 'speedboat', S.player.x + 500, S.player.y + 300, 0);
  boat.cop = true;
  boat.driver = 'cop';
  boat.colour = '#f2f4f6';
  boat.parked = false;
}

function spawnCopHelicopter(S2) {
  const heli = createHelicopter(S.player.x + 600, S.player.y - 500, true);
  heli.driver = 'cop';
  heli.alt = 1;
  heli.parked = false;
  S.vehicles.push(heli);
}

// A roadblock: two interceptors parked across the road ahead of the player.
export function setRoadblock(S2) {
  const p = S.player;
  const ahead = nearestRoadPoint(S, p.x + Math.cos(p.angle) * 620, p.y + Math.sin(p.angle) * 620);
  if (!ahead) return;
  for (const off of [-24, 24]) {
    const car = createCar('interceptor', ahead.x + off, ahead.y + (off > 0 ? 18 : -18), Math.PI / 2, '#f2f4f6');
    car.cop = true;
    car.driver = null;
    car.parked = true;
    S.vehicles.push(car);
  }
}

export function updatePolicePursuit(S2, dt) {
  const w = S.wanted;
  const p = S.player;
  if (!p) return;
  let anyCopNear = false;
  // Cop vehicles chase.
  for (const veh of S.vehicles) {
    if (!veh.cop || veh.driver !== 'cop') continue;
    const d = dist(veh.x, veh.y, p.x, p.y);
    if (d < 1500) anyCopNear = true;
    if (d > 2400 && w.stars === 0) continue;
    if (veh.kind === 'car') {
      const desired = Math.atan2(p.y - veh.y, p.x - veh.x);
      const steer = clamp(angDiff(veh.angle, desired) * 2.4, -1, 1);
      const throttle = d > 90 ? 1 : 0.25;
      updateVehiclePhysics(S2, veh, dt, { throttle, steer, brake: d < 46 });
    } else if (veh.kind === 'heli') {
      veh.x += clamp(p.x - veh.x, -340 * dt, 340 * dt);
      veh.y += clamp(p.y - veh.y, -340 * dt, 340 * dt);
      veh.alt = 1;
      veh.lightAngle = Math.atan2(p.y - veh.y, p.x - veh.x);
      veh.rotor += dt * 30;
    } else if (veh.kind === 'boat') {
      const desired = Math.atan2(p.y - veh.y, p.x - veh.x);
      veh.angle += clamp(angDiff(veh.angle, desired), -1.4 * dt, 1.4 * dt);
      veh.speed = Math.min(veh.topSpeed, (veh.speed || 0) + 260 * dt);
      veh.x += Math.cos(veh.angle) * veh.speed * dt;
      veh.y += Math.sin(veh.angle) * veh.speed * dt;
    }
  }
  // Foot officers close in and can make the arrest.
  let busting = false;
  for (const cop of S.peds) {
    if (cop.role !== 'cop' || cop.health <= 0) continue;
    const d = dist(cop.x, cop.y, p.x, p.y);
    if (d < 900) anyCopNear = true;
    if (!p.inVehicle && d > 30) {
      cop.angle = Math.atan2(p.y - cop.y, p.x - cop.x);
      cop.x += Math.cos(cop.angle) * 200 * dt;
      cop.y += Math.sin(cop.angle) * 200 * dt;
      cop.speed = 200;
    }
    if (!p.inVehicle && d < 34 && Math.abs(p.speed) < 60) busting = true;
  }
  w.bustT = busting ? (w.bustT || 0) + dt : 0;
  if (w.bustT > 1.6 && S.hooks.onBusted) S.hooks.onBusted();
  // Losing the heat: unseen long enough, the stars blink and fall away.
  if (w.stars > 0) {
    if (anyCopNear) {
      w.hiddenT = 0;
      w.blinkT = 0;
    } else {
      w.hiddenT += dt;
      if (w.hiddenT > 6) {
        w.blinkT += dt;
        if (w.blinkT > 2.4) {
          clearWanted(S2, 'lost them');
          if (S.hooks.onWantedCleared) S.hooks.onWantedCleared();
        }
      }
    }
    if (w.stars >= 3 && Math.random() < dt * 0.05) setRoadblock(S2);
    dispatchPoliceResponse(S2);
  }
  S.audio.siren = anyCopNear && w.stars > 0 ? 1 : 0;
}
