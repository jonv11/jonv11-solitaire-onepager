/* @jest-environment jsdom */
// Jest tests for Standard scoring rules and time penalties
import { describe, test, expect, beforeEach } from '@jest/globals';
import { Engine, build, parseCard } from './helpers/stateBuilder.js';
import fs from 'node:fs';
import vm from 'node:vm';

// Load SoliStats into the current context for persistence checks
function loadStats() {
  const context = { window: {}, console, localStorage };
  context.window = context;
  vm.createContext(context);
  const code = fs.readFileSync(new URL('../js/stats.js', import.meta.url), 'utf8');
  vm.runInContext(code, context, { filename: 'stats.js' });
  return context.window.SoliStats;
}

beforeEach(() => {
  // Ensure a clean storage before each test
  localStorage.clear();
});

describe('Standard scoring events', () => {
  test('Tableau → Foundation and back is neutral', () => {
    const st = build({ tableau: [['H1']] });
    Engine.move({ srcPileId: 'tab-1', cardIndex: 0, dstPileId: 'foundation-H' });
    Engine.move({ srcPileId: 'foundation-H', cardIndex: 0, dstPileId: 'tab-1' });
    expect(st.score.total).toBe(0);
  });

  test('Waste → Foundation gives +10 once', () => {
    const st = build({ waste: ['H1'] });
    Engine.move({ srcPileId: 'waste', cardIndex: 0, dstPileId: 'foundation-H' });
    expect(st.score.total).toBe(10);
    Engine.move({ srcPileId: 'foundation-H', cardIndex: 0, dstPileId: 'tab-1' });
    Engine.move({ srcPileId: 'tab-1', cardIndex: 0, dstPileId: 'foundation-H' });
    expect(st.score.total).toBe(10);
  });

  test('Reveal bonus fires only once per card', () => {
    const st = build({ tableau: [['h5', 'S1']] });
    Engine.move({ srcPileId: 'tab-1', cardIndex: 1, dstPileId: 'foundation-S' });
    Engine.move({ srcPileId: 'foundation-S', cardIndex: 0, dstPileId: 'tab-1' });
    Engine.move({ srcPileId: 'tab-1', cardIndex: 0, dstPileId: 'foundation-S' });
    expect(st.score.total).toBe(10);
  });

  test('Time penalty subtracts 6 after 30s', () => {
    const st = build();
    st.time.startedAt -= 30000; // 30 seconds ago
    st.time.nextPenaltyAt = st.time.startedAt + st.settings.timePenaltySecs * 1000;
    Engine.tick();
    expect(st.score.total).toBe(-6);
  });

  test('Penalty during auto-complete and stops on win', async () => {
    // Part A: auto-complete without winning still applies penalty
    const st1 = build({ waste: ['H1'], tableau: [['S1']] });
    st1.time.startedAt -= 10000;
    st1.time.nextPenaltyAt = st1.time.startedAt + st1.settings.timePenaltySecs * 1000;
    await Engine.runAutoToFixpoint();
    Engine.tick();
    expect(st1.score.total).toBe(13); // +10 waste, +5 tableau, -2 penalty

    // Part B: once won, further penalties stop
    const st2 = build({
      foundations: { H: ['H1','H2','H3','H4','H5','H6','H7','H8','H9','H10','H11','H12'] },
      waste: ['H13'],
    });
    st2.time.startedAt -= 10000;
    st2.time.nextPenaltyAt = st2.time.startedAt + st2.settings.timePenaltySecs * 1000;
    await Engine.runAutoToFixpoint(); // moves H13 and triggers win
    Engine.tick();
    const scoreAfterWin = st2.score.total; // includes +10 deposit and +100 win bonus
    st2.time.startedAt -= 20000; // advance time further
    Engine.tick();
    expect(st2.score.total).toBe(scoreAfterWin);
  });

  test('No points for waste→tableau, stock draw, or tableau→tableau', () => {
    const st = build({ waste: ['H1'], tableau: [['C13'], ['D12']] });
    Engine.move({ srcPileId: 'waste', cardIndex: 0, dstPileId: 'tab-1' });
    expect(st.score.total).toBe(0);
    Engine.move({ srcPileId: 'tab-2', cardIndex: 0, dstPileId: 'tab-1' });
    expect(st.score.total).toBe(0);
    st.piles.stock.cards = [parseCard('S2')];
    Engine.draw();
    expect(st.score.total).toBe(0);
  });
});

describe('Score persistence', () => {
  test('Average score persists across reloads', () => {
    const Stats = loadStats();
    Stats.initStats();
    for (const sc of [10, 20, 30]) {
      Stats.commitResult({
        ts: 1,
        te: 2,
        w: 0,
        m: 0,
        t: 0,
        dr: 1,
        sc,
        rv: 0,
        fu: [0, 0, 0, 0],
        ab: 'none',
      });
    }
    // Simulate reload
    const Stats2 = loadStats();
    Stats2.initStats();
    const agg = Stats2.loadAgg().g;
    expect(agg.sumScore).toBe(60);
    expect(agg.played).toBe(3);
    expect(agg.avgScore).toBeCloseTo(20.0);
  });
});

