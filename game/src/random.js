// Puerto Brisa — Storm Surge: seeded randomness.
//
// The whole city, its traffic and its screenshot scenes are built from one
// seeded generator, so a given seed always produces the same world and the
// entry's two grading runs write identical bytes. Nothing in the game calls
// Math.random() for world building; ambient sparkle may, world layout never.

export function createSeededRandom(seed) {
  let a = (seed >>> 0) || 1;
  const next = () => {
    // mulberry32: small, fast, and stable across browsers.
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    range(lo, hi) {
      return lo + (hi - lo) * next();
    },
    int(lo, hi) {
      return Math.floor(lo + (hi - lo + 1) * next());
    },
    pick(list) {
      return list[Math.floor(next() * list.length) % list.length];
    },
    chance(p) {
      return next() < p;
    },
    sign() {
      return next() < 0.5 ? -1 : 1;
    },
  };
}

// Turn a short string (a scene name, a district) into a stable numeric seed.
export function hashSeedText(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) || 7;
}
