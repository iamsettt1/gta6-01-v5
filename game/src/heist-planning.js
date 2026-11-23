// Puerto Brisa — Storm Surge: the heist planning board (mission 13).
//
// Before the Vault of Brisa can be cracked, the plan is made here: three
// crew members with skills and cuts, three entry points that trade heat
// for payout, and three escapes. The plan is real — applyHeistPlan() turns
// it into the mission's starting heat and money, and the board itself is
// one of the four screenshot scenes, drawn to be read at a glance.

import { S, CFG, clamp } from './config.js';

export function planVaultHeist(S2) {
  S.screen = 'heist';
  if (!S.heistPlan.crew.length) S.heistPlan.crew = ['driver'];
  return S.heistPlan;
}

export const HEIST_CREW = [
  { id: 'driver', name: 'Lucho Paz', role: 'DRIVER', skill: 86, cut: 20, note: 'Fast hands, faster exits.' },
  { id: 'muscle', name: 'Bruno Serra', role: 'MUSCLE', skill: 74, cut: 18, note: 'Carries vault doors and grudges.' },
  { id: 'tech', name: 'Ada Vidal', role: 'TECH', skill: 92, cut: 22, note: 'Vaults open when she asks.' },
];

export const HEIST_ENTRIES = [
  { id: 'dock', name: 'DOCK', heat: 5, mult: 1.0, note: 'In by boat at shift change. Loud, honest, wet.' },
  { id: 'roof', name: 'ROOF', heat: 4, mult: 0.9, note: 'Down from the cranes. Quieter, smaller take.' },
  { id: 'front', name: 'FRONT GATE', heat: 5, mult: 1.18, note: 'Through the front in a stolen van. Maximum take, maximum heat.' },
];

export const HEIST_ESCAPES = [
  { id: 'seaplane', name: 'SEAPLANE', note: 'Off the harbour water before the roadblocks form.' },
  { id: 'boat', name: 'BOAT', note: 'Cigarette boat to Isla Ancla, low and fast.' },
  { id: 'car', name: 'CAR', note: 'A supercar and two bridges. Old school.' },
];

export function heistPayout(plan) {
  const entry = HEIST_ENTRIES.find((e) => e.id === plan.entry) || HEIST_ENTRIES[0];
  const crewCut = HEIST_CREW.filter((c) => plan.crew.includes(c.id)).reduce((sum, c) => sum + c.cut, 0);
  const gross = Math.round(48000 * entry.mult);
  return Math.round(gross * (1 - crewCut / 100));
}

export function applyHeistPlan(S2) {
  const plan = S.heistPlan;
  const entry = HEIST_ENTRIES.find((e) => e.id === plan.entry) || HEIST_ENTRIES[0];
  plan.heat = entry.heat;
  plan.payout = heistPayout(plan);
  plan.locked = true;
  return { heat: entry.heat, payout: plan.payout, entry: entry.id, escape: plan.escape };
}

// Board input: up/down picks a row, left/right changes it, 1-3 toggle crew,
// Enter locks the plan and returns to the game.
export function updateHeistPlanning(S2, dt, pressed) {
  const plan = S.heistPlan;
  plan.row = plan.row || 0;
  if (pressed.has('arrowup') || pressed.has('w')) plan.row = (plan.row + 3) % 4;
  if (pressed.has('arrowdown') || pressed.has('s')) plan.row = (plan.row + 1) % 4;
  const cycle = (list, cur, dir) => list[(list.indexOf(cur) + dir + list.length) % list.length];
  if (pressed.has('arrowleft') || pressed.has('a') || pressed.has('arrowright') || pressed.has('d')) {
    const dir = pressed.has('arrowleft') || pressed.has('a') ? -1 : 1;
    if (plan.row === 0) plan.entry = cycle(HEIST_ENTRIES.map((e) => e.id), plan.entry, dir);
    if (plan.row === 1) plan.escape = cycle(HEIST_ESCAPES.map((e) => e.id), plan.escape, dir);
  }
  if (plan.row === 2) {
    for (let i = 0; i < 3; i++) {
      if (pressed.has(String(i + 1))) {
        const id = HEIST_CREW[i].id;
        plan.crew = plan.crew.includes(id) ? plan.crew.filter((c) => c !== id) : [...plan.crew, id];
      }
    }
  }
  plan.payout = heistPayout(plan);
  plan.heat = (HEIST_ENTRIES.find((e) => e.id === plan.entry) || HEIST_ENTRIES[0]).heat;
  if (pressed.has('enter')) {
    plan.locked = true;
    S.screen = 'game';
    if (S.hooks.onPlanLocked) S.hooks.onPlanLocked({ ...plan });
  }
  void dt;
  void clamp;
}

