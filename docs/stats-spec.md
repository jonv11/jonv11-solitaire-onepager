# Statistics System Specification

This document describes the client side statistics kept in `localStorage`.
All data stays on the player's device.

## Keys

- `soli.v1.meta` – metadata `{ ver, n }` where `n` is the retained session count.
- `soli.v1.sessions` – array of recent finished game summaries.
- `soli.v1.stats` – aggregates derived from sessions.
- `soli.v1.current` – snapshot of the current in‑progress game.

## Game summary (v1)

```json
{
  "ts": 0,    // start timestamp
  "te": 0,    // end timestamp
  "w": 0,     // 1 if win
  "m": 0,     // moves
  "t": 0,     // duration seconds
  "dr": 1,    // draw mode 1 or 3
  "sc": 0,    // score
  "rv": 0,    // redeals used
  "fu": [0,0,0,0], // foundations heights
  "ab": "none"    // abandon cause
}
```

Additional fields may appear and are ignored by the reader.

## Aggregates

`soli.v1.stats` stores counters for all games (`g`) and per draw mode (`d1` and `d3`).
Each aggregate contains:

- `played`, `wins`, `winStreak`, `bestStreak`
- `bestTime`, `bestScore`
- sums and averages for time, moves and recycles
- histograms `histT` and `histM`

Histograms use five buckets:

- Time (seconds): `[0–180,181–300,301–480,481–720,721+]`
- Moves: `[0–80,81–110,111–150,151–200,201+]`

## API surface

The `SoliStats` namespace exposes:

- `initStats(config)`
- `loadMeta()`, `loadSessions()`, `loadAgg()`
- `saveCurrent(snapshot)`, `clearCurrent()`
- `checkpoint(event)`
- `commitResult(summary)`
- `recomputeAgg()`
- `exportAll()`, `importAll(json, mode)`
- `migrateIfNeeded()`

All storage interaction is wrapped with `safeGet`, `safeSet` and `safeRemove` which
protect against quota errors by pruning old sessions first.

## Migration

`meta.ver` allows future schema upgrades.  Version 1 is the initial release and
migrations are a no‑op.
