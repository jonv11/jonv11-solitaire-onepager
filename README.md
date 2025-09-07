Klondike Solitaire implemented as a single-page web app. No backend. Offline-capable. Desktop and mobile friendly.

> Live demo: [https://jonv11.github.io/jonv11-solitaire-onepager/](https://jonv11.github.io/jonv11-solitaire-onepager/)

---

## Features

- Klondike rules: stock, waste, 7 tableau piles, 4 foundations.
- Input: drag and drop or click source → destination.
- Auto-move to foundations on double-click or tap.
- Draw-1 or Draw-3 modes. Optional redeal limits.
- Undo/Redo with incremental DOM patching.
- Scoring: Standard and Vegas.
- Hints and optional auto-complete (auto-finish remaining foundation moves when a win is guaranteed).
- Deterministic solver API to detect proven dead-ends.
- Persistent settings and stats in `localStorage` with cookie fallback.
- One HTML file, split CSS/JS, no frameworks required.

## Auto-play

The **Auto** button moves every legal next-rank card from the waste and tableau
to its matching foundation. Waste is scanned first, followed by tableau columns
from left to right. Each applied move animates the card travelling to its
foundation when animations are enabled. The routine stops when no further
foundation moves remain and the button is re-enabled after completion.

---

## Game rules (technical summary)

**Goal**  
Move all cards to the four foundations by suit in ascending order A→K.

**Setup**  
- 52-card deck, shuffled.  
- Tableau: 7 piles, pile *i* has *i* cards, only the top is face-up.  
- Foundations: 4 empty piles by suit.  
- Stock: remaining face-down cards.  
- Waste: face-up discard from the stock.

**Moves**  
- **Tableau building:** descending rank, alternating colors. Example: 7♠ on 8♦.  
- **Multiple-card moves:** move a face-up sequence that follows alternating-color descending order.  
- **Empty tableau:** only a King or a sequence starting with a King can be moved to an empty tableau pile.  
- **Foundations:** build by suit ascending A→K. Only the next rank of the same suit is legal.  
- **Stock → Waste:** draw one or three cards depending on mode.  
- **Redeal:** when stock is empty, turn waste face-down to form a new stock as allowed by settings.

**Win condition**  
All 52 cards placed on foundations.

---

## Controls

- **Desktop**
  - Drag a card or valid sequence onto a legal target.
  - Double-click a card to auto-move to a foundation if legal.
  - Keyboard: `Space` draw, `U` undo, `R` redo, `H` hint, `A` auto-complete, `←/→/↑/↓` focus navigation, `Enter` move when a target is legal.

- **Mobile/Tablet**
  - Drag a card or valid sequence onto a legal target.
  - Double-tap to auto-move to foundation.

---

## Non-board UI

The top status bar, action bar and modal popups share styling helpers.
See [docs/non-board-ui.md](docs/non-board-ui.md) for class names and programmatic control.

---

## Auto-complete

When a win is certain and only moves to the foundations remain, the game can finish for you. Press the **Auto** button or `A` key to trigger automatic play-out. The engine then moves every remaining card to its foundation in order—similar to "auto-finish" in classic Solitaire apps—granting any time bonus and ending the round without further input.

---

## Settings

All settings persist between sessions.

- `drawCount`: `1` or `3`. Default `1`.  
- `redealPolicy`: `"unlimited" | "limited(n)" | "none"`. Default `"unlimited"`.  
- `leftHandMode`: mirror layout for left-hand use. Default `false`.  
- `animations`: enable simple transitions. Default `true`.  
- `hints`: enable hint engine. Default `true`.  
- `autoComplete`: allow finishing when only foundation moves remain. Default `true`.  
- `sound`: simple UI sounds. Default `false`.

---

## Scoring

- **Standard**  
  - +5 move from tableau to foundation  
  - +10 waste to foundation  
  - +5 tableau to tableau (uncovering counts separately)  
  - −15 every 10 seconds idle (optional)  
  - Bonus for time remaining when auto-complete starts

- **Vegas**  
  - Start bankroll −$52  
  - +$5 per card to foundation  
  - Optional cumulative score across plays

All values are constants in `js/engine.js` and can be adjusted.

---

## Persistence

Uses `localStorage`. Falls back to browser cookie via a tiny jQuery helper if unavailable.

**Keys**
- `solitaire.settings` → JSON of Settings
- `solitaire.saved` → current `GameState` for resume
- `solitaire.stats` → wins, time, moves, streaks, vegas bankroll

### Storage and Stats

Schema v1 stores a rolling window of finished games and aggregated counters
under `soli.v1.*` keys in `localStorage`. Statistics stay on the device and can
be exported or imported via the **Stats** panel. No data leaves the browser.

---

## Internationalization

UI strings are stored in `assets/i18n/{lang}.json`. English (`en`) and French (`fr`) are bundled.

**Detection order on first load**
1. `?lang=xx` query parameter if supported
2. Saved choice in `localStorage`
3. Browser languages (`navigator.language` / `navigator.languages`)
4. Default to English

The chosen language persists in `localStorage`. The query parameter provides a one-time override.

**Adding a language**
1. Create `assets/i18n/<code>.json` based on existing keys.
2. Translate all keys from `assets/i18n/en.json`.
3. Avoid HTML in values unless already safe in the UI.
4. Test via `?lang=<code>` and by switching through the Options panel.

**Markup rules**
- Use `data-i18n="key"` for text content.
- Use `data-i18n-attr="attr:key"` to translate attributes.
- Dynamic text is translated in JavaScript via `I18n.t()`.

---

## Data model

```ts
// js/model.js
type Suit = 'S' | 'H' | 'D' | 'C';
type Color = 'black' | 'red';

interface Card { id: string; rank: 1|2|...|13; suit: Suit; color: Color; faceUp: boolean; }
interface Pile { id: string; kind: 'tableau'|'foundation'|'stock'|'waste'; cards: Card[]; }

interface GameState {
  seed: number;
  piles: { tableau: Pile[]; foundations: Pile[]; stock: Pile; waste: Pile; };
  settings: Settings;
  score: ScoreState;
  history: UndoDelta[];   // incremental operations for undo/redo
  time: { startedAt: number; elapsedMs: number; };
}
```

`UndoDelta` stores small mutations (flip, move, append, remove) to patch the DOM without re-rendering the whole board.

---

## Architecture

- **model.js**: card types, game state, serializers.  
- **engine.js**: shuffling, deal, move validation, scoring, hint engine, win detection.  
- **ui.js**: DOM bindings, drag-drop logic, focus navigation, ARIA roles, animations.  
- **store.js**: persistence API for settings, stats, and saved games.  
- **main.js**: boot, event wiring, settings panel.

DOM updates are incremental: compute `UndoDelta[]` per move and apply targeted patches. Avoid global reflow.

---

## Accessibility

- Landmarks: `main`, `nav`, `section` per pile group.  
- Roles: `list` for piles, `listitem` for cards.  
- ARIA: `aria-label` for pile names and counts, `aria-live="polite"` for move feedback.  
- Keyboard traversal for all interactive elements.  
- High-contrast mode through a CSS variable toggle.

---

## Performance

- No framework. Minimal DOM nodes.  
- CSS transforms for movement.  
- `requestAnimationFrame` for animations.  
- Batch classList mutations.  
- Avoid layout thrash; read then write.

---

## Project structure

```
jonv11-solitaire-onepager/
├── index.html
├── css/
│   └── style.css
├── js/
│   ├── store.js
│   ├── model.js
│   ├── engine.js
│   ├── ui.js
│   └── main.js
├── docs/
│   ├── ARCHITECTURE.md
│   ├── CONTRIBUTING.md
│   └── ROADMAP.md
├── .github/
│   ├── workflows/
│   │   ├── tests.yml
│   │   └── codeql.yml
│   └── pull_request_template.md
├── .editorconfig
├── .gitattributes
├── .gitignore
├── .eslintrc.json
├── .eslintignore
├── .prettierrc.json
├── jest.config.cjs
├── CODE_OF_CONDUCT.md
├── CONTRIBUTING.md
├── SECURITY.md
├── LICENSE
├── CHANGELOG.md
└── README.md
```

---

## Getting started

**Requirements**  
Any recent browser. Optional: Node.js ≥ 18 for tooling.

**Local run**  
Open `index.html` directly, or use a static server:

```bash
# optional
npx serve .
# or
python -m http.server 8080
```

**Install dev tooling**

```bash
npm i
# if you add ESLint/Vitest:
npm run lint
npm test
```

### Node and npm

- Run `nvm use` to match the Node version in `.nvmrc`.
- Use `npm ci` for installs so the lockfile is respected.
- Before committing, run `npm run lint` and `npm test` locally.
- When dependencies change, run `npm install` locally and commit the updated `package-lock.json`.
- If private packages are added, configure an `NPM_TOKEN` repository secret so CI can authenticate.

---

## Testing

- Framework: Jest (single framework for all unit and integration tests)
- Location: 	ests/
- Naming: use *.test.js or *.spec.js
- Environment: default Node; use jsdom explicitly in tests that touch the DOM
- Setup: common polyfills in 	ests/setup-globals.js (auto-loaded via Jest config)
- Coverage: 
pm run test:coverage (outputs coverage/lcov.info)

Guidelines:
- Prefer deterministic, headless tests. Use the VM pattern to load js/*.js into a sandboxed context when not testing UI wiring.
- Avoid 
ode:test; use Jest�s 	est/expect API for new tests.
- Keep browser-run ad hoc tests out of the repo; convert them to automated Jest tests when possible.

Commands:
- Run all tests: 
pm test
- Run a single file: 
px jest tests/engine.test.js
- Watch mode: 
px jest --watch

---
## Build and deploy

No build step is required. Deploy the repository root as static files.

**GitHub Pages**
1. Settings → Pages → Source: `main` → `/ (root)`.
2. Wait for Pages to publish. The URL is shown in the Pages panel.

**Any static host**  
Upload the repository contents or point the host to the repo root.

---

## CI

`.github/workflows/test.yml` runs:
- Install via `npm install --no-audit --no-fund`
- Run unit tests with Jest and collect coverage (`npm run test:coverage`)
- Upload `coverage/lcov.info` as an artifact

Protect `main` with required status checks and 1 review.

## Release

Run the `Release` workflow from the Actions tab with an input `version` (SemVer).
The workflow updates `package.json` and `CHANGELOG.md`, tags the commit, and
publishes a GitHub Release.

The `CHANGELOG.md` follows [Keep a Changelog](https://keepachangelog.com)
with an `Unreleased` section for upcoming changes.

---

## Roadmap

- Drag-and-drop with rollback when illegal.
- Undo/Redo for all actions including settings changes.
- Hints and auto-complete for finishing when only foundation moves remain.
- Vegas and Standard scoring, timer, and stats UI.
- Left-hand mode, draw-1/draw-3, redeal policies.
- GitHub Pages deployment.

See `docs/ROADMAP.md` for details.

---

## Contributing

- Use Conventional Commits.  
- Target `develop` for feature work.  
- Add unit tests alongside logic changes.
- Keep comments, identifiers, and tests in English.
- Open a PR with a clear description and screenshots or GIFs if UI changes.
- Ensure secret scanning and push protection are enabled in repository settings.

See `docs/CONTRIBUTING.md`.

---

## License

MIT. See `LICENSE`.

---

## Credits

- This project follows the `jonv11` repository conventions for structure, naming, and CI.

