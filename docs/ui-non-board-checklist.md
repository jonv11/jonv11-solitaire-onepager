# UI Non-board Checklist

Manual steps to verify the top bar, popups and action bar.

## Status Bar
- [ ] Three blocks show score, moves and time left/center/right.
- [ ] Updating values does not shift layout or vertical alignment.

## Popups
- [ ] Options and Stats match styling: header, shadow, radius and padding.
- [ ] Opening a popup disables page scroll and focuses first control.
- [ ] Popup closes via header X, `Esc`, or clicking outside.
- [ ] Tab cycles through controls; focus returns to opener on close.

## Action Bar
- [ ] Buttons (Options, New, Auto, Hint, Undo, Stats) are evenly spaced and remain above system gesture areas.
- [ ] Each button exposes one focusable target with icon and label.

## Controls
- [ ] Toggles respond to pointer and keyboard (`Space`/`Enter`).
- [ ] Slider responds to drag and keyboard arrows.

## Responsiveness
- [ ] At widths 320–414 px, touch targets are ≥44 px and no elements overlap.
- [ ] Wider screens scale while keeping action bar visible.

## Accessibility
- [ ] All interactive elements show a visible focus outline.
- [ ] Popups announce their titles to screen readers.

## Regressions
- [ ] Stats popup still opens and functions as before using shared styles.
