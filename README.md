# Puerto Brisa — Storm Surge

A complete 2D top-down open-world crime game in a single HTML canvas: eight districts on a 6800×4600 coastal city, ten car classes plus motorcycles, three boats, a helicopter and a seaplane, fourteen story missions, a heist planning board, empire businesses, a bounty board, a five-star wanted system, and a storm that floods the streets while you make your escape.

You are **Rosa Camacho**, back in Puerto Brisa to take the city from the Herrera family — one job, one block, one business at a time.

**Play it on make.fun:** https://make.fun/bounty/gta6-01

## What's in the world

- **The city** — El Mirador, Avenida Coral, Puerto Brisa Marina, Barrio Iris, Playa Brisa, Las Lomas, Zona Libre and the island of Isla Ancla, joined by two bridges, with a working day/night cycle, neon nights, rain and the Storm Surge itself.
- **Vehicles** — 10 car classes, motorcycles, 3 boat classes, a police helicopter with a searchlight, and a seaplane that takes off from the harbour water or the Pista Brisa strip and lands the same way.
- **14 story missions** — tails, timed deliveries, a stealth tail with a detection meter, street races, territory takes, an export run, a helicopter steal, a planned vault heist with crew/entry/escape choices, and a five-star storm finale.
- **Systems that talk to each other** — wanted levels with roadblocks and a bribe line on Rosa's phone; a heist board whose heat follows you into the escape; businesses that pay while you play; paint shops that respray, repair and lose the heat; a tuning shop with neon underglow; safehouses that save your progress.
- **Side work** — a six-race league, six bounty targets (alive pays full), six export cars, eighteen sun shells, taxi fares.

## Controls

| Keys | Action |
| --- | --- |
| WASD / arrows | Move / drive / fly |
| E | Enter or exit a vehicle · talk to a mission giver |
| F | Interact — buy, save, capture, board |
| Space | Fire (on foot / drive-by) · handbrake in a car |
| 1–4 | Pistol · Scattergun · SMG · Rifle |
| J | Mission board |
| P | Phone (objectives, league, exports, bribes) |
| H | Heist planning board (at an owned safehouse) |
| Esc | Full-city map + empire panel |
| M | Mute |

Progress saves to the browser automatically at safehouses and after every mission.

## Run it locally

The game is plain static files — no build step, no dependencies, no network:

```sh
cd game
python3 -m http.server 8080
# open http://localhost:8080
```

Or run the hand-in program (Node 22, standard library only), which copies
`game/` and `screenshots/` to the output directory and writes the
`dossier.json` the judge reads:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

Deterministic screenshot scenes live at `game/index.html?shot=harbour|heist|bounty|empire&seed=N`
(the four scenes in `shots.json`); each stages a composed tableau over the
real game state and sets `window.__shotReady` when it is painted.

## Referral

If make.fun brought you here, this entry was built with an AI agent working
from a written spec. My referral link: https://make.fun/r/9j3w1sg2
(referral code `9j3w1sg2`).

## License

MIT — see `LICENSE`.
