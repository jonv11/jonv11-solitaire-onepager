import { test, expect } from "@jest/globals";
import fs from "node:fs";
import vm from "node:vm";

// Set up shared VM context for engine
const context = { window: {}, console };
context.window = context; // window.window === window
vm.createContext(context);
for (const file of ["js/emitter.js", "js/model.js", "js/engine.js"]) {
  const code = fs.readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
  vm.runInContext(code, context, { filename: file });
}

const { _findHint } = context.window.Engine;

function card(id, rank, suit, color) {
  return { id, rank, suit, color, faceUp: true };
}

test("findHint prioritizes foundation moves over tableau moves", () => {
  const state = {
    piles: {
      stock: { cards: [] },
      waste: { cards: [] },
      foundations: [
        {
          id: "f1",
          kind: "foundation",
          suit: "S",
          cards: [card("S1", 1, "S", "black")],
        },
        { id: "f2", kind: "foundation", suit: "H", cards: [] },
        { id: "f3", kind: "foundation", suit: "D", cards: [] },
        { id: "f4", kind: "foundation", suit: "C", cards: [] },
      ],
      tableau: [
        { id: "t1", kind: "tableau", cards: [card("C7", 7, "C", "black")] },
        { id: "t2", kind: "tableau", cards: [card("D8", 8, "D", "red")] },
        { id: "t3", kind: "tableau", cards: [card("S2", 2, "S", "black")] },
      ],
    },
  };

  const move = _findHint(state);
  expect(move.srcPileId).toBe("t3");
  expect(move.dstPileId).toBe("f1");
});
