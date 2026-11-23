// Puerto Brisa — Storm Surge: motorcycles — one class, quick and narrow.
//
// A bike is a vehicle with kind 'bike': it threads gaps cars cannot, leans
// into its steering, and throws the rider's aim off more than a car's does.

import { S, clamp } from './config.js';
import { updateVehiclePhysics as runSharedVehiclePhysics } from './vehicles-cars.js';

export function createMotorcycle(x, y, angle, colour) {
  return {
    kind: 'bike',
    cls: 'bike',
    name: 'Iris Runner',
    x, y,
    angle: angle || 0,
    speed: 0,
    w: 34,
    h: 13,
    topSpeed: 480,
    accel: 460,
    grip: 6.4,
    colour: colour || '#37b6ff',
    underglow: null,
    wheels: 'sport',
    spoiler: false,
    driver: null,
    cop: false,
    parked: false,
    health: 80,
    route: null,
    named: null,
    distance: 0,
    lean: 0,
  };
}

export function ridePlayerBike(S2, dt) {
  const veh = S.player.inVehicle;
  if (!veh || veh.kind !== 'bike') return;
  const k = S.input.keys;
  const controls = {
    throttle: (k.has('w') || k.has('arrowup') ? 1 : 0) - (k.has('s') || k.has('arrowdown') ? 1 : 0),
    steer: (k.has('d') || k.has('arrowright') ? 1 : 0) - (k.has('a') || k.has('arrowleft') ? 1 : 0),
    brake: k.has(' '),
  };
  veh.lean = clamp(veh.lean + (controls.steer * 0.5 - veh.lean) * dt * 7, -0.5, 0.5);
  runSharedVehiclePhysics(S2, veh, dt, controls);
  S.player.x = veh.x;
  S.player.y = veh.y;
  S.player.angle = veh.angle;
  S.audio.engineOn = true;
}

// The NPC step main.js runs for bikes it is not riding: like the boats,
// the helicopter and the seaplane, a traffic bike arrives here carrying
// an empty control set, so the fields are normalised before the shared
// step sees them — a missing throttle has to read as "off the gas",
// never feed Math.sign as undefined and come back NaN. A bike also
// settles its lean toward wherever it is being steered, the same settle
// ridePlayerBike applies, so a riderless bike rolling with the traffic
// still banks through its turns instead of sliding bolt upright.
export function updateVehiclePhysics(S2, veh, dt, controls) {
  const c = controls || {};
  const step = {
    throttle: c.throttle || 0,
    steer: c.steer || 0,
    brake: !!c.brake,
  };
  const lean = veh.lean || 0;
  veh.lean = clamp(lean + (step.steer * 0.5 - lean) * dt * 7, -0.5, 0.5);
  return runSharedVehiclePhysics(S2, veh, dt, step);
}

export function drawMotorcycle(ctx, veh) {
  ctx.save();
  ctx.translate(veh.x, veh.y);
  ctx.rotate(veh.angle);
  ctx.fillStyle = 'rgba(10,12,16,0.3)';
  ctx.beginPath();
  ctx.ellipse(2, 3, veh.w * 0.55, veh.h * 0.8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#0c0e11';
  ctx.fillRect(-veh.w / 2, -2, 9, 4);
  ctx.fillRect(veh.w / 2 - 9, -2, 9, 4);
  ctx.save();
  ctx.rotate(veh.lean * 0.4);
  ctx.fillStyle = veh.colour;
  ctx.beginPath();
  ctx.ellipse(0, 0, veh.w * 0.42, veh.h * 0.42, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1b2733';
  ctx.beginPath();
  ctx.arc(2, 0, 5.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.restore();
  void S;
}
