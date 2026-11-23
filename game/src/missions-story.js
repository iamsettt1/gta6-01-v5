// Puerto Brisa — Storm Surge: the fourteen-mission story.
//
// Rosa Camacho works for fixer Tomás Ibarra against the Herrera family. The
// missions form one chain; each is data (giver, briefing, rewards) plus a
// list of stages the small engine below walks: go somewhere, steal and
// deliver, tail a courier, hold a plaza, chase a van, run a boat, fly the
// seaplane, and — for mission 13 — execute the plan from the planning
// board. The engine writes S.mission.objectives every frame, which is what
// the HUD banner and checklist draw.

import { S, dist } from './config.js';
import { createCar } from './vehicles-cars.js';
import { spawnPedestrian } from './pedestrians.js';
import { reportCrime, clearWanted } from './police-pursuit.js';
import { showMessage } from './player-on-foot.js';
import { summonStormSurge } from './storm-weather.js';
import { claimTerritoryBlock, TERRITORY_BLOCKS } from './territory.js';
import { startLeagueRace } from './races-league.js';
import { applyHeistPlan } from './heist-planning.js';

export function startMission(S2, id) {
  const def = MISSIONS.find((m) => m.id === id);
  if (!def) return false;
  const M = S.mission;
  M.active = true;
  M.id = id;
  M.stage = 0;
  M.timer = 0;
  M.detection = 0;
  M.failText = '';
  M.bannerTitle = def.title.toUpperCase();
  M.bannerT = 5;
  M.noCrime = false;
  S.screen = 'briefing';
  S.briefing = { title: def.title, giver: GIVERS[def.giver].name, text: def.brief, cash: def.cash };
  setupStage(S2, def, 0);
  return true;
}

export const GIVERS = {
  tomas: { name: 'Tomás Ibarra', x: 640, y: 2080, shirt: '#ffc845' },
  pilar: { name: 'Pilar Duarte', x: 2620, y: 1560, shirt: '#ff4fd8' },
  bruno: { name: 'Bruno Serra', x: 5560, y: 1180, shirt: '#37b6ff' },
};

export const MISSIONS = [
  { id: 1, title: 'First Wheels', giver: 'tomas', brief: 'Tomás: "A Coral Sedan waits by the Mirador plaza, Rosa. Take it, bring it to my dock. Quietly."', cash: 600, respect: 12 },
  { id: 2, title: 'Tail the Courier', giver: 'tomas', brief: 'Tomás: "The Herrera courier crosses El Mirador at noon. Follow him home — close is blown, far is lost."', cash: 750, respect: 14 },
  { id: 3, title: 'Iris Run', giver: 'pilar', brief: 'Pilar: "One package, four minutes, every neon street in Barrio Iris. The club pays for fast, not careful."', cash: 900, respect: 16 },
  { id: 4, title: 'Dockside Static', giver: 'tomas', brief: 'Tomás: "Herrera shooters on my docks. Clear the marina, all of them, and keep the boats floating."', cash: 1200, respect: 20 },
  { id: 5, title: 'Street Crown', giver: 'pilar', brief: 'Pilar: "Three laps of Avenida Coral against my three best. Win the Street Crown and the league opens."', cash: 1500, respect: 22 },
  { id: 6, title: 'Wet Cargo', giver: 'tomas', brief: 'Tomás: "Crates to Isla Ancla by speedboat. The LPD will smell it — outrun their boats, deliver dry."', cash: 1600, respect: 24 },
  { id: 7, title: 'The Export List', giver: 'bruno', brief: 'Bruno: "Three named cars, one garage. A Muscle in Mirador, a GT in Iris, a Van at the beach. Bring them home."', cash: 2100, respect: 26 },
  { id: 8, title: 'Storm Warning', giver: 'pilar', brief: 'Pilar: "They are coming for the club in the storm, Rosa. Hold Barrio Iris until the rain stops."', cash: 2000, respect: 28 },
  { id: 9, title: 'Two Bridges', giver: 'tomas', brief: 'Tomás: "An armoured Herrera van crosses both bridges tonight. Stop it before Isla Ancla — whatever it takes."', cash: 2400, respect: 30 },
  { id: 10, title: 'Turf War', giver: 'tomas', brief: 'Tomás: "Three Mirador blocks fly Herrera red. Take them, hold them, paint the hill teal."', cash: 2600, respect: 32 },
  { id: 11, title: 'Wings Over Brisa', giver: 'bruno', brief: 'Bruno: "The LPD helicopter sits on my airstrip. Take it up, shake five stars, and bring it back breathing."', cash: 3000, respect: 36 },
  { id: 12, title: 'King Tide Run', giver: 'tomas', brief: 'Tomás: "Dawn, the seaplane, one crate to Isla Ancla. Boats below you, the helicopter above. Fly it, Rosa."', cash: 3400, respect: 40 },
  { id: 13, title: 'The Vault of Brisa', giver: 'tomas', brief: 'Tomás: "The marina vault convoy. Plan it on the board at the safehouse — crew, entry, escape — then we crack it."', cash: 4800, respect: 48 },
  { id: 14, title: 'Storm Surge', giver: 'tomas', brief: 'Tomás: "King tide, five stars, the bridges drowning. Get to the seaplane and fly us out of the storm, Rosa."', cash: 6000, respect: 60 },
];

