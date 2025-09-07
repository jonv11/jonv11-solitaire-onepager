/* jonv11-solitaire-onepager - js/engine.js
   Core game rules for Klondike.
   Relies on Model and Store. Emits events for UI.
*/
/* global EventEmitter, Model */
(function () {
  "use strict";

  function Engine() {
    // Allow construction without `new` by correcting the call form.
    if (!(this instanceof Engine)) return new Engine();

    // Support both function-style and class-style emitters.
    const api = new EventEmitter();
    let state = null;
    let undoStack = [];
    let redoStack = [];

    // Parse a redeal policy string and return the allowed count
    // "unlimited" -> Number.MAX_SAFE_INTEGER, "none" -> 0, "limited(n)" -> n
    function parseRedeals(policy) {
      if (policy === "unlimited") return Number.MAX_SAFE_INTEGER;
      if (policy === "none") return 0;
      const m = /limited\((\d+)\)/.exec(policy);
      return m ? Number(m[1]) : 0;
    }

    function cloneState(st) {
      return JSON.parse(JSON.stringify(st));
    }

    function pushUndo() {
      if (!state) return;
      state.time.elapsedMs = Date.now() - state.time.startedAt;
      undoStack.push(cloneState(state));
      if (undoStack.length > 100) undoStack.shift();
      redoStack.length = 0;
    }

    // ---- END CONDITION
    function isWin(st) {
      const n = st.piles.foundations.reduce((s, f) => s + f.cards.length, 0);
      return n === 52;
    }

    // minimal move enumeration
    function hasAnyLegalMove(st) {
      const top = (p) => p.cards[p.cards.length - 1] || null;

      // waste -> foundation/tableau
      if (st.piles.waste.cards.length) {
        const c = top(st.piles.waste);
        for (const f of st.piles.foundations)
          if (Model.canDropOnFoundation(c, top(f), f.suit)) return true;
        for (const t of st.piles.tableau)
          if (Model.canDropOnTableau(c, top(t))) return true;
      }

      // tableau -> foundation/tableau
      for (const t of st.piles.tableau) {
        // card(s) face-up starting from the first face-up index
        let i = t.cards.findIndex((c) => c.faceUp);
        if (i === -1) continue;
        for (; i < t.cards.length; i++) {
          const c = t.cards[i];
          for (const f of st.piles.foundations)
            if (Model.canDropOnFoundation(c, top(f), f.suit)) return true;
          for (const tt of st.piles.tableau)
            if (tt !== t && Model.canDropOnTableau(c, top(tt))) return true;
        }
      }
      return false;
    }

    function canDraw(st) {
      if (st.piles.stock.cards.length) return true;
      if (!st.piles.waste.cards.length) return false;
      // allowed to restock from waste?
      if (st.settings.redealPolicy === "none") return false;
      if (st.settings.redealPolicy.startsWith("limited")) {
        return (st.redealsRemaining || 0) > 0;
      }
      return true;
    }

    function isStuck(st) {
      return !isWin(st) && !hasAnyLegalMove(st) && !canDraw(st);
    }

    function endCheck() {
      if (isWin(state)) {
        state.score.total += 100; // bonus simple
        api.emit("win", state);
      } else if (isStuck(state)) {
        api.emit("stuck", state);
      }
    }

    // ---------- Internal helpers
    function emit() {
      api.emit("state", state);
    }

    function top(pile) {
      return pile.cards[pile.cards.length - 1] || null;
    }

    function flipIfNeeded(pile) {
      if (pile.kind === "tableau" && pile.cards.length) {
        const c = top(pile);
        if (!c.faceUp) {
          c.faceUp = true;
          state.score.total += 5;
        }
      }
    }

    function pileById(id) {
      if (id === "stock") return state.piles.stock;
      if (id === "waste") return state.piles.waste;
      if (id.startsWith("foundation-")) {
        const suit = id.split("-")[1];
        return state.piles.foundations.find((f) => f.suit === suit);
      }
      if (id.startsWith("tab-")) {
        const idx = Number(id.split("-")[1]) - 1;
        return state.piles.tableau[idx];
      }
      return null;
    }

    function canMoveCard(card, dstPile) {
      if (dstPile.kind === "foundation") {
        return Model.canDropOnFoundation(card, top(dstPile), dstPile.suit);
      }
      if (dstPile.kind === "tableau") {
        return Model.canDropOnTableau(card, top(dstPile));
      }
      return false;
    }

    // ---------- Public
    function newGame(settings) {
      state = Model.deal(Math.floor(Math.random() * 1e9), settings);
      // initialize redeal counter based on policy
      state.redealsRemaining = parseRedeals(settings.redealPolicy);
      // set up next time-penalty trigger
      const interval = (settings.timePenaltySecs || 10) * 1000;
      state.time.nextPenaltyAt = state.time.startedAt + interval;
      undoStack = [];
      redoStack = [];
      emit();
      endCheck();
      return state;
    }

    function getState() {
      return state;
    }

    function draw() {
      if (!state) return;
      pushUndo();
      const n = state.settings.drawCount || 1;
      for (let i = 0; i < n; i++) {
        if (!state.piles.stock.cards.length) {
          // redeal
          if (
            state.piles.waste.cards.length &&
            state.settings.redealPolicy !== "none" &&
            (state.settings.redealPolicy === "unlimited" ||
              state.redealsRemaining > 0)
          ) {
            state.piles.stock.cards = state.piles.waste.cards
              .reverse()
              .map((c) => ({ ...c, faceUp: false }));
            state.piles.waste.cards = [];
            if (state.settings.redealPolicy.startsWith("limited"))
              state.redealsRemaining--;
          } else break;
        }
        const c = state.piles.stock.cards.pop();
        if (!c) break;
        c.faceUp = true;
        state.piles.waste.cards.push(c);
      }
      state.score.moves++;
      emit();
      endCheck();
    }

    /** @param {{srcPileId:string, cardIndex:number, dstPileId:string}} move */
    function move({ srcPileId, cardIndex, dstPileId }) {
      const src = pileById(srcPileId);
      const dst = pileById(dstPileId);
      if (!src || !dst) return;

      const cards = src.cards.slice(cardIndex);
      if (!cards.length) return;
      if (!canMoveCard(cards[0], dst)) return;
      pushUndo();
      dst.cards.push(...cards);
      src.cards.length = cardIndex;
      flipIfNeeded(src);

      // scoring according to Standard rules
      if (dst.kind === "foundation") {
        // Waste→Foundation yields +10, Tableau→Foundation yields +5
        if (src.kind === "waste") state.score.total += 10;
        else if (src.kind === "tableau") state.score.total += 5;
      }
      // Moving cards out of a foundation costs −5 per card
      if (src.kind === "foundation") state.score.total -= 5 * cards.length;
      state.score.moves++;

      emit();
      endCheck();
    }

    // Core hint logic extracted for reuse and unit testing
    // Accepts an explicit state object and returns the next suggested move,
    // or `null` if no legal move exists.
    function findHintInState(st) {
      // ---- Prioritize foundation moves across the entire board ----

      // 1. waste → foundation
      if (st.piles.waste.cards.length) {
        const c = top(st.piles.waste);
        for (const f of st.piles.foundations) {
          if (Model.canDropOnFoundation(c, top(f), f.suit)) {
            return {
              srcPileId: "waste",
              cardIndex: st.piles.waste.cards.length - 1,
              dstPileId: f.id,
            };
          }
        }
      }

      // 2. tableau top cards → foundation
      for (const t of st.piles.tableau) {
        const c = top(t);
        if (!c || !c.faceUp) continue;
        for (const f of st.piles.foundations) {
          if (Model.canDropOnFoundation(c, top(f), f.suit)) {
            return {
              srcPileId: t.id,
              cardIndex: t.cards.length - 1,
              dstPileId: f.id,
            };
          }
        }
      }

      // ---- No foundation moves found; fall back to tableau moves ----

      // 3. waste → tableau
      if (st.piles.waste.cards.length) {
        const c = top(st.piles.waste);
        for (const t of st.piles.tableau) {
          if (Model.canDropOnTableau(c, top(t))) {
            return {
              srcPileId: "waste",
              cardIndex: st.piles.waste.cards.length - 1,
              dstPileId: t.id,
            };
          }
        }
      }

      // 4. tableau → tableau
      for (let ti = 0; ti < st.piles.tableau.length; ti++) {
        const t = st.piles.tableau[ti];
        for (let i = 0; i < t.cards.length; i++) {
          if (!t.cards[i].faceUp) continue;
          const c = t.cards[i];

          // only consider the first face-up run in a tableau
          if (i > 0 && t.cards[i - 1].faceUp) continue;

          for (let tj = 0; tj < st.piles.tableau.length; tj++) {
            if (ti === tj) continue;
            const dstPile = st.piles.tableau[tj];
            const dstTop = top(dstPile);

            // skip moving a king pile with no hidden cards to another empty tableau
            if (!dstTop && c.rank === 13 && i === 0) continue;

            // skip moves where destination card is identical in rank and color
            const prev = i > 0 ? t.cards[i - 1] : null;
            if (
              prev &&
              dstTop &&
              prev.rank === dstTop.rank &&
              Model.isRed(prev.suit) === Model.isRed(dstTop.suit)
            )
              continue;

            if (Model.canDropOnTableau(c, dstTop)) {
              return { srcPileId: t.id, cardIndex: i, dstPileId: dstPile.id };
            }
          }
        }
      }

      return null;
    }

    // Public wrapper uses internal state
    function findHint() {
      if (!state) return null;
      return findHintInState(state);
    }

    function tick() {
      if (!state) return;
      const now = Date.now();
      state.time.elapsedMs = now - state.time.startedAt;
      let penalized = false;
      const interval = (state.settings.timePenaltySecs || 10) * 1000;
      const points = state.settings.timePenaltyPoints || 2;
      // Apply time penalties at fixed intervals while the game is not yet won
      while (!isWin(state) && now >= state.time.nextPenaltyAt) {
        state.score.total -= points;
        state.time.nextPenaltyAt += interval;
        penalized = true;
      }
      if (penalized) emit();
      api.emit("tick", state.time);
    }

    function undo() {
      if (!undoStack.length || !state) return;
      redoStack.push(cloneState(state));
      state = undoStack.pop();
      state.time.elapsedMs = Date.now() - state.time.startedAt;
      emit();
      endCheck();
    }

    function redo() {
      if (!redoStack.length || !state) return;
      undoStack.push(cloneState(state));
      state = redoStack.pop();
      state.time.elapsedMs = Date.now() - state.time.startedAt;
      emit();
      endCheck();
    }

    function autoMoveOne({ srcPileId, cardIndex }) {
      const src = pileById(srcPileId);
      if (!src) return;

      const card = src.cards[cardIndex];
      if (!card) return;

      // Try to drop onto correct foundation
      const f = state.piles.foundations.find((x) => x.suit === card.suit);
      const top = f.cards.length ? f.cards[f.cards.length - 1] : null;
      if (Model.canDropOnFoundation(card, top, f.suit)) {
        move({ srcPileId, cardIndex, dstPileId: f.id });
      }
    }

    // Determine if moving the given card to its foundation is "safe".
    // A move is considered safe when neither opposite-color suit
    // requires this card for further tableau play. We approximate this by
    // ensuring that both opposite-color foundations have progressed to at
    // least the card's rank minus one.
    function isSafeFoundationMove(card) {
      // Suits of the opposite colour. Red -> clubs/spades, black -> hearts/diamonds
      if (card.rank <= 2) return true; // Aces and Twos never block play
      const opp = Model.isRed(card.suit) ? ["C", "S"] : ["H", "D"];
      // Lowest rank currently on the opposite-colour foundations
      const lowestOppRank = Math.min(
        ...opp.map((s) => {
          const f = state.piles.foundations.find((x) => x.suit === s);
          const top = f.cards.length ? f.cards[f.cards.length - 1].rank : 0;
          return top;
        })
      );
      return card.rank <= lowestOppRank + 1;
    }

    // Automatically move any available top cards to their foundations.
    // Returns the number of cards moved.
    function autoMoveToFoundations() {
      if (!state) return 0;
      const top = (p) => p.cards[p.cards.length - 1] || null;
      let moved = 0;
      let changed;
      do {
        changed = false;
        // Try tableau piles first
        for (const t of state.piles.tableau) {
          const c = top(t);
          if (!c || !c.faceUp) continue;
          const f = state.piles.foundations.find((x) => x.suit === c.suit);
          if (
            Model.canDropOnFoundation(c, top(f), f.suit) &&
            isSafeFoundationMove(c)
          ) {
            move({ srcPileId: t.id, cardIndex: t.cards.length - 1, dstPileId: f.id });
            moved++;
            changed = true;
            break; // re-evaluate from the start after each move
          }
        }
        if (changed) continue;

        // Then waste pile
        const w = state.piles.waste;
        if (w.cards.length) {
          const c = top(w);
          const f = state.piles.foundations.find((x) => x.suit === c.suit);
          if (
            Model.canDropOnFoundation(c, top(f), f.suit) &&
            isSafeFoundationMove(c)
          ) {
            move({ srcPileId: w.id, cardIndex: w.cards.length - 1, dstPileId: f.id });
            moved++;
            changed = true;
          }
        }
        // Stock is not automatically drawn; avoid peeking at hidden cards
        // to preserve classic gameplay and prevent unfair advantage.
        // Auto moves only consider tableau and waste piles.
      } while (changed);
      return moved;
    }

    // ---------- Pure helpers exposed for solver ----------

    function listLegalMoves(st) {
      const moves = [];
      const top = (p) => p.cards[p.cards.length - 1] || null;

      // tableau flips
      for (const t of st.piles.tableau) {
        if (t.cards.length && !top(t).faceUp)
          moves.push({ type: "flip", pileId: t.id });
      }

      // waste moves
      if (st.piles.waste.cards.length) {
        const c = top(st.piles.waste);
        for (const f of st.piles.foundations) {
          if (Model.canDropOnFoundation(c, top(f), f.suit))
            moves.push({
              type: "move",
              src: "waste",
              cardIndex: st.piles.waste.cards.length - 1,
              dst: f.id,
            });
        }
        for (const t of st.piles.tableau) {
          if (Model.canDropOnTableau(c, top(t)))
            moves.push({
              type: "move",
              src: "waste",
              cardIndex: st.piles.waste.cards.length - 1,
              dst: t.id,
            });
        }
      }

      // tableau moves
      for (const t of st.piles.tableau) {
        const first = t.cards.findIndex((c) => c.faceUp);
        if (first === -1) continue;
        for (let i = first; i < t.cards.length; i++) {
          const c = t.cards[i];
          // to foundation
          if (i === t.cards.length - 1) {
            for (const f of st.piles.foundations) {
              if (Model.canDropOnFoundation(c, top(f), f.suit))
                moves.push({ type: "move", src: t.id, cardIndex: i, dst: f.id });
            }
          }
          // to tableau
          for (const tt of st.piles.tableau) {
            if (tt === t) continue;
            if (Model.canDropOnTableau(c, top(tt)))
              moves.push({ type: "move", src: t.id, cardIndex: i, dst: tt.id });
          }
        }
      }

      // draw/redeal
      if (canDraw(st)) moves.push({ type: "draw" });

      return moves;
    }

    function applyMove(st, move) {
      const next = cloneState(st);
      const top = (p) => p.cards[p.cards.length - 1] || null;
      const pileByIdPure = (id) => {
        if (id === "stock") return next.piles.stock;
        if (id === "waste") return next.piles.waste;
        if (id.startsWith("foundation-")) {
          const suit = id.split("-")[1];
          return next.piles.foundations.find((f) => f.suit === suit);
        }
        if (id.startsWith("tab-")) {
          const idx = Number(id.split("-")[1]) - 1;
          return next.piles.tableau[idx];
        }
        return null;
      };

      if (move.type === "flip") {
        const p = pileByIdPure(move.pileId);
        const c = top(p);
        if (c) c.faceUp = true;
        return next;
      }
      if (move.type === "move") {
        const src = pileByIdPure(move.src);
        const dst = pileByIdPure(move.dst);
        const cards = src.cards.slice(move.cardIndex);
        dst.cards.push(...cards);
        src.cards.length = move.cardIndex;
        if (src.kind === "tableau") {
          const t = top(src);
          if (t && !t.faceUp) t.faceUp = true;
        }
        return next;
      }
      if (move.type === "draw") {
        const n = next.settings.drawCount || 1;
        for (let i = 0; i < n; i++) {
          if (!next.piles.stock.cards.length) {
            if (
              next.piles.waste.cards.length &&
              next.settings.redealPolicy !== "none" &&
              (next.settings.redealPolicy === "unlimited" ||
                next.redealsRemaining > 0)
            ) {
              next.piles.stock.cards = next.piles.waste.cards
                .reverse()
                .map((c) => ({ ...c, faceUp: false }));
              next.piles.waste.cards = [];
              if (next.settings.redealPolicy.startsWith("limited"))
                next.redealsRemaining--;
            } else break;
          }
          const c = next.piles.stock.cards.pop();
          if (!c) break;
          c.faceUp = true;
          next.piles.waste.cards.push(c);
        }
        return next;
      }
      return next;
    }

    function enumerateAutoSafeFoundationMoves(st) {
      const moves = [];
      const top = (p) => p.cards[p.cards.length - 1] || null;
      const bySuit = {};
      for (const f of st.piles.foundations) bySuit[f.suit] = f;

      const waste = st.piles.waste;
      if (waste.cards.length) {
        const c = top(waste);
        const f = bySuit[c.suit];
        if (Model.canDropOnFoundation(c, top(f), f.suit))
          moves.push({
            type: "move",
            src: "waste",
            cardIndex: waste.cards.length - 1,
            dst: f.id,
          });
      }

      for (const t of st.piles.tableau) {
        if (!t.cards.length) continue;
        const c = top(t);
        const f = bySuit[c.suit];
        if (c.faceUp && Model.canDropOnFoundation(c, top(f), f.suit))
          moves.push({ type: "move", src: t.id, cardIndex: t.cards.length - 1, dst: f.id });
      }

      return moves;
    }

    // --- Auto-play helpers ---

    /**
     * Generate a compact hash of the current piles to detect cycles.
     * Only the order of visible cards matters for auto-play termination.
     * @param {*} st
     * @returns {string}
     */
    function stateHash(st) {
      const f = st.piles.foundations
        .map((pile) => pile.cards.map((c) => c.id).join("."))
        .join("|");
      const w = st.piles.waste.cards.map((c) => c.id).join(".");
      const t = st.piles.tableau
        .map((pile) =>
          pile.cards
            .filter((c) => c.faceUp)
            .map((c) => c.id)
            .join("."),
        )
        .join("|");
      return f + "/" + w + "/" + t;
    }

    /**
     * Check if moving `card` to its suit foundation is legal.
     * Aces start empty foundations; otherwise next rank of same suit.
     * @param {{rank:number, suit:string}} card
     * @param {*[]} foundations
     */
    function isLegalFoundationMove(card, foundations) {
      const f = foundations.find((x) => x.suit === card.suit);
      if (!f) return false;
      // An Ace can start an empty foundation of the same suit
      if (f.cards.length === 0) return card.rank === 1;
      const top = f.cards[f.cards.length - 1];
      // Otherwise, only the next rank of the same suit is legal
      return card.rank === top.rank + 1;
    }

    /**
     * Find all currently legal foundation moves in deterministic order.
     * Waste top card is considered first, then tableau columns left-to-right.
     * @param {*} st
     * @returns {{srcPileId:string, cardIndex:number, dstPileId:string}[]}
     */
    function findNextFoundationMoves(st) {
      const moves = [];
      const top = (p) => p.cards[p.cards.length - 1] || null;

      const w = st.piles.waste;
      if (w.cards.length) {
        const c = top(w);
        const f = st.piles.foundations.find((x) => x.suit === c.suit);
        if (isLegalFoundationMove(c, st.piles.foundations))
          moves.push({ srcPileId: w.id, cardIndex: w.cards.length - 1, dstPileId: f.id });
      }

      for (const t of st.piles.tableau) {
        const c = top(t);
        if (!c || !c.faceUp) continue;
        const f = st.piles.foundations.find((x) => x.suit === c.suit);
        if (isLegalFoundationMove(c, st.piles.foundations))
          moves.push({ srcPileId: t.id, cardIndex: t.cards.length - 1, dstPileId: f.id });
      }

      return moves;
    }

    const DEBUG_AUTO = !!globalThis.DEBUG_AUTO;
    const logAuto = (...args) => {
      if (DEBUG_AUTO) console.debug("[auto]", ...args);
    };

    let autoRunning = false;

    /**
     * Automatically move all legal next-rank cards to their foundations.
     * Moves are animated sequentially when enabled.
     * Returns a summary object with iteration and move counts.
     */
    async function runAutoToFixpoint() {
      if (autoRunning || !state) return { moves: 0, iterations: 0 };
      autoRunning = true;
      try {
        let iterations = 0;
        let moves = 0;
        const animate =
          state.settings.animations && (globalThis.AUTO_ANIMATE ?? true);
        const animMs = globalThis.AUTO_ANIM_DURATION_MS ?? 200;
        while (iterations < 1000 && moves < 500) {
          const hash = stateHash(state);
          const next = findNextFoundationMoves(state);
          if (!next.length) break;
          const mv = next[0];
          // Log iteration, state hash, available moves, and chosen move when debugging
          logAuto("iter", iterations + 1, "hash", hash, "moves", next, "applying", mv);
          let p = Promise.resolve();
          if (animate && globalThis.UI?.animateMove)
            p = globalThis.UI.animateMove(mv, animMs);
          move(mv);
          moves++;
          iterations++;
          await p;
          if (!animate) await new Promise((resolve) => setTimeout(resolve, 0));
        }
        return { moves, iterations };
      } finally {
        autoRunning = false;
      }
    }

    // Augment the EventEmitter instance with the engine's public API.
    // Using Object.assign preserves emitter methods (on, emit, etc.)
    // which live on the prototype and are non-enumerable in Node's
    // implementation. Spreading `api` into a new object would lose
    // these methods and break event handling in consumers.
    Object.assign(api, {
      newGame,
      getState,
      draw,
      move,
      tick,
      findHint,
      // Exposed for unit tests
      _findHint: findHintInState,
      autoMoveOne,
      autoMoveToFoundations,
      undo,
      redo,
      // solver helpers
      listLegalMoves,
      applyMove,
      isWin,
      enumerateAutoSafeFoundationMoves,
      // auto-play helpers for tests
      _stateHash: stateHash,
      _findNextFoundationMoves: findNextFoundationMoves,
      runAutoToFixpoint,
    });
    return api;
  }

  // Pre-constructed singleton used by the browser code.
  const engine = new Engine();
  window.engine = engine;
  window.Engine = engine; // backward compatibility
  window.EngineCtor = Engine;
})();
