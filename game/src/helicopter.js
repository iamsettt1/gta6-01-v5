// Puerto Brisa — Storm Surge: the helicopter — steal it, fly it, land it.
//
// One helicopter airframe serves the airstrip spare, the finale and the
// five-star police response. It climbs over the rooftops (buildings stop
// mattering once the altitude is up), drags a soft shadow across the city,
// washes dust off the ground below, and carries a searchlight the pilot
// aims with the mouse.

import { S, clamp, angLerp } from './config.js';
import { isWaterAt } from './city-map.js';
import { smokePuff } from './effects-particles.js';

export function stealPoliceHelicopter(S2) {
  // Mission 11's beat: the LPD helicopter waits on the Zona Libre helipad.
  const pad = S.city.airstrip.helipad;
  let heli = S.vehicles.find((v) => v.kind === 'heli' && v.cop);
  if (!heli) {
    heli = createHelicopter(pad.x, pad.y, true);
    S.vehicles.push(heli);
  }
  heli.parked = true;
  heli.driver = null;
  heli.x = pad.x;
  heli.y = pad.y;
  heli.alt = 0;
  return heli;
}

export function createHelicopter(x, y, cop) {
  return {
    kind: 'heli',
    cls: 'helicopter',
    name: cop ? 'LPD Helicopter' : 'Brisa Helicopter',
    x, y,
    angle: -Math.PI / 2,
    speed: 0,
    vx: 0,
    vy: 0,
    w: 58,
    h: 24,
    topSpeed: 540,
    accel: 300,
    grip: 3.4,
    colour: cop ? '#f2f4f6' : '#ff7a59',
    underglow: null,
    wheels: 'stock',
    spoiler: false,
    driver: null,
    cop: !!cop,
    parked: true,
    health: 100,
    route: null,
    named: null,
    distance: 0,
    alt: 0,
    rotor: 0,
    lightAngle: 0,
    lightOn: !!cop,
  };
}

export function spawnAirstripHelicopter(S2) {
  const pad = S.city.airstrip.helipad;
  const heli = createHelicopter(pad.x, pad.y, false);
  heli.colour = '#ffc845';
  S.vehicles.push(heli);
  return heli;
}

export function updateHelicopterPhysics(S2, heli, dt, rawControls) {
  // As with the boats: an empty control set must mean "no thrust".
  const controls = {
    throttle: rawControls.throttle || 0,
    steer: rawControls.steer || 0,
    brake: !!rawControls.brake,
    climb: !!rawControls.climb,
  };
  heli.rotor += dt * (6 + heli.alt * 26 + Math.abs(heli.speed) * 0.02);
  const thrust = controls.throttle;
  if (thrust !== 0) {
    heli.vx += Math.cos(heli.angle) * heli.accel * thrust * dt;
    heli.vy += Math.sin(heli.angle) * heli.accel * thrust * dt;
  }
  if (controls.steer !== 0) heli.angle += controls.steer * heli.grip * 0.55 * dt;
  heli.vx -= heli.vx * 0.85 * dt;
  heli.vy -= heli.vy * 0.85 * dt;
  const spd = Math.hypot(heli.vx, heli.vy);
  if (spd > heli.topSpeed) {
    heli.vx *= heli.topSpeed / spd;
    heli.vy *= heli.topSpeed / spd;
  }
  heli.speed = spd;
  // Altitude: climbs while there is thrust or speed, settles when idle.
  const wantsAir = thrust > 0 || spd > 70 || controls.climb;
  heli.alt = clamp(heli.alt + (wantsAir ? dt * 0.7 : -dt * 0.45), 0, 1);
  if (heli.alt > 0.02 || spd > 4) {
    heli.x = clamp(heli.x + heli.vx * dt, 40, 6760);
    heli.y = clamp(heli.y + heli.vy * dt, 40, 4560);
  }
  heli.distance += spd * dt;
  if (heli.alt > 0.1 && heli.alt < 0.6 && Math.random() < dt * 8) {
    smokePuff(S, heli.x + (Math.random() - 0.5) * 90, heli.y + (Math.random() - 0.5) * 90, false);
  }
  S.audio.rotor = heli.driver === 'player' ? 0.4 + heli.alt * 0.6 : S.audio.rotor;
  return heli;
}

