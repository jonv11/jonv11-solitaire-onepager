// Jest unit tests covering the Auto foundation feature
import { describe, test, expect, beforeEach } from '@jest/globals';
import { Engine, build } from './helpers/stateBuilder.js';

// Reset to a clean state before each test
beforeEach(() => {
  Engine.newGame();
});

describe('Auto foundation moves', () => {
  test('moves ace from waste', async () => {
    const st = build({ waste: ['H1'] });
    const res = await Engine.runAutoToFixpoint();
    expect(res.moves).toBe(1);
    const hf = st.piles.foundations.find((f) => f.suit === 'H');
    expect(hf.cards).toHaveLength(1);
    expect(hf.cards[0].rank).toBe(1);
  });

  test('moves ace from tableau and flips underlying card', async () => {
    const st = build({ tableau: [['h5', 'S1']] });
    const res = await Engine.runAutoToFixpoint();
    expect(res.moves).toBe(1);
    const sf = st.piles.foundations.find((f) => f.suit === 'S');
    expect(sf.cards).toHaveLength(1);
    expect(st.piles.tableau[0].cards[0].faceUp).toBe(true);
  });

  test('moves 3 on 2', async () => {
    const st = build({ foundations: { H: ['H1', 'H2'] }, tableau: [['H3']] });
    const res = await Engine.runAutoToFixpoint();
    expect(res.moves).toBe(1);
    const hf = st.piles.foundations.find((f) => f.suit === 'H');
    expect(hf.cards.map((c) => c.rank)).toEqual([1, 2, 3]);
  });

  test('chains from ace to three', async () => {
    const st = build({ waste: ['H1'], tableau: [['H2'], ['H3']] });
    const res = await Engine.runAutoToFixpoint();
    expect(res.moves).toBe(3);
    const hf = st.piles.foundations.find((f) => f.suit === 'H');
    expect(hf.cards.map((c) => c.rank)).toEqual([1, 2, 3]);
  });

  test('multiple suits deterministic order', async () => {
    // Waste should be processed before tableau columns (left to right)
    const st = build({ waste: ['D1'], tableau: [['C1'], ['S1']] });
    const moves = Engine._findNextFoundationMoves(st);
    expect(moves.map((m) => m.from)).toEqual(['waste', 'tab-1', 'tab-2']);
    await Engine.runAutoToFixpoint();
    const [sf, hf, df, cf] = st.piles.foundations;
    expect(sf.cards).toHaveLength(1); // Spades from tableau[1]
    expect(hf.cards).toHaveLength(0); // No hearts moved
    expect(df.cards).toHaveLength(1); // Diamond from waste
    expect(cf.cards).toHaveLength(1); // Club from tableau[0]
    expect(st.piles.waste.cards).toHaveLength(0);
  });

  test('no illegal jump', async () => {
    const st = build({ waste: ['H4'], foundations: { H: ['H1', 'H2'] } });
    const res = await Engine.runAutoToFixpoint();
    expect(res.moves).toBe(0);
    const hf = st.piles.foundations.find((f) => f.suit === 'H');
    expect(hf.cards.map((c) => c.rank)).toEqual([1, 2]);
    expect(st.piles.waste.cards[0].rank).toBe(4);
  });

  test('idempotent and terminates', async () => {
    const st = build({ waste: ['H1'] });
    const r1 = await Engine.runAutoToFixpoint();
    const r2 = await Engine.runAutoToFixpoint();
    expect(r1.moves).toBe(1);
    expect(r2.moves).toBe(0);
    const hf = st.piles.foundations.find((f) => f.suit === 'H');
    expect(hf.cards).toHaveLength(1);
  });

  test('reentrancy guard', async () => {
    const st = build({ waste: ['H1'] });
    const p1 = Engine.runAutoToFixpoint();
    const p2 = Engine.runAutoToFixpoint();
    const [r1, r2] = await Promise.all([p1, p2]);
    const moves = [r1.moves, r2.moves].sort();
    expect(moves).toEqual([0, 1]);
    const hf = st.piles.foundations.find((f) => f.suit === 'H');
    expect(hf.cards).toHaveLength(1);
  });
});
