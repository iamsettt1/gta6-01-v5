// Puerto Brisa — Storm Surge: the renderer — city, water, actors, light.
//
// drawPuertoBrisaWorld() paints one frame in world space: sea, land,
// districts, roads and bridges, buildings and props, then the actors in
// depth order (boats, cars, people, the player, aircraft last so their
// shadows and searchlights sit right), then bullets and particles, then
// the day tint and the storm. Everything off-screen is culled hard — the
// contact sheet only ever shows one viewport of a 6800x4600 world.

import { CFG, S, clamp } from './config.js';
import { drawCar } from './vehicles-cars.js';
import { drawMotorcycle } from './motorcycles.js';
import { drawBoat } from './boats.js';
import { drawHelicopter } from './helicopter.js';
import { drawSeaplane } from './seaplane.js';
import { drawPedestrian } from './pedestrians.js';
import { drawPlayer } from './player-on-foot.js';
import { drawParticles } from './effects-particles.js';
import { drawBullets } from './combat-weapons.js';
import { drawSunShells } from './side-activities.js';
import { drawRaceRings } from './races-league.js';
import { drawStormOverlay } from './storm-weather.js';
import { territoryTintAt, TERRITORY_BLOCKS } from './territory.js';

export function drawPuertoBrisaWorld(ctx, S2) {
  const cam = S.cam;
  const vw = CFG.VIEW_W;
  const vh = CFG.VIEW_H;
  const rx = cam.x + (cam.shake ? (Math.random() - 0.5) * cam.shake : 0);
  const ry = cam.y + (cam.shake ? (Math.random() - 0.5) * cam.shake : 0);
  // Sea first: animated sparkle over a deep teal.
  ctx.fillStyle = '#155e75';
  ctx.fillRect(0, 0, vw, vh);
  ctx.fillStyle = 'rgba(140,220,240,0.25)';
  const sparkleT = Math.floor(S.t * 2);
  for (let i = 0; i < 40; i++) {
    const sx = ((i * 331 + sparkleT * 57) % 1400) - 60;
    const sy = ((i * 197 + sparkleT * 31) % 900) - 50;
    ctx.fillRect(sx, sy, 14, 3);
  }
  ctx.save();
  ctx.translate(-rx, -ry);
  const view = { x: rx - 80, y: ry - 80, w: vw + 160, h: vh + 160 };
  drawLand(ctx, S, view);
  drawRoads(ctx, S, view);
  drawAirstrip(ctx, S);
  drawBuildings(ctx, S, view);
  drawProps(ctx, S, view);
  drawSunShells(ctx, S);
  drawRaceRings(ctx, S);
  // Actors in depth order.
  for (const v of S.vehicles) if (v.kind === 'boat' && inView(v, view)) drawBoat(ctx, v, S);
  for (const v of S.vehicles) if (v.kind === 'car' && inView(v, view)) drawCar(ctx, v);
  for (const v of S.vehicles) if (v.kind === 'bike' && inView(v, view)) drawMotorcycle(ctx, v);
  for (const ped of S.peds) if (inView(ped, view)) drawPedestrian(ctx, ped, S);
  drawTargetMarker(ctx, S);
  drawPlayer(ctx, S);
  for (const v of S.vehicles) if (v.kind === 'heli' && inView(v, view)) drawHelicopter(ctx, v, S);
  for (const v of S.vehicles) if (v.kind === 'plane' && inView(v, view)) drawSeaplane(ctx, v, S);
  drawBullets(ctx, S);
  drawParticles(ctx, S);
  ctx.restore();
  // Light and weather over everything.
  if (S.day.dark > 0.02) {
    ctx.fillStyle = S.day.tint || 'rgba(10,14,40,0.2)';
    ctx.fillRect(0, 0, vw, vh);
    if (S.day.neon) drawNeonGlow(ctx, S, rx, ry);
  }
  drawStormOverlay(ctx, S, S.cam);
}

function inView(e, view) {
  return e.x > view.x - 90 && e.x < view.x + view.w + 90 && e.y > view.y - 90 && e.y < view.y + view.h + 90;
}

function drawLand(ctx, S2, view) {
  // Sand rim, then landmass, then district grounds.
  ctx.fillStyle = '#d9c48f';
  for (const l of S.city.lands) ctx.fillRect(l.x - 16, l.y - 16, l.w + 32, l.h + 32);
  ctx.fillStyle = '#b7a77f';
  for (const l of S.city.lands) ctx.fillRect(l.x, l.y, l.w, l.h);
  for (const d of S.city.districts) {
    ctx.fillStyle = d.ground;
    ctx.fillRect(d.rect.x, d.rect.y, d.rect.w, d.rect.h);
  }
  // Territory washes over the Mirador blocks.
  for (const b of TERRITORY_BLOCKS) {
    ctx.fillStyle = territoryTintAt(S, b.rect.x + 4, b.rect.y + 4) || 'rgba(0,0,0,0)';
    ctx.fillRect(b.rect.x, b.rect.y, b.rect.w, b.rect.h);
  }
  // Water cuts (harbour basin, cove, channel) back over the land.
  ctx.fillStyle = '#155e75';
  for (const w of S.city.waters) {
    if (w.w >= CFG.WORLD_W && w.y === 0) continue; // the open sea is the background
    ctx.fillRect(w.x, w.y, w.w, w.h);
  }
  void view;
}

