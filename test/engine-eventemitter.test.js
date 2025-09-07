import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { Engine, engine } from '../js/engine.module.js';

// Ensure returned engine APIs keep EventEmitter listener methods.
// Regression test for spreading EventEmitter into a plain object.
test('engine exposes EventEmitter methods', () => {
  assert.equal(typeof engine.on, 'function');
  assert.equal(typeof engine.emit, 'function');
});

test('Engine constructor returns emitter-capable instance', () => {
  const inst = Engine();
  assert.equal(typeof inst.on, 'function');
  assert.equal(typeof inst.emit, 'function');
});
