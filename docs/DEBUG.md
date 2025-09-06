# Debug options

## Auto-play logging

Set `window.DEBUG_AUTO = true` in the browser console before starting auto-play.
When enabled, each auto-play iteration logs the current state hash, the list of
candidate moves, and the move that was applied. Output uses `console.debug` so
production builds remain silent.

## Disable auto-play animations

For testing, set `window.AUTO_ANIMATE = false` to skip the visual animation
while still applying moves.
