import { test, expect } from "@jest/globals";
import { Engine, build } from "./fixture-builder.js";

test("auto moves ace from waste", async () => {
  const st = build({ waste: ["H1"] });
  const res = await Engine.runAutoToFixpoint();
  expect(res.moves).toBe(1);
  const hf = st.piles.foundations.find((f) => f.suit === "H");
  expect(hf.cards).toHaveLength(1);
  expect(hf.cards[0].rank).toBe(1);
});

test("auto moves ace from tableau and flips underlying card", async () => {
  const st = build({ tableau: [["h5", "S1"]] });
  const res = await Engine.runAutoToFixpoint();
  expect(res.moves).toBe(1);
  const sf = st.piles.foundations.find((f) => f.suit === "S");
  expect(sf.cards).toHaveLength(1);
  expect(st.piles.tableau[0].cards).toHaveLength(1);
  expect(st.piles.tableau[0].cards[0].faceUp).toBe(true);
});

test("auto moves multiple aces in deterministic order", async () => {
  const st = build({ waste: ["D1"], tableau: [["C1"]] });
  const res = await Engine.runAutoToFixpoint();
  expect(res.moves).toBe(2);
  expect(st.piles.foundations.find((f) => f.suit === "D").cards).toHaveLength(
    1,
  );
  expect(st.piles.foundations.find((f) => f.suit === "C").cards).toHaveLength(
    1,
  );
  expect(st.piles.waste.cards).toHaveLength(0);
  expect(st.piles.tableau[0].cards).toHaveLength(0);
});

test("auto chains from ace to three", async () => {
  const st = build({ waste: ["H1"], tableau: [["H2"], ["H3"]] });
  const res = await Engine.runAutoToFixpoint();
  expect(res.moves).toBe(3);
  const hf = st.piles.foundations.find((f) => f.suit === "H");
  expect(hf.cards).toHaveLength(3);
  expect(hf.cards[2].rank).toBe(3);
});

test("auto does not move wrong suit ace", async () => {
  const st = build({ waste: ["C1"] });
  const res = await Engine.runAutoToFixpoint();
  expect(res.moves).toBe(1);
  expect(st.piles.foundations.find((f) => f.suit === "C").cards).toHaveLength(
    1,
  );
  expect(st.piles.foundations.find((f) => f.suit === "H").cards).toHaveLength(
    0,
  );
});

test("auto is idempotent and terminates", async () => {
  const st = build({ waste: ["H1"] });
  const r1 = await Engine.runAutoToFixpoint();
  const r2 = await Engine.runAutoToFixpoint();
  expect(r1.moves).toBe(1);
  expect(r2.moves).toBe(0);
  const hf = st.piles.foundations.find((f) => f.suit === "H");
  expect(hf.cards).toHaveLength(1);
});