// Stage lists per mission. Stage types: goto | drive | follow | fight |
// hold | race | chase | collect | flyto | boat | heist | escape.
const STAGES = {
  1: [
    { type: 'goto', x: 760, y: 560, text: 'Reach the marked sedan in El Mirador' },
    { type: 'drive', point: { x: 640, y: 2140 }, text: 'Deliver the sedan to Tomás at the marina' },
  ],
  2: [
    { type: 'follow', from: { x: 900, y: 500 }, to: { x: 1500, y: 1050 }, text: 'Tail the courier — stay close, stay unseen' },
  ],
  3: [
    { type: 'goto', x: 2300, y: 1700, text: 'Pick up the package at Club Iris', timer: 240 },
    { type: 'drive', point: { x: 3200, y: 2300 }, text: 'Deliver across Barrio Iris before the timer dies', timer: 240 },
  ],
  4: [
    { type: 'fight', x: 900, y: 2050, count: 6, text: 'Clear the Herrera shooters from the docks' },
  ],
  5: [
    { type: 'race', raceIndex: 0, text: 'Win the Street Crown — 3 laps of Avenida Coral' },
  ],
  6: [
    { type: 'boat', point: { x: 5960, y: 2880 }, text: 'Run the cargo by boat to Isla Ancla' },
  ],
  7: [
    { type: 'collect', text: 'Steal the 3 export cars and deliver them to Zona Libre' },
  ],
  8: [
    { type: 'hold', x: 2620, y: 1900, seconds: 75, waves: 3, text: 'Hold Barrio Iris through the storm ambush' },
  ],
  9: [
    { type: 'chase', text: 'Stop the armoured van before it crosses to Isla Ancla' },
  ],
  10: [
    { type: 'fight', x: 600, y: 560, count: 4, block: 0, text: 'Take the Plaza del Faro block' },
    { type: 'fight', x: 1080, y: 560, count: 4, block: 1, text: 'Take the Los Arcos block' },
    { type: 'fight', x: 820, y: 960, count: 5, block: 2, text: 'Take the Mirador Alto block' },
  ],
  11: [
    { type: 'flyto', kind: 'heli', point: { x: 900, y: 900 }, text: 'Steal the LPD helicopter and reach the Mirador marker' },
    { type: 'escape', text: 'Lose the five-star pursuit in the air' },
  ],
  12: [
    { type: 'flyto', kind: 'plane', point: { x: 5960, y: 2880 }, text: 'Fly the cargo by seaplane to Isla Ancla' },
    { type: 'flyto', kind: 'plane', point: { x: 880, y: 2450 }, text: 'Bring the seaplane home to the marina' },
  ],
  13: [
    { type: 'heist', text: 'Execute the plan: crack the vault convoy and escape' },
  ],
  14: [
    { type: 'goto', x: 5170, y: 1480, text: 'Reach the Zona Libre seaplane dock through the storm' },
    { type: 'flyto', kind: 'plane', point: { x: 6100, y: 2600 }, text: 'Fly out of the storm to Isla Ancla' },
    { type: 'escape', text: 'Lose the heat over the water' },
  ],
};

export function missionDefinition(id) {
  return MISSIONS.find((m) => m.id === id);
}

export function nextMissionId() {
  for (const m of MISSIONS) if (!S.progress.missionsDone.includes(m.id)) return m.id;
  return 0;
}

