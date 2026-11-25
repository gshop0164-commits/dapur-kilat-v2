// Dapur Kilat v2 — browser entry: loop, input wiring, ?shot= staging.
import { VIEW } from './config.js';
import { createWorld, startShift, update, useNearest, setClickTarget } from './world.js';
import { createInput } from './input.js';
import { render } from './render.js';
import { stageShot } from './shots.js';

const params = new URLSearchParams(location.search);
const seed = Number(params.get('seed') || '1') || 1;
const shot = params.get('shot');

const canvas = document.getElementById('game');
canvas.width = VIEW.w;
canvas.height = VIEW.h;
const ctx = canvas.getContext('2d');

let world = shot ? stageShot(seed, shot) : createWorld(seed);
window.__game = { world, get screen() { return world.screen; } };

const input = createInput(canvas, {
  onUse: () => {
    if (world.screen === 'playing') useNearest(world);
  },
  onConfirm: () => {
    if (world.screen === 'title' || world.screen === 'over') startShift(world);
    else if (world.screen === 'paused') world.screen = 'playing';
  },
  onPause: () => {
    if (world.screen === 'playing') world.screen = 'paused';
    else if (world.screen === 'paused') world.screen = 'playing';
  },
  onClick: (x, y) => {
    if (world.screen === 'title' || world.screen === 'over') {
      startShift(world);
      return;
    }
    if (world.screen === 'playing') setClickTarget(world, x, y);
  },
});

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  const move = input.moveVector();
  // Keyboard input cancels a click-to-walk target.
  if (move.x !== 0 || move.y !== 0) world.cook.target = null;
  update(world, dt, move);
  render(ctx, world);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
