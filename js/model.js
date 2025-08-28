
/* jonv11-solitaire-onepager - js/model.js
   Domain model, helpers, and (de)serialization.
   Exposes a global `Model` used by Engine/UI.
*/
(function(){
  'use strict';

  /** @typedef {'S'|'H'|'D'|'C'} Suit */
  /** @typedef {'black'|'red'} Color */
  /**
   * @typedef {Object} Card
   * @property {string} id            Unique id (e.g., "S13-42")
   * @property {number} rank          1..13 (1 Ace, 11 Jack, 12 Queen, 13 King)
   * @property {Suit} suit
   * @property {Color} color          'red' for H/D, 'black' for S/C
   * @property {boolean} faceUp
   */

  /**
   * @typedef {'tableau'|'foundation'|'stock'|'waste'} PileKind
   */

  /**
   * @typedef {Object} Pile
   * @property {string} id
   * @property {PileKind} kind
   * @property {Card[]} cards
   * @property {Suit=} suit          Only for foundations
   * @property {number=} col         Only for tableau columns 1..7
   */

  /**
   * @typedef {Object} ScoreState
   * @property {number} total
   * @property {number} moves
   */

  /**
   * @typedef {Object} Settings
   * @property {number} drawCount                 1 or 3
   * @property {'unlimited'|`limited(${number})`|'none'} redealPolicy
   * @property {boolean} leftHandMode
   * @property {boolean} animations
   * @property {boolean} hints
   * @property {boolean} autoComplete
   * @property {boolean} sound
   */

  /**
   * @typedef {Object} GameState
   * @property {number} seed
   * @property {{ tableau: Pile[]; foundations: Pile[]; stock: Pile; waste: Pile; }} piles
   * @property {Settings} settings
   * @property {ScoreState} score
   * @property {Array<UndoDelta>} history
   * @property {{ startedAt: number; elapsedMs: number; }} time
   */

  /**
   * @typedef {Object} UndoDelta    // Small mutation unit for DOM patching
   * @property {'flip'|'move'|'append'|'remove'} kind
   * @property {any} payload
   */

  // ---------- Constants
  const SUITS = /** @type {Suit[]} */ (['S','H','D','C']);
  const RANKS = Array.from({length:13}, (_,i)=>i+1);

  // ---------- Card and pile factories
  /** @param {Suit} suit @param {number} rank @param {boolean} faceUp */
  function makeCard(suit, rank, faceUp){
    const color = (suit === 'H' || suit === 'D') ? 'red' : 'black';
    // Add short random suffix to keep ids unique even after shuffles
    const id = suit + rank + '-' + Math.random().toString(36).slice(2,6);
    return { id, rank, suit, color, faceUp: !!faceUp };
  }

  /** @param {string} id @param {PileKind} kind */
  function makePile(id, kind){
    return { id, kind, cards: [] };
  }

  /** Make the four foundation piles */
  function makeFoundations(){
    return SUITS.map(s => ({ id: 'F'+s, kind: 'foundation', suit: s, cards: [] }));
  }

  /** Make 7 tableau piles */
  function makeTableau(){
    return Array.from({length:7}, (_,i) => ({ id: 'T'+(i+1), kind: 'tableau', col: i+1, cards: [] }));
  }

  /** Create an ordered deck */
  function newOrderedDeck(){
    /** @type {Card[]} */
    const deck = [];
    for (const s of SUITS) for (const r of RANKS) deck.push(makeCard(s, r, false));
    return deck;
  }

  /** In-place Fisher-Yates */
  function shuffle(deck, rnd=Math.random){
    for (let i=deck.length-1; i>0; i--){
      const j = Math.floor(rnd()*(i+1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
  }

  /** Simple LCG for seeded randomness */
  function lcg(seed){
    let s = (seed>>>0) || 1;
    return () => (s = (s*1664525 + 1013904223) >>> 0, (s / 0xffffffff));
  }

  // ---------- Serialization
  /** @param {GameState} st */
  function serialize(st){
    return JSON.stringify(st);
  }

  /** @param {string} json @returns {GameState|null} */
  function deserialize(json){
    try{
      const st = JSON.parse(json);
      // quick structural check
      if (!st || !st.piles || !st.piles.stock || !st.piles.waste) return null;
      return st;
    } catch { return null; }
  }

  // ---------- Helpers
  /** @param {Suit} s */
  function isRed(s){ return s === 'H' || s === 'D'; }

  /** @param {Card} a @param {Card} b */
  function alternatingColorDesc(a,b){
    if (!a || !b) return false;
    const colorOk = (a.color !== b.color);
    const rankOk  = a.rank === (b.rank - 1);
    return colorOk && rankOk;
  }

  /** @param {Card} a @param {Card} b */
  function sameSuitAsc(a,b){
    if (!a || !b) return false;
    const suitOk = a.suit === b.suit;
    const rankOk = a.rank === (b.rank + 1);
    return suitOk && rankOk;
  }

  /** @param {number} r */
  function rankToText(r){ return ({1:'A',11:'J',12:'Q',13:'K'})[r] || String(r); }
  /** @param {Suit} s */
  function suitToChar(s){ return ({S:'♠',H:'♥',D:'♦',C:'♣'})[s]; }

  /** Build a fresh dealt Klondike layout using seed and settings */
  function deal(seed, settings){
    const rnd = lcg(seed || Math.floor(Math.random()*1e9));
    const deck = shuffle(newOrderedDeck(), rnd);

    const tableau = makeTableau();
    for (let col=0; col<7; col++){
      for (let row=0; row<=col; row++){
        const c = deck.pop();
        c.faceUp = (row === col);
        tableau[col].cards.push(c);
      }
    }
    const stock = { id:'STOCK', kind:'stock', cards: deck };
    const waste = { id:'WASTE', kind:'waste', cards: [] };
    const foundations = makeFoundations();

    /** @type {GameState} */
    const st = {
      seed: seed || Math.floor(Math.random()*1e9),
      piles: { tableau, foundations, stock, waste },
      settings,
      score: { total: 0, moves: 0 },
      history: [],
      time: { startedAt: Date.now(), elapsedMs: 0 }
    };
    return st;
  }

  /** @typedef {{ srcPileId:string; cardIndex:number; dstPileId:string }} Move */

  /** Lightweight legality helpers for UI pre-checks (Engine is authoritative) */
  function canDropOnTableau(card, dstTop){
    if (!dstTop) return card.rank === 13; // empty tableau requires King
    return alternatingColorDesc(card, dstTop);
  }

  function canDropOnFoundation(card, dstTop, suit){
    if (suit && card.suit !== suit) return false;
    if (!dstTop) return card.rank === 1; // Ace first
    return sameSuitAsc(card, dstTop);
  }

  // ---------- Public API
  const Model = {
    SUITS, RANKS,
    makeCard, makePile, makeFoundations, makeTableau,
    newOrderedDeck, shuffle, lcg,
    serialize, deserialize,
    isRed, alternatingColorDesc, sameSuitAsc,
    rankToText, suitToChar,
    deal,
    canDropOnTableau, canDropOnFoundation
  };

  // expose
  window.Model = Model;
})();
