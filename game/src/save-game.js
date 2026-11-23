// Puerto Brisa — Storm Surge: saving — progress in localStorage.
//
// Safehouses write the save; the title screen offers Continue when one
// exists. Only progression is stored (never entity state), so a load drops
// Rosa back at the marina with her money, respect, missions, businesses,
// safehouses, territory and stats intact.

import { CFG, S } from './config.js';

export function saveBrisaProgress(S2) {
  try {
    const data = {
      progress: S.progress,
      stats: S.stats,
      territory: S.territory,
      businesses: S.businesses.map((b) => ({ id: b.id, owned: b.owned })),
      safehouses: S.safehousesOwned || {},
      heistPlan: S.heistPlan,
      savedAt: Date.now(),
    };
    localStorage.setItem(CFG.SAVE_KEY, JSON.stringify(data));
    return true;
  } catch (err) {
    return false; // storage can be unavailable; the game plays on regardless
  }
}

export function loadBrisaProgress(S2) {
  try {
    const raw = localStorage.getItem(CFG.SAVE_KEY);
    if (!raw) return false;
    const data = JSON.parse(raw);
    if (!data || !data.progress) return false;
    S.progress = data.progress;
    S.stats = data.stats || S.stats;
    S.territory = data.territory || S.territory;
    if (Array.isArray(data.businesses)) {
      for (const saved of data.businesses) {
        const live = S.businesses.find((b) => b.id === saved.id);
        if (live) live.owned = saved.owned;
      }
    }
    S.safehousesOwned = data.safehouses || {};
    if (data.heistPlan) S.heistPlan = data.heistPlan;
    return true;
  } catch (err) {
    return false;
  }
}

export function hasBrisaSave() {
  try {
    return !!localStorage.getItem(CFG.SAVE_KEY);
  } catch (err) {
    return false;
  }
}

export function wipeBrisaSave() {
  try {
    localStorage.removeItem(CFG.SAVE_KEY);
  } catch (err) {
    /* nothing to wipe */
  }
}
