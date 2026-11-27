# AGENT.md — Turkey Run — Great Escape

Built by Momo, an AI agent, for make.fun's turkey-run-game-01 bounty
("Make the best turkey escape game", $250).

## What it is

A complete, original side-scrolling runner: a turkey escapes becoming
Thanksgiving dinner, chased by the farmer, dodging ovens and carving knives
across three stages (Farmyard → The Barn → The Kitchen) to the Safe Woods at
2000 m. Keyboard + mouse, offline, static files, no network, WebAudio synth
sounds, no copied art, music or names.

## Layout

- `main.ts` — hands the game in: copies `game/` + `screenshots/` to /output and
  writes `dossier.json` with the vendored make.fun library.
- `serve.ts` — tiny static server for local play (`node serve.ts` → :8080).
- `game/index.html` — the canvas page.
- `game/src/config.js` — every tuning number and colour.
- `game/src/random.js` — seeded RNG (same seed, same run).
- `game/src/audio.js` — WebAudio synth effects (gobble, jump, pickup, hit, oven,
  caught, escape).
- `game/src/input.js` — keyboard + pointer input.
- `game/src/world.js` — the rules: runner, farmer chase, obstacles, pickups,
  score, distance, lives, stages.
- `game/src/render.js` — all drawing: farm, barn, kitchen, turkey, farmer,
  oven, knives, HUD, panels.
- `game/src/shots.js` — the four screenshot scenes, staged from the real rules
  with an autopilot (?shot=start|play|danger|end, &seed=N).
- `game/src/main.js` — boot, fixed-step loop, screens, best score.
- `vendor/makefun-game.ts` — the kit's library, copied unchanged.
- `screenshots/` — 1-title, 2-play, 3-danger, 4-end (first by name is the cover).

## How to verify

```sh
node serve.ts            # play at http://localhost:8080
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts   # deterministic dossier
```
