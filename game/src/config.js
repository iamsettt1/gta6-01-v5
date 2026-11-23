// Puerto Brisa — Storm Surge: shared configuration and the one world state.
//
// Every module in the game reads its tuning from CFG and its live data from
// the single state object S, created by createPuertoBrisaState() below and
// exported at the bottom of this file. Keeping one state object means the
// feature modules never import each other in circles: they all import this
// file (and the seeded random), act on S, and let main.js conduct the order
// in which their update functions run each frame.

export function createPuertoBrisaState() {
  const state = {
    // Clock and flow control.
    t: 0,
    frame: 0,
    screen: 'title', // title | game | pause | map | board | phone | heist | busted | wasted | briefing
    started: false,
    paused: false,
    seed: 7,
    shot: null,
    // Camera over the world, in world pixels (top-left corner of the view).
    cam: { x: 0, y: 0, shake: 0, shakeX: 0, shakeY: 0 },
    // The city, filled by buildPuertoBrisaCity() in city-map.js.
    city: {
      roads: [],
      buildings: [],
      waters: [],
      bridges: [],
      props: [],
      signs: [],
      docks: [],
      airstrip: null,
      seaplaneDock: null,
      lighthouse: null,
      districts: [],
    },
    // Player and progression.
    player: null,
    progress: {
      cash: 450,
      respect: 0,
      respectLevel: 1,
      missionsDone: [],
      currentMission: 0,
      racesWon: 0,
      raceBest: {},
      shells: 0,
      exports: 0,
      exportDelivered: [],
      bountiesCaught: 0,
      completion: 0,
    },
    stats: { carsDriven: 0, boatsDriven: 0, flights: 0, distance: 0, shotsFired: 0 },
    // Entities.
    vehicles: [],
    peds: [],
    bullets: [],
    particles: [],
    pickups: [],
    shells: [],
    // Law.
    wanted: { stars: 0, heat: 0, blinkT: 0, hiddenT: 0, bribeUsed: false, lastCrime: '' },
    // Weather and time of day.
    day: { t01: 0.72, phase: 'golden hour', sunAngle: 0.6 },
    weather: { storm: 0, rain: 0, wind: 0.2, lightningT: 4, flash: 0, flood: 0 },
    // Mission runtime.
    mission: {
      active: false,
      id: 0,
      stage: 0,
      objectives: [],
      timer: 0,
      bannerT: 0,
      bannerTitle: '',
      failText: '',
      message: '',
      messageT: 0,
      target: null,
      detection: 0,
    },
    // Heist planning (mission 13).
    heistPlan: { crew: ['driver'], entry: 'dock', escape: 'seaplane', locked: false, heat: 5, payout: 48000 },
    // Bounty board runtime.
    bounties: [],
    // Empire runtime.
    businesses: [],
    businessIncomeT: 0,
    // Territory blocks in El Mirador: 0 = Herrera, 1 = held by the crew.
    territory: [0, 0, 0],
    territoryPayT: 0,
    // Phone and UI scratch state.
    phone: { open: false, contact: 0 },
    board: { tab: 'missions' },
    race: { active: false, index: 0, checkpoint: 0, lap: 0, t: 0, best: 0, grid: [] },
    taxi: { fare: null },
    audio: { enginePitch: 0, engineOn: false, rotor: 0, prop: 0, siren: 0, radio: 0 },
    input: { keys: new Set(), mouse: { x: 0, y: 0, down: false, clicked: false } },
    hooks: {},
    message: '',
    messageT: 0,
  };
  return state;
}

export const CFG = {
  WORLD_W: 6800,
  WORLD_H: 4600,
  VIEW_W: 1280,
  VIEW_H: 800,
  // Oversized, thumbnail-proof HUD constants (1280x800 render).
  HUD_FONT: 34,
  HUD_BANNER_FONT: 44,
  HUD_STAR_PX: 64,
  HUD_READOUT: 36,
  MINIMAP_BIG: 360,
  MINIMAP_SMALL: 300,
  CREW_TEAL: '#14c8bc',
  CREW_TEAL_DARK: '#0a7d76',
  HERRERA_RED: '#e33f4e',
  GOLD: '#ffc845',
  MAGENTA: '#e0218a',
  INK: '#10151d',
  PAPER: '#f7f1de',
  SAVE_KEY: 'puerto-brisa-storm-surge-save-v1',
  PLAYER_SPEED: 265,
  PLAYER_RUN_MULT: 1.45,
  WATER_FINE: 25,
};

// Small geometry and math helpers shared by every system.
export function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function dist(x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

export function angDiff(a, b) {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}

export function angLerp(a, b, t) {
  return a + angDiff(a, b) * t;
}

export function pointInRect(x, y, r) {
  return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
}

export function circleHitsRect(x, y, rad, r) {
  const nx = clamp(x, r.x, r.x + r.w);
  const ny = clamp(y, r.y, r.y + r.h);
  const dx = x - nx;
  const dy = y - ny;
  return dx * dx + dy * dy < rad * rad;
}

// Push a circle out of a solid rectangle; returns the corrected position.
export function pushOutOfRect(x, y, rad, r) {
  const nx = clamp(x, r.x, r.x + r.w);
  const ny = clamp(y, r.y, r.y + r.h);
  let dx = x - nx;
  let dy = y - ny;
  const d2 = dx * dx + dy * dy;
  if (d2 >= rad * rad) return { x, y, hit: false };
  if (d2 > 0.0001) {
    const d = Math.sqrt(d2);
    return { x: nx + (dx / d) * rad, y: ny + (dy / d) * rad, hit: true };
  }
  // Centre inside the rect: leave through the nearest face.
  const left = x - r.x;
  const right = r.x + r.w - x;
  const top = y - r.y;
  const bottom = r.y + r.h - y;
  const m = Math.min(left, right, top, bottom);
  if (m === left) return { x: r.x - rad, y, hit: true };
  if (m === right) return { x: r.x + r.w + rad, y, hit: true };
  if (m === top) return { x, y: r.y - rad, hit: true };
  return { x, y: r.y + r.h + rad, hit: true };
}

export function formatCash(n) {
  return '$' + Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// The one shared world state. main.js resets and rebuilds it per run.
export const S = createPuertoBrisaState();
