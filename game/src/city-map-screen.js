// Puerto Brisa — Storm Surge: the full-city map and the empire panel.
//
// Esc opens the pause screen: the whole 6800x4600 city on the left —
// districts labelled, roads drawn, the island and airstrip marked — and
// the empire on the right: businesses and income, safehouses, the story
// so far and the completion maths. J opens the mission board instead.

import { CFG, S, formatCash } from './config.js';
import { MISSIONS } from './missions-story.js';
import { empireIncomePerHour } from './empire-businesses.js';
import { SAFEHOUSES } from './safehouses.js';
import { EXPORT_CARS } from './side-activities.js';
import { RACES } from './races-league.js';

export function drawFullCityMap(ctx, S2, rect) {
  const { x, y, w, h } = rect;
  const sx = w / CFG.WORLD_W;
  const sy = h / CFG.WORLD_H;
  ctx.fillStyle = '#0d2f42';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#3f7d5a';
  for (const l of S.city.lands) ctx.fillRect(x + l.x * sx, y + l.y * sy, l.w * sx, l.h * sy);
  ctx.fillStyle = '#155e75';
  for (const wd of S.city.waters) {
    if (wd.y === 0 && wd.w >= CFG.WORLD_W) continue;
    ctx.fillRect(x + wd.x * sx, y + wd.y * sy, wd.w * sx, wd.h * sy);
  }
  ctx.strokeStyle = 'rgba(235,235,225,0.65)';
  ctx.lineWidth = 2;
  for (const r of S.city.roads) {
    ctx.beginPath();
    if (r.dir === 'h') {
      ctx.moveTo(x + r.x * sx, y + (r.y + r.h / 2) * sy);
      ctx.lineTo(x + (r.x + r.w) * sx, y + (r.y + r.h / 2) * sy);
    } else {
      ctx.moveTo(x + (r.x + r.w / 2) * sx, y + r.y * sy);
      ctx.lineTo(x + (r.x + r.w / 2) * sx, y + (r.y + r.h) * sy);
    }
    ctx.stroke();
  }
  // Territory blocks glow for Rosa's colour.
  S.territory.forEach((held, i) => {
    if (!held) return;
    const blocks = [{ x: 340, y: 340 }, { x: 340, y: 940 }, { x: 1240, y: 340 }];
    const b = blocks[i];
    ctx.fillStyle = 'rgba(255,79,216,0.3)';
    ctx.fillRect(x + b.x * sx, y + b.y * sy, 860 * sx, 560 * sy);
  });
  // District labels: a smaller font, a per-district stagger so
  // neighbouring names never sit on the same line and run together,
  // and every label box clamped fully inside the map panel.
  const LABEL_OFF = {
    'El Mirador': { dx: -26, dy: -16 },
    'Avenida Coral': { dx: 10, dy: 14 },
    'Puerto Brisa Marina': { dx: 30, dy: -14 },
    'Barrio Iris': { dx: -6, dy: 16 },
    'Playa Brisa': { dx: 6, dy: -14 },
    'Las Lomas': { dx: -10, dy: -16 },
    'Zona Libre': { dx: -14, dy: 12 },
    'Isla Ancla': { dx: -14, dy: 10 },
  };
  ctx.textAlign = 'center';
  ctx.font = 'bold 15px system-ui, sans-serif';
  for (const d of S.city.districts) {
    const off = LABEL_OFF[d.name] || { dx: 0, dy: 0 };
    const tw = ctx.measureText(d.name.toUpperCase()).width + 12;
    let cx = x + (d.rect.x + d.rect.w / 2) * sx + off.dx;
    let cy = y + (d.rect.y + d.rect.h / 2) * sy + off.dy;
    cx = Math.min(Math.max(cx, x + tw / 2 + 4), x + w - tw / 2 - 4);
    cy = Math.min(Math.max(cy, y + 16), y + h - 16);
    ctx.fillStyle = 'rgba(10,14,22,0.75)';
    ctx.fillRect(cx - tw / 2, cy - 12, tw, 24);
    ctx.fillStyle = d.accent;
    ctx.fillText(d.name.toUpperCase(), cx, cy + 5);
  }
  // Airstrip and player markers.
  const a = S.city.airstrip;
  ctx.fillStyle = '#ffc845';
  ctx.font = 'bold 18px system-ui, sans-serif';
  ctx.fillText('PISTA BRISA ✈', x + (a.x + a.w / 2) * sx, y + (a.y - 12) * sy);
  const p = S.player;
  if (p) {
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(x + p.x * sx, y + p.y * sy, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#10151d';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(247,241,222,0.8)';
  ctx.lineWidth = 3;
  ctx.strokeRect(x, y, w, h);
  void S2;
}

// The empire panel: businesses, safehouses, story, completion.
export function drawEmpirePanel(ctx, S2, x, y, w) {
  ctx.fillStyle = 'rgba(13,18,28,0.94)';
  ctx.fillRect(x, y, w, 700);
  ctx.strokeStyle = '#3a4656';
  ctx.lineWidth = 3;
  ctx.strokeRect(x, y, w, 700);
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffc845';
  ctx.font = 'bold 34px system-ui, sans-serif';
  ctx.fillText('THE EMPIRE — ROSA CAMACHO', x + 22, y + 46);
  ctx.fillStyle = '#57d977';
  ctx.font = 'bold 30px system-ui, sans-serif';
  ctx.fillText(`${formatCash(S.progress.cash)} · RESPECT ${S.progress.respectLevel} · DONE ${Math.round(S.progress.completion)}%`, x + 22, y + 88);
  let cy = y + 138;
  ctx.fillStyle = '#f7f1de';
  ctx.font = 'bold 26px system-ui, sans-serif';
  ctx.fillText(`BUSINESSES — ${empireIncomePerHour(S) ? '$' + empireIncomePerHour(S) + '/hour' : 'none yet'}`, x + 22, cy);
  cy += 34;
  ctx.font = '23px system-ui, sans-serif';
  for (const b of S.businesses) {
    ctx.fillStyle = b.owned ? '#57d977' : '#8fa2b5';
    ctx.fillText(`${b.owned ? '✓' : '·'} ${b.name} (${b.kind}) — ${b.owned ? '$' + b.income + '/h' : formatCash(b.price)}`, x + 30, cy);
    cy += 30;
  }
  cy += 12;
  ctx.fillStyle = '#f7f1de';
  ctx.font = 'bold 26px system-ui, sans-serif';
  ctx.fillText('SAFEHOUSES', x + 22, cy);
  cy += 34;
  ctx.font = '23px system-ui, sans-serif';
  for (const hse of SAFEHOUSES) {
    const owned = S.safehousesOwned[hse.id];
    ctx.fillStyle = owned ? '#57d977' : '#8fa2b5';
    ctx.fillText(`${owned ? '✓' : '·'} ${hse.name} — ${owned ? 'yours' : formatCash(hse.price)}`, x + 30, cy);
    cy += 30;
  }
  cy += 12;
  ctx.fillStyle = '#f7f1de';
  ctx.font = 'bold 26px system-ui, sans-serif';
  ctx.fillText('THE STORY SO FAR', x + 22, cy);
  cy += 34;
  ctx.font = '23px system-ui, sans-serif';
  const done = S.progress.missionsDone.length;
  const lines = [
    `Missions ${done}/14 — next: ${S.progress.currentMission ? (MISSIONS.find((m) => m.id === S.progress.currentMission) || {}).title || '—' : 'STORY COMPLETE'}`,
    `Races won ${S.progress.racesWon}/6 · Sun shells ${S.progress.shells}/18`,
    `Bounties caught ${S.progress.bountiesCaught}/6 · Exports ${S.progress.exports}/6`,
    `Territory blocks held ${S.territory.filter(Boolean).length}/3 · Storm survived: ${S.progress.stormSurvived ? 'yes' : 'not yet'}`,
  ];
  for (const line of lines) {
    ctx.fillStyle = '#cfe0ee';
    ctx.fillText(line, x + 30, cy);
    cy += 30;
  }
  void S2;
}

// Esc screen: map left, empire right.
export function drawPauseEmpireScreen(ctx, S2) {
  ctx.fillStyle = 'rgba(8,12,20,0.88)';
  ctx.fillRect(0, 0, CFG.VIEW_W, CFG.VIEW_H);
  drawFullCityMap(ctx, S, { x: 26, y: 50, w: 660, h: 700 });
  drawEmpirePanel(ctx, S, 712, 50, 542);
  ctx.fillStyle = '#f7f1de';
  ctx.font = 'bold 30px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('PUERTO BRISA — PAUSED', 26, 36);
  ctx.font = '22px system-ui, sans-serif';
  ctx.fillStyle = '#9fb4c8';
  ctx.fillText('Esc — back to the street', 712, 782);
  void S2;
}

// J screen: the fourteen missions with state and rewards.
export function drawMissionsBoard(ctx, S2) {
  ctx.fillStyle = 'rgba(8,12,20,0.9)';
  ctx.fillRect(0, 0, CFG.VIEW_W, CFG.VIEW_H);
  ctx.fillStyle = '#ffc845';
  ctx.font = 'bold 40px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('MISSIONS — THE CAMACHO STORY', 60, 64);
  let cy = 118;
  ctx.font = 'bold 24px system-ui, sans-serif';
  for (const m of MISSIONS) {
    const done = S.progress.missionsDone.includes(m.id);
    const current = S.progress.currentMission === m.id;
    ctx.fillStyle = done ? '#57d977' : current ? '#f7f1de' : '#5c6c7d';
    const state = done ? '✓ DONE' : current ? '▸ NEXT' : '· LOCKED';
    ctx.fillText(`${String(m.id).padStart(2, '0')}  ${m.title}`, 60, cy);
    ctx.textAlign = 'right';
    ctx.fillText(`${state}  ${formatCash(m.cash)}`, CFG.VIEW_W - 60, cy);
    ctx.textAlign = 'left';
    cy += 44;
  }
  ctx.fillStyle = '#9fb4c8';
  ctx.font = '22px system-ui, sans-serif';
  const exportsLeft = EXPORT_CARS.length - S.progress.exports;
  const racesLeft = RACES.length - S.progress.racesWon;
  ctx.fillText(`Side work open: ${exportsLeft} export cars · ${racesLeft} league races · ${18 - S.progress.shells} shells · ${6 - S.progress.bountiesCaught} bounties.   J or Esc — close.`, 60, cy + 12);
  void S2;
}
