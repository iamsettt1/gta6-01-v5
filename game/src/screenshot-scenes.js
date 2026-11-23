// Puerto Brisa — Storm Surge: the four deterministic screenshot scenes.
//
// shots.json drives these: harbour (the cover), heist, bounty, empire.
// Each scene stages a frozen, composed tableau over the real game state —
// real actors, real HUD, real panels — paints it, and sets
// window.__shotReady so the capture script can shoot. Deterministic: the
// world is built from the URL seed, and staging places every actor by
// hand.

import { S } from './config.js';
import { createSeededRandom } from './random.js';
import { setDayPhase } from './daycycle-weather.js';
import { summonStormSurge } from './storm-weather.js';
import { createCar } from './vehicles-cars.js';
import { createSeaplane } from './seaplane.js';
import { createHelicopter } from './helicopter.js';
import { launchBoat } from './boats.js';
import { spawnPedestrian } from './pedestrians.js';
import { sprayWater, wakeFoam } from './effects-particles.js';
import { heistPayout } from './heist-planning.js';

export function stageScreenshotScene(S2, name) {
  if (name === 'harbour') stageHarbour(S);
  else if (name === 'heist') stageHeistBoard(S);
  else if (name === 'bounty') stageBountyShot(S);
  else if (name === 'empire') stageEmpireShot(S);
  S.shotStaged = name;
}

export function applyShotQuery(S2) {
  const params = new URLSearchParams(window.location.search);
  const shot = params.get('shot');
  const seed = params.get('seed');
  if (seed) S.seed = Number(seed) || S.seed;
  if (shot) S.shot = shot;
  return shot;
}

function clearActors(S2) {
  S.vehicles = S.vehicles.filter((v) => v.kind === 'plane' && v.docked);
  S.peds = [];
  S.bullets = [];
  S.particles = [];
}

function parkCar(S2, cls, x, y, angle, colour, extra) {
  const car = createCar(cls, x, y, angle, colour);
  if (extra) Object.assign(car, extra);
  S.vehicles.push(car);
  return car;
}

