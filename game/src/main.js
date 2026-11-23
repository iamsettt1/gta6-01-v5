// Puerto Brisa — Storm Surge: main — boot, hooks, the frame loop.
//
// One shared state object, a city built from a seed, and a screen machine:
// title -> briefing -> the street, with the heist board, the phone, the
// mission board and the pause/empire map layered over the world. Every
// cross-system call travels through S.hooks, registered here, so the
// feature modules never import each other in a circle.

import { dockSeaplanes, flyPlayerSeaplane, updateSeaplanePhysics } from './seaplane.js';
import { updateHeistPlanning, drawHeistPlanning } from './heist-planning.js';
import { initEmpireBusinesses, updateEmpireBusinesses } from './empire-businesses.js';
import { initBountyBoard, updateBountyBoard } from './bounty-board.js';
import { spawnAirstripHelicopter, stealPoliceHelicopter, flyPlayerHelicopter, updateHelicopterPhysics } from './helicopter.js';
import { updateLeagueRace } from './races-league.js';
import { updateTuningShop } from './tuning-shop.js';
import { updateMission, startMission, nextMissionId, missionDefinition, currentGiver, GIVERS } from './missions-story.js';
import { updatePolicePursuit, reportCrime } from './police-pursuit.js';
import { updateTerritory } from './territory.js';
import { launchBoat, drivePlayerBoat, updateBoatPhysics } from './boats.js';
import { scatterParkedCars, drivePlayerCar } from './vehicles-cars.js';
import { CFG, S, clamp, lerp, createPuertoBrisaState } from './config.js';
import { createSeededRandom } from './random.js';
import { attachBrisaControls } from './input-controls.js';
import { buildPuertoBrisaCity } from './city-map.js';
import { advanceDayCycle } from './daycycle-weather.js';
import { updateStormWeather } from './storm-weather.js';
import { updateParticles } from './effects-particles.js';
import { startSynthAudio, updateSynthAudio } from './audio-synth.js';
import { ridePlayerBike, updateVehiclePhysics as updateBikePhysics } from './motorcycles.js';
import { createPlayer, updatePlayerOnFoot, tryEnterVehicle, exitVehicle, showMessage } from './player-on-foot.js';
import { spawnTraffic, updateTraffic } from './traffic-ai.js';
import { scatterPedestrians, updatePedestrians, spawnPedestrian } from './pedestrians.js';
import { updateCombat } from './combat-weapons.js';
import { loadBrisaProgress, hasBrisaSave } from './save-game.js';
import { initSideActivities, updateSideActivities } from './side-activities.js';
import { updatePaintShop } from './paint-shop.js';
import { updateSafehouses, nearestSafehouse } from './safehouses.js';
import { openFixerPhone, updatePhone, drawPhone, wrapText } from './phone.js';
import { drawStormSurgeHud } from './hud-minimap.js';
import { drawPauseEmpireScreen, drawMissionsBoard } from './city-map-screen.js';
import { drawPuertoBrisaWorld } from './renderer-camera.js';
import { stageScreenshotScene, applyShotQuery } from './screenshot-scenes.js';

