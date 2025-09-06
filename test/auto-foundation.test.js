import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { Engine, build } from './fixture-builder.js';

// 1. Waste top Ace should move to empty foundation
test('auto_moves_ace_from_waste', async () => {
  const st = build({ waste: ['H1'] });
  const res = await Engine.runAutoToFixpoint();
  assert.equal(res.moves, 1);
  const hf = st.piles.foundations.find((f) => f.suit === 'H');
  assert.equal(hf.cards.length, 1);
  assert.equal(hf.cards[0].rank, 1);
});

// 2. Tableau Ace moves and flips underlying card
test('auto_moves_ace_from_tableau', async () => {
  const st = build({ tableau: [['h5', 'S1']] });
  const res = await Engine.runAutoToFixpoint();
  assert.equal(res.moves, 1);
  const sf = st.piles.foundations.find((f) => f.suit === 'S');
  assert.equal(sf.cards.length, 1);
  assert.equal(st.piles.tableau[0].cards.length, 1);
  assert.equal(st.piles.tableau[0].cards[0].faceUp, true);
});

// 3. Multiple aces move in deterministic order (waste before tableau)
test('auto_moves_multiple_aces', async () => {
  const st = build({ waste: ['D1'], tableau: [['C1']] });
  const res = await Engine.runAutoToFixpoint();
  assert.equal(res.moves, 2);
  assert.equal(st.piles.foundations.find((f) => f.suit === 'D').cards.length, 1);
  assert.equal(st.piles.foundations.find((f) => f.suit === 'C').cards.length, 1);
  assert.equal(st.piles.waste.cards.length, 0);
  assert.equal(st.piles.tableau[0].cards.length, 0);
});

// 4. Chain moves A→2→3
test('auto_chains_from_ace_to_three', async () => {
  const st = build({ waste: ['H1'], tableau: [['H2'], ['H3']] });
  const res = await Engine.runAutoToFixpoint();
  assert.equal(res.moves, 3);
  const hf = st.piles.foundations.find((f) => f.suit === 'H');
  assert.equal(hf.cards.length, 3);
  assert.equal(hf.cards[2].rank, 3);
});

// 5. Wrong suit ace does not fill other foundations
test('auto_no_false_ace_move', async () => {
  const st = build({ waste: ['C1'] });
  const res = await Engine.runAutoToFixpoint();
  assert.equal(res.moves, 1);
  assert.equal(st.piles.foundations.find((f) => f.suit === 'C').cards.length, 1);
  assert.equal(st.piles.foundations.find((f) => f.suit === 'H').cards.length, 0);
});

// 6. Second run performs no moves
test('auto_is_idempotent_and_terminates', async () => {
  const st = build({ waste: ['H1'] });
  const r1 = await Engine.runAutoToFixpoint();
  const r2 = await Engine.runAutoToFixpoint();
  assert.equal(r1.moves, 1);
  assert.equal(r2.moves, 0);
  const hf = st.piles.foundations.find((f) => f.suit === 'H');
  assert.equal(hf.cards.length, 1);
});
