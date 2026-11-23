// Puerto Brisa — Storm Surge: cars — ten classes, one physics, one draw.
//
// Every land vehicle is the same object shape; the class table gives it its
// size, pace and grip. The player, the traffic AI and the police all drive
// through updateVehiclePhysics(), so a stolen interceptor feels like the one
// chasing you. Flooded streets cut top speed for everyone (storm-weather).

import { CFG, S, clamp, angLerp } from './config.js';
import { collideWithBuildings, isOnRoad } from './city-map.js';
import { smokePuff } from './effects-particles.js';

export function createCar(cls, x, y, angle, colour) {
  const spec = CAR_CLASSES[cls] || CAR_CLASSES.sedan;
  return {
    kind: 'car',
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
    colour: colour || spec.colours[0],
    underglow: null,
    wheels: 'stock',
    spoiler: false,
    driver: null,
    cop: false,
    parked: false,
    health: 100,
    route: null,
    named: null,
    distance: 0,
  };
}

export const CAR_CLASSES = {
  compact: { name: 'Brisa Compact', w: 44, h: 24, topSpeed: 300, accel: 260, grip: 5.2, colours: ['#d95f4b', '#5b8dd9', '#7ec850'] },
  sedan: { name: 'Coral Sedan', w: 50, h: 26, topSpeed: 340, accel: 280, grip: 5.0, colours: ['#c8ccd4', '#3f6fb5', '#8a8f98'] },
  muscle: { name: 'Mirador Muscle', w: 54, h: 27, topSpeed: 400, accel: 360, grip: 4.2, colours: ['#e33f4e', '#22262e', '#ffc845'] },
  sports: { name: 'Iris GT', w: 52, h: 25, topSpeed: 470, accel: 430, grip: 5.6, colours: ['#ff4fd8', '#37b6ff', '#f2f2f2'] },
  supercar: { name: 'Ancla V12', w: 54, h: 25, topSpeed: 560, accel: 520, grip: 6.2, colours: ['#ffd23e', '#e33f4e', '#14c8bc'] },
  suv: { name: 'Lomas SUV', w: 54, h: 29, topSpeed: 330, accel: 270, grip: 4.6, colours: ['#5d6e5a', '#39424e', '#a8b6c6'] },
  pickup: { name: 'Muelle Pickup', w: 55, h: 28, topSpeed: 320, accel: 280, grip: 4.4, colours: ['#c96f43', '#74604a', '#5b8dd9'] },
  van: { name: 'Cargo Van', w: 58, h: 29, topSpeed: 290, accel: 240, grip: 4.0, colours: ['#e8e4da', '#8a8f98', '#37b6ff'] },
  taxi: { name: 'Brisa Taxi', w: 50, h: 26, topSpeed: 350, accel: 300, grip: 5.0, colours: ['#ffc845', '#ffb03a'] },
  interceptor: { name: 'LPD Interceptor', w: 52, h: 26, topSpeed: 500, accel: 470, grip: 5.8, colours: ['#f2f4f6'] },
};

export function spawnVehicle(S2, veh) {
  S.vehicles.push(veh);
  return veh;
}

// Ambient parked cars on every street, placed once when the world is built.
export function scatterParkedCars(S2, rand) {
  const classes = Object.keys(CAR_CLASSES).filter((c) => c !== 'interceptor' && c !== 'supercar');
  for (const road of S.city.roads) {
    if (!rand.chance(0.55)) continue;
    const n = rand.int(1, 3);
    for (let i = 0; i < n; i++) {
      const t = rand.range(0.08, 0.92);
      const x = road.dir === 'h' ? road.x + road.w * t : road.x + (rand.chance(0.5) ? 14 : road.w - 14);
      const y = road.dir === 'v' ? road.y + road.h * t : road.y + (rand.chance(0.5) ? 14 : road.h - 14);
      const cls = rand.pick(classes);
      const car = createCar(cls, x, y, road.dir === 'h' ? 0 : Math.PI / 2, rand.pick(CAR_CLASSES[cls].colours));
      car.parked = true;
      spawnVehicle(S2, car);
    }
  }
}