function drawRoads(ctx, S2, view) {
  ctx.fillStyle = '#4c4c52';
  for (const r of S.city.roads) {
    if (r.x + r.w < view.x || r.x > view.x + view.w || r.y + r.h < view.y || r.y > view.y + view.h) continue;
    ctx.fillRect(r.x, r.y, r.w, r.h);
  }
  // Lane dashes.
  ctx.fillStyle = 'rgba(240,240,230,0.55)';
  for (const r of S.city.roads) {
    if (r.dir === 'h') {
      for (let x = r.x + 18; x < r.x + r.w - 20; x += 52) ctx.fillRect(x, r.y + r.h / 2 - 2, 26, 4);
    } else {
      for (let y = r.y + 18; y < r.y + r.h - 20; y += 52) ctx.fillRect(r.x + r.w / 2 - 2, y, 4, 26);
    }
  }
  // Bridges: pale decks with rails over the channel.
  for (const b of S.city.bridges) {
    ctx.fillStyle = '#8d8578';
    ctx.fillRect(b.x, b.y - 8, b.w, b.h + 16);
    ctx.fillStyle = '#6e675c';
    ctx.fillRect(b.x, b.y - 8, b.w, 7);
    ctx.fillRect(b.x, b.y + b.h + 1, b.w, 7);
  }
  // Docks: wooden piers into the basin.
  ctx.fillStyle = '#8a6f4d';
  for (const d of S.city.docks) ctx.fillRect(d.x - 42, d.y, 84, 16);
}

