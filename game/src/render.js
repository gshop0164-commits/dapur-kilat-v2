// Dapur Kilat v2 — canvas renderer. Warm warung look: gradient light, soft
// shadows, textured floor, glowing grill, detailed cook, steam and sparkles.
import { VIEW, INGREDIENTS, ALL_ITEMS, RECIPES, STATIONS, BINS, BIN_W, BIN_H, GRILL_COOK_SECONDS, GRILL_BURN_SECONDS, BOARD_CHOP_SECONDS } from './config.js';
import { recipeFor } from './world.js';

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function shade(ctx, color, alpha) {
  ctx.fillStyle = color;
  ctx.globalAlpha = alpha;
  ctx.fill();
  ctx.globalAlpha = 1;
}

function ellipse(ctx, x, y, rx, ry) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
}

function softShadow(ctx, x, y, rx, ry, alpha = 0.28) {
  ctx.save();
  ctx.fillStyle = `rgba(20, 8, 2, ${alpha})`;
  ellipse(ctx, x, y, rx, ry);
  ctx.fill();
  ctx.restore();
}

// Pre-rendered floor texture: checker + speckle, drawn once per frame cheaply.
let floorPattern = null;
function floorCanvas() {
  if (floorPattern) return floorPattern;
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const g = c.getContext('2d');
  const cols = ['#a97a4e', '#9c6f45'];
  for (let y = 0; y < 4; y++) {
    for (let x = 0; x < 4; x++) {
      g.fillStyle = cols[(x + y) % 2];
      g.fillRect(x * 64, y * 64, 64, 64);
    }
  }
  // Speckle + grout.
  let seed = 1234567;
  const rnd = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  for (let i = 0; i < 900; i++) {
    g.fillStyle = rnd() > 0.5 ? 'rgba(255,220,170,0.05)' : 'rgba(40,20,5,0.06)';
    g.fillRect(rnd() * 256, rnd() * 256, 2, 2);
  }
  g.strokeStyle = 'rgba(60,30,10,0.25)';
  g.lineWidth = 2;
  for (let i = 0; i <= 4; i++) {
    g.beginPath(); g.moveTo(i * 64, 0); g.lineTo(i * 64, 256); g.stroke();
    g.beginPath(); g.moveTo(0, i * 64); g.lineTo(256, i * 64); g.stroke();
  }
  floorPattern = c;
  return c;
}

// --- ingredient mini-illustrations ---------------------------------------

