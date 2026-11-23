// Puerto Brisa — Storm Surge: side activities — shells, taxi fares, exports.
//
// The open world's pocket money. Eighteen sun shells hide across the
// districts and the island; pedestrians flag your car for taxi fares with a
// tip for speed; and six named cars on Bruno's export list pay hard cash
// when they roll into the Zona Libre garage.

import { S, dist } from './config.js';
import { createCar } from './vehicles-cars.js';
import { spawnPedestrian } from './pedestrians.js';
import { showMessage } from './player-on-foot.js';
import { playSynthHit } from './audio-synth.js';

export function hailTaxiFare(S2) {
  // Flag down the nearest roadside pedestrian and turn them into a fare.
  let best = null;
  let bestD = 700;
  for (const ped of S.peds) {
    if (ped.role !== 'walker' || ped.health <= 0) continue;
    const d = dist(S.player.x, S.player.y, ped.x, ped.y);
    if (d < bestD) {
      bestD = d;
      best = ped;
    }
  }
  if (!best) return null;
  best.role = 'fare';
  return best;
}

export const SHELL_SPOTS = [
  { x: 500, y: 480 }, { x: 1300, y: 1000 }, { x: 900, y: 260 },
  { x: 2100, y: 500 }, { x: 2900, y: 1100 }, { x: 2500, y: 260 },
  { x: 600, y: 1700 }, { x: 1500, y: 2000 }, { x: 1100, y: 2500 },
  { x: 2400, y: 1700 }, { x: 3200, y: 2400 }, { x: 2800, y: 1500 },
  { x: 3900, y: 1800 }, { x: 4700, y: 2300 }, { x: 4200, y: 1500 },
  { x: 5600, y: 700 }, { x: 6000, y: 2700 }, { x: 6450, y: 2050 },
];

export const EXPORT_CARS = [
  { name: 'Mirador Muscle', cls: 'muscle', colour: '#e33f4e', x: 800, y: 700, price: 900 },
  { name: 'Iris GT', cls: 'sports', colour: '#ff4fd8', x: 2600, y: 1800, price: 1400 },
  { name: 'Beach Van', cls: 'van', colour: '#37b6ff', x: 4100, y: 2000, price: 800 },
  { name: 'Lomas SUV', cls: 'suv', colour: '#5d6e5a', x: 4200, y: 700, price: 1000 },
  { name: 'Coral Supercar', cls: 'supercar', colour: '#ffd23e', x: 2500, y: 800, price: 2400 },
  { name: 'Harbour Pickup', cls: 'pickup', colour: '#c96f43', x: 1200, y: 1900, price: 850 },
];

export const EXPORT_GARAGE = { x: 5460, y: 1080, w: 300, h: 220 };

export function initSideActivities(S2) {
  S.shells = SHELL_SPOTS.map((s) => ({ ...s, taken: false }));
  for (const def of EXPORT_CARS) {
    if (S.progress.exportDelivered.includes(def.name)) continue;
    const car = createCar(def.cls, def.x, def.y, 0, def.colour);
    car.named = def.name;
    car.exportCar = true;
    car.exportPrice = def.price;
    car.parked = true;
    S.vehicles.push(car);
  }
  S.taxi.fareTimer = 20;
}

export function updateSideActivities(S2, dt) {
  const p = S.player;
  if (!p) return;
  // Sun shells: walk or drive over one to collect it.
  for (const shell of S.shells) {
    if (shell.taken) continue;
    if (dist(p.x, p.y, shell.x, shell.y) < 44) {
      shell.taken = true;
      S.progress.shells += 1;
      S.progress.cash += 25;
      playSynthHit(S, 'pickup');
      showMessage(S, `Sun shell ${S.progress.shells}/18 — $25.`);
    }
  }
  updateTaxi(S2, dt);
  updateExports(S2);
}

function updateTaxi(S2, dt) {
  const taxi = S.taxi;
  const p = S.player;
  if (!taxi.fare) {
    taxi.fareTimer -= dt;
    if (taxi.fareTimer <= 0 && p.inVehicle && p.inVehicle.kind === 'car') {
      const ped = hailTaxiFare(S);
      if (ped) showMessage(S, 'A pedestrian flags you down — stop beside them for a fare.');
      taxi.fareTimer = 40;
    }
    // Boarding: a flagged fare next to a stopped car climbs in.
    if (p.inVehicle && Math.abs(p.inVehicle.speed) < 24) {
      for (const ped of S.peds) {
        if (ped.role !== 'fare') continue;
        if (dist(p.x, p.y, ped.x, ped.y) < 74) {
          ped.health = -999; // aboard: leaves the street list
          const dest = fareDestination(S);
          taxi.fare = { x: dest.x, y: dest.y, t: 0, name: dest.name };
          showMessage(S, `Fare aboard — take them to ${dest.name}.`);
        }
      }
    }
    return;
  }
  taxi.fare.t += dt;
  if (!p.inVehicle) return;
  if (dist(p.x, p.y, taxi.fare.x, taxi.fare.y) < 110) {
    const tip = Math.max(0, Math.round(190 - taxi.fare.t * 2));
    const pay = 120 + tip;
    S.progress.cash += pay;
    playSynthHit(S, 'cash');
    showMessage(S, `Fare paid $${pay}${tip > 40 ? ' — fast, and they tipped well.' : '.'}`);
    taxi.fare = null;
    taxi.fareTimer = 30;
  }
}

function fareDestination(S2) {
  const spots = [
    { x: 2620, y: 1560, name: 'Club Iris' },
    { x: 640, y: 2080, name: 'the marina docks' },
    { x: 4100, y: 1750, name: 'Hotel Brisa Azul' },
    { x: 1000, y: 700, name: 'El Mirador plaza' },
    { x: 5560, y: 1180, name: 'the Zona Libre garage' },
    { x: 3000, y: 700, name: 'Avenida Coral towers' },
  ];
  return spots[Math.floor(Math.random() * spots.length)];
}

function updateExports(S2) {
  const veh = S.player.inVehicle;
  if (!veh || !veh.exportCar) return;
  const g = EXPORT_GARAGE;
  if (veh.x > g.x && veh.x < g.x + g.w && veh.y > g.y && veh.y < g.y + g.h) {
    S.progress.exports += 1;
    S.progress.exportDelivered.push(veh.named);
    S.progress.cash += veh.exportPrice;
    playSynthHit(S, 'cash');
    showMessage(S, `${veh.named} exported — $${veh.exportPrice}. ${S.progress.exports}/6 delivered.`);
    veh.exportCar = false;
    veh.named = null;
    veh.parked = true;
    veh.driver = null;
    S.player.inVehicle = null;
    S.player.x = g.x - 40;
    S.player.y = g.y + 60;
  }
}

// Golden shells pulse on the ground; drawn by the renderer.
export function drawSunShells(ctx, S2) {
  for (const shell of S.shells) {
    if (shell.taken) continue;
    const pulse = 1 + Math.sin(S.t * 3 + shell.x) * 0.15;
    ctx.save();
    ctx.translate(shell.x, shell.y);
    ctx.scale(pulse, pulse);
    ctx.fillStyle = '#ffc845';
    ctx.beginPath();
    ctx.arc(0, 0, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#e8873a';
    ctx.lineWidth = 3;
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * 6, Math.sin(a) * 6);
      ctx.lineTo(Math.cos(a) * 11, Math.sin(a) * 11);
      ctx.stroke();
    }
    ctx.restore();
  }
  void S2;
}