export function bootPuertoBrisa() {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  S.ctx = ctx;
  Object.assign(S, createPuertoBrisaState());
  // Belt-and-braces defaults for the objects other modules reach into.
  S.phone = S.phone || { open: false };
  S.safehousesOwned = S.safehousesOwned || {};
  S.heistPlan = S.heistPlan || { crew: ['driver'], entry: 'dock', escape: 'seaplane', row: 0, locked: false, payout: 0, heat: 5 };
  const shot = applyShotQuery(S);
  const rand = createSeededRandom(S.seed);
  buildPuertoBrisaCity(S, rand);
  S.player = createPlayer(S, 640, 2080);
  // A saved game's scalars load early so spawns respect them (the export
  // list skips delivered cars); a second load after the inits applies the
  // shell and business flags onto the fresh arrays.
  if (hasBrisaSave()) loadBrisaProgress(S);
  scatterParkedCars(S, rand, 90);
  spawnTraffic(S, rand, 26);
  scatterPedestrians(S, rand, 60);
  for (const g of Object.values(GIVERS)) {
    spawnPedestrian(S, g.x, g.y, 'giver', { name: g.name, shirt: '#14c8bc' });
  }
  const boatClasses = ['skiff', 'speedboat', 'cigarette'];
  S.city.docks.forEach((dock, i) => {
    if (i % 3 === 2) return;
    const boat = launchBoat(S, boatClasses[i % 3], dock.x, dock.y + 34, (rand.next() - 0.5) * 0.6);
    boat.parked = true;
  });
  dockSeaplanes(S);
  spawnAirstripHelicopter(S);
  initSideActivities(S);
  initEmpireBusinesses(S);
  initBountyBoard(S);
  if (hasBrisaSave()) loadBrisaProgress(S);
  registerHooks();
  attachBrisaControls(canvas);
  startSynthAudio(S);
  S.cam.x = clamp(S.player.x - CFG.VIEW_W / 2, 0, CFG.WORLD_W - CFG.VIEW_W);
  S.cam.y = clamp(S.player.y - CFG.VIEW_H / 2, 0, CFG.WORLD_H - CFG.VIEW_H);
  window.__game = S;
  window.__shotReady = false;
  if (shot) {
    stageScreenshotScene(S, shot);
    renderFrame(ctx);
    renderFrame(ctx);
    window.__shotReady = true;
    return S;
  }
  let last = performance.now();
  const loop = (now) => {
    const dt = Math.min(0.05, (now - last) / 1000 || 0.016);
    last = now;
    stepFrame(dt);
    renderFrame(ctx);
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
  return S;
}

// Every cross-system call in the game lands here.
function registerHooks() {
  // (Vehicle-entry stats live in player-on-foot's tryEnterVehicle itself;
  // the key hook in input-controls is a separate, optional onKeyPress.)
  S.hooks.onCarjack = (S2, veh) => reportCrime('carjack');
  S.hooks.onVehicleCrash = (S2, veh, other) => {
    S.cam.shake = Math.min(16, 6 + Math.abs(veh.speed) * 0.03);
  };
  S.hooks.onWantedRise = (S2, stars) => {
    S.audio.siren = stars > 0;
  };
  S.hooks.onBusted = (S2) => {
    const fine = Math.round(S.progress.cash * 0.1);
    S.progress.cash -= fine;
    if (S.player.inVehicle) exitVehicle(S);
    S.player.x = 640;
    S.player.y = 2080;
    S.player.health = 100;
    S.overlay = { kind: 'busted', t: 2.8 };
    showMessage(S, `BUSTED — the LPD takes $${fine} and your afternoon.`);
  };
  S.hooks.onWasted = (S2) => {
    const bill = Math.round(S.progress.cash * 0.08);
    S.progress.cash -= bill;
    if (S.player.inVehicle) exitVehicle(S);
    S.player.x = 1500;
    S.player.y = 1750;
    S.player.health = 100;
    S.player.armour = 0;
    S.overlay = { kind: 'wasted', t: 2.8 };
    showMessage(S, `WASTED — Hospital del Puerto bills you $${bill}.`);
  };
  S.hooks.onMissionComplete = (S2, def) => {
    S.progress.completion = Math.round(
      (S.progress.missionsDone.length / 14) * 55 +
      (S.progress.racesWon / 6) * 10 +
      (S.progress.shells / 18) * 8 +
      (S.progress.bountiesCaught / 6) * 10 +
      (S.progress.exports / 6) * 10 +
      (S.territory.filter(Boolean).length / 3) * 7
    );
    void def;
  };
  S.hooks.onPlanLocked = (S2) => {
    // The board can be opened any time, but the heist itself only starts
    // when the story reaches it; an early plan is simply saved.
    if (nextMissionId() === 13) startMission(S, 13);
    else showMessage(S, 'Plan saved on the board — Tomás calls when it is time.');
  };
  S.hooks.onRaceFinish = (won, index) => {
    if (won && index === 0) showMessage(S, 'The Street Crown is Rosa\'s. Pilar owes her a drink.');
  };
  S.hooks.stealHeli = (S2) => stealPoliceHelicopter(S);
}

// Edge detection: S.input.keys holds ev.key names ('e', 'enter',
// 'arrowup', '1', ' ') for everything currently held; a key counts as
// "pressed" on the frame it first appears. The snapshot lives here.
let prevKeys = new Set();

function collectPressed() {
  const pressed = new Set();
  for (const k of S.input.keys) {
    if (!prevKeys.has(k)) pressed.add(k);
  }
  prevKeys = new Set(S.input.keys);
  return pressed;
}

function stepFrame(dt) {
  S.t += dt;
  const pressed = collectPressed();
  if (S.screen === 'title') {
    advanceDayCycle(S, dt * 0.3);
    if (pressed.has('enter')) {
      S.briefing = currentBriefing();
      S.screen = 'briefing';
    }
    return;
  }
  if (S.screen === 'briefing') {
    if (pressed.has('enter')) S.screen = 'game';
    return;
  }
  if (S.screen === 'phone') {
    updatePhone(S, dt, pressed);
    return;
  }
  if (S.screen === 'board') {
    if (pressed.has('j') || pressed.has('escape')) S.screen = 'game';
    return;
  }
  if (S.screen === 'map') {
    if (pressed.has('escape')) S.screen = 'game';
    return;
  }
  if (S.screen === 'heist') {
    updateHeistPlanning(S, dt, pressed);
    if (pressed.has('escape')) S.screen = 'game';
    return;
  }
  // The street.
  if (S.overlay && S.overlay.t > 0) {
    S.overlay.t -= dt;
    updateParticles(S, dt);
    updateCamera(dt);
    return;
  }
  advanceDayCycle(S, dt);
  updateStormWeather(S, dt);
  const p = S.player;
  if (p.inVehicle) {
    const v = p.inVehicle;
    if (v.kind === 'car') drivePlayerCar(S, v, dt);
    else if (v.kind === 'bike') ridePlayerBike(S, v, dt);
    else if (v.kind === 'boat') drivePlayerBoat(S, v, dt);
    else if (v.kind === 'heli') flyPlayerHelicopter(S, v, dt);
    else if (v.kind === 'plane') flyPlayerSeaplane(S, v, dt);
    p.x = v.x;
    p.y = v.y;
    p.angle = v.angle;
  } else {
    updatePlayerOnFoot(S, dt);
  }
  for (const v of S.vehicles) {
    if (v === p.inVehicle) continue;
    if (v.kind === 'boat') updateBoatPhysics(S, v, dt, {});
    else if (v.kind === 'heli') updateHelicopterPhysics(S, v, dt, {});
    else if (v.kind === 'plane') updateSeaplanePhysics(S, v, dt, {});
    else if (v.kind === 'bike' && v.driver === 'traffic') updateBikePhysics(S, v, dt, {});
  }
  updateTraffic(S, dt);
  updatePedestrians(S, dt);
  updatePolicePursuit(S, dt);
  updateCombat(S, dt, pressed);
  updateMission(S, dt);
  updateSideActivities(S, dt);
  updateLeagueRace(S, dt);
  updateTerritory(S, dt);
  updateEmpireBusinesses(S, dt, pressed);
  updateBountyBoard(S, dt, pressed);
  updateTuningShop(S, dt, pressed);
  updatePaintShop(S, dt, pressed);
  updateSafehouses(S, dt, pressed);
  updateParticles(S, dt);
  updateSynthAudio(S);
  handleInteractKeys(pressed);
  updateCamera(dt);
  if (S.messageT > 0) S.messageT -= dt;
  // (bannerT is ticked inside updateMission, not here, so it lasts its
  // full five seconds.)
}

function handleInteractKeys(pressed) {
  const p = S.player;
  if (pressed.has('escape')) {
    S.screen = 'map';
    return;
  }
  if (pressed.has('j')) {
    S.screen = 'board';
    return;
  }
  if (pressed.has('p')) {
    openFixerPhone(S);
    return;
  }
  if (pressed.has('h')) {
    const house = nearestSafehouse(S, p.x, p.y);
    if (house && S.safehousesOwned[house.id]) S.screen = 'heist';
    else showMessage(S, 'The heist board hangs in a safehouse you own.');
    return;
  }
  if (pressed.has('e')) {
    if (p.inVehicle) {
      exitVehicle(S);
      return;
    }
    const giver = currentGiver();
    const g = giver ? giver.giver : null;
    if (g && Math.hypot(p.x - g.x, p.y - g.y) < 95) {
      const id = nextMissionId();
      if (id) {
        S.briefing = currentBriefing();
        startMission(S, id);
      } else {
        showMessage(S, 'Every job is done. The city is yours, Rosa.');
      }
      return;
    }
    tryEnterVehicle(S);
  }
}

function currentBriefing() {
  const id = nextMissionId() || S.progress.currentMission || 1;
  const def = missionDefinition(id);
  return {
    title: def ? def.title : 'PUERTO BRISA',
    giver: def ? GIVERS[def.giver].name : 'Tomás Ibarra',
    text: def ? def.brief : 'The city is yours.',
    cash: def ? def.cash : 0,
  };
}

function updateCamera(dt) {
  const p = S.player;
  if (!p) return;
  let tx = p.x - CFG.VIEW_W / 2;
  let ty = p.y - CFG.VIEW_H / 2;
  if (p.inVehicle) {
    tx += Math.cos(p.inVehicle.angle) * p.inVehicle.speed * 0.35;
    ty += Math.sin(p.inVehicle.angle) * p.inVehicle.speed * 0.35;
  }
  const k = Math.min(1, dt * 5);
  S.cam.x = clamp(lerp(S.cam.x, tx, k), 0, CFG.WORLD_W - CFG.VIEW_W);
  S.cam.y = clamp(lerp(S.cam.y, ty, k), 0, CFG.WORLD_H - CFG.VIEW_H);
  S.cam.shake = Math.max(0, S.cam.shake - dt * 26);
}

function renderFrame(ctx) {
  drawPuertoBrisaWorld(ctx, S);
  if (S.screen === 'title') drawTitleScreen(ctx);
  else if (S.screen === 'briefing') drawBriefingCard(ctx);
  else if (S.screen === 'game') drawStormSurgeHud(ctx, S);
  else if (S.screen === 'heist') {
    drawStormSurgeHud(ctx, S);
    drawHeistPlanning(ctx, S);
  } else if (S.screen === 'phone') {
    drawStormSurgeHud(ctx, S);
    drawPhone(ctx, S);
  } else if (S.screen === 'board') drawMissionsBoard(ctx, S);
  else if (S.screen === 'map') drawPauseEmpireScreen(ctx, S);
  if (S.overlay && S.overlay.t > 0) drawOverlay(ctx);
}

function drawTitleScreen(ctx) {
  ctx.fillStyle = 'rgba(8,12,22,0.45)';
  ctx.fillRect(0, 0, CFG.VIEW_W, CFG.VIEW_H);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffc845';
  ctx.font = 'bold 92px system-ui, sans-serif';
  ctx.fillText('PUERTO BRISA', CFG.VIEW_W / 2, 240);
  ctx.fillStyle = '#ff4fd8';
  ctx.font = 'bold 54px system-ui, sans-serif';
  ctx.fillText('— STORM SURGE —', CFG.VIEW_W / 2, 316);
  ctx.fillStyle = '#f7f1de';
  ctx.font = '26px system-ui, sans-serif';
  ctx.fillText('Rosa Camacho came home to take her brother\'s city back from the Herrera family.', CFG.VIEW_W / 2, 380);
  ctx.fillText('Fourteen jobs. Six races. One vault. And a storm coming in off the water.', CFG.VIEW_W / 2, 416);
  ctx.fillStyle = '#57d977';
  ctx.font = 'bold 34px system-ui, sans-serif';
  ctx.fillText(hasBrisaSave() ? 'ENTER — CONTINUE THE TAKEOVER' : 'ENTER — START THE TAKEOVER', CFG.VIEW_W / 2, 500);
  ctx.fillStyle = '#9fb4c8';
  ctx.font = '22px system-ui, sans-serif';
  ctx.fillText('WASD drive · E enter/exit · F interact · J missions · P phone · H heist board · Esc map', CFG.VIEW_W / 2, 560);
  ctx.fillText('1–4 weapons · Space fire/handbrake · M mute', CFG.VIEW_W / 2, 592);
}

function drawBriefingCard(ctx) {
  const b = S.briefing;
  if (!b) return;
  ctx.fillStyle = 'rgba(8,12,20,0.62)';
  ctx.fillRect(0, 0, CFG.VIEW_W, CFG.VIEW_H);
  const x = 240;
  const y = 150;
  const w = 800;
  const h = 470;
  ctx.fillStyle = '#12161f';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = '#ffc845';
  ctx.lineWidth = 4;
  ctx.strokeRect(x, y, w, h);
  ctx.textAlign = 'left';
  ctx.fillStyle = '#14c8bc';
  ctx.font = 'bold 24px system-ui, sans-serif';
  ctx.fillText(`FROM ${b.giver.toUpperCase()}`, x + 34, y + 52);
  ctx.fillStyle = '#ffc845';
  ctx.font = 'bold 46px system-ui, sans-serif';
  ctx.fillText(b.title, x + 34, y + 112);
  ctx.fillStyle = '#f7f1de';
  ctx.font = '27px system-ui, sans-serif';
  wrapText(ctx, b.text, x + 34, y + 168, w - 68, 38);
  ctx.fillStyle = '#57d977';
  ctx.font = 'bold 30px system-ui, sans-serif';
  ctx.fillText(`PAYS ${b.cash ? '$' + b.cash.toLocaleString('en-US') : 'IN KIND'}`, x + 34, y + h - 84);
  ctx.fillStyle = '#f7f1de';
  ctx.font = 'bold 28px system-ui, sans-serif';
  ctx.fillText('ENTER — ROLL OUT', x + 34, y + h - 36);
}

function drawOverlay(ctx) {
  const o = S.overlay;
  ctx.fillStyle = o.kind === 'busted' ? 'rgba(20,40,90,0.55)' : 'rgba(90,10,10,0.55)';
  ctx.fillRect(0, 0, CFG.VIEW_W, CFG.VIEW_H);
  ctx.fillStyle = '#f7f1de';
  ctx.font = 'bold 110px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(o.kind === 'busted' ? 'BUSTED' : 'WASTED', CFG.VIEW_W / 2, CFG.VIEW_H / 2 + 30);
}

bootPuertoBrisa();