function drawIngredient(ctx, id, x, y, s) {
  // s = half-size of the drawing area.
  ctx.save();
  ctx.translate(x, y);
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(40,20,5,0.35)';
  switch (id) {
    case 'roti': {
      ctx.fillStyle = '#e8b06a';
      rr(ctx, -s, -s * 0.55, s * 2, s * 1.1, s * 0.45); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#f7d9a0';
      ellipse(ctx, 0, -s * 0.28, s * 0.7, s * 0.28); ctx.fill();
      ctx.fillStyle = '#c98f3e';
      for (const [dx, dy] of [[-s * 0.4, -s * 0.3], [0, -s * 0.42], [s * 0.4, -s * 0.3]]) {
        ellipse(ctx, dx, dy, s * 0.09, s * 0.06); ctx.fill();
      }
      break;
    }
    case 'daging':
    case 'daging_panggang': {
      const burnt = id === 'daging_panggang';
      ctx.fillStyle = burnt ? '#7a3d28' : '#a5503c';
      rr(ctx, -s, -s * 0.7, s * 2, s * 1.4, s * 0.3); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = burnt ? '#4a2012' : '#7c3626';
      ctx.lineWidth = 2.5;
      for (const dx of [-s * 0.45, 0, s * 0.45]) {
        ctx.beginPath(); ctx.moveTo(dx, -s * 0.5); ctx.lineTo(dx, s * 0.5); ctx.stroke();
      }
      if (burnt) {
        ctx.fillStyle = 'rgba(255,180,90,0.5)';
        ellipse(ctx, -s * 0.3, -s * 0.2, s * 0.16, s * 0.1); ctx.fill();
      }
      break;
    }
    case 'ayam':
    case 'ayam_panggang': {
      ctx.fillStyle = id === 'ayam_panggang' ? '#c96a4a' : '#e8907c';
      ellipse(ctx, -s * 0.15, 0, s * 0.75, s * 0.62); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#f5ead2';
      ctx.fillRect(s * 0.45, -s * 0.14, s * 0.55, s * 0.28);
      ellipse(ctx, s * 1.05, -s * 0.22, s * 0.16, s * 0.16); ctx.fill();
      ellipse(ctx, s * 1.05, s * 0.22, s * 0.16, s * 0.16); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ellipse(ctx, -s * 0.35, -s * 0.3, s * 0.28, s * 0.16); ctx.fill();
      break;
    }
    case 'nasi': {
      ctx.fillStyle = '#f5f0e0';
      ellipse(ctx, 0, s * 0.15, s * 0.9, s * 0.6); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#fffdf4';
      ellipse(ctx, -s * 0.2, -s * 0.15, s * 0.55, s * 0.4); ctx.fill();
      ctx.strokeStyle = 'rgba(120,100,70,0.5)';
      ctx.lineWidth = 1.5;
      for (const [dx, dy] of [[-s * 0.4, 0], [0, s * 0.2], [s * 0.35, -s * 0.05]]) {
        ctx.beginPath(); ctx.moveTo(dx - 3, dy); ctx.lineTo(dx + 3, dy); ctx.stroke();
      }
      break;
    }
    case 'mie': {
      ctx.strokeStyle = '#e8a91c';
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      for (let i = 0; i < 3; i++) {
        const yy = -s * 0.5 + i * s * 0.5;
        ctx.beginPath();
        ctx.moveTo(-s * 0.85, yy);
        ctx.bezierCurveTo(-s * 0.4, yy - s * 0.3, s * 0.1, yy + s * 0.3, s * 0.85, yy);
        ctx.stroke();
      }
      ctx.strokeStyle = '#f7d774';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-s * 0.6, -s * 0.35); ctx.bezierCurveTo(-s * 0.2, -s * 0.6, s * 0.3, -s * 0.1, s * 0.6, -s * 0.35); ctx.stroke();
      break;
    }
    case 'selada':
    case 'selada_iris': {
      ctx.fillStyle = '#69b455';
      for (const [dx, dy, r] of [[-s * 0.4, s * 0.2, s * 0.5], [s * 0.35, s * 0.25, s * 0.5], [0, -s * 0.3, s * 0.55]]) {
        ellipse(ctx, dx, dy, r, r * 0.75); ctx.fill(); ctx.stroke();
      }
      ctx.strokeStyle = '#3f7d33';
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(0, -s * 0.5); ctx.lineTo(0, s * 0.5); ctx.stroke();
      break;
    }
    case 'tomat':
    case 'tomat_iris': {
      ctx.fillStyle = '#d93b2b';
      ellipse(ctx, 0, s * 0.1, s * 0.8, s * 0.7); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#3f7d33';
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const a = -Math.PI / 2 + (i * Math.PI * 2) / 5;
        ctx.lineTo(Math.cos(a) * s * 0.35, -s * 0.55 + Math.sin(a) * s * 0.2);
      }
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ellipse(ctx, -s * 0.35, -s * 0.25, s * 0.22, s * 0.14); ctx.fill();
      break;
    }
    case 'keju': {
      ctx.fillStyle = '#f7d54a';
      ctx.beginPath();
      ctx.moveTo(0, -s * 0.8); ctx.lineTo(s * 0.85, s * 0.6); ctx.lineTo(-s * 0.85, s * 0.6);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#d9a91c';
      for (const [dx, dy] of [[0, 0.1], [-s * 0.35, s * 0.3], [s * 0.3, s * 0.35]]) {
        ellipse(ctx, dx * s, dy * s, s * 0.12, s * 0.12); ctx.fill();
      }
      break;
    }
    default: {
      ctx.fillStyle = '#888';
      ellipse(ctx, 0, 0, s * 0.7, s * 0.7); ctx.fill();
    }
  }
  ctx.restore();
}

// --- scene ---------------------------------------------------------------

