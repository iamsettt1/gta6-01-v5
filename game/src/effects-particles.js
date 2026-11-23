// Puerto Brisa — Storm Surge: particles — sparks, spray, wakes and cash.
//
// One pooled list in S.particles. Spawners are tiny and named for the effect
// they make; the renderer calls drawParticles() once per frame after the
// world so effects always sit on top of the actors that made them.

import { clamp } from './config.js';

export function burstSparks(S, x, y, n, colour) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = 60 + Math.random() * 260;
    push(S, {
      x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
      life: 0, maxLife: 0.28 + Math.random() * 0.3, size: 3 + Math.random() * 4,
      colour: colour || '#ffd76a', type: 'spark', gravity: 300,
    });
  }
}

export function sprayWater(S, x, y, n, power) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = (30 + Math.random() * 90) * (power || 1);
    push(S, {
      x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 40,
      life: 0, maxLife: 0.5 + Math.random() * 0.5, size: 4 + Math.random() * 6,
      colour: 'rgba(210,240,255,0.85)', type: 'spray', gravity: 220,
    });
  }
}

export function wakeFoam(S, x, y, spread) {
  push(S, {
    x: x + (Math.random() - 0.5) * spread, y: y + (Math.random() - 0.5) * spread,
    vx: 0, vy: 0, life: 0, maxLife: 1.4, size: 10 + Math.random() * 16,
    colour: 'rgba(240,252,255,0.5)', type: 'wake', gravity: 0,
  });
}

export function smokePuff(S, x, y, dark) {
  push(S, {
    x, y, vx: (Math.random() - 0.5) * 24, vy: -34 - Math.random() * 30,
    life: 0, maxLife: 1.1 + Math.random() * 0.7, size: 9 + Math.random() * 12,
    colour: dark ? 'rgba(40,40,46,0.5)' : 'rgba(200,200,205,0.45)', type: 'smoke', gravity: -30,
  });
}

export function cashConfetti(S, x, y, n) {
  for (let i = 0; i < (n || 14); i++) {
    const a = -Math.PI / 2 + (Math.random() - 0.5) * 1.6;
    const sp = 120 + Math.random() * 200;
    push(S, {
      x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
      life: 0, maxLife: 0.9 + Math.random() * 0.5, size: 5 + Math.random() * 4,
      colour: Math.random() < 0.5 ? '#57d977' : '#ffc845', type: 'cash', gravity: 340,
    });
  }
}

export function muzzleFlash(S, x, y, angle) {
  push(S, {
    x: x + Math.cos(angle) * 20, y: y + Math.sin(angle) * 20, vx: 0, vy: 0,
    life: 0, maxLife: 0.06, size: 15, colour: '#ffe9a3', type: 'flash', gravity: 0,
  });
}

function push(S, p) {
  if (S.particles.length > 700) S.particles.splice(0, S.particles.length - 700);
  S.particles.push(p);
}

export function updateParticles(S, dt) {
  const list = S.particles;
  for (let i = list.length - 1; i >= 0; i--) {
    const p = list[i];
    p.life += dt;
    if (p.life >= p.maxLife) {
      list.splice(i, 1);
      continue;
    }
    p.vy += (p.gravity || 0) * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    if (p.type === 'wake') p.size += dt * 22;
  }
}

export function drawParticles(ctx, S) {
  for (const p of S.particles) {
    const a = clamp(1 - p.life / p.maxLife, 0, 1);
    ctx.globalAlpha = p.type === 'wake' ? a * 0.7 : a;
    ctx.fillStyle = p.colour;
    if (p.type === 'flash') {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * a + 4, 0, Math.PI * 2);
      ctx.fill();
    } else if (p.type === 'wake') {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size * 0.7);
    }
  }
  ctx.globalAlpha = 1;
}
