# CyberTrainEX

A personal strength-training PWA with Cyberpunk 2077-inspired menus, offline workout tracking, and a ChatGPT handoff using your own account.

**Live app:** [Open CyberTrainEX](https://goopleguy.github.io/cybertrainEX/). Install it from your phone browser using Add to Home Screen / Install App. GitHub Pages is enabled and future pushes deploy automatically.

Derived from [GoopleGuy/cybertrain](https://github.com/GoopleGuy/cybertrain) at `91c8853e0dc520583eb72ffa66c4603b552ccb75`. This separate same-owner repository retains the original Git history; it is not a GitHub fork-network entry.

## Changes

- Unified charcoal, electric-yellow and cyan menus; desktop and phone layouts, readable metadata, keyboard focus, reduced motion and browser zoom.
- **141 exercises**, expanded from 58: 31 rack/barbell, 11 open hex bar, 44 Arcadia, 14 Hyper Pro and 41 dumbbell movements. Original exercise IDs and the three-day program remain compatible.
- Equipment and muscle filters, text search, setup guidance, load conventions and per-exercise Coach links.
- Progression requires completed sets at consistent loads. At the top of the rep range, log at least 1 RIR on every set before increasing load. Incomplete work, missing RIR and sets at failure hold the load. Bodyweight movements without a load increment maintain their target after reaching the top. Timed exercises use seconds.
- Timed work is excluded from repetition/volume totals; bodyweight and timed work are excluded from e1RM. Volume is a logged-load index: per-hand/per-side entries are not doubled.
- EX uses its own storage key and scoped service-worker cache.

## ChatGPT coaching

Open COACH, choose an exercise or session, type your question, review the brief, then COPY TRAINING BRIEF and OPEN CHATGPT. Paste into your own conversation. You can exclude recent history. Nothing is sent automatically; no API key is requested and this app makes no model calls. Apply agreed changes manually in BUILD or your next session.

This is a manual handoff, not an embedded chatbot. See [integration options](docs/chatgpt-integration.md) for the deeper plugin approach.

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

Serve `dist/` using a static server. For browser checks, you can instead set `CHROME_PATH` to installed Chrome. Screenshots go to `test-results/` unless `QA_OUTPUT` is set. The browser suite supplies built assets directly and isolates external requests; it covers search, Coach clipboard, logging, archive/reload, backup restore, builder persistence, and all six tabs at 320px and 390px. Unit tests cover catalog integrity, filter intersections, progression edge cases and Coach history exclusion.

GitHub Actions installs locked dependencies, tests and builds on each push. Optional Pages deployment is gated by the repository variable `ENABLE_PAGES=true`: set Pages source to GitHub Actions and enable that variable, then rerun the workflow. Hosting is not configured automatically. Service-worker updates use the commit SHA and an EX-specific scope. Fonts fall back to local fonts offline.

## Source map

`CyberTrain.jsx` holds app flows and base styles; `theme.mjs` adds the EX visual system. `exercises.mjs` retains the original catalog; `library.mjs` expands it and adds guidance/search. `progression.mjs` contains the tested local rules. `Coach.jsx` and `coach.mjs` prepare reviewable prompts without an API dependency.