function drawFloorAndWalls(ctx, w) {
  const pat = ctx.createPattern(floorCanvas(), 'repeat');
  ctx.fillStyle = pat;
  ctx.fillRect(0, 150, VIEW.w, VIEW.h - 150);
  // Warm light from the top centre.
  const light = ctx.createRadialGradient(640, 120, 60, 640, 380, 780);
  light.addColorStop(0, 'rgba(255,214,150,0.20)');
  light.addColorStop(0.6, 'rgba(255,214,150,0.05)');
  light.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = light;
  ctx.fillRect(0, 150, VIEW.w, VIEW.h - 150);
  // Vignette.
  const vig = ctx.createRadialGradient(640, 400, 260, 640, 400, 760);
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(20,8,0,0.35)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, VIEW.w, VIEW.h);
  // Wall band behind the order board.
  const wall = ctx.createLinearGradient(0, 54, 0, 150);
  wall.addColorStop(0, '#5a3a22');
  wall.addColorStop(1, '#4a2e1a');
  ctx.fillStyle = wall;
  ctx.fillRect(0, 54, VIEW.w, 96);
  ctx.fillStyle = 'rgba(255,200,130,0.12)';
  for (let x = 0; x < VIEW.w; x += 96) ctx.fillRect(x, 54, 48, 96);
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(0, 146, VIEW.w, 4);
}

function drawPanel(ctx, x, y, w, h, r = 12) {
  ctx.save();
  softShadow(ctx, x + w / 2, y + h - 2, w / 2, 10, 0.3);
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, '#6b4a30');
  g.addColorStop(1, '#54371f');
  ctx.fillStyle = g;
  rr(ctx, x, y, w, h, r);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,210,150,0.35)';
  ctx.lineWidth = 1.5;
  rr(ctx, x + 0.5, y + 0.5, w - 1, h - 1, r);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,230,190,0.25)';
  ctx.beginPath();
  ctx.moveTo(x + r, y + 1.5);
  ctx.lineTo(x + w - r, y + 1.5);
  ctx.stroke();
  ctx.restore();
}

function drawBins(ctx, w) {
  ctx.fillStyle = '#ffe9c4';
  ctx.font = '700 13px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('BAHAN', 20, 600);
  for (const bin of BINS) {
    drawPanel(ctx, bin.x, bin.y, BIN_W, BIN_H, 10);
    drawIngredient(ctx, bin.id, bin.x + BIN_W / 2, bin.y + 28, 20);
    ctx.fillStyle = '#ffe9c4';
    ctx.font = '600 14px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(INGREDIENTS[bin.id].label, bin.x + BIN_W / 2, bin.y + BIN_H - 10);
  }
}

function drawGrill(ctx, w) {
  const g = STATIONS.grill;
  drawPanel(ctx, g.x, g.y, g.w, g.h, 12);
  ctx.fillStyle = '#ffe9c4';
  ctx.font = '700 14px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('PANGGANGAN', g.x + 12, g.y + 20);
  w.grill.forEach((slot, i) => {
    const sx = g.x + 16 + i * 142;
    const sy = g.y + 30;
    ctx.save();
    ctx.fillStyle = '#2a1a10';
    rr(ctx, sx, sy, 126, 52, 8);
    ctx.fill();
    // Coals glow.
    const glow = ctx.createRadialGradient(sx + 63, sy + 26, 4, sx + 63, sy + 26, 60);
    const pulse = 0.35 + 0.15 * Math.sin(w.now * 3 + i * 2);
    glow.addColorStop(0, `rgba(255,120,30,${slot.state === 'empty' ? 0.12 : pulse})`);
    glow.addColorStop(1, 'rgba(255,120,30,0)');
    ctx.fillStyle = glow;
    rr(ctx, sx, sy, 126, 52, 8);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.6)';
    ctx.lineWidth = 2;
    for (let k = 1; k < 4; k++) {
      ctx.beginPath(); ctx.moveTo(sx + 8, sy + k * 13); ctx.lineTo(sx + 118, sy + k * 13); ctx.stroke();
    }
    if (slot.item) {
      const fid = slot.item + '_panggang';
      drawIngredient(ctx, slot.state === 'burnt' ? 'daging' : fid, sx + 42, sy + 26, 17);
      if (slot.state === 'burnt') {
        ctx.fillStyle = '#1a1a1a';
        ellipse(ctx, sx + 42, sy + 26, 17, 12); ctx.fill();
        ctx.fillStyle = '#ff5a3c';
        ctx.font = '700 13px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('GOSONG', sx + 63, sy + 70 - 8);
      } else {
        const frac = slot.state === 'ready' ? 1 : slot.t / GRILL_COOK_SECONDS;
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        rr(ctx, sx + 66, sy + 10, 50, 10, 5); ctx.fill();
        ctx.fillStyle = slot.state === 'ready' ? '#7ddc6a' : '#ffb13c';
        rr(ctx, sx + 67, sy + 11, 48 * frac, 8, 4); ctx.fill();
        if (slot.state === 'ready') {
          ctx.fillStyle = '#a9f29a';
          ctx.font = '700 12px system-ui, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('SIAP!', sx + 92, sy + 40);
        }
      }
    } else {
      ctx.fillStyle = 'rgba(255,233,196,0.35)';
      ctx.font = '600 13px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('kosong', sx + 63, sy + 30);
    }
    ctx.restore();
  });
}

