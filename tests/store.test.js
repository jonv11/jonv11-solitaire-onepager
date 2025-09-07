import { describe, test, expect } from '@jest/globals';
import fs from 'node:fs';
import vm from 'node:vm';

const localStub = {
  data: {},
  getItem(k) {
    return this.data[k] ?? null;
  },
  setItem(k, v) {
    this.data[k] = String(v);
  },
  removeItem(k) {
    delete this.data[k];
  },
};

const context = { window: {}, console, localStorage: localStub };
context.window = context;
vm.createContext(context);

const code = fs.readFileSync(new URL('../js/store.js', import.meta.url), 'utf8');
vm.runInContext(code, context, { filename: 'js/store.js' });

const { Store } = context.window;

test('Store persists settings via localStorage', () => {
  Store.setSettings({ a: 1 });
  expect(localStub.data['solitaire.settings']).toBe(JSON.stringify({ a: 1 }));
  const st = Store.getSettings();
  expect(JSON.stringify(st)).toBe(JSON.stringify({ a: 1 }));
});

test('Store clears saved state', () => {
  Store.saveState({ foo: 'bar' });
  expect(localStub.data['solitaire.saved']).toBeTruthy();
  Store.clearSavedState();
  expect(localStub.data['solitaire.saved']).toBe(undefined);
});
