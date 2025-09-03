import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import fs from 'node:fs';
import vm from 'node:vm';

const context = { window: {}, console };
context.window = context;
vm.createContext(context);

const code = fs.readFileSync(new URL('../js/emitter.js', import.meta.url), 'utf8');
vm.runInContext(code, context, { filename: 'js/emitter.js' });

const { EventEmitter } = context.window;

test('EventEmitter emits to registered listeners', () => {
  const emitter = EventEmitter();
  let payload = 0;
  emitter.on('ping', (n) => { payload = n; });
  emitter.emit('ping', 7);
  assert.equal(payload, 7);
});

test('EventEmitter does not throw when a listener errors', () => {
  const emitter = EventEmitter();
  emitter.on('boom', () => { throw new Error('fail'); });
  assert.doesNotThrow(() => emitter.emit('boom'));
});
