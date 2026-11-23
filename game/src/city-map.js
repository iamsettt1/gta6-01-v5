// Puerto Brisa — Storm Surge: building the city itself.
//
// buildPuertoBrisaCity() lays out the whole world from the district table:
// two land masses split by a channel, a harbour basin cut into the marina,
// a road grid per district, two bridges to the east shore, an airstrip, and
// a few hundred solid buildings with district rooftops. Everything is placed
// with the seeded generator, so the city is identical on every run.

import { CFG, pointInRect, pushOutOfRect } from './config.js';
import { DISTRICTS } from './districts.js';

// Several vehicle modules reach for the rectangle test through this file
// (they already import the water test from here), so pass it on.
export { pointInRect };

export function buildPuertoBrisaCity(S, rand) {
  const city = S.city;
  city.districts = DISTRICTS;
  city.lands = [
    { x: 140, y: 140, w: 4900, h: 2960 }, // mainland: Mirador to Playa Brisa
    { x: 5140, y: 140, w: 1520, h: 2960 }, // east shore: Zona Libre + Isla Ancla
  ];
  city.waters = [
    { x: 0, y: 0, w: CFG.WORLD_W, h: 140 },
    { x: 0, y: 3100, w: CFG.WORLD_W, h: CFG.WORLD_H - 3100 },
    { x: 0, y: 0, w: 140, h: CFG.WORLD_H },
    { x: 6660, y: 0, w: 140, h: CFG.WORLD_H },
    { x: 5040, y: 0, w: 100, h: CFG.WORLD_H }, // the channel
    { x: 240, y: 2240, w: 1500, h: 420 }, // harbour basin in the marina
    { x: 5560, y: 2940, w: 940, h: 160 }, // smugglers' cove, Isla Ancla
  ];
  city.bridges = [
    { x: 4960, y: 940, w: 280, h: 92, name: 'Puente Norte' },
    { x: 4960, y: 2380, w: 280, h: 92, name: 'Puente Largo' },
  ];
  city.airstrip = { x: 5420, y: 420, w: 1020, h: 132, helipad: { x: 6180, y: 860, r: 64 } };
  city.seaplaneDock = { x: 5170, y: 1480 };
  city.lighthouse = { x: 6420, y: 2900 };
  city.docks = [
    { x: 420, y: 2230 },
    { x: 760, y: 2230 },
    { x: 1100, y: 2230 },
    { x: 1440, y: 2230 },
    { x: 5180, y: 1520 },
    { x: 5960, y: 2930 },
  ];
  buildRoadGrid(S, rand);
  buildBlocks(S, rand);
  buildProps(S, rand);
  return city;
}

// A grid of avenues inside every district, plus the two bridge roads and the
// beach promenade. Roads are wide (92 px, two lanes) so screenshots read.
function buildRoadGrid(S, rand) {
  const roads = S.city.roads;
  const add = (x, y, w, h, dir, name) => roads.push({ x, y, w, h, dir, name: name || '' });
  for (const d of DISTRICTS) {
    const r = d.rect;
    // Vertical avenues.
    for (let x = r.x + 190; x < r.x + r.w - 80; x += 340) add(x, r.y + 30, 92, r.h - 60, 'v');
    // Horizontal streets.
    for (let y = r.y + 170; y < r.y + r.h - 60; y += 320) add(r.x + 30, y, r.w - 60, 92, 'h');
    // A ring road just inside the district edge.
    add(r.x + 26, r.y + 26, r.w - 52, 84, 'h');
    add(r.x + 26, r.y + r.h - 110, r.w - 52, 84, 'h');
  }
  // Bridges become ordinary roads the traffic system can follow.
  for (const b of S.city.bridges) add(b.x, b.y, b.w, b.h, 'h', b.name);
  // The long east-west artery tying the mainland together.
  add(140, 1330, 4900, 96, 'h', 'Avenida del Puerto');
  add(5140, 1330, 1520, 96, 'h', 'Avenida del Puerto');
  S.city.roads = roads;
}

// Buildings fill the block interiors the road grid leaves behind. For each
// district we read its own avenues back out of the road list, take the free
// spans between consecutive road bands (and the district edges), shrink
// each block by a margin, and split it into one to four plots sized to fit.
// Every plot is still tested against roads, water, the airstrip and the
// helipad clearing before it is kept, so nothing solid lands on a street.
function buildBlocks(S, rand) {
  const buildings = S.city.buildings;
  const margin = 12;
  for (const d of DISTRICTS) {
    const r = d.rect;
    // This district's own road bands, clipped to its rect and sorted.
    const vBands = [];
    const hBands = [];
    for (const rd of S.city.roads) {
      if (!rectsOverlap(rd, r)) continue;
      if (rd.dir === 'v') vBands.push([Math.max(rd.x, r.x), Math.min(rd.x + rd.w, r.x + r.w)]);
      else hBands.push([Math.max(rd.y, r.y), Math.min(rd.y + rd.h, r.y + r.h)]);
    }
    vBands.sort((a, b) => a[0] - b[0]);
    hBands.sort((a, b) => a[0] - b[0]);
    const xSpans = freeSpans(r.x, r.x + r.w, vBands);
    const ySpans = freeSpans(r.y, r.y + r.h, hBands);
    for (const [x0, x1] of xSpans) {
      for (const [y0, y1] of ySpans) {
        // One block interior: shrink it, then split it into 1-4 plots.
        const bx = x0 + margin;
        const by = y0 + margin;
        const bw = x1 - x0 - margin * 2;
        const bh = y1 - y0 - margin * 2;
        if (bw < 78 || bh < 72) continue;
        const cols = bw >= 196 ? 2 : 1;
        const rows = bh >= 196 ? 2 : 1;
        const cellW = bw / cols;
        const cellH = bh / rows;
        for (let cx = 0; cx < cols; cx++) {
          for (let cy = 0; cy < rows; cy++) {
            if (rand.range(0, 1) < 0.08) continue; // the odd open plot: a plaza, a car park
            const maxW = Math.min(150, cellW - 14);
            const maxH = Math.min(128, cellH - 14);
            if (maxW < 70 || maxH < 62) continue;
            const w = rand.range(68, maxW);
            const h = rand.range(60, maxH);
            const px = bx + cx * cellW + rand.range(0, cellW - w);
            const py = by + cy * cellH + rand.range(0, cellH - h);
            const rect = { x: px, y: py, w, h };
            if (S.city.roads.some((rd) => rectsOverlap(rect, inflate(rd, 10)))) continue;
            if (S.city.waters.some((wtr) => rectsOverlap(rect, wtr))) continue;
            if (S.city.airstrip && rectsOverlap(rect, inflate(S.city.airstrip, 30))) continue;
            if (rectsOverlap(rect, { x: 6100, y: 780, w: 180, h: 180 })) continue; // helipad clearing
            buildings.push({
              x: px,
              y: py,
              w,
              h,
              roof: rand.pick(d.roofs),
              district: d.name,
              floors: rand.int(1, 6),
            });
          }
        }
      }
    }
  }
  S.city.buildings = buildings;
}

