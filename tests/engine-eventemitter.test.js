import { test, expect } from "@jest/globals";
import { Engine, engine } from "../js/engine.module.js";

test("engine exposes EventEmitter methods", () => {
  expect(typeof engine.on).toBe("function");
  expect(typeof engine.emit).toBe("function");
});

test("Engine constructor returns emitter-capable instance", () => {
  const inst = Engine();
  expect(typeof inst.on).toBe("function");
  expect(typeof inst.emit).toBe("function");
});