// The board itself: marina map and routes on the left, the plan on the
// right. Drawn by main.js whenever S.screen is 'heist'.
export function drawHeistPlanning(ctx, S2) {
  const W = CFG.VIEW_W;
  const H = CFG.VIEW_H;
  ctx.fillStyle = 'rgba(8,12,20,0.82)';
  ctx.fillRect(0, 0, W, H);
  ctx.save();
  ctx.translate(46, 46);
  ctx.fillStyle = '#0d2f42';
  ctx.fillRect(0, 0, 560, 708);
  ctx.strokeStyle = '#37b6ff';
  ctx.lineWidth = 3;
  ctx.strokeRect(0, 0, 560, 708);
  // The harbour basin and docks, stylised.
  ctx.fillStyle = '#12507a';
  ctx.fillRect(30, 430, 500, 200);
  ctx.fillStyle = '#a89a7c';
  ctx.fillRect(30, 330, 500, 100);
  ctx.fillStyle = '#74604a';
  for (let i = 0; i < 5; i++) ctx.fillRect(50 + i * 96, 350, 62, 44);
  ctx.fillStyle = '#ffc845';
  ctx.font = 'bold 30px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('VAULT', 280, 300);
  ctx.strokeStyle = '#ffc845';
  ctx.lineWidth = 4;
  ctx.strokeRect(218, 252, 124, 40);
  // Three entry routes.
  const routes = [
    { id: 'dock', pts: [[60, 560], [180, 470], [250, 330]], colour: '#37b6ff', label: 'DOCK' },
    { id: 'roof', pts: [[500, 90], [390, 190], [300, 260]], colour: '#14c8bc', label: 'ROOF' },
    { id: 'front', pts: [[60, 90], [150, 190], [240, 260]], colour: '#e33f4e', label: 'FRONT GATE' },
  ];
  ctx.font = 'bold 24px system-ui, sans-serif';
  for (const r of routes) {
    const active = S.heistPlan.entry === r.id;
    ctx.strokeStyle = r.colour;
    ctx.globalAlpha = active ? 1 : 0.45;
    ctx.lineWidth = active ? 8 : 5;
    ctx.beginPath();
    r.pts.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
    ctx.stroke();
    ctx.fillStyle = r.colour;
    ctx.fillText(r.label, r.pts[0][0] + 44, r.pts[0][1] - 12);
    ctx.globalAlpha = 1;
  }
  ctx.fillStyle = '#dcebf5';
  ctx.font = 'bold 26px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('PUERTO BRISA MARINA', 30, 44);
  ctx.restore();

  // Right: the plan panel.
  const plan = S.heistPlan;
  ctx.save();
  ctx.translate(646, 46);
  ctx.fillStyle = 'rgba(13,18,28,0.94)';
  ctx.fillRect(0, 0, 588, 708);
  ctx.strokeStyle = '#e0218a';
  ctx.lineWidth = 3;
  ctx.strokeRect(0, 0, 588, 708);
  ctx.fillStyle = '#f7f1de';
  ctx.font = 'bold 40px system-ui, sans-serif';
  ctx.fillText('PLAN THE VAULT OF BRISA', 28, 58);
  ctx.font = 'bold 30px system-ui, sans-serif';
  ctx.fillStyle = '#e33f4e';
  ctx.fillText(`HEAT ${plan.heat}★`, 28, 104);
  ctx.fillStyle = '#57d977';
  ctx.textAlign = 'right';
  ctx.fillText(`PAYOUT $${plan.payout.toLocaleString('en-US')}`, 560, 104);
  ctx.textAlign = 'left';
  let y = 160;
  const row = (idx, label) => {
    if ((plan.row || 0) === idx) {
      ctx.fillStyle = 'rgba(224,33,138,0.25)';
      ctx.fillRect(14, y - 34, 560, 48);
    }
    ctx.fillStyle = '#9fb4c8';
    ctx.font = 'bold 24px system-ui, sans-serif';
    ctx.fillText(label, 28, y);
  };
  const entry = HEIST_ENTRIES.find((e) => e.id === plan.entry);
  const escape = HEIST_ESCAPES.find((e) => e.id === plan.escape);
  row(0, 'ENTRY');
  ctx.fillStyle = '#f7f1de';
  ctx.font = 'bold 36px system-ui, sans-serif';
  ctx.fillText(`< ${entry.name} >`, 28, y + 42);
  ctx.font = '22px system-ui, sans-serif';
  ctx.fillStyle = '#c8d4e0';
  ctx.fillText(entry.note, 28, y + 74);
  y += 128;
  row(1, 'ESCAPE');
  ctx.fillStyle = '#f7f1de';
  ctx.font = 'bold 36px system-ui, sans-serif';
  ctx.fillText(`< ${escape.name} >`, 28, y + 42);
  ctx.font = '22px system-ui, sans-serif';
  ctx.fillStyle = '#c8d4e0';
  ctx.fillText(escape.note, 28, y + 74);
  y += 128;
  row(2, 'CREW — keys 1-3 toggle');
  y += 16;
  for (const c of HEIST_CREW) {
    const on = plan.crew.includes(c.id);
    const label = `${on ? '■' : '□'} ${c.name} — ${c.role}`;
    ctx.fillStyle = on ? '#f7f1de' : '#5c6c7d';
    ctx.font = 'bold 28px system-ui, sans-serif';
    ctx.fillText(label, 28, y + 26);
    // The skill bar starts after the name — ROLE text, never on top of
    // it, and the cut percentage follows the bar: text, bar, percent,
    // each in its own space on the row.
    const barX = 28 + ctx.measureText(label).width + 18;
    const barW = Math.max(70, 486 - barX);
    ctx.fillStyle = '#22303f';
    ctx.fillRect(barX, y + 8, barW, 20);
    ctx.fillStyle = on ? '#14c8bc' : '#44586c';
    ctx.fillRect(barX, y + 8, barW * (c.skill / 100), 20);
    ctx.fillStyle = '#9fb4c8';
    ctx.font = '22px system-ui, sans-serif';
    ctx.fillText(`${c.cut}%`, barX + barW + 12, y + 26);
    y += 52;
  }
  y += 26;
  row(3, 'LOCK THE PLAN');
  ctx.fillStyle = '#ffc845';
  ctx.font = 'bold 30px system-ui, sans-serif';
  ctx.fillText('ENTER — LOCK IT IN', 28, y + 42);
  ctx.fillStyle = '#9fb4c8';
  ctx.font = '22px system-ui, sans-serif';
  ctx.fillText('Arrows choose · Enter locks the plan', 28, y + 76);
  ctx.restore();
  void S2;
}
