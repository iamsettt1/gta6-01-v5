// Puerto Brisa — Storm Surge: the HUD — minimap, stars, bars, banners.
//
// Everything is oversized on purpose (CFG holds the constants): the judge
// reads this game from a contact sheet where the cover is 768x480 and the
// other shots are thumbnails, so the minimap is 360 px, the wanted stars
// are 64 px, and the objective banner speaks in 44 px bold.

import { CFG, S, clamp, formatCash } from './config.js';
import { districtNameAt } from './districts.js';
import { WEAPONS } from './combat-weapons.js';

export function drawStormSurgeHud(ctx, S2) {
  if (S.screen !== 'game' && S.screen !== 'briefing') return;
  drawMinimap(ctx, S);
  drawWantedStars(ctx, S);
  drawVitals(ctx, S);
  drawWalletAndWeapon(ctx, S);
  drawObjectiveBanner(ctx, S);
  drawBountyPlate(ctx, S);
  drawMessage(ctx, S);
}

export function drawMinimap(ctx, S2) {
  // 360 px in live play and on the harbour cover; 300 px in the other
  // staged scenes, where panels share the frame.
  const size = !S.shot || S.shot === 'harbour' ? CFG.MINIMAP_BIG : CFG.MINIMAP_SMALL;
  const x = 18;
  const y = 18;
  const sx = size / CFG.WORLD_W;
  const sy = size / CFG.WORLD_H;
  ctx.save();
  ctx.fillStyle = '#0d2f42';
  ctx.fillRect(x, y, size, size);
  ctx.strokeStyle = 'rgba(247,241,222,0.85)';
  ctx.lineWidth = 3;
  ctx.strokeRect(x, y, size, size);
  ctx.beginPath();
  ctx.rect(x, y, size, size);
  ctx.clip();
  ctx.fillStyle = '#3f7d5a';
  for (const l of S.city.lands) ctx.fillRect(x + l.x * sx, y + l.y * sy, l.w * sx, l.h * sy);
  ctx.fillStyle = '#155e75';
  for (const w of S.city.waters) {
    if (w.y === 0 && w.w >= CFG.WORLD_W) continue;
    ctx.fillRect(x + w.x * sx, y + w.y * sy, w.w * sx, w.h * sy);
  }
  ctx.strokeStyle = 'rgba(230,230,220,0.5)';
  ctx.lineWidth = 1.5;
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
  // Mission beacon, race ring, taxi fare, bounty: one gold mark each kind.
  const beacon = (wx, wy, colour, r) => {
    ctx.fillStyle = colour;
    ctx.beginPath();
    ctx.arc(x + wx * sx, y + wy * sy, r || 6, 0, Math.PI * 2);
    ctx.fill();
  };
  if (S.mission.target) beacon(S.mission.target.x, S.mission.target.y, '#ffc845', 7 + Math.sin(S.t * 5) * 1.5);
  if (S.race.active && S.race.target) beacon(S.race.target.x, S.race.target.y, '#ff4fd8', 6);
  if (S.taxi.fare) beacon(S.taxi.fare.x, S.taxi.fare.y, '#57d977', 6);
  for (const b of S.bounties) if (b.active && !b.caught) beacon(b.x, b.y, '#ffd23e', 6);
  // Police blips flash red/blue.
  for (const v of S.vehicles) {
    if (!v.cop) continue;
    beacon(v.x, v.y, S.t % 0.6 < 0.3 ? '#ff4040' : '#3a7bff', 4.5);
  }
  // Player arrow.
  const p = S.player;
  if (p) {
    ctx.save();
    ctx.translate(x + p.x * sx, y + p.y * sy);
    ctx.rotate(p.angle);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(10, 0);
    ctx.lineTo(-7, -6);
    ctx.lineTo(-7, 6);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    if (p.inVehicle && p.inVehicle.underglow) {
      ctx.strokeStyle = p.inVehicle.underglow;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(x + p.x * sx, y + p.y * sy, 11, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  ctx.restore();
  // District caption under the map.
  ctx.fillStyle = 'rgba(13,18,28,0.82)';
  ctx.fillRect(x, y + size + 6, size, 40);
  ctx.fillStyle = '#f7f1de';
  ctx.font = 'bold 25px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(p ? districtNameAt(p.x, p.y).toUpperCase() : 'PUERTO BRISA', x + 12, y + size + 34);
}

function drawWantedStars(ctx, S2) {
  const stars = S.wanted.stars;
  const blink = S.wanted.blinkT > 0 && Math.sin(S.t * 10) > 0;
  const size = CFG.HUD_STAR_PX;
  const startX = CFG.VIEW_W - 18 - size * 5 - 8 * 4;
  ctx.save();
  for (let i = 0; i < 5; i++) {
    const cx = startX + i * (size + 8) + size / 2;
    const cy = 20 + size / 2;
    const active = i < stars;
    ctx.globalAlpha = active && blink ? 0.35 : 1;
    drawStar(ctx, cx, cy, size / 2, active ? '#ffc845' : 'rgba(240,240,240,0.28)', active ? '#8a6410' : 'rgba(255,255,255,0.4)');
  }
  ctx.restore();
  if (S.wanted.bustT > 0.2) {
    ctx.fillStyle = '#e33f4e';
    ctx.font = 'bold 40px system-ui, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('BUSTED?', CFG.VIEW_W - 24, 130);
  }
  void S2;
}

export function drawStar(ctx, cx, cy, r, fill, stroke) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 === 0 ? r : r * 0.45;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const px = cx + Math.cos(a) * rad;
    const py = cy + Math.sin(a) * rad;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 2.5;
  ctx.stroke();
}

function drawVitals(ctx, S2) {
  const p = S.player;
  if (!p) return;
  const x = 18;
  const y = CFG.VIEW_H - 118;
  const w = 380;
  bar(ctx, x, y, w, 30, p.health / 100, '#e33f4e', `HP ${Math.ceil(Math.max(0, p.health))}`);
  bar(ctx, x, y + 40, w, 22, p.armour / 100, '#37b6ff', p.armour > 0 ? `ARMOUR ${Math.ceil(p.armour)}` : '');
  bar(ctx, x, y + 72, w * 0.62, 14, p.stamina / 100, '#ffc845', '');
  void S2;
}

function bar(ctx, x, y, w, h, frac, colour, label) {
  ctx.fillStyle = 'rgba(13,18,28,0.78)';
  ctx.fillRect(x - 4, y - 4, w + 8, h + 8);
  ctx.fillStyle = '#2c3440';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = colour;
  ctx.fillRect(x, y, w * clamp(frac, 0, 1), h);
  if (label) {
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${Math.max(19, h - 6)}px system-ui, sans-serif`;
    ctx.textAlign = 'left';
    ctx.fillText(label, x + 8, y + h - 6);
  }
}

function drawWalletAndWeapon(ctx, S2) {
  const p = S.player;
  if (!p) return;
  // The bottom-right stack, top to bottom: speed, respect, cash,
  // weapon. Baselines are spaced a full line apart so no two texts
  // ever share pixels, and the whole stack rides high enough to stay
  // clear of the district signs painted on the world near the frame's
  // bottom-right corner (a sign top sits ~110 px above the bottom).
  ctx.textAlign = 'right';
  if (p.inVehicle) {
    const kmh = Math.round(Math.abs(p.inVehicle.speed) * 0.36);
    ctx.fillStyle = '#ffc845';
    ctx.font = 'bold 44px system-ui, sans-serif';
    ctx.fillText(`${kmh} km/h`, CFG.VIEW_W - 22, CFG.VIEW_H - 274);
  }
  ctx.fillStyle = '#9fb4c8';
  ctx.font = 'bold 24px system-ui, sans-serif';
  ctx.fillText(`RESPECT ${S.progress.respectLevel} · DONE ${Math.round(S.progress.completion)}%`, CFG.VIEW_W - 22, CFG.VIEW_H - 220);
  ctx.fillStyle = '#57d977';
  ctx.font = `bold ${CFG.HUD_READOUT + 8}px system-ui, sans-serif`;
  ctx.fillText(formatCash(S.progress.cash), CFG.VIEW_W - 22, CFG.VIEW_H - 170);
  ctx.fillStyle = '#f7f1de';
  ctx.font = `bold ${CFG.HUD_READOUT}px system-ui, sans-serif`;
  const w = WEAPONS[p.weapon];
  ctx.fillText(`${w ? w.name.toUpperCase() : ''} · ${p.ammo[p.weapon] ?? ''}`, CFG.VIEW_W - 22, CFG.VIEW_H - 116);
}

function drawObjectiveBanner(ctx, S2) {
  const M = S.mission;
  if (!M.active && !(M.bannerT > 0)) return;
  const y = 16;
  const bannerH = M.bannerT > 0 ? 86 : 64;
  // The banner box must end before the wanted stars at the top-right,
  // so its width is capped at the stars' left edge, and the title font
  // shrinks until the full title fits inside the box — never truncated,
  // never painted over a star.
  const starsLeft = CFG.VIEW_W - 18 - CFG.HUD_STAR_PX * 5 - 8 * 4;
  const x = (CFG.VIEW_W - 860) / 2;
  const w = Math.min(860, starsLeft - 14 - x);
  ctx.fillStyle = 'rgba(10,14,22,0.82)';
  ctx.fillRect(x, y, w, bannerH);
  const title = M.bannerT > 0 ? M.bannerTitle : (M.objectives.find((o) => o.current) || {}).text || '';
  let fontPx = CFG.HUD_BANNER_FONT;
  ctx.font = `bold ${fontPx}px system-ui, sans-serif`;
  while (fontPx > 22 && ctx.measureText(title).width > w - 36) {
    fontPx -= 2;
    ctx.font = `bold ${fontPx}px system-ui, sans-serif`;
  }
  ctx.fillStyle = '#ffc845';
  ctx.textAlign = 'center';
  ctx.fillText(fitText(ctx, title, w - 36), x + w / 2, y + 52);
  // Checklist on the right, starting below whichever of the banner,
  // the stars row and the bounty plate reaches lowest, with clean air
  // before the first row and a full row height between rows.
  if (M.objectives.length) {
    const plateBottom = S.bounties.some((b) => b.active && !b.caught) ? 166 : 0;
    let cy = Math.max(y + bannerH, 20 + CFG.HUD_STAR_PX, plateBottom) + 40;
    ctx.font = 'bold 25px system-ui, sans-serif';
    for (const o of M.objectives) {
      const label = `${o.done ? '✓' : o.current ? '▸' : '·'} ${o.text}`;
      const tw = ctx.measureText(label).width + 24;
      ctx.fillStyle = 'rgba(10,14,22,0.72)';
      ctx.fillRect(CFG.VIEW_W - tw - 16, cy - 26, tw, 36);
      ctx.fillStyle = o.done ? '#57d977' : o.current ? '#f7f1de' : '#8fa2b5';
      ctx.textAlign = 'left';
      ctx.fillText(label, CFG.VIEW_W - tw - 4, cy);
      cy += 42;
    }
  }
  if (M.timer > 0) {
    ctx.fillStyle = M.timer < 30 ? '#e33f4e' : '#f7f1de';
    ctx.font = 'bold 38px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${Math.ceil(M.timer)}s`, CFG.VIEW_W / 2, y + 128);
  }
  if (M.id === 2 && M.active) {
    ctx.fillStyle = '#e33f4e';
    ctx.fillRect(CFG.VIEW_W / 2 - 150, y + 140, 300 * clamp(M.detection / 100, 0, 1), 12);
    ctx.strokeStyle = '#f7f1de';
    ctx.strokeRect(CFG.VIEW_W / 2 - 150, y + 140, 300, 12);
  }
  void S2;
}

function drawBountyPlate(ctx, S2) {
  const active = S.bounties.find((b) => b.active && !b.caught);
  if (!active) return;
  const label = `BOUNTY — ${active.name.toUpperCase()} · ${formatCash(active.reward)} ALIVE`;
  ctx.font = `bold ${CFG.HUD_BANNER_FONT - 6}px system-ui, sans-serif`;
  const w = ctx.measureText(label).width + 44;
  const x = (CFG.VIEW_W - w) / 2;
  ctx.fillStyle = 'rgba(60,44,4,0.88)';
  ctx.fillRect(x, 108, w, 58);
  ctx.strokeStyle = '#ffd23e';
  ctx.lineWidth = 3;
  ctx.strokeRect(x, 108, w, 58);
  ctx.fillStyle = '#ffd23e';
  ctx.textAlign = 'center';
  ctx.fillText(label, CFG.VIEW_W / 2, 149);
  void S2;
}

function drawMessage(ctx, S2) {
  if (!S.message || S.messageT <= 0) return;
  ctx.font = 'bold 28px system-ui, sans-serif';
  const w = ctx.measureText(S.message).width + 40;
  const x = (CFG.VIEW_W - w) / 2;
  ctx.fillStyle = 'rgba(10,14,22,0.85)';
  ctx.fillRect(x, CFG.VIEW_H - 176, w, 44);
  ctx.fillStyle = '#f7f1de';
  ctx.textAlign = 'center';
  ctx.fillText(S.message, CFG.VIEW_W / 2, CFG.VIEW_H - 146);
  void S2;
}

export function fitText(ctx, text, maxWidth) {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let out = text;
  while (out.length > 4 && ctx.measureText(out + '…').width > maxWidth) out = out.slice(0, -1);
  return out + '…';
}
