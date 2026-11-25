// Dapur Kilat v2 — game state and rules. No DOM here: the logic test in Node
// imports this file directly, and the browser loop drives it through update().
import {
  SHIFT_SECONDS, MAX_HEARTS, MAX_CARRY, MAX_PLATE, MAX_ORDERS, WALK_SPEED,
  USE_RANGE, STATIONS, BINS, BIN_W, BIN_H, RECIPES, FINISHED,
  GRILL_COOK_SECONDS, GRILL_BURN_SECONDS, BOARD_CHOP_SECONDS,
  COMBO_WINDOW, COMBO_STEP, COMBO_MAX, SPEED_BONUS_MAX,
} from './config.js';
import { makeRng, pick, clamp, lerp } from './random.js';

export const BEST_KEY = 'dapurkilatv2_best';

export function loadBest() {
  try {
    if (typeof localStorage === 'undefined') return 0;
    return Number(localStorage.getItem(BEST_KEY) || 0) || 0;
  } catch {
    return 0;
  }
}

function saveBest(v) {
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(BEST_KEY, String(v));
  } catch { /* storage unavailable: ignore */ }
}

export function multisetEqual(a, b) {
  if (a.length !== b.length) return false;
  const count = new Map();
  for (const x of a) count.set(x, (count.get(x) || 0) + 1);
  for (const x of b) {
    const n = count.get(x) || 0;
    if (n === 0) return false;
    count.set(x, n - 1);
  }
  return true;
}

export function recipeFor(items) {
  return RECIPES.find((r) => multisetEqual(r.items, items)) || null;
}

export function createWorld(seed = 1) {
  const w = {
    seed,
    rng: makeRng(seed),
    screen: 'title',
    timeLeft: SHIFT_SECONDS,
    elapsed: 0,
    hearts: MAX_HEARTS,
    coins: 0,
    served: 0,
    combo: 0,
    bestCombo: 0,
    lastServeAt: -999,
    orders: [],
    orderSeq: 0,
    spawnTimer: 2,
    cook: { x: 640, y: 540, carry: [], plate: null, dir: 1, moving: false, target: null, pendingUse: null, bob: 0 },
    grill: [
      { item: null, t: 0, state: 'empty' },
      { item: null, t: 0, state: 'empty' },
    ],
    board: { item: null, t: 0, state: 'empty' },
    plate: [],
    particles: [],
    floaters: [],
    toasts: [],
    best: loadBest(),
    overReason: null,
    now: 0,
  };
  return w;
}

export function progress(w) {
  return clamp(w.elapsed / SHIFT_SECONDS, 0, 1);
}

function patienceFor(w) {
  return lerp(52, 30, progress(w));
}

function spawnInterval(w) {
  return lerp(14, 7, progress(w));
}

export function startShift(w) {
  const fresh = createWorld(w.seed);
  fresh.best = w.best;
  Object.assign(w, fresh);
  w.screen = 'playing';
  w.spawnTimer = 2;
}

function toast(w, text) {
  w.toasts.push({ text, life: 2.2 });
  if (w.toasts.length > 3) w.toasts.shift();
}

function floater(w, x, y, text, color = '#ffd94a') {
  w.floaters.push({ x, y, text, life: 1.4, color });
}

function spawnOrder(w) {
  if (w.orders.length >= MAX_ORDERS) return;
  const recipe = pick(w.rng, RECIPES);
  const patience = patienceFor(w);
  w.orders.push({ id: ++w.orderSeq, recipe, patience, maxPatience: patience });
}

function gameOver(w, reason) {
  w.screen = 'over';
  w.overReason = reason;
  if (w.coins > w.best) {
    w.best = w.coins;
    saveBest(w.best);
  }
}

