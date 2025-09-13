import { test, expect, beforeEach, jest } from "@jest/globals";
import fs from "node:fs";
import vm from "node:vm";
import { JSDOM } from "jsdom";

// Helper to load core modules into a browser-like context
function loadContext() {
  const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
  const dom = new JSDOM(html, { pretendToBeVisual: true });
  const context = dom.window;
  // Expose Node timers/console into the DOM context
  context.console = console;
  context.setTimeout = setTimeout;
  context.clearTimeout = clearTimeout;
  vm.createContext(context);
  for (const file of ["js/emitter.js", "js/model.js", "js/engine.js", "js/ui.js", "js/invariants.js"]) {
    const code = fs.readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
    vm.runInContext(code, context, { filename: file });
  }
  return context;
}

const TEST_SETTINGS = {
  drawCount: 1,
  redealPolicy: "none",
  leftHandMode: false,
  animations: false,
  hints: true,
  autoComplete: true,
  sound: false,
};

// --- Tests ---

describe("foundation auto-move", () => {
  let Engine, UI, windowObj;

  function card(suit, rank) {
    const { Model } = windowObj;
    return {
      id: suit + rank,
      rank,
      suit,
      color: Model.isRed(suit) ? "red" : "black",
      faceUp: true,
    };
  }

  beforeEach(() => {
    windowObj = loadContext();
    Engine = windowObj.Engine;
    UI = windowObj.UI;
    Engine.on("state", (st) => UI.render(st));
    UI.init(windowObj.document.getElementById("game"));
  });

  test("moves 8C only onto Clubs foundation", () => {
    Engine.newGame(TEST_SETTINGS);
    const st = Engine.getState();
    // Minimal piles
    const clubs = st.piles.foundations.find((f) => f.suit === "C");
    clubs.cards = Array.from({ length: 7 }, (_, i) => card("C", i + 1));
    st.piles.tableau[0].cards = [card("C", 8)];
    UI.render(st);

    Engine.autoMoveOne({ srcPileId: "tab-1", cardIndex: 0 });

    expect(clubs.cards).toHaveLength(8);
    expect(clubs.cards[7].rank).toBe(8);
  });

  test("rejects cross-suit move when top is 7D", () => {
    Engine.newGame(TEST_SETTINGS);
    const st = Engine.getState();
    const diamonds = st.piles.foundations.find((f) => f.suit === "D");
    diamonds.cards = Array.from({ length: 7 }, (_, i) => card("D", i + 1));
    st.piles.tableau[0].cards = [card("C", 8)];
    UI.render(st);

    Engine.autoMoveOne({ srcPileId: "tab-1", cardIndex: 0 });

    const clubs = st.piles.foundations.find((f) => f.suit === "C");
    expect(clubs.cards).toHaveLength(0);
    expect(diamonds.cards).toHaveLength(7);
  });

  test("after undo, auto-move still targets same suit", () => {
    Engine.newGame(TEST_SETTINGS);
    const st = Engine.getState();
    const clubs = st.piles.foundations.find((f) => f.suit === "C");
    clubs.cards = Array.from({ length: 7 }, (_, i) => card("C", i + 1));
    st.piles.tableau[0].cards = [card("C", 8)];
    UI.render(st);

    Engine.autoMoveOne({ srcPileId: "tab-1", cardIndex: 0 });
    Engine.undo();
    Engine.autoMoveOne({ srcPileId: "tab-1", cardIndex: 0 });

    expect(clubs.cards).toHaveLength(8);
  });

  test("double-click triggers once", () => {
    Engine.newGame(TEST_SETTINGS);
    const st = Engine.getState();
    const clubs = st.piles.foundations.find((f) => f.suit === "C");
    clubs.cards = Array.from({ length: 7 }, (_, i) => card("C", i + 1));
    st.piles.tableau[0].cards = [card("C", 8)];
    UI.render(st);

    const spy = jest.spyOn(Engine, "autoMoveOne");
    const cardEl = windowObj.document.querySelector("#tab-1 .card");
    cardEl.dispatchEvent(new windowObj.MouseEvent("dblclick", { bubbles: true }));

    expect(spy).toHaveBeenCalledTimes(1);
  });

  test("foundation invariant holds after random moves and undos", () => {
    Engine.newGame(TEST_SETTINGS);
    const rnd = windowObj.Model.lcg(123);
    for (let i = 0; i < 50; i++) {
      const r = Math.floor(rnd() * 3);
      if (r === 0) Engine.draw();
      else if (r === 1) Engine.autoMoveToFoundations();
      else Engine.undo();
    }
    // Final state should respect invariant
    windowObj.assertFoundationInvariant(Engine.getState());
  });
});