export function flyPlayerHelicopter(S2, dt) {
  const heli = S.player.inVehicle;
  if (!heli || heli.kind !== 'heli') return;
  const k = S.input.keys;
  updateHelicopterPhysics(S2, heli, dt, {
    throttle: (k.has('w') || k.has('arrowup') ? 1 : 0) - (k.has('s') || k.has('arrowdown') ? 1 : 0),
    steer: (k.has('d') || k.has('arrowright') ? 1 : 0) - (k.has('a') || k.has('arrowleft') ? 1 : 0),
    brake: k.has(' '),
    climb: k.has('shift'),
  });
  // The searchlight follows the mouse.
  const wx = S.cam.x + S.input.mouse.x;
  const wy = S.cam.y + S.input.mouse.y;
  heli.lightAngle = Math.atan2(wy - heli.y, wx - heli.x);
  heli.lightOn = true;
  S.player.x = heli.x;
  S.player.y = heli.y;
  S.player.angle = heli.angle;
  S.audio.engineOn = false;
}

export function helicopterCanLand(S2, heli) {
  if (heli.alt > 0.3 || heli.speed > 70) return false;
  if (isWaterAt(S, heli.x, heli.y)) return false;
  return true;
}

export function drawHelicopter(ctx, heli, S2) {
  const lift = heli.alt * 46;
  // Ground shadow, shrinking and softening with altitude.
  ctx.save();
  ctx.globalAlpha = 0.32 - heli.alt * 0.14;
  ctx.fillStyle = '#0a0e14';
  ctx.beginPath();
  ctx.ellipse(heli.x + 14 + lift * 0.4, heli.y + 16 + lift * 0.4, heli.w * 0.62, heli.h * 0.8, heli.angle, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // Searchlight cone under the shadow, so it reads as light on the ground.
  if (heli.lightOn && heli.alt > 0.15) {
    const lx = heli.x + Math.cos(heli.lightAngle) * 150;
    const ly = heli.y + Math.sin(heli.lightAngle) * 150;
    const grad = ctx.createRadialGradient(lx, ly, 8, lx, ly, 120);
    grad.addColorStop(0, 'rgba(255,246,190,0.5)');
    grad.addColorStop(1, 'rgba(255,246,190,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(heli.x, heli.y);
    ctx.lineTo(lx - 60, ly - 60);
    ctx.lineTo(lx + 60, ly + 60);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.arc(lx, ly, 46, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.save();
  ctx.translate(heli.x, heli.y - lift * 0.35);
  ctx.rotate(heli.angle);
  // Tail boom and fin.
  ctx.fillStyle = heli.cop ? '#14202e' : '#c2502e';
  ctx.fillRect(-heli.w * 0.95, -3, heli.w * 0.62, 6);
  ctx.fillRect(-heli.w * 0.98, -9, 7, 18);
  // Body.
  ctx.fillStyle = heli.colour;
  ctx.beginPath();
  ctx.ellipse(0, 0, heli.w * 0.52, heli.h * 0.62, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1b2733';
  ctx.beginPath();
  ctx.ellipse(heli.w * 0.22, 0, heli.w * 0.2, heli.h * 0.42, 0, 0, Math.PI * 2);
  ctx.fill();
  if (heli.cop) {
    ctx.fillStyle = '#14202e';
    ctx.font = 'bold 11px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('LPD', -6, 4);
  }
  // Main rotor: a blurred disc line spinning with rotor phase.
  ctx.strokeStyle = 'rgba(20,24,30,0.65)';
  ctx.lineWidth = 4;
  const r = heli.w * 0.98;
  const a = heli.rotor;
  ctx.beginPath();
  ctx.moveTo(Math.cos(a) * -r, Math.sin(a) * -r * 0.24);
  ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r * 0.24);
  ctx.moveTo(Math.cos(a + Math.PI / 2) * -r, Math.sin(a + Math.PI / 2) * -r * 0.24);
  ctx.lineTo(Math.cos(a + Math.PI / 2) * r, Math.sin(a + Math.PI / 2) * r * 0.24);
  ctx.stroke();
  ctx.restore();
  void S2;
}

export { angLerp };
