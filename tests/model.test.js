import { describe, test, expect } from '@jest/globals';
import fs from 'node:fs';
import vm from 'node:vm';

const context = { window: {}, console };
context.window = context;
vm.createContext(context);

const code = fs.readFileSync(new URL('../js/model.js', import.meta.url), 'utf8');
vm.runInContext(code, context, { filename: 'js/model.js' });

const { Model } = context.window;

function card(s, r, faceUp = true) {
  return { id: s + r, suit: s, rank: r, color: Model.isRed(s) ? 'red' : 'black', faceUp };
}

test('newOrderedDeck creates 52 unique cards', () => {
  const deck = Model.newOrderedDeck();
  expect(deck.length).toBe(52);
  const ids = new Set(deck.map((c) => c.id));
  expect(ids.size).toBe(52);
});

test('shuffle with seeded generator is deterministic', () => {
  const arr1 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const arr2 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const s1 = Model.shuffle(arr1.slice(), Model.lcg(123));
  const s2 = Model.shuffle(arr2.slice(), Model.lcg(123));
  expect(s1).toStrictEqual(s2);
});

test('canDropOnTableau and canDropOnFoundation obey rules', () => {
  const kS = card('S', 13);
  expect(Model.canDropOnTableau(kS, null)).toBe(true);
  const qH = card('H', 12);
  expect(Model.canDropOnTableau(qH, kS)).toBe(true);
  const aC = card('C', 1);
  expect(Model.canDropOnFoundation(aC, null, 'C')).toBe(true);
  const twoC = card('C', 2);
  expect(Model.canDropOnFoundation(twoC, aC, 'C')).toBe(true);
  const wrongSuit = card('D', 2);
  expect(Model.canDropOnFoundation(wrongSuit, aC, 'C')).toBe(false);
});

