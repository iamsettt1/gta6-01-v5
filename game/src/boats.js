// Puerto Brisa — Storm Surge: boats — three classes on the harbour water.
//
// Boats live in the same S.vehicles list as cars but answer to the water:
// they accelerate slowly, turn wide, bob on the swell, leave foam wakes, and
// stop hard against land and the bridges. Drive-by fire works from a boat.

import { S, clamp } from './config.js';
import { isWaterAt } from './city-map.js';
import { wakeFoam, sprayWater } from './effects-particles.js';

export function launchBoat(S2, cls, x, y, angle) {
  const spec = BOAT_CLASSES[cls] || BOAT_CLASSES.skiff;
  const boat = {
    kind: 'boat',
    cls,
    name: spec.name,
    x, y,
    angle: angle || 0,
    speed: 0,
    w: spec.w,
    h: spec.h,
    topSpeed: spec.topSpeed,
    accel: spec.accel,
    grip: spec.grip,
    colour: spec.colours[0],
    underglow: null,
    wheels: 'stock',
    spoiler: false,
    driver: null,
    cop: false,
    parked: true,
    health: 100,
    route: null,
    named: null,
    distance: 0,
    bob: Math.random() * Math.PI * 2,
  };
  S.vehicles.push(boat);
  return boat;
}

export const BOAT_CLASSES = {
  skiff: { name: 'Harbour Skiff', w: 40, h: 17, topSpeed: 240, accel: 150, grip: 2.2, colours: ['#e8e4da'] },
  speedboat: { name: 'Brisa Speedboat', w: 52, h: 20, topSpeed: 430, accel: 300, grip: 2.8, colours: ['#ff7a59'] },
  cigarette: { name: 'Herrera Cigarette', w: 60, h: 21, topSpeed: 540, accel: 380, grip: 3.0, colours: ['#22262e'] },
};

export function updateBoatPhysics(S2, boat, dt, rawControls) {
  // Parked and NPC boats are stepped with an empty control set: normalise
  // first so an absent throttle reads as 0, never as NaN thrust.
  const controls = {
    throttle: rawControls.throttle || 0,
    steer: rawControls.steer || 0,
    brake: !!rawControls.brake,
  };
  if (controls.throttle !== 0) boat.speed += Math.sign(controls.throttle) * boat.accel * dt;
  else boat.speed -= boat.speed * 0.7 * dt;
  if (controls.brake) boat.speed -= boat.speed * 3 * dt;
  boat.speed = clamp(boat.speed, -boat.topSpeed * 0.3, boat.topSpeed);
  if (Math.abs(boat.speed) > 6) {
    boat.angle += controls.steer * boat.grip * dt * clamp(Math.abs(boat.speed) / 240, 0.3, 1) * (boat.speed >= 0 ? 1 : -1);
  }
  const nx = boat.x + Math.cos(boat.angle) * boat.speed * dt;
  const ny = boat.y + Math.sin(boat.angle) * boat.speed * dt;
  // A boat's bow and stern both have to stay wet.
  const bowWet = isWaterAt(S, nx + Math.cos(boat.angle) * boat.w * 0.4, ny + Math.sin(boat.angle) * boat.w * 0.4);
  const sternWet = isWaterAt(S, nx - Math.cos(boat.angle) * boat.w * 0.4, ny - Math.sin(boat.angle) * boat.w * 0.4);
  if (bowWet && sternWet) {
    boat.x = nx;
    boat.y = ny;
  } else {
    if (Math.abs(boat.speed) > 120 && S.hooks.onVehicleCrash) S.hooks.onVehicleCrash(S, boat, null);
    boat.speed *= -0.2;
    boat.health -= 2;
  }
  boat.bob += dt * (1.4 + Math.abs(boat.speed) * 0.004);
  boat.distance += Math.abs(boat.speed) * dt;
  if (Math.abs(boat.speed) > 60 && Math.random() < dt * 22) {
    wakeFoam(S, boat.x - Math.cos(boat.angle) * boat.w * 0.5, boat.y - Math.sin(boat.angle) * boat.w * 0.5, 16);
  }
  if (Math.abs(boat.speed) > 300 && Math.random() < dt * 10) {
    sprayWater(S, boat.x, boat.y, 1, 0.7);
  }
  return boat;
}

export function drivePlayerBoat(S2, dt) {
  const boat = S.player.inVehicle;
  if (!boat || boat.kind !== 'boat') return;
  const k = S.input.keys;
  updateBoatPhysics(S2, boat, dt, {
    throttle: (k.has('w') || k.has('arrowup') ? 1 : 0) - (k.has('s') || k.has('arrowdown') ? 1 : 0),
    steer: (k.has('d') || k.has('arrowright') ? 1 : 0) - (k.has('a') || k.has('arrowleft') ? 1 : 0),
    brake: k.has(' '),
  });
  S.player.x = boat.x;
  S.player.y = boat.y;
  S.player.angle = boat.angle;
  S.audio.engineOn = true;
  S.audio.enginePitch = Math.abs(boat.speed) / Math.max(1, boat.topSpeed);
}

export function drawBoat(ctx, boat, S2) {
  ctx.save();
  ctx.translate(boat.x, boat.y);
  ctx.rotate(boat.angle);
  const bobY = Math.sin(boat.bob) * 1.6;
  ctx.fillStyle = 'rgba(8,30,44,0.35)';
  ctx.beginPath();
  ctx.ellipse(3, 5 + bobY, boat.w * 0.55, boat.h * 0.75, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = boat.colour;
  ctx.beginPath();
  ctx.moveTo(-boat.w / 2, -boat.h / 2 + bobY);
  ctx.lineTo(boat.w / 2 - 8, -boat.h / 2 + bobY);
  ctx.lineTo(boat.w / 2, 0 + bobY);
  ctx.lineTo(boat.w / 2 - 8, boat.h / 2 + bobY);
  ctx.lineTo(-boat.w / 2, boat.h / 2 + bobY);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#1b2733';
  ctx.fillRect(-boat.w * 0.18, -boat.h / 2 + 4 + bobY, boat.w * 0.3, boat.h - 8);
  if (boat.cop) {
    ctx.fillStyle = '#f2f4f6';
    ctx.fillRect(-boat.w * 0.3, -3 + bobY, boat.w * 0.5, 6);
    ctx.fillStyle = S2.t % 0.6 < 0.3 ? '#ff4040' : '#3a7bff';
    ctx.fillRect(-4, -boat.h / 2 + 1 + bobY, 8, 4);
  }
  ctx.restore();
}