function drawBoard(ctx, w) {
  const b = STATIONS.board;
  drawPanel(ctx, b.x, b.y, b.w, b.h, 12);
  ctx.fillStyle = '#ffe9c4';
  ctx.font = '700 14px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('TALENAN', b.x + 12, b.y + 20);
  // Wood board.
  ctx.save();
  ctx.fillStyle = '#c89a5e';
  rr(ctx, b.x + 16, b.y + 30, b.w - 32, 54, 8);
  ctx.fill();
  ctx.strokeStyle = 'rgba(90,55,20,0.5)';
  ctx.lineWidth = 2;
  rr(ctx, b.x + 16, b.y + 30, b.w - 32, 54, 8);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(120,75,30,0.35)';
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(b.x + 26, b.y + 42 + i * 14);
    ctx.lineTo(b.x + b.w - 26, b.y + 40 + i * 14);
    ctx.stroke();
  }
  if (w.board.item) {
    drawIngredient(ctx, w.board.state === 'ready' ? w.board.item + '_iris' : w.board.item, b.x + b.w / 2 - 30, b.y + 57, 18);
    const frac = w.board.state === 'ready' ? 1 : w.board.t / BOARD_CHOP_SECONDS;
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    rr(ctx, b.x + b.w / 2 + 8, b.y + 52, 56, 10, 5); ctx.fill();
    ctx.fillStyle = w.board.state === 'ready' ? '#7ddc6a' : '#ffb13c';
    rr(ctx, b.x + b.w / 2 + 9, b.y + 53, 54 * frac, 8, 4); ctx.fill();
    if (w.board.state === 'ready') {
      ctx.fillStyle = '#e8ffd9';
      ctx.font = '700 12px system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('SIAP!', b.x + b.w / 2 + 8, b.y + 74);
    }
  } else {
    ctx.fillStyle = 'rgba(255,233,196,0.7)';
    ctx.font = '600 13px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('tomat / selada', b.x + b.w / 2, b.y + 60);
  }
  ctx.restore();
}

function drawPlate(ctx, items, x, y, s) {
  // White plate with rim shadow, items layered on top.
  ctx.save();
  softShadow(ctx, x, y + s * 0.5, s * 1.05, s * 0.22, 0.3);
  ctx.fillStyle = '#f8f4ec';
  ellipse(ctx, x, y, s, s * 0.62); ctx.fill();
  ctx.strokeStyle = '#c9bfa9';
  ctx.lineWidth = 2;
  ellipse(ctx, x, y, s, s * 0.62); ctx.stroke();
  ctx.fillStyle = '#e9e2d2';
  ellipse(ctx, x, y, s * 0.72, s * 0.44); ctx.fill();
  items.forEach((id, i) => {
    const n = items.length;
    const dx = n === 1 ? 0 : (i - (n - 1) / 2) * s * 0.62;
    drawIngredient(ctx, id, x + dx, y - s * 0.08, s * 0.34);
  });
  ctx.restore();
}

function drawPlating(ctx, w) {
  const p = STATIONS.plating;
  drawPanel(ctx, p.x, p.y, p.w, p.h, 12);
  ctx.fillStyle = '#ffe9c4';
  ctx.font = '700 14px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('MEJA SAJI — susun piring di sini', p.x + 12, p.y + 20);
  if (w.plate.length > 0) {
    drawPlate(ctx, w.plate, p.x + p.w / 2, p.y + 72, 46);
    const recipe = recipeFor(w.plate);
    if (recipe) {
      ctx.fillStyle = '#a9f29a';
      ctx.font = '700 15px system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(recipe.name + ' — siap!', p.x + 14, p.y + p.h - 12);
    } else {
      ctx.fillStyle = '#ffd94a';
      ctx.font = '600 13px system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(w.plate.length + '/' + 4 + ' bahan di piring', p.x + 14, p.y + p.h - 12);
    }
  } else {
    ctx.fillStyle = 'rgba(255,233,196,0.4)';
    ctx.font = '600 13px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('piring kosong', p.x + p.w / 2, p.y + 66);
  }
}

