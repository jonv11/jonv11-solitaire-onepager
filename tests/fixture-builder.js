import fs from 'node:fs';
import vm from 'node:vm';

// Shared VM context for loading engine and model once per test suite
const context = { window: {}, console, setTimeout, clearTimeout };
context.window = context;
vm.createContext(context);
for (const file of ['js/emitter.js', 'js/model.js', 'js/engine.js']) {
  const code = fs.readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
  vm.runInContext(code, context, { filename: file });
}

const { Engine, Model } = context.window;

// Minimal settings to keep tests deterministic and headless
const TEST_SETTINGS = {
  drawCount: 1,
  redealPolicy: 'none',
  leftHandMode: false,
  animations: false,
  hints: true,
  autoComplete: true,
  sound: false,
};

/**
 * Parse a compact card code into a card object.
 * Uppercase suit => face-up, lowercase => face-down.
 * Example: 'H1' = A♥ face-up, 'd13' = K♦ face-down.
 * @param {string} code
 */
function parseCard(code) {
  const suit = code[0].toUpperCase();
  const rank = Number(code.slice(1));
  const faceUp = code[0] === suit;
  return {
    id: suit + rank,
    rank,
    suit,
    color: Model.isRed(suit) ? 'red' : 'black',
    faceUp,
  };
}

/**
 * Build a fresh engine state with the given pile contents.
 * @param {{waste?:string[], tableau?:string[][], foundations?:Record<string,string[]>}} cfg
 */
function build(cfg = {}) {
  const { waste = [], tableau = [], foundations = {} } = cfg;
  Engine.newGame(TEST_SETTINGS);
  const st = Engine.getState();

  // Foundations keyed by suit; default to empty
  st.piles.foundations = ['S', 'H', 'D', 'C'].map((suit) => ({
    id: 'foundation-' + suit,
    kind: 'foundation',
    suit,
    cards: (foundations[suit] || []).map(parseCard),
  }));

  // Waste pile
  st.piles.waste = {
    id: 'waste',
    kind: 'waste',
    cards: waste.map(parseCard),
  };

  // Tableau columns (7 fixed)
  st.piles.tableau = Array.from({ length: 7 }, (_, i) => ({
    id: 'tab-' + (i + 1),
    kind: 'tableau',
    col: i + 1,
    cards: (tableau[i] || []).map(parseCard),
  }));

  // Empty stock to keep tests focused
  st.piles.stock = { id: 'stock', kind: 'stock', cards: [] };

  return st;
}

export { Engine, Model, build, parseCard };
