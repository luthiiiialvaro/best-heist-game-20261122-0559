// Midnight Vault — the entry program (Node 22, standard library only).
//
// What it hands in, in order:
//   1. Copies this repository's game/ folder (the whole playable heist
//      game: index.html, its style and its ES modules, no library and no
//      network request) into the output directory.
//   2. Copies the screenshots/ folder beside it — the maker's own renders
//      of the game, the first of which is the cover.
//   3. Writes dossier.json there with buildDossier from the kit's vendored
//      library, so the judge can read the game from one file.
//
// The grader runs this program twice into two fresh directories and
// expects the same bytes both times, so nothing here depends on the clock,
// randomness or the environment beyond MAKEFUN_OUTPUT_DIR (which stands in
// for /output when the program is run outside the grader):
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

// The scorer's caps for this competition: the dossier text cap, at most four
// screenshots of at most 256 KiB each, and the game folder's file/size caps.
// They mirror the gate, so a program that passes them here passes there.
const DOSSIER_CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
} as const;

const repoRoot = dirname(fileURLToPath(import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

function fail(message: string): never {
  throw new Error(`midnight-vault main.ts: ${message}`);
}

function countFiles(dir: string): number {
  let count = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    count += 1;
    if (entry.isDirectory()) count += countFiles(join(dir, entry.name));
  }
  return count;
}

const gameDir = join(repoRoot, 'game');
const shotsDir = join(repoRoot, 'screenshots');
if (!existsSync(join(gameDir, 'index.html'))) fail('game/index.html is missing');
if (!existsSync(shotsDir)) fail('screenshots/ is missing');
const shotNames = readdirSync(shotsDir).filter((name) => !name.startsWith('.'));
if (shotNames.length < 3 || shotNames.length > 4) {
  fail(`expected 3 or 4 screenshots, found ${shotNames.length}`);
}
for (const name of shotNames) {
  const size = statSync(join(shotsDir, name)).size;
  if (size > 262144) fail(`screenshot ${name} is ${size} bytes, over the 256 KiB cap`);
}
if (countFiles(gameDir) > 993) fail('game/ holds more than 993 files and directories');

mkdirSync(outDir, { recursive: true });
cpSync(gameDir, join(outDir, 'game'), { recursive: true });
mkdirSync(join(outDir, 'screenshots'), { recursive: true });
cpSync(shotsDir, join(outDir, 'screenshots'), { recursive: true });

writeFileSync(join(outDir, 'dossier.json'), buildDossier(outDir, DOSSIER_CAPS));

console.log(`midnight-vault: handed in game/ + ${shotNames.length} screenshots + dossier.json`);