// 1 — HARBOUR (the cover): the heist escape at dusk, mid-takeoff.
function stageHarbour(S2) {
  clearActors(S);
  setDayPhase(S, 0.66); // dusk, neon on
  summonStormSurge(S, 0.8);
  // The storm reads as rain streaks, not as a grey wash: rain is set
  // strong and the frozen lightning sheen stays faint, so the dusk
  // colours keep the bounty scene's saturation.
  S.weather.storm = 0.75;
  S.weather.rain = 0.85;
  S.weather.flash = 0.2;
  S.screen = 'game';
  S.progress.cash = 12480;
  S.progress.respectLevel = 6;
  S.wanted.stars = 5;
  const p = S.player;
  p.weapon = 'rifle';
  p.ammo.rifle = 40;
  p.health = 88;
  p.armour = 55;
  // The camera is fixed first — world x 340..1620, y 2010..2810 — and
  // every actor below is staged inside that frame: the quay, cranes
  // and docks across the top, the harbour basin and the chase below.
  S.cam.x = 340;
  S.cam.y = 2010;
  S.cam.shake = 2;
  // The seaplane, big in frame, climbing out of the basin on its
  // takeoff run with a spray trail streaming behind it. The world's
  // docked planes are cleared away so the hero plane flies alone.
  const plane = createSeaplane(860, 2400, -0.3);
  plane.w = 118;
  plane.h = 54;
  plane.alt = 0.5;
  plane.airborne = true;
  plane.speed = 245;
  plane.prop = 0.9;
  S.vehicles = S.vehicles.filter((v) => v.kind !== 'plane');
  S.vehicles.push(plane);
  p.inVehicle = plane;
  plane.pilot = p;
  p.x = plane.x;
  p.y = plane.y;
  sprayWater(S, 812, 2415, 30);
  sprayWater(S, 774, 2427, 20);
  sprayWater(S, 736, 2438, 14);
  wakeFoam(S, 690, 2448, 16);
  wakeFoam(S, 636, 2456, 12);
  // The police helicopter in frame at the right, nose turned onto the
  // plane, its searchlight cone cast across the water toward it.
  const heli = createHelicopter(1330, 2330, true);
  heli.w = 96;
  heli.h = 40;
  heli.alt = 1;
  heli.rotor = 0.8;
  heli.lightOn = true;
  heli.lightAngle = Math.atan2(plane.y - heli.y, plane.x - heli.x);
  heli.angle = heli.lightAngle;
  S.vehicles.push(heli);
  // The boat chase on the basin: Rosa's speedboat ahead of the
  // plane's run, one police skiff closing in behind it, a second
  // cutting across the basin's south water.
  const boat = launchBoat(S, 'speedboat', 1080, 2470, -0.15);
  boat.w = 78;
  boat.h = 30;
  boat.driver = 'npc';
  boat.speed = 190;
  wakeFoam(S, 1012, 2476, 14);
  wakeFoam(S, 952, 2481, 10);
  const cop1 = launchBoat(S, 'skiff', 720, 2460, -0.2);
  cop1.w = 64;
  cop1.h = 26;
  cop1.cop = true;
  cop1.speed = 170;
  wakeFoam(S, 652, 2468, 10);
  wakeFoam(S, 598, 2473, 8);
  const cop2 = launchBoat(S, 'skiff', 1150, 2610, -0.35);
  cop2.w = 64;
  cop2.h = 26;
  cop2.cop = true;
  cop2.speed = 165;
  wakeFoam(S, 1082, 2618, 10);
  wakeFoam(S, 1028, 2623, 8);
  // Street life on the quay and the avenue crossing it: cars inside
  // the frame, peds strung along the dock strip.
  parkCar(S, 'taxi', 760, 2276, 0, '#ffc845');
  parkCar(S, 'sports', 1500, 2276, Math.PI, '#ff4fd8');
  parkCar(S, 'sedan', 1080, 2276, 0, '#b9c4ce');
  parkCar(S, 'pickup', 816, 2150, Math.PI / 2, '#c96f43');
  parkCar(S, 'van', 1000, 2532, Math.PI, '#8fa2b5');
  const rand = createSeededRandom(S.seed + 5);
  for (let i = 0; i < 8; i++) {
    spawnPedestrian(S, 760 + rand.next() * 800, 2252 + rand.next() * 56, 'walker', {});
  }
  // The mission banner the cover is built around.
  S.mission.active = true;
  S.mission.id = 13;
  S.mission.bannerT = 999;
  S.mission.bannerTitle = 'THE VAULT OF BRISA — LOSE THE HEAT';
  S.mission.objectives = [
    { text: 'Crack the marina vault convoy', done: true, current: false },
    { text: 'Lose the heat — five stars', done: false, current: true },
    { text: 'Escape by seaplane', done: false, current: false },
  ];
  S.mission.target = null;
}

// 2 — HEIST: the planning board over the marina at night.
function stageHeistBoard(S2) {
  clearActors(S);
  setDayPhase(S, 0.85); // night
  summonStormSurge(S, 0.3);
  S.screen = 'heist';
  S.progress.cash = 24000;
  const plan = { crew: ['driver', 'muscle', 'tech'], entry: 'dock', escape: 'seaplane', row: 2, locked: false };
  plan.payout = heistPayout(plan);
  plan.heat = 5; // the dock entry's heat, per HEIST_ENTRIES
  S.heistPlan = plan;
  // The marina behind the panel: the escape plane at its dock, a boat, cars.
  const plane = createSeaplane(880, 2450, -0.4);
  plane.docked = true;
  S.vehicles.push(plane);
  const boat = launchBoat(S, 'cigarette', 620, 2560, -0.2);
  boat.parked = true;
  parkCar(S, 'sports', 500, 2068, Math.PI, '#e33f4e');
  parkCar(S, 'van', 900, 1620, 0, '#8fa2b5');
  const p = S.player;
  p.inVehicle = null;
  p.x = 640;
  p.y = 2080;
  p.angle = -Math.PI / 2;
  spawnPedestrian(S, 700, 2040, 'giver', { name: 'Tomás Ibarra', shirt: '#14c8bc' });
  S.cam.x = 260;
  S.cam.y = 1380;
}

