// Dapur Kilat v2 — hand-in program (Node 22, standard library only).
//
// The game is the static files under game/ (plain HTML + ES modules, no
// build step, no network). This program copies game/ and screenshots/ into
// /output and writes /output/dossier.json with the vendored make.fun library.
//
// Entry checks (refuse early rather than hand in a broken entry):
//   - game/index.html must exist
//   - screenshots/ must hold 3 or 4 PNG/JPEG files, each at most 256 KiB
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
const MAX_SCREENSHOT_BYTES = 262144;

function fail(message: string): never {
  throw new Error('dapur-kilat-v2 hand-in refused: ' + message);
}

if (!existsSync(join(here, 'game', 'index.html'))) {
  fail('game/index.html is missing');
}

const shotDir = join(here, 'screenshots');
if (!existsSync(shotDir)) fail('screenshots/ is missing');
const shots = readdirSync(shotDir)
  .filter((name) => /\.(png|jpe?g)$/i.test(name))
  .sort();
if (shots.length < 3 || shots.length > 4) {
  fail(`expected 3 or 4 screenshots, found ${shots.length}`);
}
for (const name of shots) {
  const size = statSync(join(shotDir, name)).size;
  if (size > MAX_SCREENSHOT_BYTES) {
    fail(`${name} is ${size} bytes, over the 256 KiB cap`);
  }
}

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
cpSync(shotDir, join(out, 'screenshots'), { recursive: true });

writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);

console.log(`Dapur Kilat v2 handed in: ${shots.length} screenshots, game/ copied to ${out}`);
