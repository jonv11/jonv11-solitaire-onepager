import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { Engine } from '../js/engine.module.js';

// Ensure calling Engine without `new` returns a working instance.
test('Engine constructor guard', () => {
  const inst = Engine();
  assert.equal(typeof inst.newGame, 'function');
  // Should be distinct instances on each call
  const inst2 = Engine();
  assert.notStrictEqual(inst, inst2);
});
