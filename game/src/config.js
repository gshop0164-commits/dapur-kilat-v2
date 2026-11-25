// Dapur Kilat v2 — tuning and content. All values chosen for this build.
export const VIEW = { w: 1280, h: 720 };
export const SHIFT_SECONDS = 150;
export const MAX_HEARTS = 3;
export const MAX_CARRY = 3;
export const MAX_PLATE = 4;
export const MAX_ORDERS = 4;
export const WALK_SPEED = 265;
export const USE_RANGE = 66;

// Ingredients: id, label, base colour, kind (raw / grillable / choppable).
export const INGREDIENTS = {
  roti:   { label: 'Roti',   color: '#e8b06a' },
  daging: { label: 'Daging', color: '#a5503c' },
  ayam:   { label: 'Ayam',   color: '#e8907c' },
  nasi:   { label: 'Nasi',   color: '#f5f0e0' },
  mie:    { label: 'Mie',    color: '#f2c14e' },
  selada: { label: 'Selada', color: '#69b455' },
  tomat:  { label: 'Tomat',  color: '#d93b2b' },
  keju:   { label: 'Keju',   color: '#f7d54a' },
};

// Finished items produced by stations.
export const FINISHED = {
  daging_panggang: { label: 'Daging Panggang', color: '#8a4632', from: 'daging' },
  ayam_panggang:   { label: 'Ayam Panggang',   color: '#c96a4a', from: 'ayam' },
  tomat_iris:      { label: 'Tomat Iris',      color: '#e0574a', from: 'tomat' },
  selada_iris:     { label: 'Selada Iris',     color: '#7cc46a', from: 'selada' },
};

export const ALL_ITEMS = { ...INGREDIENTS, ...FINISHED };

// Recipes: exact multiset match on the plate.
export const RECIPES = [
  { name: 'Burger Kilat',  items: ['roti', 'daging_panggang', 'selada_iris'], coins: 14 },
  { name: 'Burger Ayam',   items: ['roti', 'ayam_panggang', 'keju'],          coins: 18 },
  { name: 'Nasi Ayam',     items: ['nasi', 'ayam_panggang', 'tomat_iris'],    coins: 14 },
  { name: 'Mie Goreng',    items: ['mie', 'ayam_panggang', 'selada_iris'],    coins: 16 },
  { name: 'Salad Segar',   items: ['selada_iris', 'tomat_iris', 'keju'],      coins: 12 },
  { name: 'Burger Spesial',items: ['roti', 'daging_panggang', 'keju', 'tomat_iris'], coins: 22 },
];

// Station rectangles (x, y, w, h) in canvas space.
export const STATIONS = {
  grill:   { x: 948,  y: 166, w: 312, h: 96,  label: 'PANGGANGAN' },
  board:   { x: 470,  y: 180, w: 230, h: 100, label: 'TALENAN' },
  plating: { x: 470,  y: 380, w: 340, h: 120, label: 'MEJA SAJI' },
  serve:   { x: 1010, y: 340, w: 250, h: 220, label: 'JENDELA ANTAR' },
  trash:   { x: 300,  y: 470, w: 84,  h: 84,  label: 'SAMPAH' },
};

// Ingredient bins in one row along the bottom, so every bin is equally
// reachable from the aisle above (a two-column wall would hide the back
// column behind the front one).
export const BINS = [
  { id: 'roti',   x: 20,   y: 606 },
  { id: 'daging', x: 175,  y: 606 },
  { id: 'ayam',   x: 330,  y: 606 },
  { id: 'nasi',   x: 485,  y: 606 },
  { id: 'mie',    x: 640,  y: 606 },
  { id: 'selada', x: 795,  y: 606 },
  { id: 'tomat',  x: 950,  y: 606 },
  { id: 'keju',   x: 1105, y: 606 },
];
export const BIN_W = 145;
export const BIN_H = 72;

export const GRILL_COOK_SECONDS = 5;    // raw -> ready
export const GRILL_BURN_SECONDS = 9;    // ready -> burnt
export const BOARD_CHOP_SECONDS = 2;
export const COMBO_WINDOW = 25;         // seconds between serves to keep combo
export const COMBO_STEP = 0.25;         // multiplier step per combo level
export const COMBO_MAX = 2;             // multiplier cap
export const SPEED_BONUS_MAX = 6;       // coins for instant serve
