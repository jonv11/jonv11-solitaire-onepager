## [Unreleased]

### Added

- Sequential animations for automatic foundation moves

### Changed

### Fixed

- Counting an in-progress game as a loss when starting a new one
- Auto button no longer hangs; auto-play now moves safe cards to foundations deterministically and terminates
- Auto now moves any legal next-rank card to its foundation (e.g., 3 onto 2)

## [0.1.0] - 2025-09-03

### Added
- Initial HTML, CSS, and JS files for the Solitaire game
- Icons displayed on foundation piles
- Win celebration animation when a game is completed
- Auto-complete option to finish when only foundation moves remain
- Cards visibly travel from source to foundation during auto-complete when animations are enabled
- Basic Node-based test harness for unit testing
- Initial solver unit tests migrated from inline test states

### Changed
- Harmonized event system
- Various adjustments and addition of in-game hints
- Card resizing for small screens and timer fix
- Timer stops and undo/redo/hint buttons hide on win; reset on new game

### Fixed
- Event handling on mobile
- Infinite score and improved symbol sizes
- Highlighting issue when selecting cards
- Card teleportation during drag-and-drop
- Hint suggestions now skip redundant moves (e.g., king to empty tableau)
- GitHub Pages settings for deployment
- Redeal limits now enforced for 1 or 3 redeal options
- Deterministic solver script now loaded to enable "no hope" hints
- Auto-complete now prioritizes all foundation moves before tableau moves, preventing premature stops