// 3 — BOUNTY: golden hour in El Mirador, the turf war and El Cuervo.
function stageBountyShot(S2) {
  clearActors(S);
  setDayPhase(S, 0.52); // golden hour
  S.weather.storm = 0;
  S.screen = 'game';
  S.progress.cash = 31275;
  S.progress.respectLevel = 7;
  S.wanted.stars = 3;
  S.territory = [1, 1, 0];
  const p = S.player;
  p.inVehicle = null;
  p.x = 860;
  p.y = 920;
  p.angle = 0.15;
  p.weapon = 'rifle';
  p.ammo.rifle = 34;
  p.health = 82;
  p.armour = 40;
  // El Cuervo himself, ringed and named, health worn down.
  const target = spawnPedestrian(S, 1030, 872, 'target', { name: 'EL CUERVO', shirt: '#ffd23e' });
  target.health = 64;
  S.bounties = [{ name: 'El Cuervo', reward: 6500, district: 'El Mirador', x: 1030, y: 872, active: true, caught: false, ped: target }];
  // Three rivals at cover, crates to hide behind.
  const cover = [[1150, 800], [1180, 950], [1080, 1000]];
  for (const [cx, cy] of cover) {
    S.city.props.push({ kind: 'crate', x: cx - 30, y: cy, angle: 0, colour: '#9c7a4a' });
    const rival = spawnPedestrian(S, cx, cy, 'rival', { shirt: '#e33f4e' });
    rival.angle = Math.PI;
  }
  parkCar(S, 'muscle', 950, 985, 0.3, '#5d6e5a');
  // A tracer in flight from Rosa's rifle.
  S.bullets.push({ x: 905, y: 908, vx: 760, vy: -90, life: 0.35, from: 'player', dmg: 20, colour: '#ffe9a8' });
  S.mission.active = true;
  S.mission.id = 10;
  S.mission.bannerT = 999;
  S.mission.bannerTitle = 'TURF WAR — HOLD THE PLAZA 2/3';
  S.mission.objectives = [
    { text: 'Plaza del Faro — taken', done: true, current: false },
    { text: 'Los Arcos — taken', done: true, current: false },
    { text: 'Mirador Alto — take it', done: false, current: true },
  ];
  S.cam.x = 860 - 560;
  S.cam.y = 920 - 400;
}

// 4 — EMPIRE: the pause screen over Playa Brisa at dusk.
function stageEmpireShot(S2) {
  setDayPhase(S, 0.7); // dusk
  S.screen = 'map';
  S.progress.cash = 86240;
  S.progress.respectLevel = 8;
  S.progress.missionsDone = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
  S.progress.currentMission = 12;
  S.progress.racesWon = 5;
  S.progress.shells = 13;
  S.progress.exports = 5;
  S.progress.exportDelivered = ['Mirador Muscle', 'Iris GT', 'Beach Van', 'Lomas SUV', 'Harbour Pickup'];
  S.progress.bountiesCaught = 4;
  S.progress.completion = 81;
  S.territory = [1, 1, 0];
  for (const b of S.businesses) b.owned = true;
  S.empireComplete = true;
  S.safehousesOwned = { mirador: true, playa: true, isla: false };
  S.shells.forEach((shell, i) => {
    shell.taken = i < 13;
  });
  // Rosa's tuned car on the beachfront behind the panel.
  const car = parkCar(S, 'sports', 4050, 1700, 0, '#37b6ff', { underglow: '#14c8bc', spoiler: true });
  const p = S.player;
  p.inVehicle = car;
  car.driver = 'player';
  p.x = car.x;
  p.y = car.y;
  S.cam.x = 3420;
  S.cam.y = 1280;
}
