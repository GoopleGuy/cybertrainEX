# CyberTrainEX

A personal strength-training PWA with Cyberpunk 2077-inspired menus and offline workout tracking.

**Live app:** [Open CyberTrainEX](https://goopleguy.github.io/cybertrainEX/). Install it from your phone browser using Add to Home Screen / Install App. GitHub Pages is enabled and future pushes deploy automatically.

Derived from [GoopleGuy/cybertrain](https://github.com/GoopleGuy/cybertrain) at `91c8853e0dc520583eb72ffa66c4603b552ccb75`. This separate same-owner repository retains the original Git history; it is not a GitHub fork-network entry.

## Changes

- Original neon yellow, cyan and magenta lighting, compact proportions, angled panels and locally bundled Rajdhani / Share Tech Mono fonts, including offline.
- Phone-first typography and spacing sit on a true-black OLED canvas with restrained edge details. Five floating icon buttons replace the full-width navigation bar, and an inset timer uses a thin progress light. Both reserve space so they never cover workout controls. Animated navigation, smooth exercise expansion, retained panel inputs and per-tab scroll positions keep interactions continuous. Keyboard focus, reduced motion and browser zoom are supported.
- Collapsible program tuning groups rest, sets and rep targets without crowding the exercise list.
- **158 exercises**, including 17 additions for the weekly plan. Existing exercise IDs and history are preserved.
- Equipment and muscle filters, text search, setup guidance and load conventions.
- Progression requires completed sets at consistent loads. At the top of the rep range, log at least 1 RIR on every set before increasing load. Incomplete work, missing RIR and sets at failure hold the load. Bodyweight movements without a load increment maintain their target after reaching the top. Timed exercises use seconds.
- Timed work is excluded from repetition/volume totals; bodyweight, power and timed work are excluded from e1RM. Volume is a logged-load index: per-hand/per-side entries are not doubled. Broad jumps record best distance per set in inches; power, bodyweight and timed logs have a separate history view.
- EX uses its own storage key and scoped service-worker cache.

## Fixed weekly training

Monday Upper A, Tuesday Lower A, Wednesday Upper B, Thursday Upper C, Friday Lower B; Saturday rest and Sunday optional easy riding. Optional Movement A is shared between Monday/Thursday AM; Movement B is Wednesday AM. Skipping a session never moves the schedule. Choose another date to log that date explicitly.

The eight daily mobility checkboxes are date-specific and separate from workout totals. Two temporary left-side extras receive an in-app review note after six weeks. Supersets alternate and rest after the pair. The sixteen linked substitutes keep distinct load histories and preserve already logged sets when swapped.

The original progression engine is unchanged. Session-specific sets, rep ranges, rest, tempo, RIR and notes come from the handoff; ranged rests default to their upper endpoint. No automatic 12-week phases, deloads, weakest-body-part selection or monthly check-in fields were added. The first-week Nordic adjustment is retained as a note for manual tuning.

Schema 2 migration preserves all prior logs and stores the former A/B/C program and overrides under `legacy`, included in backups. Its exercise list is visible in Protocol. Weekly Build edits are scoped to the selected session; Movement A edits affect both assigned mornings.

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
