// Puerto Brisa — Storm Surge: the seaplane — the build's headline aircraft.
//
// A twin-prop on floats, docked at the marina ramp and the Zona Libre dock.
// On the water it handles like a fast boat; past takeoff speed it lifts off
// (takeOffSeaplane), flies the whole map over rooftops and bridges, and
// settles back onto water or the airstrip strip. Spray on the takeoff run,
// a wake on touchdown, and cargo money by the nautical mile.

import { S, clamp } from './config.js';
import { isWaterAt, pointInRect as inRect } from './city-map.js';
import { sprayWater, wakeFoam } from './effects-particles.js';
import { playSynthHit } from './audio-synth.js';

export function takeOffSeaplane(S2, plane) {
  if (!plane || plane.kind !== 'plane' || plane.airborne) return false;
  if (plane.speed < TAKEOFF_SPEED) return false;
  plane.airborne = true;
  plane.alt = Math.max(plane.alt, 0.25);
  sprayWater(S, plane.x, plane.y, 22, 1.4);
  playSynthHit(S, 'splash');
  S.stats.flights += 1;
  if (S.hooks.onTakeoff) S.hooks.onTakeoff(plane);
  return true;
}

export const TAKEOFF_SPEED = 295;

export function createSeaplane(x, y, angle) {
  return {
    kind: 'plane',
    cls: 'seaplane',
    name: 'Brisa Twin Otter',
    x, y,
    angle: angle || 0,
    speed: 0,
    w: 64,
    h: 30,
    topSpeed: 660,
    accel: 330,
    grip: 2.1,
    colour: '#f2f4f6',
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
    alt: 0,
    airborne: false,
    prop: 0,
    cargo: 0,
  };
}

export function dockSeaplanes(S2) {
  const marina = createSeaplane(880, 2450, Math.PI / 2);
  const zona = createSeaplane(S.city.seaplaneDock.x - 30, S.city.seaplaneDock.y + 40, Math.PI);
  S.vehicles.push(marina, zona);
  return [marina, zona];
}

export function updateSeaplanePhysics(S2, plane, dt, rawControls) {
  // Callers may pass a partial or empty control set (parked traffic gets
  // {}): normalise so an absent throttle is 0, never NaN.
  const controls = {
    throttle: rawControls.throttle || 0,
    steer: rawControls.steer || 0,
    brake: !!rawControls.brake,
  };
  plane.prop += dt * (4 + Math.abs(plane.speed) * 0.09);
  const onRunway = inRect(plane.x, plane.y, S.city.airstrip);
  if (!plane.airborne) {
    // Water (or runway) run: boat-like, with a hard ceiling at takeoff.
    if (controls.throttle !== 0) plane.speed += Math.sign(controls.throttle) * plane.accel * dt;
    else plane.speed -= plane.speed * 0.55 * dt;
    if (controls.brake) plane.speed -= plane.speed * 3 * dt;
    plane.speed = clamp(plane.speed, -90, plane.topSpeed);
    if (Math.abs(plane.speed) > 6) {
      plane.angle += controls.steer * plane.grip * dt * clamp(Math.abs(plane.speed) / 260, 0.3, 1) * (plane.speed >= 0 ? 1 : -1);
    }
    const nx = plane.x + Math.cos(plane.angle) * plane.speed * dt;
    const ny = plane.y + Math.sin(plane.angle) * plane.speed * dt;
    const wet = isWaterAt(S, nx, ny) || inRect(nx, ny, S.city.airstrip);
    if (wet) {
      plane.x = nx;
      plane.y = ny;
    } else {
      plane.speed *= -0.15;
      plane.health -= 1.5;
    }
    if (Math.abs(plane.speed) > 120 && Math.random() < dt * 20) {
      sprayWater(S, plane.x - Math.cos(plane.angle) * 30, plane.y - Math.sin(plane.angle) * 30, 1, 1);
      wakeFoam(S, plane.x - Math.cos(plane.angle) * 34, plane.y - Math.sin(plane.angle) * 34, 20);
    }
    if (plane.speed >= TAKEOFF_SPEED && (isWaterAt(S, plane.x, plane.y) || onRunway)) {
      takeOffSeaplane(S2, plane);
    }
  } else {
    // Airborne: fast, wide-turning, altitude eases up; throttle back over
    // water or the strip and she settles down again.
    if (controls.throttle !== 0) plane.speed += Math.sign(controls.throttle) * plane.accel * 0.8 * dt;
    else plane.speed -= plane.speed * 0.22 * dt;
    plane.speed = clamp(plane.speed, 130, plane.topSpeed);
    plane.angle += controls.steer * plane.grip * 0.72 * dt * clamp(plane.speed / 320, 0.4, 1);
    plane.x = clamp(plane.x + Math.cos(plane.angle) * plane.speed * dt, 40, 6760);
    plane.y = clamp(plane.y + Math.sin(plane.angle) * plane.speed * dt, 40, 4560);
    plane.alt = clamp(plane.alt + dt * 0.5, 0, 1);
    const overWater = isWaterAt(S, plane.x, plane.y);
    const overStrip = inRect(plane.x, plane.y, S.city.airstrip);
    if (controls.brake && plane.speed < 250 && (overWater || overStrip)) {
      plane.alt -= dt * 1.4;
      if (plane.alt <= 0) {
        plane.alt = 0;
        plane.airborne = false;
        plane.speed = Math.min(plane.speed, 180);
        if (overWater) {
          wakeFoam(S, plane.x, plane.y, 34);
          sprayWater(S, plane.x, plane.y, 14, 1);
          playSynthHit(S, 'splash');
        }
      }
    }
  }
  plane.distance += Math.abs(plane.speed) * dt;
  S.audio.prop = plane.driver === 'player' ? clamp(Math.abs(plane.speed) / plane.topSpeed, 0, 1) : S.audio.prop;
  return plane;
}

