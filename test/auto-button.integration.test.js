import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import fs from 'node:fs';
import { JSDOM } from 'jsdom';

// Integration test for Auto button with sequential animations

test('Auto button disables during run and updates foundations', async () => {
  const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const dom = new JSDOM(html, { pretendToBeVisual: true });
  const { window } = dom;
  globalThis.window = window;
  globalThis.document = window.document;
  globalThis.navigator = window.navigator;
  const { engine } = await import('../js/engine.module.js');
  await import('../js/ui.js');
  const { UI } = globalThis;
  engine.on('state', (st) => UI.render(st));
  UI.init(document.getElementById('game'));

  const card = (s, r) => ({ id: s + r, rank: r, suit: s, color: ['H', 'D'].includes(s) ? 'red' : 'black', faceUp: true });
  engine.newGame({ drawCount: 1, redealPolicy: 'none', leftHandMode: false, animations: true, hints: true, autoComplete: true, sound: false });
  const st = engine.getState();
  st.piles.foundations.find((f) => f.suit === 'S').cards = [card('S', 1), card('S', 2)];
  st.piles.foundations.find((f) => f.suit === 'H').cards = [card('H', 1), card('H', 2)];
  st.piles.foundations.find((f) => f.suit === 'D').cards = [card('D', 1), card('D', 2)];
  st.piles.waste.cards = [card('S', 3)];
  st.piles.tableau[0].cards = [card('D', 3)];
  st.piles.tableau[1].cards = [card('H', 3)];
  UI.render(st);

  const order = [];
  UI.animateMove = (mv) =>
    new Promise((resolve) => {
      order.push(mv.dstPileId);
      setTimeout(resolve, 0);
    });
  const btn = document.getElementById('auto');
  btn.addEventListener('click', async () => {
    btn.disabled = true;
    await engine.runAutoToFixpoint();
    btn.disabled = false;
  });

  btn.click();
  assert.equal(btn.disabled, true);
  await new Promise((r) => setTimeout(r, 10));
  assert.equal(btn.disabled, false);
  assert.deepEqual(order, ['foundation-S', 'foundation-D', 'foundation-H']);
  const hf = st.piles.foundations.find((f) => f.suit === 'H');
  assert.equal(hf.cards.length, 3);
  const cardEl = document.querySelector('#foundation-H .card:last-child');
  assert(cardEl);
  assert.equal(cardEl.dataset.rank, '3');
});
