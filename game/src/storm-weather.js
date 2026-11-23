// Puerto Brisa — Storm Surge: storm weather, lightning and the king tide.
//
// summonStormSurge() is the one call missions and the finale use to bring the
// weather in. The storm eases toward its target so scenes can ramp it, rain
// and flood derive from its level, and flooded streets genuinely slow cars
// (vehicles-cars.js reads S.weather.flood every frame).

import { clamp } from './config.js';

export function summonStormSurge(S, strength) {
  S.weather.target = clamp(strength, 0, 1);
  if (strength > 0.4 && S.weather.storm < 0.2) {
    S.weather.lightningT = Math.min(S.weather.lightningT, 0.8);
  }
}

export function updateStormWeather(S, dt) {
  const w = S.weather;
  const target = w.target !== undefined ? w.target : w.storm;
  w.storm += clamp(target - w.storm, -dt * 0.08, dt * 0.08);
  w.storm = clamp(w.storm, 0, 1);
  w.rain = clamp(w.storm * 1.15, 0, 1);
  w.flood = clamp((w.storm - 0.62) * 1.6, 0, 0.55);
  w.wind = 0.2 + w.storm * 0.8;
  // Lightning: a timer, a bright flash frame, then thunder in the audio mix.
  w.flash = Math.max(0, w.flash - dt * 5);
  if (w.storm > 0.35) {
    w.lightningT -= dt * (0.5 + w.storm);
    if (w.lightningT <= 0) {
      w.flash = 0.85;
      w.lightningT = 2.5 + Math.random() * 5;
      S.audio.thunder = 1;
    }
  }
  return w;
}

// Rain streaks and the lightning wash, drawn over the world by the renderer.
export function drawStormOverlay(ctx, S, cam) {
  const w = S.weather;
  if (w.flash > 0) {
    ctx.fillStyle = `rgba(230,238,255,${(w.flash * 0.5).toFixed(3)})`;
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  }
  if (w.rain <= 0.03) return;
  ctx.strokeStyle = 'rgba(190,215,255,0.5)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  const n = Math.floor(90 * w.rain);
  const t = S.t * 900;
  for (let i = 0; i < n; i++) {
    const x = ((i * 173.3 + t * 0.35) % (ctx.canvas.width + 80)) - 40;
    const y = ((i * 271.7 + t) % (ctx.canvas.height + 60)) - 30;
    ctx.moveTo(x, y);
    ctx.lineTo(x - 7, y + 22);
  }
  ctx.stroke();
  void cam;
}
