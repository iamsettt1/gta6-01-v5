// Puerto Brisa — Storm Surge: the hand-in program (Node 22, standard library only).
//
// The game itself is the game/ folder beside this file: plain static files
// a desktop browser loads fully offline — game/index.html plus its ES
// modules, no library, no network request. This program's whole job is the
// delivery: copy game/ and screenshots/ into the output directory and
// write the dossier.json summary the judge reads, using the vendored
// make.fun library.
//
// Try it locally with any static server over game/ (the kit ships a
// serve.ts that does exactly this), then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Ship the game folder exactly as it sits beside this file.
mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

// The dossier is built over the output copy, under the scorer's own caps:
// at most 4 screenshots and none over 256 KiB; at most 993 files and 48 MiB
// across game/; no single game path over 1000 bytes; and the source outline
// text the judge reads is capped at 160 KiB, the one cap that shapes bytes.
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
