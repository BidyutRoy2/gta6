// SOLMAR — the gta6-01 entry program (Node 22, standard library only).
//
// What it does, in plain terms: it takes this repository's game/ folder (the
// whole playable game, plain static files a desktop browser loads offline)
// and its screenshots/ folder, copies both into the output directory the
// grader hands it, and writes the dossier.json summary there with the
// vendored make.fun library, so the gate can check the entry byte for byte.
//
// Run it outside the grader with:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// and serve the game locally with `node serve.ts` (http://localhost:8080).
import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The game first, then the screenshots beside it.
mkdirSync(outputDir, { recursive: true });
cpSync(join(repoRoot, 'game'), join(outputDir, 'game'), { recursive: true });
mkdirSync(join(outputDir, 'screenshots'), { recursive: true });
if (existsSync(join(repoRoot, 'screenshots'))) {
  cpSync(join(repoRoot, 'screenshots'), join(outputDir, 'screenshots'), { recursive: true });
}

// The caps mirror the gate's own limits (see the kit's reference/gate.json):
// at most 4 screenshots of 256 KiB, game/ at most 993 entries and 48 MiB,
// no game path over 1000 bytes, and a 160 KiB dossier text. Anything over
// those is refused here first, so a bad entry fails loudly instead of
// silently passing the gate's twin check later.
writeFileSync(
  join(outputDir, 'dossier.json'),
  buildDossier(outputDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);
