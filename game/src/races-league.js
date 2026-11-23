// Puerto Brisa — Storm Surge: the six-race street league.
//
// Checkpoint races on the real streets: three rival cars, laps, a running
// clock, best-time medals and a league table. Mission 5 (Street Crown) is
// league race 1 wearing a story hat; winning it opens the other five.

import { S, clamp, dist, angDiff } from './config.js';
import { createCar, updateVehiclePhysics } from './vehicles-cars.js';
import { showMessage } from './player-on-foot.js';
import { cashConfetti } from './effects-particles.js';
import { playSynthHit } from './audio-synth.js';

export function startLeagueRace(S2, index) {
  const def = RACES[index] || RACES[0];
  const race = S.race;
  race.active = true;
  race.index = index;
  race.checkpoint = 0;
  race.lap = 1;
  race.t = 0;
  race.finished = false;
  race.won = false;
  race.def = def;
  race.target = def.checkpoints[0];
  // Three rivals on the start line beside the player.
  race.grid = [];
  const start = def.checkpoints[0];
  const colours = ['#e33f4e', '#37b6ff', '#7ec850'];
  for (let i = 0; i < 3; i++) {
    const car = createCar(i === 0 ? 'sports' : 'muscle', start.x - 60 - i * 56, start.y + 44 + (i % 2) * 40, 0, colours[i]);
    car.driver = 'race';
    car.raceCp = 0;
    car.raceLap = 1;
    car.raceSkill = 0.9 + i * 0.045;
    S.vehicles.push(car);
    race.grid.push(car);
  }
  showMessage(S, `${def.name} — ${def.laps} laps. Follow the gold rings!`);
  return race;
}

export const RACES = [
  { name: 'Street Crown — Avenida Coral', laps: 3, checkpoints: [{ x: 1900, y: 360 }, { x: 3100, y: 360 }, { x: 3100, y: 1150 }, { x: 1900, y: 1150 }] },
  { name: 'Lumen Sprint — Barrio Iris', laps: 2, checkpoints: [{ x: 2250, y: 1560 }, { x: 3350, y: 1560 }, { x: 3350, y: 2450 }, { x: 2250, y: 2450 }] },
  { name: 'Harbour Run — Marina', laps: 2, checkpoints: [{ x: 400, y: 1560 }, { x: 1800, y: 1560 }, { x: 1800, y: 2100 }, { x: 400, y: 2100 }] },
  { name: 'Playa Dash — Beachfront', laps: 2, checkpoints: [{ x: 3750, y: 1560 }, { x: 4900, y: 1560 }, { x: 4900, y: 2450 }, { x: 3750, y: 2450 }] },
  { name: 'Lomas Climb — Las Lomas', laps: 2, checkpoints: [{ x: 3750, y: 360 }, { x: 4900, y: 360 }, { x: 4900, y: 1150 }, { x: 3750, y: 1150 }] },
  { name: 'Two Bridges GP — Isla Ancla', laps: 1, checkpoints: [{ x: 5300, y: 1000 }, { x: 6400, y: 1000 }, { x: 6400, y: 2500 }, { x: 5300, y: 2500 }, { x: 5090, y: 2430 }] },
];

export function updateLeagueRace(S2, dt) {
  const race = S.race;
  if (!race.active || race.finished) return;
  const def = race.def;
  race.t += dt;
  const p = S.player;
  // Player progress.
  const cp = def.checkpoints[race.checkpoint];
  race.target = cp;
  if (p.inVehicle && dist(p.x, p.y, cp.x, cp.y) < 120) {
    race.checkpoint += 1;
    playSynthHit(S, 'pickup');
    if (race.checkpoint >= def.checkpoints.length) {
      race.checkpoint = 0;
      race.lap += 1;
      if (race.lap > def.laps) return finishRace(S2);
      showMessage(S, `Lap ${race.lap} of ${def.laps}.`);
    }
  }
  // Rivals chase their own checkpoints with a little rubber in the band.
  const playerProgress = (race.lap - 1) * def.checkpoints.length + race.checkpoint;
  for (const car of race.grid) {
    if (car.health <= 0) continue;
    const target = def.checkpoints[car.raceCp];
    const d = dist(car.x, car.y, target.x, target.y);
    if (d < 120) {
      car.raceCp += 1;
      if (car.raceCp >= def.checkpoints.length) {
        car.raceCp = 0;
        car.raceLap += 1;
      }
    }
    const rivalProgress = (car.raceLap - 1) * def.checkpoints.length + car.raceCp;
    const band = clamp(1 + (playerProgress - rivalProgress) * 0.03, 0.86, 1.1);
    const desired = Math.atan2(target.y - car.y, target.x - car.x);
    const steer = clamp(angDiff(car.angle, desired) * 2.4, -1, 1);
    const savedTop = car.topSpeed;
    car.topSpeed = savedTop * car.raceSkill * band;
    updateVehiclePhysics(S2, car, dt, { throttle: 1, steer, brake: false });
    car.topSpeed = savedTop;
  }
}

function finishRace(S2) {
  const race = S.race;
  race.finished = true;
  race.active = false;
  const def = race.def;
  const playerProgress = def.laps * def.checkpoints.length;
  const bestRival = Math.max(...race.grid.map((c) => (c.raceLap - 1) * def.checkpoints.length + c.raceCp));
  race.won = playerProgress >= bestRival;
  for (const car of race.grid) {
    car.driver = 'traffic';
    car.route = null;
  }
  if (race.won) {
    S.progress.racesWon += 1;
    const prevBest = S.progress.raceBest[race.index];
    if (!prevBest || race.t < prevBest) S.progress.raceBest[race.index] = Math.round(race.t);
    S.progress.cash += 800;
    cashConfetti(S, S.player.x, S.player.y, 22);
    playSynthHit(S, 'cash');
    showMessage(S, `${def.name} — YOU WIN in ${race.t.toFixed(1)}s! $800 and a league point.`);
  } else {
    showMessage(S, `${def.name} — beaten this time. The league remembers.`);
  }
  if (S.hooks.onRaceFinish) S.hooks.onRaceFinish(race.won, race.index);
}

// Gold checkpoint rings, drawn by the renderer while a race runs.
export function drawRaceRings(ctx, S2) {
  const race = S.race;
  if (!race.active || !race.target) return;
  const t = race.target;
  ctx.save();
  ctx.strokeStyle = '#ffc845';
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.arc(t.x, t.y, 52 + Math.sin(S.t * 5) * 7, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,200,69,0.16)';
  ctx.beginPath();
  ctx.arc(t.x, t.y, 52, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  void S2;
}
