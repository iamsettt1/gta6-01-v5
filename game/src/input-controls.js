// Puerto Brisa — Storm Surge: keyboard and mouse capture.
//
// One listener set writes into S.input; every other system reads from there,
// so the screenshot scenes can drive the game by writing the same fields.

import { S } from './config.js';

export function attachBrisaControls(canvas) {
  const keys = S.input.keys;
  window.addEventListener('keydown', (ev) => {
    const k = ev.key.toLowerCase();
    keys.add(k);
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) ev.preventDefault();
    if (S.hooks.onKeyPress) S.hooks.onKeyPress(k);
  });
  window.addEventListener('keyup', (ev) => {
    keys.delete(ev.key.toLowerCase());
  });
  window.addEventListener('blur', () => keys.clear());
  canvas.addEventListener('mousemove', (ev) => {
    const r = canvas.getBoundingClientRect();
    S.input.mouse.x = ((ev.clientX - r.left) / r.width) * canvas.width;
    S.input.mouse.y = ((ev.clientY - r.top) / r.height) * canvas.height;
  });
  canvas.addEventListener('mousedown', () => {
    S.input.mouse.down = true;
    S.input.mouse.clicked = true;
  });
  window.addEventListener('mouseup', () => {
    S.input.mouse.down = false;
  });
  canvas.addEventListener('contextmenu', (ev) => ev.preventDefault());
  return S.input;
}

// Was this key pressed this frame? (Edge detection lives in main.js, which
// snapshots the set each frame and calls this with the previous snapshot.)
export function keyWentDown(prev, key) {
  return S.input.keys.has(key) && !prev.has(key);
}

export function moveAxes() {
  const k = S.input.keys;
  let x = 0;
  let y = 0;
  if (k.has('a') || k.has('arrowleft')) x -= 1;
  if (k.has('d') || k.has('arrowright')) x += 1;
  if (k.has('w') || k.has('arrowup')) y -= 1;
  if (k.has('s') || k.has('arrowdown')) y += 1;
  if (x !== 0 && y !== 0) {
    const inv = Math.SQRT1_2;
    x *= inv;
    y *= inv;
  }
  return { x, y };
}