function servePlate(w) {
  const plate = w.cook.plate;
  if (!plate || plate.length === 0) return;
  const recipe = recipeFor(plate);
  if (!recipe) {
    toast(w, 'Bukan resep yang dikenal!');
    return;
  }
  const order = w.orders.find((o) => o.recipe.name === recipe.name);
  if (!order) {
    toast(w, 'Tidak ada pesanan ' + recipe.name + '!');
    return;
  }
  const speedBonus = Math.round(SPEED_BONUS_MAX * (order.patience / order.maxPatience));
  if (w.elapsed - w.lastServeAt <= COMBO_WINDOW) w.combo += 1;
  else w.combo = 1;
  w.bestCombo = Math.max(w.bestCombo, w.combo);
  w.lastServeAt = w.elapsed;
  const mult = Math.min(COMBO_MAX, 1 + COMBO_STEP * (w.combo - 1));
  const earned = Math.round((recipe.coins + speedBonus) * mult);
  w.coins += earned;
  w.served += 1;
  w.orders = w.orders.filter((o) => o !== order);
  const s = STATIONS.serve;
  floater(w, s.x + s.w / 2, s.y + 30, '+' + earned + ' koin', '#ffd94a');
  if (w.combo > 1) floater(w, s.x + s.w / 2, s.y + 58, 'Kombo x' + mult.toFixed(2).replace(/\.?0+$/, ''), '#ff9d5c');
  w.cook.plate = null;
  for (let i = 0; i < 10; i++) {
    w.particles.push({ x: s.x + s.w / 2 + (w.rng() - 0.5) * 120, y: s.y + 60, vx: (w.rng() - 0.5) * 30, vy: -40 - w.rng() * 40, life: 0.8, max: 0.8, kind: 'spark', size: 3 + w.rng() * 3 });
  }
}

// --- station interaction -------------------------------------------------

function distToRect(px, py, r) {
  const dx = Math.max(r.x - px, 0, px - (r.x + r.w));
  const dy = Math.max(r.y - py, 0, py - (r.y + r.h));
  return Math.hypot(dx, dy);
}

function nearestInteractable(w) {
  const c = w.cook;
  let best = null;
  const consider = (kind, data, rect, dist) => {
    if (dist <= USE_RANGE && (!best || dist < best.dist)) best = { kind, data, rect, dist };
  };
  for (const bin of BINS) {
    consider('bin', bin, { x: bin.x, y: bin.y, w: BIN_W, h: BIN_H }, distToRect(c.x, c.y, { x: bin.x, y: bin.y, w: BIN_W, h: BIN_H }));
  }
  consider('grill', 0, STATIONS.grill, distToRect(c.x, c.y, STATIONS.grill));
  consider('grill', 1, STATIONS.grill, distToRect(c.x, c.y, STATIONS.grill));
  consider('board', null, STATIONS.board, distToRect(c.x, c.y, STATIONS.board));
  consider('plating', null, STATIONS.plating, distToRect(c.x, c.y, STATIONS.plating));
  consider('serve', null, STATIONS.serve, distToRect(c.x, c.y, STATIONS.serve));
  consider('trash', null, STATIONS.trash, distToRect(c.x, c.y, STATIONS.trash));
  return best;
}

