// Integration test validating Auto button UI behaviour
import { describe, test, expect } from '@jest/globals';
import fs from 'node:fs';
import vm from 'node:vm';
import { JSDOM } from 'jsdom';
import { Engine } from './helpers/stateBuilder.js';

describe('Auto UI integration', () => {
  test('button disables during run and foundations update', async () => {
    globalThis.AUTO_ANIMATE = false;
    const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
    const dom = new JSDOM(html, { pretendToBeVisual: true });
    const { window } = dom;
    const { document } = window;
    const context = { window, document, console, setTimeout, clearTimeout };
    context.window = window;
    vm.createContext(context);
    for (const file of ['js/emitter.js', 'js/model.js', 'js/engine.js', 'js/ui.js']) {
      const code = fs.readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
      vm.runInContext(code, context, { filename: file });
    }
    const { UI } = context.window;
    Engine.on('state', (st) => UI.render(st));
    UI.init(document.getElementById('game'));

    const card = (s, r) => ({ id: s + r, rank: r, suit: s, color: ['H', 'D'].includes(s) ? 'red' : 'black', faceUp: true });
    Engine.newGame({ drawCount: 1, redealPolicy: 'none', leftHandMode: false, animations: true, hints: true, autoComplete: true, sound: false });
    const st = Engine.getState();
    st.piles.foundations.find((f) => f.suit === 'S').cards = [card('S', 1), card('S', 2)];
    st.piles.foundations.find((f) => f.suit === 'H').cards = [card('H', 1), card('H', 2)];
    st.piles.foundations.find((f) => f.suit === 'D').cards = [card('D', 1), card('D', 2)];
    st.piles.waste.cards = [card('S', 3)];
    st.piles.tableau[0].cards = [card('D', 3)];
    st.piles.tableau[1].cards = [card('H', 3)];
    UI.render(st);

    const order = [];
    UI.animateMove = (mv) => new Promise((resolve) => {
      order.push(mv.dstPileId);
      setTimeout(resolve, 0);
    });
    const btn = document.getElementById('auto');
    btn.addEventListener('click', async () => {
      btn.disabled = true;
      await Engine.runAutoToFixpoint();
      btn.disabled = false;
    });

    btn.click();
    expect(btn.disabled).toBe(true);
  await new Promise((resolve) => setTimeout(resolve, 10));
    expect(btn.disabled).toBe(false);
    expect(order).toEqual(['foundation-S', 'foundation-D', 'foundation-H']);
    const hf = st.piles.foundations.find((f) => f.suit === 'H');
    expect(hf.cards).toHaveLength(3);
    const cardEl = document.querySelector('#foundation-H .card:last-child');
    expect(cardEl.dataset.rank).toBe('3');
  });
});
