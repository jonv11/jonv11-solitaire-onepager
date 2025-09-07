import { test, expect } from "@jest/globals";
import fs from "node:fs";
import { JSDOM } from "jsdom";

// Integration test ensuring Auto moves an Ace from the waste pile
test("auto button moves waste Ace to foundation and re-enables", async () => {
  const html = fs.readFileSync(
    new URL("../index.html", import.meta.url),
    "utf8",
  );
  const dom = new JSDOM(html, { pretendToBeVisual: true });
  const { window } = dom;
  globalThis.window = window;
  globalThis.document = window.document;
  globalThis.navigator = window.navigator;

  const { engine } = await import("../js/engine.module.js");
  const { Emitter } = await import("../js/utils/emitter.js");
  globalThis.EventEmitter = () => new Emitter();
  await import("../js/ui.js");
  const { UI } = globalThis;
  engine.on("state", (st) => UI.render(st));
  UI.init(document.getElementById("game"));

  const card = (s, r) => ({
    id: s + r,
    rank: r,
    suit: s,
    color: ["H", "D"].includes(s) ? "red" : "black",
    faceUp: true,
  });
  engine.newGame({
    drawCount: 1,
    redealPolicy: "none",
    leftHandMode: false,
    animations: true,
    hints: true,
    autoComplete: true,
    sound: false,
  });
  const st = engine.getState();
  st.piles.foundations.find((f) => f.suit === "S").cards = [];
  st.piles.waste.cards = [card("S", 1)];
  UI.render(st);

  const btn = document.getElementById("auto");
  btn.click();
  expect(btn.disabled).toBe(true);
  await new Promise((r) => setTimeout(r, 10));
  expect(btn.disabled).toBe(false);
  const sf = st.piles.foundations.find((f) => f.suit === "S");
  expect(sf.cards).toHaveLength(1);
  expect(sf.cards[0].rank).toBe(1);
});