// Spawn whatever the stage needs and point the beacon at it.
function setupStage(S2, def, stageIdx) {
  const stage = (STAGES[def.id] || [])[stageIdx];
  const M = S.mission;
  M.target = null;
  M.stageData = {};
  if (!stage) return;
  if (stage.type === 'goto' || stage.type === 'drive' || stage.type === 'boat' || stage.type === 'flyto') {
    const p = stage.point || stage;
    M.target = { x: p.x, y: p.y };
  }
  if (def.id === 1 && stageIdx === 0) {
    const car = createCar('sedan', 760, 560, 0, '#3f6fb5');
    car.named = 'First Wheels sedan';
    car.missionMark = true;
    S.vehicles.push(car);
    M.stageData.veh = car;
  }
  if (stage.type === 'fight') {
    M.stageData.rivals = [];
    for (let i = 0; i < stage.count; i++) {
      const ped = spawnPedestrian(S, stage.x + (Math.random() - 0.5) * 260, stage.y + (Math.random() - 0.5) * 260, 'rival', { faction: 'herrera' });
      M.stageData.rivals.push(ped);
    }
    M.target = { x: stage.x, y: stage.y };
  }
  if (stage.type === 'follow') {
    const ped = spawnPedestrian(S, stage.from.x, stage.from.y, 'walker', { name: 'courier' });
    ped.role = 'courier';
    M.stageData.courier = ped;
    M.stageData.from = stage.from;
    M.stageData.to = stage.to;
    M.target = { x: ped.x, y: ped.y };
  }
  if (stage.type === 'hold') {
    summonStormSurge(S, 0.85);
    M.stageData.left = stage.seconds;
    M.stageData.wave = 0;
    M.stageData.rivals = [];
    M.target = { x: stage.x, y: stage.y };
  }
  if (stage.type === 'chase') {
    const van = createCar('van', 4300, 1000, 0, '#39424e');
    van.health = 320;
    van.driver = 'rival';
    van.missionMark = true;
    S.vehicles.push(van);
    M.stageData.van = van;
    M.target = { x: van.x, y: van.y };
  }
  if (stage.type === 'collect') {
    M.stageData.left = 3;
    M.target = { x: 5560, y: 1180 };
  }
  if (stage.type === 'race') {
    startLeagueRace(S, stage.raceIndex);
  }
  if (stage.type === 'heist') {
    const plan = applyHeistPlan(S);
    M.stageData.plan = plan;
    M.stageData.convoy = [];
    for (let i = 0; i < 3; i++) {
      const truck = createCar('van', 700 + i * 90, 2050, 0, '#74604a');
      truck.health = 200;
      truck.driver = 'rival';
      S.vehicles.push(truck);
      M.stageData.convoy.push(truck);
    }
    M.target = { x: 760, y: 2050 };
    reportCrime(S, 'mission');
  }
  if (def.id === 8) summonStormSurge(S, 0.85);
  if (def.id === 14) {
    summonStormSurge(S, 1);
    if (S.wanted.stars < 5) {
      S.wanted.stars = 5;
      reportCrime(S, 'mission');
    }
  }
  if (def.id === 11 && stageIdx === 0 && S.hooks.stealHeli) S.hooks.stealHeli();
  if (stage.timer) M.timer = stage.timer;
}

// The per-frame mission engine.
export function updateMission(S2, dt) {
  const M = S.mission;
  if (!M.active) {
    M.objectives = [];
    return;
  }
  const def = missionDefinition(M.id);
  const stages = STAGES[M.id] || [];
  const stage = stages[M.stage];
  M.bannerT = Math.max(0, M.bannerT - dt);
  if (!stage) {
    completeMission(S2, def);
    return;
  }
  // Objectives list for the HUD checklist.
  M.objectives = stages.map((s, i) => ({ text: s.text, done: i < M.stage, current: i === M.stage }));
  if (stage.timer) {
    M.timer -= dt;
    if (M.timer <= 0) return failMission(S2, 'Out of time.');
  }
  const p = S.player;
  const done = checkStage(S2, stage, dt);
  if (done === 'fail') return;
  if (done) {
    M.stage += 1;
    if (M.stage >= stages.length) completeMission(S2, def);
    else setupStage(S2, def, M.stage);
  }
}

