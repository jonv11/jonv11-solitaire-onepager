import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import fs from 'node:fs';
import vm from 'node:vm';

const context = { window: {}, console, setTimeout, clearTimeout };
context.window = context;
vm.createContext(context);

for (const file of ['js/emitter.js', 'js/model.js', 'js/engine.js']) {
  const code = fs.readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
  vm.runInContext(code, context, { filename: file });
}

const { Engine, Model } = context.window;

const TEST_SETTINGS = {
  drawCount: 1,
  redealPolicy: 'none',
  leftHandMode: false,
  animations: false,
  hints: true,
  autoComplete: true,
  sound: false,
};

function card(s, r, faceUp = true) {
  return { id: s + r, rank: r, suit: s, color: Model.isRed(s) ? 'red' : 'black', faceUp };
}

function emptyPiles() {
  return {
    foundations: ['S', 'H', 'D', 'C'].map((s) => ({ id: 'foundation-' + s, kind: 'foundation', suit: s, cards: [] })),
    tableau: Array.from({ length: 7 }, (_, i) => ({ id: 'tab-' + (i + 1), kind: 'tableau', col: i + 1, cards: [] })),
    stock: { id: 'stock', kind: 'stock', cards: [] },
    waste: { id: 'waste', kind: 'waste', cards: [] },
  };
}

function parseCode(code) {
  const suit = code[0];
  const rank = Number(code.slice(1));
  return card(suit, rank, true);
}

function loadFixture(name) {
  const data = JSON.parse(fs.readFileSync(new URL(`./fixtures/${name}.json`, import.meta.url), 'utf8'));
  Engine.newGame(TEST_SETTINGS);
  const st = Engine.getState();
  st.piles = emptyPiles();
  for (const [suit, arr] of Object.entries(data.foundations)) {
    const pile = st.piles.foundations.find((f) => f.suit === suit);
    pile.cards = arr.map(parseCode);
  }
  st.piles.waste.cards = data.waste.map(parseCode);
  data.tableau.forEach((col, i) => {
    st.piles.tableau[i].cards = col.map(parseCode);
  });
  return st;
}

test('regression: waste 2S moves to foundation', async () => {
  const st = loadFixture('auto-hang');
  const res = await Engine.runAutoToFixpoint();
  assert.equal(res.moves, 1);
  assert.equal(st.piles.foundations.find((f) => f.suit === 'S').cards.length, 2);
  assert.equal(st.piles.waste.cards.length, 0);
});

test('chains waste then tableau moves deterministically', async () => {
  Engine.newGame(TEST_SETTINGS);
  const st = Engine.getState();
  st.piles = emptyPiles();
  st.piles.foundations[0].cards = [card('S', 1)];
  st.piles.foundations[1].cards = [card('H', 1)];
  st.piles.waste.cards = [card('S', 2, true)];
  st.piles.tableau[0].cards = [card('H', 2, true)];
  const res = await Engine.runAutoToFixpoint();
  assert.equal(res.moves, 2);
  assert.equal(st.piles.foundations[0].cards.length, 2);
  assert.equal(st.piles.foundations[1].cards.length, 2);
  assert.equal(st.piles.waste.cards.length, 0);
  assert.equal(st.piles.tableau[0].cards.length, 0);
});

test('terminates quickly when no moves available', async () => {
  Engine.newGame(TEST_SETTINGS);
  const st = Engine.getState();
  st.piles = emptyPiles();
  const res = await Engine.runAutoToFixpoint();
  assert.equal(res.moves, 0);
  assert.equal(res.iterations, 0);
});

test('re-entrancy guard prevents concurrent runs', async () => {
  Engine.newGame(TEST_SETTINGS);
  const st = Engine.getState();
  st.piles = emptyPiles();
  st.piles.foundations[0].cards = [card('S',1)];
  st.piles.waste.cards = [card('S',2,true)];
  const p1 = Engine.runAutoToFixpoint();
  const p2 = Engine.runAutoToFixpoint();
  const [r1, r2] = await Promise.all([p1, p2]);
  assert.equal(r1.moves, 1);
  assert.equal(r2.moves, 0);
  assert.equal(st.piles.foundations[0].cards.length, 2);
});

test('auto moves 3H onto 2H from tableau', async () => {
  const st = loadFixture('auto-3-on-2');
  const res = await Engine.runAutoToFixpoint();
  assert.equal(res.moves, 1);
  const hf = st.piles.foundations.find((f) => f.suit === 'H');
  assert.equal(hf.cards[hf.cards.length - 1].rank, 3);
  assert.equal(st.piles.tableau[0].cards.length, 0);
});

test('auto moves chain across suits', async () => {
  Engine.newGame(TEST_SETTINGS);
  const st = Engine.getState();
  st.piles = emptyPiles();
  st.piles.foundations.find((f) => f.suit === 'S').cards = [card('S', 1), card('S', 2)];
  st.piles.foundations.find((f) => f.suit === 'H').cards = [card('H', 1), card('H', 2)];
  st.piles.foundations.find((f) => f.suit === 'D').cards = [card('D', 1), card('D', 2)];
  st.piles.waste.cards = [card('S', 3, true)];
  st.piles.tableau[0].cards = [card('D', 3, true)];
  st.piles.tableau[1].cards = [card('H', 3, true)];
  const res = await Engine.runAutoToFixpoint();
  assert.equal(res.moves, 3);
  assert.equal(st.piles.foundations.find((f) => f.suit === 'S').cards.length, 3);
  assert.equal(st.piles.foundations.find((f) => f.suit === 'H').cards.length, 3);
  assert.equal(st.piles.foundations.find((f) => f.suit === 'D').cards.length, 3);
});

test('auto does not jump ranks', async () => {
  Engine.newGame(TEST_SETTINGS);
  const st = Engine.getState();
  st.piles = emptyPiles();
  st.piles.foundations.find((f) => f.suit === 'H').cards = [card('H', 1), card('H', 2)];
  st.piles.tableau[0].cards = [card('H', 4, true)];
  const res = await Engine.runAutoToFixpoint();
  assert.equal(res.moves, 0);
  assert.equal(st.piles.foundations.find((f) => f.suit === 'H').cards.length, 2);
  assert.equal(st.piles.tableau[0].cards.length, 1);
});
