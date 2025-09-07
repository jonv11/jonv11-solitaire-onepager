import { describe, test, expect } from '@jest/globals';
import fs from 'node:fs';
import vm from 'node:vm';

const context = { window: {}, console };
context.window = context;
vm.createContext(context);

for (const file of ['js/emitter.js', 'js/model.js', 'js/engine.js']) {
  const code = fs.readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
  vm.runInContext(code, context, { filename: file });
}

const { Engine, Model } = context.window;

function card(s, r, faceUp = true) {
  return { id: s + r, rank: r, suit: s, color: Model.isRed(s) ? 'red' : 'black', faceUp };
}

test('Engine.isWin detects full foundations', () => {
  const foundations = ['S', 'H', 'D', 'C'].map((s) => ({
    id: 'foundation-' + s,
    kind: 'foundation',
    suit: s,
    cards: Array.from({ length: 13 }, (_, i) => card(s, i + 1)),
  }));
  const st = {
    piles: {
      foundations,
      tableau: Array.from({ length: 7 }, (_, i) => ({ id: 'tab-' + (i + 1), kind: 'tableau', col: i + 1, cards: [] })),
      stock: { id: 'stock', kind: 'stock', cards: [] },
      waste: { id: 'waste', kind: 'waste', cards: [] },
    },
  };
  expect(Engine.isWin(st)).toBe(true);
});

test('Engine.enumerateAutoSafeFoundationMoves finds safe waste moves', () => {
  const foundations = [
    { id: 'foundation-S', kind: 'foundation', suit: 'S', cards: [card('S', 1)] },
    { id: 'foundation-H', kind: 'foundation', suit: 'H', cards: [] },
    { id: 'foundation-D', kind: 'foundation', suit: 'D', cards: [] },
    { id: 'foundation-C', kind: 'foundation', suit: 'C', cards: [] },
  ];
  const st = {
    piles: {
      foundations,
      tableau: Array.from({ length: 7 }, (_, i) => ({ id: 'tab-' + (i + 1), kind: 'tableau', col: i + 1, cards: [] })),
      stock: { id: 'stock', kind: 'stock', cards: [] },
      waste: { id: 'waste', kind: 'waste', cards: [card('S', 2)] },
    },
    settings: {},
  };
  const moves = Engine.enumerateAutoSafeFoundationMoves(st);
  expect(JSON.stringify(moves)).toBe(
    JSON.stringify([{ type: 'move', src: 'waste', cardIndex: 0, dst: 'foundation-S' }])
  );
});
