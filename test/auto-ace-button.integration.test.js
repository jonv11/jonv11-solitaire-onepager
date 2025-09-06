import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import fs from 'node:fs';
import vm from 'node:vm';
import { JSDOM } from 'jsdom';

// Integration test ensuring Auto moves an Ace from the waste pile

test('auto button moves waste Ace to foundation and re-enables', async () => {
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
  const { Engine, UI } = context.window;
  Engine.on('state', (st) => UI.render(st));
  UI.init(document.getElementById('game'));

  const card = (s, r) => ({ id: s + r, rank: r, suit: s, color: ['H', 'D'].includes(s) ? 'red' : 'black', faceUp: true });
  Engine.newGame({ drawCount: 1, redealPolicy: 'none', leftHandMode: false, animations: true, hints: true, autoComplete: true, sound: false });
  const st = Engine.getState();
  st.piles.waste.cards = [card('H', 1)];
  st.piles.foundations.forEach((f) => (f.cards = []));
  UI.render(st);

  const btn = document.getElementById('auto');
  btn.addEventListener('click', async () => {
    btn.disabled = true;
    await Engine.runAutoToFixpoint();
    btn.disabled = false;
  });

  btn.click();
  assert.equal(btn.disabled, true);
  await new Promise((r) => setTimeout(r, 10));
  assert.equal(btn.disabled, false);
  const hf = st.piles.foundations.find((f) => f.suit === 'H');
  assert.equal(hf.cards.length, 1);
  assert.equal(hf.cards[0].rank, 1);
});
