# 🎯 Plinko

A modern, **provably-fair** Plinko game built with **Angular 21** — drop the ball, watch it bounce through the pegs, and win up to **1000×** your stake. Supports multiple local players, full game history, and a leaderboard, all persisted in your browser.

> Rewritten from scratch in Angular (the original React + Matter.js version lives in git history) to fix four things: **fair payouts**, **responsiveness**, **deterministic outcomes**, and **performance**.

---

## ✨ Features

- **Provably-fair engine** — every drop is decided by a seeded HMAC-SHA256 RNG with a **binomial** landing distribution, so the house edge (RTP ≈ 99%) is mathematically guaranteed, not an accident of physics. Every result stores its `serverSeed` / `clientSeed` / `nonce` and can be re-verified.
- **9 board sizes** (8–16 rows) × **3 risk modes** (low / normal / high) — 27 payout tables, ported and RTP-validated by unit tests.
- **Multiple players** — create profiles, switch between them, each with its own balance and history.
- **Leaderboard** — players ranked by balance, with drops played and biggest win.
- **Persistent** — players and results are stored in **IndexedDB** (with an in-memory fallback for private mode), surviving reloads.
- **Custom canvas animation** — no physics library; a lightweight `requestAnimationFrame` animator renders a believable ball path into the predetermined bucket and **idles when no ball is in flight**.
- **Fully responsive** — one resolution-independent code path scales from phone to desktop.
- **Accessible** — keyboard focus, `aria-live` win announcements, `prefers-reduced-motion` support, and 44px touch targets.

---

## 🧠 How "provably fair" works

The key design decision is **decoupling the outcome from the animation**:

1. A per-session secret `serverSeed` + a `clientSeed` + an incrementing `nonce` are fed into `HMAC-SHA256` to produce a deterministic bit stream.
2. Each bit is a left/right decision at one peg row. The **bucket index = number of right moves**, which is a true `Binomial(rows, 0.5)` distribution.
3. The multiplier table maps that bucket to a payout. Because the distribution is exact, the expected return (RTP) is provable — the ported tables yield ~99%.
4. The canvas animation simply *plays back* the decided path; the physics is cosmetic.

`verifyOutcome()` recomputes any stored result from its seed + nonce, so a player can audit history. See [`src/app/core/fairness/`](src/app/core/fairness).

---

## 🛠 Tech stack

| Concern | Choice |
| --- | --- |
| Framework | Angular 21 (standalone, **zoneless**, `OnPush`) |
| Reactivity | Signals + **NgRx Signal Store** (`@ngrx/signals`) |
| Persistence | IndexedDB via [`idb`](https://github.com/jakearchibald/idb) |
| Rendering | Canvas 2D + `requestAnimationFrame` (no physics lib) |
| Crypto | Web Crypto (`crypto.subtle` HMAC-SHA256) |
| Testing | Vitest (`@angular/build:unit-test`) + `fake-indexeddb` |
| Fonts | Inter (UI, tabular numerals) + Space Grotesk (display) |

---

## 🚀 Getting started

**Prerequisites:** Node.js 20+ and npm.

```bash
npm install         # install dependencies
npm start           # dev server at http://localhost:4200
npm run build       # production build → dist/
npm test            # run the unit suite (Vitest)
```

---

## 📂 Project structure

```
src/app/
├── core/
│   ├── fairness/     # provably-fair engine: rng, outcome, multiplier tables (PURE, unit-tested)
│   ├── db/           # IndexedDB store (idb) + in-memory fallback + DI token
│   ├── audio/        # pooled sound effects with a mute toggle
│   ├── models/       # Player, GameResult types
│   └── util/         # money rounding & formatting
├── state/            # NgRx Signal Stores: players, game-config, history + GameService facade
├── features/
│   ├── auth/         # player-select screen + route guard
│   ├── game/         # board (canvas), controls, history panel, game page
│   └── leaderboard/  # leaderboard page
└── shared/           # money pipe, reusable UI
```

---

## ✅ Testing

40+ unit tests cover the parts where correctness matters:

- **Fairness** — determinism (same seed → same path), binomial distribution, and an RTP band assertion for every (rows, risk) combo.
- **Persistence** — IndexedDB round-trips for players and results (run against both the real and in-memory stores).
- **State** — bet debit / payout credit, balance integrity, history cap, nonce advancement.

```bash
npm test
```

The fairness specs run in the Node test environment so Web Crypto is available.

---

## ⚡ Performance

- **Lazy-loaded routes** keep the initial bundle small (~75 kB transferred).
- The canvas loop **only runs while a ball is animating** — the board is static between drops, so the CPU/GPU idle at rest (important for battery on mobile).
- Capped `devicePixelRatio` (≤ 2.5) avoids oversized backing stores on high-DPI screens.
- `OnPush` everywhere; canvas pixels are invisible to change detection.

---

## 🔍 SEO & sharing

`index.html` ships Open Graph + Twitter Card metadata, a description, theme color, a web app manifest, `robots.txt`, `sitemap.xml`, and a branded `og-image.svg`. The app is client-rendered; for full crawler coverage of the marketing route, add Angular SSR/prerendering (`ng add @angular/ssr`).

---

## 📝 Notes

- **Local only** — no backend; everything lives in the browser. Clearing site data resets players and history.
- Not real-money gambling — it's a self-contained simulator/demo.