function drawServe(ctx, w) {
  const s = STATIONS.serve;
  // Awning: red/white stripes.
  ctx.save();
  for (let i = 0; i < 6; i++) {
    ctx.fillStyle = i % 2 === 0 ? '#c23b2e' : '#f5efe4';
    ctx.fillRect(s.x + i * (s.w / 6), s.y - 26, s.w / 6, 26);
  }
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.fillRect(s.x, s.y - 2, s.w, 4);
  drawPanel(ctx, s.x, s.y, s.w, s.h, 12);
  ctx.fillStyle = '#ffe9c4';
  ctx.font = '700 15px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('JENDELA ANTAR', s.x + s.w / 2, s.y + 24);
  ctx.fillStyle = 'rgba(255,233,196,0.65)';
  ctx.font = '600 13px system-ui, sans-serif';
  ctx.fillText('antar piring jadi', s.x + s.w / 2, s.y + 44);
  // Warm glow inside the window.
  const glow = ctx.createRadialGradient(s.x + s.w / 2, s.y + 130, 10, s.x + s.w / 2, s.y + 130, 130);
  glow.addColorStop(0, 'rgba(255,190,90,0.28)');
  glow.addColorStop(1, 'rgba(255,190,90,0)');
  ctx.fillStyle = glow;
  rr(ctx, s.x + 16, s.y + 58, s.w - 32, s.h - 78, 10);
  ctx.fill();
  // Service bell on the counter: brass dome, knob, highlight, base.
  const bx = s.x + s.w / 2;
  const by = s.y + s.h - 34;
  ctx.fillStyle = '#8a6a1c';
  ellipse(ctx, bx, by + 12, 20, 4); ctx.fill();
  const dome = ctx.createLinearGradient(bx - 16, by - 14, bx + 16, by + 12);
  dome.addColorStop(0, '#ffe27a');
  dome.addColorStop(0.6, '#f2b93c');
  dome.addColorStop(1, '#c98f1e');
  ctx.fillStyle = dome;
  ctx.beginPath();
  ctx.ellipse(bx, by + 10, 16, 13, 0, Math.PI, 0);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(90,55,10,0.6)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.ellipse(bx, by + 10, 16, 13, 0, Math.PI, 0);
  ctx.closePath(); ctx.stroke();
  ctx.fillStyle = '#8a6a1c';
  ellipse(ctx, bx, by - 5, 3.5, 3.5); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ellipse(ctx, bx - 7, by + 1, 4, 2.5); ctx.fill();
  ctx.restore();
}

function drawTrash(ctx, w) {
  const t = STATIONS.trash;
  drawPanel(ctx, t.x, t.y, t.w, t.h, 10);
  ctx.save();
  ctx.fillStyle = '#7d8a99';
  rr(ctx, t.x + 22, t.y + 18, 40, 44, 6); ctx.fill();
  ctx.strokeStyle = '#4a5566';
  ctx.lineWidth = 2;
  rr(ctx, t.x + 22, t.y + 18, 40, 44, 6); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(t.x + 18, t.y + 14); ctx.lineTo(t.x + 66, t.y + 14); ctx.stroke();
  ctx.fillStyle = '#ffe9c4';
  ctx.font = '600 12px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('SAMPAH', t.x + t.w / 2, t.y + t.h - 8);
  ctx.restore();
}

