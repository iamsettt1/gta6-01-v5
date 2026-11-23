// Puerto Brisa — Storm Surge: Rosa's phone — contacts, objectives, bribes.
//
// P opens it. The contacts are the game's living threads: Tomás with the
// next objective, Pilar with the league, Bruno with the export list, and
// one unnamed number that will make a wanted level go away — once per
// heat, for cash.

import { S, CFG } from './config.js';
import { clearWanted } from './police-pursuit.js';
import { showMessage } from './player-on-foot.js';
import { nextMissionId, missionDefinition, GIVERS } from './missions-story.js';

export function openFixerPhone(S2) {
  S.screen = 'phone';
  S.phone.open = true;
  return S.phone;
}

export function phoneContacts(S2) {
  const nextId = nextMissionId();
  const next = nextId ? missionDefinition(nextId) : null;
  const contacts = [
    {
      name: 'Tomás Ibarra — Fixer',
      line: next ? `Next: "${next.title}" — see ${GIVERS[next.giver].name}. $${next.cash} on the table.` : 'Every job is done, Rosa. The city is yours.',
    },
    {
      name: 'Pilar Duarte — Club Iris',
      line: `League races won: ${S.progress.racesWon}/6. The Street Crown opens the season.`,
    },
    {
      name: 'Bruno Serra — Exports',
      line: `Export list: ${S.progress.exports}/6 delivered to Zona Libre.`,
    },
    {
      name: 'Unknown Number',
      line: S.wanted.stars > 0
        ? (S.wanted.bribeUsed ? 'Already paid this heat. Do not call again.' : `Make ${S.wanted.stars} stars vanish: $${S.wanted.stars * 500}. Press B.`)
        : 'No heat, no charge. We will speak when you are warm.',
    },
  ];
  return contacts;
}

export function updatePhone(S2, dt, pressed) {
  if (pressed.has('b') && S.wanted.stars > 0 && !S.wanted.bribeUsed) {
    const cost = S.wanted.stars * 500;
    if (S.progress.cash >= cost) {
      S.progress.cash -= cost;
      clearWanted(S, 'bribe');
      S.wanted.bribeUsed = true;
      showMessage(S, `The heat is gone. $${cost} well spent.`);
      S.screen = 'game';
      S.phone.open = false;
    } else {
      showMessage(S, `The number wants $${cost}. You do not have it.`);
    }
  }
  if (pressed.has('p') || pressed.has('escape')) {
    S.screen = 'game';
    S.phone.open = false;
  }
  void dt;
}

export function drawPhone(ctx, S2) {
  const W = CFG.VIEW_W;
  const H = CFG.VIEW_H;
  ctx.fillStyle = 'rgba(8,12,20,0.6)';
  ctx.fillRect(0, 0, W, H);
  const x = W - 470;
  const y = 90;
  const w = 400;
  const h = 620;
  ctx.fillStyle = '#12161f';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = '#3a4656';
  ctx.lineWidth = 4;
  ctx.strokeRect(x, y, w, h);
  ctx.fillStyle = '#14c8bc';
  ctx.fillRect(x, y, w, 74);
  ctx.fillStyle = '#10151d';
  ctx.font = 'bold 32px system-ui, sans-serif';
  ctx.fillText('ROSA — PHONE', x + 22, y + 48);
  let cy = y + 128;
  for (const c of phoneContacts(S)) {
    ctx.fillStyle = '#f7f1de';
    ctx.font = 'bold 25px system-ui, sans-serif';
    wrapText(ctx, c.name, x + 22, cy, w - 44, 30);
    cy += 32;
    ctx.fillStyle = '#9fb4c8';
    ctx.font = '22px system-ui, sans-serif';
    cy += wrapText(ctx, c.line, x + 22, cy, w - 44, 27);
    cy += 30;
  }
  ctx.fillStyle = '#5c6c7d';
  ctx.font = '21px system-ui, sans-serif';
  ctx.fillText('P or Esc — put it away', x + 22, y + h - 24);
  void S2;
}

// Word-wrapping helper shared by the phone and briefing cards.
export function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(' ');
  let line = '';
  let lines = 0;
  for (const word of words) {
    const test = line ? line + ' ' + word : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, y + lines * lineHeight);
      line = word;
      lines += 1;
    } else {
      line = test;
    }
  }
  if (line) {
    ctx.fillText(line, x, y + lines * lineHeight);
    lines += 1;
  }
  return lines * lineHeight;
}
