# Project Roadmap

This roadmap tracks the progress of the **Solitaire One-Pager** project.  
Each item is marked with a checkbox for clarity.

---

## Core Features
- [x] Basic layout with stock, waste, foundations, and tableau.
- [x] Responsive design (portrait, landscape, desktop).
- [x] Card rendering (rank, suit, corners, center symbol).
- [x] Drag & drop support with snap-back for invalid moves.
- [x] Move validation (tableau, foundations, waste).
- [x] Score and move counter tracking.
- [x] Local persistence of settings and saved game (Store).
- [ ] Undo/Redo stack with multiple levels.
- [ ] Auto move with animation when one or multiple cards can be added to foundations.

---

## Game Logic
- [x] Move rules (alternating colors in tableau, ascending same-suit in foundations).
- [x] Flip last card in tableau automatically when uncovered.
- [x] Redeal rules (draw 1, draw 3, limited/unlimited/no redeal).
- [x] Win detection (all 52 cards in foundations).
- [x] Stuck detection (no legal moves + no redeal).
- [ ] Smarter auto-complete (detect when game is a forced win).
- [ ] Statistics tracking (wins, losses, average time).

---

## User Interface
- [x] Toolbar with New / Undo / Redo / Hint / Auto buttons.
- [x] Expandable “Options” panel (draw count, redeal policy, left-hand mode).
- [x] Hint system (highlight a valid move).
- [x] Highlight valid drop targets.
- [x] Victory / Stuck banner (top fixed, fading).
- [ ] End-of-game modal with summary and quick actions.
- [ ] Improved animations for move/auto/hint highlights.
- [ ] Better settings UI.

---

## Mobile Optimization
- [x] Fit 7 columns across screen in portrait (`--card-w` dynamic).
- [x] Clip tableau stacks (half/third cards) in landscape with limited height.
- [x] Disable text selection and scrolling on cards.
- [x] Responsive `.center` sizing for suit symbol.
- [ ] Double-tap shortcut (auto-move card to foundation).
- [ ] Haptic feedback on move (where supported).
- [ ] Optimize viewport, card size, and vertical gap for visibility in worst-case tableau (6 face-down, 12 face-up cards).

---

## Documentation
- [x] `README.md` with live demo link.
- [x] `ARCHITECTURE.md` (modules and responsibilities).
- [x] `CONTRIBUTING.md` (guidelines).
- [x] `ROADMAP.md` (this document).
- [x] `CHANGELOG.md` with versioned history.
- [ ] Screenshots/GIFs in documentation.

---

## Deployment
- [x] GitHub Pages integration for live demo.
- [ ] Automated CI (GitHub Actions) to lint/test on PR.
- [ ] Release tagging and changelog generation.
