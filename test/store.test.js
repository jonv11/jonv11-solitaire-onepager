import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import fs from 'node:fs';
import vm from 'node:vm';

const localStub = {
  data: {},
  getItem(k){ return this.data[k] ?? null; },
  setItem(k,v){ this.data[k] = String(v); },
  removeItem(k){ delete this.data[k]; }
};

const context = { window: {}, console, localStorage: localStub };
context.window = context;
vm.createContext(context);

const code = fs.readFileSync(new URL('../js/store.js', import.meta.url), 'utf8');
vm.runInContext(code, context, { filename: 'js/store.js' });

const { Store } = context.window;

test('Store persists settings via localStorage', () => {
  Store.setSettings({ a:1 });
  assert.equal(localStub.data['solitaire.settings'], JSON.stringify({ a:1 }));
  const st = Store.getSettings();
  assert.equal(JSON.stringify(st), JSON.stringify({ a:1 }));
});

test('Store clears saved state', () => {
  Store.saveState({ foo:'bar' });
  assert.ok(localStub.data['solitaire.saved']);
  Store.clearSavedState();
  assert.equal(localStub.data['solitaire.saved'], undefined);
});