function drawAirstrip(ctx, S2) {
  const a = S.city.airstrip;
  if (!a) return;
  ctx.fillStyle = '#3f3f45';
  ctx.fillRect(a.x, a.y, a.w, a.h);
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  for (let x = a.x + 30; x < a.x + a.w - 40; x += 70) ctx.fillRect(x, a.y + a.h / 2 - 3, 38, 6);
  ctx.fillStyle = '#ffc845';
  ctx.font = 'bold 30px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('PISTA BRISA', a.x + 18, a.y + 36);
  // Helipad.
  ctx.strokeStyle = '#f2f2f2';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(a.helipad.x, a.helipad.y, a.helipad.r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#f2f2f2';
  ctx.font = 'bold 44px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('H', a.helipad.x, a.helipad.y + 15);
}

function drawBuildings(ctx, S2, view) {
  for (const b of S.city.buildings) {
    if (b.x + b.w < view.x || b.x > view.x + view.w || b.y + b.h < view.y || b.y > view.y + view.h) continue;
    ctx.fillStyle = 'rgba(20,16,10,0.3)';
    ctx.fillRect(b.x + 7, b.y + 9, b.w, b.h);
    ctx.fillStyle = '#6e6257';
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.fillStyle = b.roof;
    ctx.fillRect(b.x + 4, b.y + 4, b.w - 8, b.h - 8);
    ctx.fillStyle = 'rgba(255,255,255,0.13)';
    ctx.fillRect(b.x + 10, b.y + 10, b.w - 20, 10);
    if (b.floors >= 4) {
      ctx.fillStyle = 'rgba(20,30,44,0.35)';
      ctx.fillRect(b.x + b.w * 0.3, b.y + b.h * 0.3, b.w * 0.4, b.h * 0.4);
    }
  }
}

function drawProps(ctx, S2, view) {
  for (const p of S.city.props) {
    if (p.x < view.x || p.x > view.x + view.w || p.y < view.y || p.y > view.y + view.h) continue;
    if (p.kind === 'palm') {
      ctx.fillStyle = '#7a5c38';
      ctx.fillRect(p.x - 3, p.y - 4, 6, 16);
      ctx.strokeStyle = '#3f9e4d';
      ctx.lineWidth = 5;
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2 + p.angle;
        ctx.moveTo(p.x, p.y - 4);
        ctx.lineTo(p.x + Math.cos(a) * 24, p.y - 10 + Math.sin(a) * 10);
      }
      ctx.stroke();
    } else if (p.kind === 'lamp') {
      ctx.fillStyle = '#39424e';
      ctx.fillRect(p.x - 2, p.y - 14, 4, 18);
      ctx.fillStyle = S.day.neon ? '#ffd76a' : '#e8e4da';
      ctx.beginPath();
      ctx.arc(p.x, p.y - 16, 5, 0, Math.PI * 2);
      ctx.fill();
    } else if (p.kind === 'crate' || p.kind === 'barrel') {
      ctx.fillStyle = p.kind === 'crate' ? '#9c7a4a' : '#5d6e5a';
      ctx.fillRect(p.x - 11, p.y - 11, 22, 22);
      ctx.strokeStyle = 'rgba(0,0,0,0.3)';
      ctx.lineWidth = 2;
      ctx.strokeRect(p.x - 11, p.y - 11, 22, 22);
    } else if (p.kind === 'container') {
      ctx.fillStyle = p.colour;
      ctx.fillRect(p.x - 34, p.y - 14, 68, 28);
      ctx.strokeStyle = 'rgba(0,0,0,0.35)';
      ctx.strokeRect(p.x - 34, p.y - 14, 68, 28);
    } else if (p.kind === 'stall' || p.kind === 'bench') {
      ctx.fillStyle = p.colour;
      ctx.fillRect(p.x - 16, p.y - 8, 32, 16);
    } else if (p.kind === 'crane') {
      ctx.strokeStyle = p.colour;
      ctx.lineWidth = 9;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y + 60);
      ctx.lineTo(p.x, p.y - 90);
      ctx.lineTo(p.x + 130, p.y - 90);
      ctx.stroke();
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(p.x + 110, p.y - 90);
      ctx.lineTo(p.x + 110, p.y - 40);
      ctx.stroke();
    } else if (p.kind === 'lighthouse') {
      ctx.fillStyle = '#f2ead8';
      ctx.beginPath();
      ctx.moveTo(p.x - 16, p.y + 30);
      ctx.lineTo(p.x - 9, p.y - 44);
      ctx.lineTo(p.x + 9, p.y - 44);
      ctx.lineTo(p.x + 16, p.y + 30);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#e33f4e';
      ctx.fillRect(p.x - 12, p.y - 8, 24, 12);
      ctx.fillStyle = '#ffc845';
      ctx.beginPath();
      ctx.arc(p.x, p.y - 50, 8, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // District corner signs.
  ctx.font = 'bold 21px system-ui, sans-serif';
  ctx.textAlign = 'left';
  for (const s of S.city.signs) {
    if (s.x < view.x || s.x > view.x + view.w) continue;
    ctx.fillStyle = 'rgba(13,18,28,0.85)';
    const wText = ctx.measureText(s.text).width + 18;
    ctx.fillRect(s.x, s.y, wText, 30);
    ctx.fillStyle = s.accent;
    ctx.fillText(s.text, s.x + 9, s.y + 22);
  }
}

// The bounty target gets a name plate and health bar wherever he runs.
function drawTargetMarker(ctx, S2) {
  for (const ped of S.peds) {
    if (ped.role !== 'target' || ped.health <= 0) continue;
    ctx.save();
    ctx.strokeStyle = '#ffd23e';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(ped.x, ped.y, 22 + Math.sin(S.t * 5) * 3, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = 'rgba(13,18,28,0.88)';
    const label = ped.name || 'TARGET';
    ctx.font = 'bold 22px system-ui, sans-serif';
    const w = ctx.measureText(label).width + 16;
    ctx.fillRect(ped.x - w / 2, ped.y - 58, w, 28);
    ctx.fillStyle = '#ffd23e';
    ctx.textAlign = 'center';
    ctx.fillText(label, ped.x, ped.y - 36);
    ctx.fillStyle = '#3a3f47';
    ctx.fillRect(ped.x - 30, ped.y - 28, 60, 7);
    ctx.fillStyle = '#57d977';
    ctx.fillRect(ped.x - 30, ped.y - 28, 60 * clamp(ped.health / 100, 0, 1), 7);
    ctx.restore();
  }
}

function drawNeonGlow(ctx, S2, rx, ry) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const d of S.city.districts) {
    if (d.name !== 'Barrio Iris' && d.name !== 'Avenida Coral') continue;
    for (let i = 0; i < 7; i++) {
      const bx = d.rect.x + ((i * 613) % d.rect.w);
      const by = d.rect.y + ((i * 389) % d.rect.h);
      const sx = bx - rx;
      const sy = by - ry;
      if (sx < -80 || sy < -80 || sx > CFG.VIEW_W + 80 || sy > CFG.VIEW_H + 80) continue;
      const grad = ctx.createRadialGradient(sx, sy, 4, sx, sy, 74);
      grad.addColorStop(0, 'rgba(255,79,216,0.20)');
      grad.addColorStop(1, 'rgba(255,79,216,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(sx - 74, sy - 74, 148, 148);
    }
  }
  ctx.restore();
}
