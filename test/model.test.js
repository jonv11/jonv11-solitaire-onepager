import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import fs from 'node:fs';
import vm from 'node:vm';

const context = { window: {}, console };
context.window = context;
vm.createContext(context);

const code = fs.readFileSync(new URL('../js/model.js', import.meta.url), 'utf8');
vm.runInContext(code, context, { filename: 'js/model.js' });

const { Model } = context.window;

function card(s, r, faceUp=true){
  return { id: s + r, suit: s, rank: r, color: Model.isRed(s) ? 'red':'black', faceUp };
}

test('newOrderedDeck creates 52 unique cards', () => {
  const deck = Model.newOrderedDeck();
  assert.equal(deck.length, 52);
  const ids = new Set(deck.map(c => c.id));
  assert.equal(ids.size, 52);
});

test('shuffle with seeded generator is deterministic', () => {
  const arr1 = [1,2,3,4,5,6,7,8,9,10];
  const arr2 = [1,2,3,4,5,6,7,8,9,10];
  const s1 = Model.shuffle(arr1.slice(), Model.lcg(123));
  const s2 = Model.shuffle(arr2.slice(), Model.lcg(123));
  assert.deepStrictEqual(s1, s2);
});

test('canDropOnTableau and canDropOnFoundation obey rules', () => {
  const kS = card('S',13);
  assert.equal(Model.canDropOnTableau(kS, null), true);
  const qH = card('H',12);
  assert.equal(Model.canDropOnTableau(qH, kS), true);
  const aC = card('C',1);
  assert.equal(Model.canDropOnFoundation(aC, null, 'C'), true);
  const twoC = card('C',2);
  assert.equal(Model.canDropOnFoundation(twoC, aC, 'C'), true);
  const wrongSuit = card('D',2);
  assert.equal(Model.canDropOnFoundation(wrongSuit, aC, 'C'), false);
});