function drawCook(ctx, w) {
  const c = w.cook;
  const bob = c.moving ? Math.sin(c.bob) * 2.5 : Math.sin(w.now * 2) * 1;
  const x = c.x;
  const y = c.y + bob * 0.4;
  ctx.save();
  softShadow(ctx, c.x, c.y + 22, 26, 9, 0.35);
  ctx.translate(x, y);
  ctx.scale(c.dir, 1);
  // Body / apron.
  ctx.fillStyle = '#f2ede2';
  rr(ctx, -15, -6, 30, 30, 10); ctx.fill();
  ctx.strokeStyle = 'rgba(60,30,10,0.4)';
  ctx.lineWidth = 1.5;
  rr(ctx, -15, -6, 30, 30, 10); ctx.stroke();
  ctx.fillStyle = '#3f7d33';
  rr(ctx, -11, 2, 22, 20, 6); ctx.fill();
  // Head + chef hat.
  ctx.fillStyle = '#f2c297';
  ellipse(ctx, 0, -16, 12, 11); ctx.fill();
  ctx.fillStyle = '#ffffff';
  ellipse(ctx, -8, -26, 8, 7); ctx.fill();
  ellipse(ctx, 0, -30, 9, 8); ctx.fill();
  ellipse(ctx, 8, -26, 8, 7); ctx.fill();
  ctx.fillRect(-11, -28, 22, 6);
  // Face.
  ctx.fillStyle = '#2a1a10';
  ellipse(ctx, 4, -17, 1.6, 2.2); ctx.fill();
  ctx.strokeStyle = '#2a1a10';
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(5, -11, 3.5, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
  // Arms.
  ctx.strokeStyle = '#f2c297';
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  const swing = c.moving ? Math.sin(c.bob) * 5 : 0;
  ctx.beginPath(); ctx.moveTo(-12, 2); ctx.lineTo(-20, 12 + swing); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(12, 2); ctx.lineTo(20, 12 - swing); ctx.stroke();
  // Feet.
  ctx.fillStyle = '#3a2a1a';
  ellipse(ctx, -7, 25, 6, 3.5); ctx.fill();
  ellipse(ctx, 7, 25, 6, 3.5); ctx.fill();
  ctx.restore();
  // Carried items stacked above the head.
  if (c.plate) {
    drawPlate(ctx, c.plate, c.x, c.y - 52, 24);
  } else if (c.carry.length > 0) {
    c.carry.forEach((id, i) => {
      drawIngredient(ctx, id, c.x, c.y - 46 - i * 20, 13);
    });
  }
}

function drawParticles(ctx, w) {
  for (const p of w.particles) {
    const a = Math.max(0, p.life / p.max);
    if (p.kind === 'steam') {
      ctx.fillStyle = `rgba(255,255,255,${0.35 * a})`;
      ellipse(ctx, p.x, p.y, p.size * (1.6 - a * 0.6), p.size * (1.6 - a * 0.6));
      ctx.fill();
    } else {
      ctx.fillStyle = `rgba(255,215,74,${a})`;
      ellipse(ctx, p.x, p.y, p.size, p.size);
      ctx.fill();
    }
  }
  ctx.textAlign = 'center';
  for (const f of w.floaters) {
    ctx.globalAlpha = Math.min(1, f.life);
    ctx.fillStyle = f.color;
    ctx.font = '700 22px system-ui, sans-serif';
    ctx.strokeStyle = 'rgba(40,15,0,0.8)';
    ctx.lineWidth = 4;
    ctx.strokeText(f.text, f.x, f.y);
    ctx.fillText(f.text, f.x, f.y);
    ctx.globalAlpha = 1;
  }
}

function drawOrders(ctx, w) {
  ctx.fillStyle = '#ffe9c4';
  ctx.font = '700 17px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('PESANAN', 16, 94);
  const cardW = 268;
  const cardH = 84;
  w.orders.forEach((o, i) => {
    const x = 120 + i * (cardW + 12);
    const y = 68;
    ctx.save();
    ctx.translate(x + cardW / 2, y + cardH / 2);
    ctx.rotate((i % 2 === 0 ? -1 : 1) * 0.008);
    ctx.translate(-cardW / 2, -cardH / 2);
    softShadow(ctx, cardW / 2, cardH - 2, cardW / 2, 8, 0.3);
    const g = ctx.createLinearGradient(0, 0, 0, cardH);
    g.addColorStop(0, '#fdf6e3');
    g.addColorStop(1, '#f3e6c8');
    ctx.fillStyle = g;
    rr(ctx, 0, 0, cardW, cardH, 10);
    ctx.fill();
    ctx.strokeStyle = 'rgba(120,80,30,0.4)';
    ctx.lineWidth = 1.5;
    rr(ctx, 0.5, 0.5, cardW - 1, cardH - 1, 10);
    ctx.stroke();
    ctx.fillStyle = '#4a2e1a';
    ctx.font = '700 16px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(o.recipe.name, 12, 24);
    ctx.fillStyle = '#b07818';
    ctx.font = '700 15px system-ui, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(o.recipe.coins + ' koin', cardW - 12, 24);
    // Ingredient icons, checked when already on the plate.
    o.recipe.items.forEach((id, k) => {
      const ix = 24 + k * 34;
      const onPlate = w.plate.includes(id) || (w.cook.plate && w.cook.plate.includes(id));
      drawIngredient(ctx, id, ix, 48, 12);
      if (onPlate) {
        ctx.strokeStyle = '#3f9d3f';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(ix - 7, 48);
        ctx.lineTo(ix - 2, 53);
        ctx.lineTo(ix + 8, 40);
        ctx.stroke();
      }
    });
    // Patience bar.
    const frac = Math.max(0, o.patience / o.maxPatience);
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    rr(ctx, 12, cardH - 14, cardW - 24, 7, 3.5); ctx.fill();
    ctx.fillStyle = frac > 0.5 ? '#69b455' : frac > 0.25 ? '#f2a93b' : '#d93b2b';
    rr(ctx, 12, cardH - 14, (cardW - 24) * frac, 7, 3.5); ctx.fill();
    ctx.restore();
  });
  if (w.orders.length === 0 && w.screen === 'playing') {
    ctx.fillStyle = 'rgba(255,233,196,0.55)';
    ctx.font = '600 15px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Belum ada pesanan — sebentar lagi datang…', 120, 112);
  }
}

