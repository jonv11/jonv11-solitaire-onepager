# Debug options

## Auto-play logging

Set `window.DEBUG_AUTO = true` in the browser console before starting auto-play.
When enabled, each auto-play iteration logs the current state hash, candidate
moves, and progress counters to the developer console.

## Disable auto-play animations

For testing, set `window.AUTO_ANIMATE = false` to skip the visual animation
while still applying moves.