export function useNearest(w) {
  if (w.screen !== 'playing') return;
  const hit = nearestInteractable(w);
  if (!hit) return;
  const c = w.cook;

  if (hit.kind === 'bin') {
    if (c.plate) { toast(w, 'Tangan penuh piring!'); return; }
    if (c.carry.length >= MAX_CARRY) { toast(w, 'Tangan sudah penuh (3)!'); return; }
    c.carry.push(hit.data.id);
    return;
  }

  if (hit.kind === 'grill') {
    const slot = w.grill[hit.data];
    if (slot.state === 'empty') {
      const raw = c.carry.find((i) => i === 'daging' || i === 'ayam');
      if (!raw) { toast(w, 'Bawa daging atau ayam mentah ke panggangan!'); return; }
      c.carry.splice(c.carry.indexOf(raw), 1);
      slot.item = raw;
      slot.t = 0;
      slot.state = 'cooking';
      return;
    }
    if (slot.state === 'cooking') { toast(w, 'Masih dimasak…'); return; }
    if (slot.state === 'ready') {
      if (c.plate) { toast(w, 'Tangan penuh piring!'); return; }
      if (c.carry.length >= MAX_CARRY) { toast(w, 'Tangan sudah penuh (3)!'); return; }
      c.carry.push(FINISHED[slot.item + '_panggang'] ? slot.item + '_panggang' : slot.item);
      slot.item = null; slot.t = 0; slot.state = 'empty';
      return;
    }
    if (slot.state === 'burnt') {
      slot.item = null; slot.t = 0; slot.state = 'empty';
      toast(w, 'Gosong! Dibuang.');
      return;
    }
  }

  if (hit.kind === 'board') {
    const b = w.board;
    if (b.state === 'empty') {
      const raw = c.carry.find((i) => i === 'tomat' || i === 'selada');
      if (!raw) { toast(w, 'Bawa tomat atau selada ke talenan!'); return; }
      c.carry.splice(c.carry.indexOf(raw), 1);
      b.item = raw; b.t = 0; b.state = 'chopping';
      return;
    }
    if (b.state === 'chopping') { toast(w, 'Masih diiris…'); return; }
    if (b.state === 'ready') {
      if (c.plate) { toast(w, 'Tangan penuh piring!'); return; }
      if (c.carry.length >= MAX_CARRY) { toast(w, 'Tangan sudah penuh (3)!'); return; }
      c.carry.push(b.item + '_iris');
      b.item = null; b.t = 0; b.state = 'empty';
      return;
    }
  }

  if (hit.kind === 'plating') {
    if (c.plate) {
      if (w.plate.length === 0) {
        w.plate = c.plate;
        c.plate = null;
        toast(w, 'Piring ditaruh kembali.');
      } else {
        toast(w, 'Meja saji sudah ada piring!');
      }
      return;
    }
    if (c.carry.length > 0) {
      if (w.plate.length >= MAX_PLATE) { toast(w, 'Piring sudah penuh (4)!'); return; }
      w.plate.push(c.carry.pop());
      return;
    }
    if (w.plate.length > 0) {
      c.plate = w.plate;
      w.plate = [];
      return;
    }
    toast(w, 'Susun piring di sini dulu.');
    return;
  }

  if (hit.kind === 'serve') {
    if (!c.plate) { toast(w, 'Bawa piring jadi ke jendela antar!'); return; }
    servePlate(w);
    return;
  }

  if (hit.kind === 'trash') {
    if (c.plate) {
      c.plate = null;
      toast(w, 'Piring dibuang.');
      return;
    }
    if (c.carry.length > 0) {
      c.carry.pop();
      toast(w, 'Dibuang.');
      return;
    }
    toast(w, 'Tidak ada yang dibuang.');
  }
}

// --- movement ------------------------------------------------------------

function solids() {
  const bins = BINS.map((b) => ({ x: b.x, y: b.y, w: BIN_W, h: BIN_H }));
  return [STATIONS.grill, STATIONS.board, STATIONS.plating, STATIONS.serve, STATIONS.trash, ...bins];
}

function pushOutSolids(w) {
  const c = w.cook;
  const r = 18;
  for (const s of solids()) {
    const cx = clamp(c.x, s.x, s.x + s.w);
    const cy = clamp(c.y, s.y, s.y + s.h);
    const dx = c.x - cx;
    const dy = c.y - cy;
    const d2 = dx * dx + dy * dy;
    if (d2 >= r * r) continue;
    if (d2 === 0) { c.y = s.y + s.h + r; continue; }
    const d = Math.sqrt(d2);
    c.x = cx + (dx / d) * r;
    c.y = cy + (dy / d) * r;
  }
  c.x = clamp(c.x, 24, 1256);
  c.y = clamp(c.y, 168, 696);
}

