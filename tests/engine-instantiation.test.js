import { test, expect } from "@jest/globals";
import { Engine } from "../js/engine.module.js";

test("Engine constructor guard", () => {
  const inst = Engine();
  expect(typeof inst.newGame).toBe("function");
  const inst2 = Engine();
  expect(inst).not.toBe(inst2);
});
