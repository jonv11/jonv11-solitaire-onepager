# Architecture Overview

This document describes the architecture of the **Solitaire One-Pager** project.  
The goal is to provide a clear technical view of how the application is structured, how modules interact, and how responsibilities are split across layers.

---

## High-Level Design

The application is a **client-side only web app** (HTML/CSS/JavaScript), deployed via **GitHub Pages**, with no backend dependencies.  
It follows a **modular MVC-inspired design**:

- **Model**: domain logic, card structures, rules helpers.  
- **Engine**: game state management, move validation, scoring, win/loss detection.  
- **UI**: rendering of piles and cards, drag & drop handling, visual feedback.  
- **Controller (main.js)**: orchestrates interactions between UI and Engine, manages settings, and binds to DOM.  
- **Store**: persistence of settings, saved games, and statistics via `localStorage` or cookies fallback.  

---

## Module Responsibilities

### `index.html`
- Provides the structural layout: toolbar, stock/waste/foundations row, tableau grid, and options menu.
- Declares the `<main id="game">` container used by the UI for rendering.

### `css/style.css`
- Defines all visual aspects: card dimensions, responsive grid, themes, highlights, animations.
- Uses CSS custom properties (`--card-w`, `--card-h`, `--gap`) for responsive scaling.
- Media queries adapt the board for portrait and landscape, with optimizations for mobile (clipping card stacks, hiding scrollbars, etc.).

### `js/model.js`
- Pure domain model.
- Defines card objects, piles (stock, waste, foundations, tableau).
- Provides shuffle, deal, and rule helper functions (`canDropOnTableau`, `canDropOnFoundation`).
- Responsible for serialization/deserialization of `GameState`.

### `js/engine.js`
- The authoritative source of truth for the game state.
- Handles:
  - Dealing new games.
  - Executing moves (`move`).
  - Drawing from stock (`draw`).
  - Flipping cards automatically when uncovered.
  - Updating score and move counters.
  - Detecting win/lose conditions and emitting events (`win`, `stuck`).
- Exposes an event emitter API for state change notifications.

### `js/ui.js`
- Manages rendering of the `GameState` into the DOM.
- Creates card elements with suit, rank, and layout (corners + center).
- Handles drag & drop interactions:
  - Tracks pointer events.
  - Allows multi-card drags from tableau stacks.
  - Snaps back illegal moves.
- Provides visual feedback:
  - Highlight of valid targets.
  - Hint highlighting.
  - Animation of auto-moves.
- Publishes and consumes events to stay decoupled from the Engine.

### `js/main.js`
- Acts as the **Controller**.
- Binds toolbar buttons (New, Undo, Redo, Hint, Auto).
- Manages user settings (draw count, redeal policy, left-hand mode, animations, etc.).
- Initializes the game, wires UI and Engine, and starts timers.
- Provides glue code for showing banners or dialogs (win/loss messages).

### `js/store.js`
- Lightweight persistence layer.
- Reads/writes JSON to `localStorage` with graceful fallback to cookies.
- Stores:
  - Player settings.
  - Saved game state.
  - Aggregate statistics (plays, wins, time).

---

## Event Flow

1. **User input** → (click, drag, or toolbar action).
2. **UI** interprets interaction and requests an `Engine.move` or `Engine.draw`.
3. **Engine** validates, updates the state, and emits a `"state"` event.
4. **UI** re-renders piles and cards based on new state.
5. **Controller** saves updated state via `Store` and updates timers/score.
6. If the move leads to win/loss → `Engine` emits `"win"` or `"stuck"` events → Controller/UI display a banner/dialog.

---

## Responsiveness

- **Portrait (mobile)**: board scales to fit 7 columns across screen width; cards shrink with CSS variables.  
- **Landscape (short height)**: tableau cards are visually clipped (half or third) to save vertical space.  
- **Desktop**: card dimensions capped to comfortable maximum (≈120×168 px).  

---

## Extensibility

- **Hint Engine**: integrated into `engine.js` to scan for legal moves and return a suggested `Move`.
- **Auto-move**: moves all safe cards to foundations; can be triggered manually or automatically when no other moves remain.
- **Animations**: encapsulated in CSS + UI so they can be tuned without touching game logic.
- **Theming**: CSS variables make it easy to change look & feel.

---

## Deployment

- Hosted via **GitHub Pages**.  
- No build pipeline; plain HTML/CSS/JS.  
- Can be opened locally (`index.html`) or deployed automatically on push to `main`.

---

## Known Trade-offs

- No undo/redo stack yet (placeholder in controller).  
- AI auto-win detection could be extended to detect forced wins.  
- Double-tap on mobile is emulated, since native `dblclick` is unreliable on touch devices.  

---

## Conclusion

The Solitaire One-Pager is designed to remain lightweight, modular, and easy to maintain.  
By separating **Engine** (rules) from **UI** (rendering) and **Controller** (glue), the codebase supports future features such as statistics, themes, or multiplayer variants without rewriting core logic.