export function flyPlayerSeaplane(S2, dt) {
  const plane = S.player.inVehicle;
  if (!plane || plane.kind !== 'plane') return;
  const k = S.input.keys;
  updateSeaplanePhysics(S2, plane, dt, {
    throttle: (k.has('w') || k.has('arrowup') ? 1 : 0) - (k.has('s') || k.has('arrowdown') ? 1 : 0),
    steer: (k.has('d') || k.has('arrowright') ? 1 : 0) - (k.has('a') || k.has('arrowleft') ? 1 : 0),
    brake: k.has(' '),
  });
  S.player.x = plane.x;
  S.player.y = plane.y;
  S.player.angle = plane.angle;
  S.audio.engineOn = false;
}

export function drawSeaplane(ctx, plane, S2) {
  const lift = plane.alt * 52;
  ctx.save();
  ctx.globalAlpha = 0.3 - plane.alt * 0.13;
  ctx.fillStyle = '#0a0e14';
  ctx.beginPath();
  ctx.ellipse(plane.x + 16 + lift * 0.4, plane.y + 18 + lift * 0.4, plane.w * 0.6, plane.h * 0.9, plane.angle, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.save();
  ctx.translate(plane.x, plane.y - lift * 0.35);
  ctx.rotate(plane.angle);
  // Wing across the fuselage, twin props at its front edge.
  ctx.fillStyle = '#d95f4b';
  ctx.fillRect(-6, -plane.w * 0.52, 15, plane.w * 1.04);
  // Floats.
  ctx.fillStyle = '#39424e';
  ctx.fillRect(-plane.w * 0.34, -plane.h * 0.62, plane.w * 0.62, 5);
  ctx.fillRect(-plane.w * 0.34, plane.h * 0.62 - 5, plane.w * 0.62, 5);
  // Fuselage.
  ctx.fillStyle = plane.colour;
  ctx.beginPath();
  ctx.ellipse(0, 0, plane.w * 0.52, plane.h * 0.4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#e33f4e';
  ctx.fillRect(-plane.w * 0.52, -plane.h * 0.22, plane.w * 0.2, plane.h * 0.44);
  ctx.fillStyle = '#1b2733';
  ctx.beginPath();
  ctx.ellipse(plane.w * 0.24, 0, plane.w * 0.16, plane.h * 0.26, 0, 0, Math.PI * 2);
  ctx.fill();
  // Spinning props.
  ctx.strokeStyle = 'rgba(20,24,30,0.7)';
  ctx.lineWidth = 3;
  const a = plane.prop;
  for (const py of [-plane.w * 0.34, plane.w * 0.34]) {
    ctx.beginPath();
    ctx.moveTo(4, py + Math.sin(a) * 11);
    ctx.lineTo(4, py - Math.sin(a) * 11);
    ctx.stroke();
  }
  ctx.restore();
  void S2;
}