function checkStage(S2, stage, dt) {
  const M = S.mission;
  const p = S.player;
  switch (stage.type) {
    case 'goto':
      return dist(p.x, p.y, stage.x, stage.y) < 90;
    case 'drive': {
      if (!p.inVehicle) return false;
      return dist(p.x, p.y, stage.point.x, stage.point.y) < 110;
    }
    case 'boat': {
      if (!p.inVehicle || p.inVehicle.kind !== 'boat') return false;
      return dist(p.x, p.y, stage.point.x, stage.point.y) < 130;
    }
    case 'flyto': {
      if (!p.inVehicle || p.inVehicle.kind !== stage.kind) return false;
      if (p.inVehicle.alt !== undefined && p.inVehicle.alt < 0.2 && stage.kind === 'heli') return false;
      return dist(p.x, p.y, stage.point.x, stage.point.y) < 220;
    }
    case 'follow': {
      const c = M.stageData.courier;
      if (!c || c.health <= 0) {
        failMission(S2, 'The courier is down — the trail is dead.');
        return 'fail';
      }
      // The courier walks his route; detection fills close or far.
      const t = (c.walkT || 0) + dt;
      c.walkT = t;
      const k = Math.min(1, t / 75);
      c.x = M.stageData.from.x + (M.stageData.to.x - M.stageData.from.x) * k;
      c.y = M.stageData.from.y + (M.stageData.to.y - M.stageData.from.y) * k + Math.sin(t * 0.7) * 30;
      M.target = { x: c.x, y: c.y };
      const d = dist(p.x, p.y, c.x, c.y);
      if (d < 90 || d > 560) M.detection += dt * 22;
      else M.detection = Math.max(0, M.detection - dt * 14);
      if (M.detection > 100) {
        failMission(S2, 'Blown — the courier lost you.');
        return 'fail';
      }
      return k >= 1;
    }
    case 'fight': {
      const alive = M.stageData.rivals.filter((r) => r.health > 0);
      M.target = alive.length ? { x: alive[0].x, y: alive[0].y } : M.target;
      if (!alive.length) {
        if (stage.block !== undefined) claimTerritoryBlock(S, stage.block);
        return true;
      }
      return false;
    }
    case 'hold': {
      M.stageData.left -= dt;
      if (dist(p.x, p.y, stage.x, stage.y) > 420) {
        failMission(S2, 'You abandoned the block.');
        return 'fail';
      }
      if (M.stageData.rivals.filter((r) => r.health > 0).length < 2 && M.stageData.wave < stage.waves) {
        M.stageData.wave += 1;
        for (let i = 0; i < 4; i++) {
          M.stageData.rivals.push(spawnPedestrian(S, stage.x + (Math.random() - 0.5) * 420, stage.y + (Math.random() - 0.5) * 420, 'rival', { faction: 'herrera' }));
        }
      }
      if (M.stageData.left <= 0) {
        summonStormSurge(S, 0.25);
        return true;
      }
      return false;
    }
    case 'race':
      return S.race.finished === true && S.race.won === true;
    case 'chase': {
      const van = M.stageData.van;
      if (!van) return true;
      M.target = { x: van.x, y: van.y };
      // The van flees toward the island bridges.
      const goal = { x: 5300, y: 2430 };
      const a = Math.atan2(goal.y - van.y, goal.x - van.x);
      van.angle = a;
      van.speed = Math.min(van.topSpeed, (van.speed || 0) + 200 * dt);
      van.x += Math.cos(a) * van.speed * dt;
      van.y += Math.sin(a) * van.speed * dt;
      if (van.health <= 60) return true;
      if (dist(van.x, van.y, goal.x, goal.y) < 120) {
        failMission(S2, 'The van made the island.');
        return 'fail';
      }
      return false;
    }
    case 'collect': {
      return S.progress.exports >= 3 && M.id === 7 ? true : S.mission.stageData.left <= 0;
    }
    case 'heist': {
      const convoy = M.stageData.convoy || [];
      const stopped = convoy.every((v) => v.health <= 60 || Math.abs(v.speed) < 4);
      if (stopped && dist(p.x, p.y, 760, 2050) < 400) {
        if (S.wanted.stars === 0) return true;
        showMessage(S, 'The vault is cracked — now lose the heat!');
        return false;
      }
      return false;
    }
    case 'escape': {
      return S.wanted.stars === 0;
    }
    default:
      return false;
  }
}

export function completeMission(S2, def) {
  const M = S.mission;
  M.active = false;
  M.objectives = [];
  if (!def) return;
  if (!S.progress.missionsDone.includes(def.id)) {
    S.progress.missionsDone.push(def.id);
    const planBonus = def.id === 13 && M.stageData && M.stageData.plan ? M.stageData.plan.payout - 48000 : 0;
    S.progress.cash += def.cash + Math.max(0, planBonus);
    S.progress.respect += def.respect;
    S.progress.respectLevel = 1 + Math.floor(S.progress.respect / 60);
    showMessage(S, `${def.title} complete — $${def.cash} and the city's respect.`);
    if (S.hooks.onMissionComplete) S.hooks.onMissionComplete(S, def);
  }
  if (def.id === 14) {
    showMessage(S, 'STORM SURGE — Rosa Camacho owns Puerto Brisa now. Free roam!');
    summonStormSurge(S, 0.2);
  }
  void clearWanted;
}

export function failMission(S2, why) {
  const M = S.mission;
  M.active = false;
  M.objectives = [];
  M.failText = why || 'Mission failed.';
  showMessage(S, `Mission failed — ${M.failText} Talk to the giver to retry.`);
  if (S.screen === 'game') S.screen = 'game';
}

// Giver markers: who to talk to for the next mission.
export function currentGiver() {
  const id = nextMissionId();
  if (!id) return null;
  const def = missionDefinition(id);
  const g = GIVERS[def.giver];
  return { def, giver: g };
}
