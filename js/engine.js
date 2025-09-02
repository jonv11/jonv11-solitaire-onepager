/* jonv11-solitaire-onepager - js/engine.js
   Core game rules for Klondike.
   Relies on Model and Store. Emits events for UI.
*/
(function () {
  "use strict";

  const Engine = (() => {
    const api = EventEmitter();
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

      // scoring (basic)
      if (dst.kind === "foundation") state.score.total += 10;
      if (src.kind === "foundation") state.score.total -= 10;
      state.score.moves++;

      emit();
      endCheck();
    }

    function findHint() {
      // Provide a simple heuristic hint: prioritize waste moves, then tableau
      if (!state) return null;
      const top = (p) => p.cards[p.cards.length - 1] || null;

      // 1. waste → foundation ou tableau
      if (state.piles.waste.cards.length) {
        const c = top(state.piles.waste);
        for (const f of state.piles.foundations) {
          if (Model.canDropOnFoundation(c, top(f), f.suit))
            return {
              srcPileId: "waste",
              cardIndex: state.piles.waste.cards.length - 1,
              dstPileId: f.id,
            };
        }
        for (const t of state.piles.tableau) {
          if (Model.canDropOnTableau(c, top(t)))
            return {
              srcPileId: "waste",
              cardIndex: state.piles.waste.cards.length - 1,
              dstPileId: t.id,
            };
        }
      }

      // 2. tableau → foundation ou tableau
      for (let ti = 0; ti < state.piles.tableau.length; ti++) {
        const t = state.piles.tableau[ti];
        for (let i = 0; i < t.cards.length; i++) {
          if (!t.cards[i].faceUp) continue;
          const c = t.cards[i];

          // try moving single card to foundation when on top
          if (i === t.cards.length - 1) {
            for (const f of state.piles.foundations) {
              if (Model.canDropOnFoundation(c, top(f), f.suit))
                return { srcPileId: t.id, cardIndex: i, dstPileId: f.id };
            }
          }

          // only consider the first face-up run in a tableau
          if (i > 0 && t.cards[i - 1].faceUp) continue;

          for (let tj = 0; tj < state.piles.tableau.length; tj++) {
            if (ti === tj) continue;
            const dstPile = state.piles.tableau[tj];
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

            if (Model.canDropOnTableau(c, dstTop))
              return { srcPileId: t.id, cardIndex: i, dstPileId: dstPile.id };
          }
        }
      }

      return null;
    }

    function tick() {
      if (!state) return;
      state.time.elapsedMs = Date.now() - state.time.startedAt;
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
      const rankInFoundation = (s) => bySuit[s].cards.length;
      const isSafe = (card) => {
        const r = card.rank;
        if (r <= 2) return true;
        const red = Model.isRed(card.suit);
        const opp = red ? ["S", "C"] : ["H", "D"];
        if (Math.min(rankInFoundation(opp[0]), rankInFoundation(opp[1])) >= r - 1)
          return true;
        if (rankInFoundation(card.suit) >= r + 1) return true;
        return false;
      };

      const waste = st.piles.waste;
      if (waste.cards.length) {
        const c = top(waste);
        const f = bySuit[c.suit];
        if (Model.canDropOnFoundation(c, top(f), f.suit) && isSafe(c))
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
        if (c.faceUp && Model.canDropOnFoundation(c, top(f), f.suit) && isSafe(c))
          moves.push({ type: "move", src: t.id, cardIndex: t.cards.length - 1, dst: f.id });
      }

      return moves;
    }

    return {
      ...api,
      newGame,
      getState,
      draw,
      move,
      tick,
      findHint,
      autoMoveOne,
      undo,
      redo,
      // solver helpers
      listLegalMoves,
      applyMove,
      isWin,
      enumerateAutoSafeFoundationMoves,
    };
  })();

  window.Engine = Engine;
})();