// The gaps between sorted road bands inside [lo, hi]: each gap is a strip
// of buildable land running along the district's other axis.
function freeSpans(lo, hi, bands) {
  const spans = [];
  let cur = lo;
  for (const [a, b] of bands) {
    if (a > cur) spans.push([cur, Math.min(a, hi)]);
    if (b > cur) cur = b;
  }
  if (cur < hi) spans.push([cur, hi]);
  return spans;
}

// Palms, lamps, market stalls, crates, containers, benches and corner signs:
// the small dressing that makes a screenshot read as a lived-in city.
function buildProps(S, rand) {
  const props = S.city.props;
  const signs = S.city.signs;
  for (const d of DISTRICTS) {
    const r = d.rect;
    for (let i = 0; i < 26; i++) {
      const x = rand.range(r.x + 40, r.x + r.w - 40);
      const y = rand.range(r.y + 40, r.y + r.h - 40);
      if (isWaterAt(S, x, y)) continue;
      const kind = d.name === 'Playa Brisa' || d.name === 'Las Lomas'
        ? rand.pick(['palm', 'palm', 'lamp', 'bench'])
        : d.name === 'Puerto Brisa Marina' || d.name === 'Zona Libre'
          ? rand.pick(['crate', 'container', 'lamp', 'barrel'])
          : rand.pick(['lamp', 'bench', 'stall', 'palm']);
      props.push({ x, y, kind, colour: rand.pick(d.roofs), angle: rand.range(0, Math.PI * 2) });
    }
    // One named sign at each district corner.
    d.signs.forEach((text, i) => {
      const sx = i % 2 === 0 ? r.x + 60 : r.x + r.w - 240;
      const sy = i < 2 ? r.y + 130 : r.y + r.h - 90;
      signs.push({ x: sx, y: sy, text, accent: d.accent });
    });
  }
  // Cranes over the marina basin.
  for (let i = 0; i < 3; i++) props.push({ x: 420 + i * 480, y: 2190, kind: 'crane', colour: '#e8873a', angle: 0 });
  props.push({ x: S.city.lighthouse.x, y: S.city.lighthouse.y, kind: 'lighthouse', colour: '#f2ead8', angle: 0 });
  S.city.props = props;
  S.city.signs = signs;
}

function inflate(r, by) {
  return { x: r.x - by, y: r.y - by, w: r.w + by * 2, h: r.h + by * 2 };
}

export function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export function isOnLand(S, x, y) {
  if (S.city.bridges.some((b) => pointInRect(x, y, b))) return true;
  if (S.city.waters.some((w) => pointInRect(x, y, w))) return false;
  return S.city.lands.some((l) => pointInRect(x, y, l));
}

export function isWaterAt(S, x, y) {
  if (S.city.bridges.some((b) => pointInRect(x, y, b))) return false;
  if (S.city.waters.some((w) => pointInRect(x, y, w))) return true;
  return !S.city.lands.some((l) => pointInRect(x, y, l));
}

export function isOnRoad(S, x, y) {
  return S.city.roads.some((r) => pointInRect(x, y, r));
}

// Solid-building collision for a circle body; returns the pushed position.
export function collideWithBuildings(S, x, y, rad) {
  let out = { x, y, hit: false };
  for (const b of S.city.buildings) {
    if (x < b.x - rad || x > b.x + b.w + rad || y < b.y - rad || y > b.y + b.h + rad) continue;
    const p = pushOutOfRect(out.x, out.y, rad, b);
    out = { x: p.x, y: p.y, hit: out.hit || p.hit };
  }
  return out;
}

// Nearest point on any road — used to place traffic, fares and respawns.
export function nearestRoadPoint(S, x, y) {
  let best = null;
  let bestD = Infinity;
  for (const r of S.city.roads) {
    const nx = Math.max(r.x, Math.min(x, r.x + r.w));
    const ny = Math.max(r.y, Math.min(y, r.y + r.h));
    const d = (nx - x) * (nx - x) + (ny - y) * (ny - y);
    if (d < bestD) {
      bestD = d;
      best = { x: nx, y: ny, road: r };
    }
  }
  return best;
}
