# CyberTrainEX

A personal strength-training PWA with Cyberpunk 2077-inspired menus and offline workout tracking.

**Live app:** [Open CyberTrainEX](https://goopleguy.github.io/cybertrainEX/). Install it from your phone browser using Add to Home Screen / Install App. GitHub Pages is enabled and future pushes deploy automatically.

Derived from [GoopleGuy/cybertrain](https://github.com/GoopleGuy/cybertrain) at `91c8853e0dc520583eb72ffa66c4603b552ccb75`. This separate same-owner repository retains the original Git history; it is not a GitHub fork-network entry.

## Changes

- Original neon yellow, cyan and magenta lighting, compact proportions, angled panels and locally bundled Rajdhani / Share Tech Mono fonts, including offline.
- A single app frame connects the header, scrolling content, rest timer and five-tab dock. Animated navigation, smooth exercise expansion, retained panel inputs and per-tab scroll positions keep interactions continuous. Keyboard focus, reduced motion and browser zoom are supported.
- Collapsible program tuning groups rest, sets and rep targets without crowding the exercise list.
- **141 exercises**, expanded from 58: 31 rack/barbell, 11 open hex bar, 44 Arcadia, 14 Hyper Pro and 41 dumbbell movements. Original exercise IDs and the three-day program remain compatible.
- Equipment and muscle filters, text search, setup guidance and load conventions.
- Progression requires completed sets at consistent loads. At the top of the rep range, log at least 1 RIR on every set before increasing load. Incomplete work, missing RIR and sets at failure hold the load. Bodyweight movements without a load increment maintain their target after reaching the top. Timed exercises use seconds.
- Timed work is excluded from repetition/volume totals; bodyweight and timed work are excluded from e1RM. Volume is a logged-load index: per-hand/per-side entries are not doubled.
- EX uses its own storage key and scoped service-worker cache.

## ChatGPT coaching

AI integration is paused. The manual copy/paste Coach has been removed from the interface. Progression uses local rules; this app makes no model calls. See [integration research](docs/chatgpt-integration.md) for the previously investigated options and limitations.

## Move existing training data

In the original app, DATA -> EXPORT BACKUP. In CyberTrainEX, DATA -> IMPORT, paste, and restore. Your original data stays intact. Exports contain private training data: keep them in your own files, not this public repository.

Completed sessions save when you END SESSION & ARCHIVE. Active sessions are held in memory: keep the page open until archiving. Clearing site data can erase history; export backups regularly. Browser storage is origin-scoped, so EX intentionally uses a different key even when both apps share the same GitHub Pages domain.

## Equipment

The catalog targets the equipment specified in the source: REP Arcadia, rack/barbell, open hex bar, Freak Athlete Hyper Pro with leg developer, and adjustable dumbbells. Bench, platform, handle and attachment requirements appear in setup notes; a listed exercise does not imply every accessory is included. Follow your own equipment's manufacturer instructions.

- [Arcadia details](https://repfitness.com/products/arcadia-functional-trainer)
- [Hyper Pro setup resources](https://freakathlete.co/pages/hyper-pro-getting-started)

Targets are editable starting points, not individualized prescriptions. Use available equipment increments, controlled technique and comfortable range. Do not train through pain.

## Develop and verify

Node.js 20 or newer:

```sh
npm ci
npm test
npm run build
npx playwright install chromium
node tests/browser.mjs
```

Serve `dist/` using a static server. For browser checks, you can instead set `CHROME_PATH` to installed Chrome. Screenshots go to `test-results/` unless `QA_OUTPUT` is set. The browser suite supplies built assets directly and isolates external requests; it covers all five tabs at 320px, 390px and 1440px, dock/timer alignment, scroll restoration, exercise draft retention, logging, archive/reload, backup restore, builder persistence, tuning/reset, drag reorder and reduced motion. Unit tests cover catalog integrity, filter intersections, progression edge cases and the retained Coach helper.

GitHub Actions installs locked dependencies, tests and builds on each push. Pages deployment is enabled for this repository through `ENABLE_PAGES=true` and the GitHub Actions Pages source. Service-worker updates use the commit SHA and an EX-specific scope. Original typefaces are bundled and cached for offline use; their licenses are in `static/fonts/`.

## Source map

`CyberTrain.jsx` holds app flows and base styles; `theme.mjs` refines the original visual system and declares local fonts. `NavIcon.jsx` provides the dock icons. `exercises.mjs` retains the original catalog; `library.mjs` expands it and adds guidance/search. `progression.mjs` contains the tested local rules. `Coach.jsx` and `coach.mjs` are inactive legacy source.