function drawHud(ctx, w) {
  const g = ctx.createLinearGradient(0, 0, 0, 54);
  g.addColorStop(0, '#3a2412');
  g.addColorStop(1, '#2a180a');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIEW.w, 54);
  ctx.fillStyle = 'rgba(255,200,130,0.15)';
  ctx.fillRect(0, 52, VIEW.w, 2);
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffd94a';
  ctx.font = '800 24px system-ui, sans-serif';
  ctx.fillText('DAPUR KILAT v2', 16, 36);
  // Hearts.
  for (let i = 0; i < 3; i++) {
    const hx = 220 + i * 30;
    ctx.fillStyle = i < w.hearts ? '#e84a5f' : 'rgba(255,255,255,0.18)';
    ctx.beginPath();
    ctx.moveTo(hx, 34);
    ctx.bezierCurveTo(hx - 10, 22, hx - 18, 30, hx, 42);
    ctx.bezierCurveTo(hx + 18, 30, hx + 10, 22, hx, 34);
    ctx.fill();
  }
  // Timer.
  const mm = Math.floor(w.timeLeft / 60);
  const ss = String(Math.floor(w.timeLeft % 60)).padStart(2, '0');
  ctx.fillStyle = w.timeLeft <= 20 ? '#ff6a5c' : '#fff3d6';
  ctx.font = '800 30px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(mm + ':' + ss, 640, 38);
  ctx.fillStyle = 'rgba(255,255,255,0.2)';
  rr(ctx, 540, 46, 200, 5, 2.5); ctx.fill();
  ctx.fillStyle = w.timeLeft <= 20 ? '#ff6a5c' : '#7ddc6a';
  rr(ctx, 540, 46, 200 * (w.timeLeft / 150), 5, 2.5); ctx.fill();
  // Coins + combo.
  ctx.fillStyle = '#ffd94a';
  ctx.font = '800 24px system-ui, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('Koin ' + w.coins, 1120, 36);
  if (w.combo > 1) {
    ctx.fillStyle = '#ff9d5c';
    ctx.font = '800 20px system-ui, sans-serif';
    ctx.fillText('Kombo x' + (1 + 0.25 * (w.combo - 1)).toFixed(2).replace(/\.?0+$/, ''), 1264, 36);
  }
}

function drawToasts(ctx, w) {
  ctx.textAlign = 'center';
  w.toasts.forEach((t, i) => {
    const y = 690 - i * 26;
    ctx.globalAlpha = Math.min(1, t.life);
    ctx.fillStyle = 'rgba(20,10,4,0.8)';
    const tw = ctx.measureText(t.text).width + 28;
    rr(ctx, 640 - tw / 2, y - 18, tw, 24, 12);
    ctx.fill();
    ctx.fillStyle = '#ffe9c4';
    ctx.font = '600 15px system-ui, sans-serif';
    ctx.fillText(t.text, 640, y);
    ctx.globalAlpha = 1;
  });
}