export function update(w, dt, move) {
  w.now += dt;
  // Particles and floaters animate on every screen (title staging looks alive).
  for (const p of w.particles) {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.life -= dt;
  }
  w.particles = w.particles.filter((p) => p.life > 0);
  for (const f of w.floaters) {
    f.y -= 34 * dt;
    f.life -= dt;
  }
  w.floaters = w.floaters.filter((f) => f.life > 0);
  for (const t of w.toasts) t.life -= dt;
  w.toasts = w.toasts.filter((t) => t.life > 0);

  if (w.screen !== 'playing') return;

  w.elapsed += dt;
  w.timeLeft = Math.max(0, SHIFT_SECONDS - w.elapsed);
  if (w.timeLeft <= 0) {
    gameOver(w, 'time');
    return;
  }

  // Movement: keyboard vector, or click-to-walk target.
  const c = w.cook;
  let mx = move.x;
  let my = move.y;
  if (c.target) {
    const dx = c.target.x - c.x;
    const dy = c.target.y - c.y;
    const d = Math.hypot(dx, dy);
    if (d < 10) {
      c.target = null;
      if (c.pendingUse) {
        c.pendingUse = null;
        useNearest(w);
      }
    } else {
      mx = dx / d;
      my = dy / d;
    }
  }
  const len = Math.hypot(mx, my);
  if (len > 0.01) {
    const nx = mx / Math.max(1, len);
    const ny = my / Math.max(1, len);
    c.x += nx * WALK_SPEED * dt;
    c.y += ny * WALK_SPEED * dt;
    c.dir = nx < -0.05 ? -1 : nx > 0.05 ? 1 : c.dir;
    c.moving = true;
    c.bob += dt * 11;
  } else {
    c.moving = false;
  }
  pushOutSolids(w);

  // Grill timers.
  for (const slot of w.grill) {
    if (slot.state === 'cooking' || slot.state === 'ready') {
      slot.t += dt;
      if (slot.state === 'cooking' && slot.t >= GRILL_COOK_SECONDS) slot.state = 'ready';
      if (slot.t >= GRILL_BURN_SECONDS) slot.state = 'burnt';
      if (slot.state === 'cooking' && w.rng() < dt * 6) {
        w.particles.push({ x: 990 + w.rng() * 220, y: 200, vx: (w.rng() - 0.5) * 12, vy: -26 - w.rng() * 22, life: 1.1, max: 1.1, kind: 'steam', size: 5 + w.rng() * 5 });
      }
    }
  }
  // Board timer.
  if (w.board.state === 'chopping') {
    w.board.t += dt;
    if (w.board.t >= BOARD_CHOP_SECONDS) w.board.state = 'ready';
  }

  // Orders: spawn and patience.
  w.spawnTimer -= dt;
  if (w.spawnTimer <= 0) {
    spawnOrder(w);
    w.spawnTimer = spawnInterval(w);
  }
  for (const o of [...w.orders]) {
    o.patience -= dt;
    if (o.patience <= 0) {
      w.orders = w.orders.filter((x) => x !== o);
      w.hearts -= 1;
      toast(w, 'Pesanan ' + o.recipe.name + ' hangus! -1 hati');
      if (w.hearts <= 0) {
        gameOver(w, 'hearts');
        return;
      }
    }
  }
}

export function setClickTarget(w, x, y) {
  if (w.screen !== 'playing') return;
  const c = w.cook;
  // If the click lands on/near a station, walk to its edge and use it.
  const targets = [];
  for (const bin of BINS) targets.push({ r: { x: bin.x, y: bin.y, w: BIN_W, h: BIN_H } });
  for (const key of ['grill', 'board', 'plating', 'serve', 'trash']) {
    targets.push({ r: STATIONS[key] });
  }
  for (const t of targets) {
    if (x >= t.r.x - 8 && x <= t.r.x + t.r.w + 8 && y >= t.r.y - 8 && y <= t.r.y + t.r.h + 8) {
      // Approach point: the nearest edge point from the cook, pushed 30px out.
      const ex = clamp(c.x, t.r.x, t.r.x + t.r.w);
      const ey = clamp(c.y, t.r.y, t.r.y + t.r.h);
      const dx = c.x - ex;
      const dy = c.y - ey;
      const d = Math.hypot(dx, dy) || 1;
      c.target = { x: ex + (dx / d) * 30, y: ey + (dy / d) * 30 };
      c.pendingUse = true;
      return;
    }
  }
  c.target = { x: clamp(x, 24, 1256), y: clamp(y, 168, 696) };
  c.pendingUse = null;
}
