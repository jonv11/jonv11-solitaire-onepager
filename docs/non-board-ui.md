# Non-board UI Structure

The non-board interface is split into three pieces:

- **Top status bar** – flex container with three blocks showing score, moves and time. Elements use IDs `#score`, `#moves` and `#time` so game logic can update them without layout shift.
- **Action bar** – fixed bottom `nav.toolbar` containing the primary buttons: Options, New, Auto, Hint and Undo. Buttons share the `action-btn` class for spacing and focus styles. The Stats button is injected by `stats-ui.js` using the same class.
- **Popups** – modal overlays built with `.popup-overlay` and `.popup` containers. Shared classes: `popup-header`, `popup-close`, `popup-content`, `row`, `toggle-input` and `slider-row`.

## Shared Classes

Spacing, radii, shadows and transitions are defined in `css/style.css` using custom properties (`--ui-gap`, `--ui-radius`, `--ui-shadow`, `--ui-transition`).

| Class | Purpose |
|-------|---------|
| `.popup-overlay` | Full-screen modal backdrop. |
| `.popup` | Framed dialog container. |
| `.popup-header` | Title area with close button. |
| `.popup-content` | Scrollable content region. |
| `.row` | Generic horizontal layout for option rows. |
| `.toggle-input` | Reusable ON/OFF switch. |
| `.slider-row` | Row variant with `<input type="range">`. |
| `.action-btn` | Buttons in the bottom bar. |

## Programmatic Access

Popups expose `Popup.open(overlay, opener)` and `Popup.close(overlay)` helpers.
The Options popup is wired in `js/options-ui.js`; to open or close it manually:

```js
Popup.open(document.getElementById('optionsPopup'));
Popup.close(document.getElementById('optionsPopup'));
```

The Stats popup exports `window.StatsUI.show()` and `window.StatsUI.hide()` for convenience.