function drawTitleBanner(ctx, w) {
  // SLIM opaque banner at the top only — the kitchen stays fully visible.
  const g = ctx.createLinearGradient(0, 0, 0, 64);
  g.addColorStop(0, '#3a2412');
  g.addColorStop(1, '#2a180a');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIEW.w, 64);
  ctx.fillStyle = 'rgba(255,200,130,0.2)';
  ctx.fillRect(0, 64, VIEW.w, 2);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd94a';
  ctx.font = '800 34px system-ui, sans-serif';
  ctx.fillText('DAPUR KILAT v2', 640, 38);
  ctx.fillStyle = '#ffe9c4';
  ctx.font = '600 14px system-ui, sans-serif';
  ctx.fillText('Warung cepat saji — sajikan pesanan sebelum waktunya habis!', 640, 58);
  // Slim instruction strip at the bottom.
  ctx.fillStyle = 'rgba(20,10,4,0.85)';
  ctx.fillRect(0, VIEW.h - 36, VIEW.w, 36);
  ctx.fillStyle = '#ffe9c4';
  ctx.font = '600 15px system-ui, sans-serif';
  ctx.fillText('Gerak: WASD / panah / klik  •  Gunakan: E  •  Jeda: P  •  Terbaik: ' + w.best + '  •  Tekan Spasi untuk mulai', 640, VIEW.h - 13);
}

function drawCenterCard(ctx, title, lines, accent) {
  ctx.fillStyle = 'rgba(15,8,2,0.55)';
  ctx.fillRect(0, 0, VIEW.w, VIEW.h);
  const cw = 560;
  const ch = 150 + lines.length * 30;
  const x = (VIEW.w - cw) / 2;
  const y = (VIEW.h - ch) / 2;
  ctx.save();
  softShadow(ctx, VIEW.w / 2, y + ch, cw / 2, 14, 0.4);
  const g = ctx.createLinearGradient(0, y, 0, y + ch);
  g.addColorStop(0, '#5a3a22');
  g.addColorStop(1, '#3a2412');
  ctx.fillStyle = g;
  rr(ctx, x, y, cw, ch, 16);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,210,150,0.4)';
  ctx.lineWidth = 2;
  rr(ctx, x + 1, y + 1, cw - 2, ch - 2, 16);
  ctx.stroke();
  ctx.textAlign = 'center';
  ctx.fillStyle = accent;
  ctx.font = '800 34px system-ui, sans-serif';
  ctx.fillText(title, VIEW.w / 2, y + 52);
  ctx.fillStyle = '#ffe9c4';
  ctx.font = '600 17px system-ui, sans-serif';
  lines.forEach((ln, i) => ctx.fillText(ln, VIEW.w / 2, y + 92 + i * 30));
  ctx.restore();
}

export function render(ctx, w) {
  ctx.clearRect(0, 0, VIEW.w, VIEW.h);
  drawFloorAndWalls(ctx, w);
  drawBins(ctx, w);
  drawGrill(ctx, w);
  drawBoard(ctx, w);
  drawPlating(ctx, w);
  drawServe(ctx, w);
  drawTrash(ctx, w);
  drawCook(ctx, w);
  drawParticles(ctx, w);
  if (w.screen === 'title') {
    drawOrders(ctx, w);
    drawTitleBanner(ctx, w);
  } else {
    drawOrders(ctx, w);
    drawHud(ctx, w);
    drawToasts(ctx, w);
  }
  if (w.screen === 'paused') {
    drawCenterCard(ctx, 'JEDA', ['Tekan P atau Spasi untuk lanjut'], '#ffd94a');
  }
  if (w.screen === 'over') {
    const reason = w.overReason === 'hearts' ? 'Hati habis!' : 'Waktu habis!';
    drawCenterCard(
      ctx,
      reason,
      [
        'Koin: ' + w.coins + '   •   Disajikan: ' + w.served + '   •   Kombo terbaik: x' + w.bestCombo,
        w.coins >= w.best && w.coins > 0 ? 'Rekor baru! Terbaik: ' + w.best : 'Terbaik: ' + w.best,
        'Tekan Spasi untuk main lagi',
      ],
      '#ffd94a',
    );
  }
}
