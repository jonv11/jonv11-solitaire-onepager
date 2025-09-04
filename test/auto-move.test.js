import { test } from 'node:test';
import { strict as assert } from 'node:assert';
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

const TEST_SETTINGS = { drawCount: 1, redealPolicy: 'none', leftHandMode: false, animations: false, hints: true, autoComplete: true, sound: false };

function card(s, r, faceUp = true) {
  return { id: s + r, rank: r, suit: s, color: Model.isRed(s) ? 'red' : 'black', faceUp };
}

function emptyPiles() {
  return {
    foundations: ['S','H','D','C'].map((s) => ({ id: 'foundation-' + s, kind: 'foundation', suit: s, cards: [] })),
    tableau: Array.from({ length: 7 }, (_, i) => ({ id: 'tab-' + (i + 1), kind: 'tableau', col: i + 1, cards: [] })),
    stock: { id: 'stock', kind: 'stock', cards: [] },
    waste: { id: 'waste', kind: 'waste', cards: [] },
  };
}

test('moves tableau top card to foundation and flips beneath card', () => {
  Engine.newGame(TEST_SETTINGS);
  const st = Engine.getState();
  st.piles = emptyPiles();
  st.piles.foundations[1].cards = []; // hearts foundation
  st.piles.tableau[0].cards = [card('H',5,false), card('H',1,true)];

  Engine.autoMoveToFoundations();

  assert.equal(st.piles.foundations[1].cards.length, 1);
  assert.equal(st.piles.foundations[1].cards[0].rank, 1);
  assert.equal(st.piles.tableau[0].cards.length, 1);
  assert.equal(st.piles.tableau[0].cards[0].rank, 5);
  assert.equal(st.piles.tableau[0].cards[0].faceUp, true);
});

test('moves waste card to foundation', () => {
  Engine.newGame(TEST_SETTINGS);
  const st = Engine.getState();
  st.piles = emptyPiles();
  st.piles.foundations[0].cards = [card('S',1)];
  st.piles.waste.cards = [card('S',2,true)];

  Engine.autoMoveToFoundations();

  assert.equal(st.piles.foundations[0].cards.length, 2);
  assert.equal(st.piles.waste.cards.length, 0);
});

test('does not draw from stock automatically', () => {
  Engine.newGame(TEST_SETTINGS);
  const st = Engine.getState();
  st.piles = emptyPiles();
  st.piles.foundations[2].cards = [card('D',1)];
  st.piles.stock.cards = [card('D',2,false)];

  Engine.autoMoveToFoundations();

  assert.equal(st.piles.foundations[2].cards.length, 1);
  assert.equal(st.piles.stock.cards.length, 1);
  assert.equal(st.piles.waste.cards.length, 0);
});

test('chains multiple moves from tableau and waste when safe', () => {
  Engine.newGame(TEST_SETTINGS);
  const st = Engine.getState();
  st.piles = emptyPiles();
  // Advance red foundations so that 4♠ is safe to move
  st.piles.foundations[1].cards = [card('H',1), card('H',2), card('H',3)];
  st.piles.foundations[2].cards = [card('D',1), card('D',2), card('D',3)];
  st.piles.foundations[0].cards = [card('S',1)];
  st.piles.tableau[0].cards = [card('S',2,true)];
  st.piles.tableau[1].cards = [card('S',3,true)];
  st.piles.waste.cards = [card('S',4,true)];

  Engine.autoMoveToFoundations();

  assert.equal(st.piles.foundations[0].cards.length, 4);
  assert.equal(st.piles.tableau[0].cards.length, 0);
  assert.equal(st.piles.tableau[1].cards.length, 0);
  assert.equal(st.piles.waste.cards.length, 0);
});

test('skips unsafe foundation moves', () => {
  Engine.newGame(TEST_SETTINGS);
  const st = Engine.getState();
  st.piles = emptyPiles();
  // Clubs foundation ready for a 3♣
  st.piles.foundations[3].cards = [card('C',1), card('C',2)];
  // Opposite colour foundations have not reached rank 2
  st.piles.foundations[1].cards = [card('H',1)];
  st.piles.foundations[2].cards = [];
  // Tableau exposes the 3♣ which would be legal but unsafe
  st.piles.tableau[0].cards = [card('C',3,true)];

  Engine.autoMoveToFoundations();

  // 3♣ should remain on the tableau because the move is unsafe
  assert.equal(st.piles.foundations[3].cards.length, 2);
  assert.equal(st.piles.tableau[0].cards.length, 1);
  assert.equal(st.piles.tableau[0].cards[0].rank, 3);
});