// Shared driving physics. controls: {throttle -1..1, steer -1..1, brake}.
export function updateVehiclePhysics(S2, veh, dt, controls) {
  const flood = S.weather.flood;
  const topSpeed = veh.topSpeed * (1 - flood * 0.45);
  const target = controls.throttle >= 0 ? topSpeed : topSpeed * 0.42;
  if (controls.throttle !== 0) {
    veh.speed += Math.sign(controls.throttle) * veh.accel * dt;
  } else {
    veh.speed -= veh.speed * 1.4 * dt; // engine braking and drag
  }
  if (controls.brake) veh.speed -= veh.speed * 4.2 * dt;
  veh.speed = clamp(veh.speed, -topSpeed * 0.45, topSpeed);
  if (Math.abs(veh.speed) > 4) {
    const dir = veh.speed >= 0 ? 1 : -1;
    veh.angle += controls.steer * veh.grip * dt * dir * clamp(Math.abs(veh.speed) / 190, 0.25, 1);
  }
  const nx = veh.x + Math.cos(veh.angle) * veh.speed * dt;
  const ny = veh.y + Math.sin(veh.angle) * veh.speed * dt;
  const hit = collideWithBuildings(S, nx, ny, veh.w * 0.36);
  if (hit.hit && Math.abs(veh.speed) > 130) {
    veh.health -= (Math.abs(veh.speed) - 120) * 0.06;
    if (S.hooks.onVehicleCrash) S.hooks.onVehicleCrash(S, veh, null);
    veh.speed *= -0.25;
  } else {
    veh.speed = hit.hit ? veh.speed * 0.55 : veh.speed;
  }
  veh.x = clamp(hit.x, 30, CFG.WORLD_W - 30);
  veh.y = clamp(hit.y, 30, CFG.WORLD_H - 30);
  veh.distance += Math.abs(veh.speed) * dt;
  if (veh.health < 35 && Math.random() < dt * 6) smokePuff(S, veh.x, veh.y - 6, veh.health < 18);
  S.audio.enginePitch = veh.driver === 'player' ? Math.abs(veh.speed) / Math.max(1, veh.topSpeed) : S.audio.enginePitch;
  void isOnRoad;
  return veh;
}

// The player at the wheel: WASD/arrows, space brake.
export function drivePlayerCar(S2, dt) {
  const veh = S.player.inVehicle;
  if (!veh) return;
  const k = S.input.keys;
  const controls = {
    throttle: (k.has('w') || k.has('arrowup') ? 1 : 0) - (k.has('s') || k.has('arrowdown') ? 1 : 0),
    steer: (k.has('d') || k.has('arrowright') ? 1 : 0) - (k.has('a') || k.has('arrowleft') ? 1 : 0),
    brake: k.has(' '),
  };
  updateVehiclePhysics(S2, veh, dt, controls);
  S.player.x = veh.x;
  S.player.y = veh.y;
  S.player.angle = veh.angle;
  S.audio.engineOn = true;
}

export function drawCar(ctx, veh) {
  ctx.save();
  ctx.translate(veh.x, veh.y);
  ctx.rotate(veh.angle);
  const { w, h } = veh;
  if (veh.underglow) {
    ctx.save();
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = veh.underglow;
    ctx.beginPath();
    ctx.ellipse(0, 0, w * 0.72, h * 0.95, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  // Shadow, body, cabin, wheels.
  ctx.fillStyle = 'rgba(10,12,16,0.35)';
  roundRect(ctx, -w / 2 + 3, -h / 2 + 4, w, h, 7);
  ctx.fill();
  ctx.fillStyle = veh.colour;
  roundRect(ctx, -w / 2, -h / 2, w, h, 7);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.20)';
  roundRect(ctx, -w / 2 + 4, -h / 2 + 3, w * 0.34, h - 6, 5);
  ctx.fill();
  ctx.fillStyle = '#1b2733';
  roundRect(ctx, -w * 0.14, -h / 2 + 4, w * 0.3, h - 8, 4);
  ctx.fill();
  ctx.fillStyle = '#0c0e11';
  for (const [wx, wy] of [[-w / 2 + 8, -h / 2 - 2], [w / 2 - 14, -h / 2 - 2], [-w / 2 + 8, h / 2 - 3], [w / 2 - 14, h / 2 - 3]]) {
    ctx.fillRect(wx, wy, veh.wheels === 'sport' ? 13 : 11, 5);
  }
  if (veh.spoiler) {
    ctx.fillStyle = '#14171c';
    ctx.fillRect(-w / 2 - 3, -h / 2 + 2, 6, h - 4);
  }
  if (veh.cop) {
    ctx.fillStyle = '#14202e';
    roundRect(ctx, -w * 0.2, -h / 2, w * 0.42, h, 5);
    ctx.fill();
    ctx.fillStyle = S.t % 0.6 < 0.3 ? '#ff4040' : '#3a7bff';
    ctx.fillRect(-6, -h / 2 + 3, 12, 5);
    ctx.fillStyle = '#f2f4f6';
    ctx.font = 'bold 11px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('LPD', 0, 4);
  }
  if (veh.cls === 'taxi') {
    ctx.fillStyle = '#10151d';
    ctx.fillRect(-7, -8, 14, 16);
    ctx.fillStyle = '#ffc845';
    ctx.font = 'bold 10px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('TAXI', 0, 3);
  }
  if (veh.health < 30) {
    ctx.fillStyle = 'rgba(20,20,22,0.35)';
    roundRect(ctx, -w / 2, -h / 2, w, h, 7);
    ctx.fill();
  }
  ctx.restore();
}

export function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export { angLerp };
