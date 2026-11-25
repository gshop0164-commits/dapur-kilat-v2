// ?shot= staging: deterministic scenes for the four screenshots.
// The title screen stages a kitchen mid-shift so the cover shows a dish
// being assembled with only the slim banner on top.
import { createWorld } from './world.js';

const RECIPES = {
  'Burger Kilat': { name: 'Burger Kilat', items: ['roti', 'daging_panggang', 'selada_iris'], coins: 14 },
  'Burger Ayam': { name: 'Burger Ayam', items: ['roti', 'ayam_panggang', 'keju'], coins: 18 },
  'Nasi Ayam': { name: 'Nasi Ayam', items: ['nasi', 'ayam_panggang', 'tomat_iris'], coins: 14 },
  'Mie Goreng': { name: 'Mie Goreng', items: ['mie', 'ayam_panggang', 'selada_iris'], coins: 16 },
  'Salad Segar': { name: 'Salad Segar', items: ['selada_iris', 'tomat_iris', 'keju'], coins: 12 },
};

export function stageShot(seed, name) {
  const w = createWorld(seed);
  const mkOrder = (nm, patience) => {
    const recipe = RECIPES[nm];
    return { id: ++w.orderSeq, recipe, patience, maxPatience: patience };
  };

  if (name === 'start') {
    w.screen = 'title';
    w.orders = [mkOrder('Burger Kilat', 46), mkOrder('Burger Ayam', 38)];
    w.grill[0] = { item: 'daging', t: 2.5, state: 'cooking' };
    w.grill[1] = { item: 'ayam', t: 6, state: 'ready' };
    w.plate = ['roti', 'daging_panggang'];
    w.cook.x = 760;
    w.cook.y = 520;
    w.cook.carry = ['selada_iris'];
    w.cook.dir = -1;
    w.timeLeft = 150;
    return w;
  }

  if (name === 'play') {
    w.screen = 'playing';
    w.elapsed = 72;
    w.timeLeft = 78;
    w.coins = 42;
    w.combo = 2;
    w.bestCombo = 2;
    w.lastServeAt = 60;
    w.orders = [mkOrder('Burger Kilat', 30), mkOrder('Nasi Ayam', 22), mkOrder('Salad Segar', 40)];
    w.grill[0] = { item: 'ayam', t: 3, state: 'cooking' };
    w.board = { item: 'tomat', t: 1.2, state: 'chopping' };
    w.plate = ['roti', 'daging_panggang'];
    w.cook.x = 900;
    w.cook.y = 300;
    w.cook.carry = ['ayam_panggang'];
    w.cook.dir = -1;
    return w;
  }

  if (name === 'serve') {
    w.screen = 'playing';
    w.elapsed = 96;
    w.timeLeft = 54;
    w.coins = 58;
    w.combo = 3;
    w.bestCombo = 3;
    w.lastServeAt = 80;
    w.orders = [mkOrder('Burger Ayam', 26), mkOrder('Mie Goreng', 34)];
    w.cook.x = 975;
    w.cook.y = 520;
    w.cook.plate = ['roti', 'ayam_panggang', 'keju'];
    w.cook.dir = 1;
    return w;
  }

  // end
  w.screen = 'over';
  w.overReason = 'time';
  w.timeLeft = 0;
  w.elapsed = 150;
  w.coins = 96;
  w.served = 7;
  w.bestCombo = 3;
  w.best = 96;
  w.orders = [];
  w.cook.x = 640;
  w.cook.y = 500;
  return w;
}
