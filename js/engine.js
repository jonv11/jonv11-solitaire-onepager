/* jonv11-solitaire-onepager - js/engine.js
   Core game rules for Klondike.
   Relies on Model and Store. Emits events for UI.
*/
(function(){
  'use strict';

  const Engine = (() => {
    const api = EventEmitter();
    let state = null;
    let undoStack = [];
    let redoStack = [];

    // Parse a redeal policy string and return the allowed count
    // "unlimited" -> Number.MAX_SAFE_INTEGER, "none" -> 0, "limited(n)" -> n
    function parseRedeals(policy){
      if (policy === "unlimited") return Number.MAX_SAFE_INTEGER;
      if (policy === "none") return 0;
      const m = /limited\((\d+)\)/.exec(policy);
      return m ? Number(m[1]) : 0;
    }

    function cloneState(st){ return JSON.parse(JSON.stringify(st)); }

    function pushUndo(){
      if (!state) return;
      state.time.elapsedMs = Date.now() - state.time.startedAt;
      undoStack.push(cloneState(state));
      if (undoStack.length > 100) undoStack.shift();
      redoStack.length = 0;
    }
	
	// ---- END CONDITION	
	function isWin(st){
	  const n = st.piles.foundations.reduce((s,f)=>s+f.cards.length,0);
	  return n === 52;
	}

	// énumération minimale des coups
	function hasAnyLegalMove(st){
	  const top = p => p.cards[p.cards.length-1] || null;

	  // waste -> foundation/tableau
	  if (st.piles.waste.cards.length){
		const c = top(st.piles.waste);
		for (const f of st.piles.foundations) if (Model.canDropOnFoundation(c, top(f), f.suit)) return true;
		for (const t of st.piles.tableau)    if (Model.canDropOnTableau(c, top(t))) return true;
	  }

	  // tableau -> foundation/tableau
	  for (const t of st.piles.tableau){
		// carte(s) face-up à partir du premier index face-up
		let i = t.cards.findIndex(c=>c.faceUp);
		if (i === -1) continue;
		for (; i < t.cards.length; i++){
		  const c = t.cards[i];
		  for (const f of st.piles.foundations) if (Model.canDropOnFoundation(c, top(f), f.suit)) return true;
		  for (const tt of st.piles.tableau) if (tt !== t && Model.canDropOnTableau(c, top(tt))) return true;
		}
	  }
	  return false;
	}

        function canDraw(st){
          if (st.piles.stock.cards.length) return true;
          if (!st.piles.waste.cards.length) return false;
          // allowed to restock from waste?
          if (st.settings.redealPolicy === "none") return false;
          if (st.settings.redealPolicy.startsWith("limited")){
            return (st.redealsRemaining || 0) > 0;
          }
          return true;
        }

	function isStuck(st){
	  return !isWin(st) && !hasAnyLegalMove(st) && !canDraw(st);
	}

	function endCheck(){
	  if (isWin(state)){
		state.score.total += 100; // bonus simple
		api.emit("win", state);
	  } else if (isStuck(state)){
		api.emit("stuck", state);
	  }
	}


    // ---------- Internal helpers
    function emit(){ api.emit("state", state); }

    function top(pile){ return pile.cards[pile.cards.length-1] || null; }

    function flipIfNeeded(pile){
      if (pile.kind === "tableau" && pile.cards.length){
        const c = top(pile);
        if (!c.faceUp){ c.faceUp = true; state.score.total += 5; }
      }
    }

    function pileById(id){
      if (id === "stock") return state.piles.stock;
      if (id === "waste") return state.piles.waste;
      if (id.startsWith("foundation-")){
        const suit = id.split("-")[1];
        return state.piles.foundations.find(f => f.suit===suit);
      }
      if (id.startsWith("tab-")){
        const idx = Number(id.split("-")[1])-1;
        return state.piles.tableau[idx];
      }
      return null;
    }

    function canMoveCard(card, dstPile){
      if (dstPile.kind==="foundation"){
        return Model.canDropOnFoundation(card, top(dstPile), dstPile.suit);
      }
      if (dstPile.kind==="tableau"){
        return Model.canDropOnTableau(card, top(dstPile));
      }
      return false;
    }

    // ---------- Public
    function newGame(settings){
      state = Model.deal(Math.floor(Math.random()*1e9), settings);
      // initialize redeal counter based on policy
      state.redealsRemaining = parseRedeals(settings.redealPolicy);
      undoStack = [];
      redoStack = [];
      emit();
          endCheck();
      return state;
    }

    function getState(){ return state; }

    function draw(){
      if (!state) return;
      pushUndo();
      const n = state.settings.drawCount || 1;
      for (let i=0;i<n;i++){
        if (!state.piles.stock.cards.length){
          // redeal
          if (state.piles.waste.cards.length && state.settings.redealPolicy!=="none" &&
              (state.settings.redealPolicy === "unlimited" || state.redealsRemaining > 0)){
            state.piles.stock.cards = state.piles.waste.cards.reverse().map(c=>({...c,faceUp:false}));
            state.piles.waste.cards = [];
            if (state.settings.redealPolicy.startsWith("limited")) state.redealsRemaining--;
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
    function move({srcPileId, cardIndex, dstPileId}){
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
      if (dst.kind==="foundation") state.score.total += 10;
	  if (src.kind==="foundation") state.score.total -= 10;
      state.score.moves++;

      emit();
          endCheck();
    }
	
function findHint(){
  if (!state) return null;
  const top = p => p.cards[p.cards.length-1] || null;

  // 1. waste → foundation ou tableau
  if (state.piles.waste.cards.length){
    const c = top(state.piles.waste);
    for (const f of state.piles.foundations){
      if (Model.canDropOnFoundation(c, top(f), f.suit))
        return { srcPileId:"waste", cardIndex: state.piles.waste.cards.length-1, dstPileId:f.id };
    }
    for (const t of state.piles.tableau){
      if (Model.canDropOnTableau(c, top(t)))
        return { srcPileId:"waste", cardIndex: state.piles.waste.cards.length-1, dstPileId:t.id };
    }
  }

  // 2. tableau → foundation ou tableau
  for (let ti=0; ti<state.piles.tableau.length; ti++){
    const t = state.piles.tableau[ti];
    for (let i=0; i<t.cards.length; i++){
      if (!t.cards[i].faceUp) continue;
      const c = t.cards[i];

      // try moving single card to foundation when on top
      if (i === t.cards.length - 1){
        for (const f of state.piles.foundations){
          if (Model.canDropOnFoundation(c, top(f), f.suit))
            return { srcPileId:t.id, cardIndex:i, dstPileId:f.id };
        }
      }

      // only consider the first face-up run in a tableau
      if (i > 0 && t.cards[i - 1].faceUp) continue;

      for (let tj=0; tj<state.piles.tableau.length; tj++){
        if (ti === tj) continue;
        const dstPile = state.piles.tableau[tj];
        const dstTop = top(dstPile);

        // skip moving a king pile with no hidden cards to another empty tableau
        if (!dstTop && c.rank === 13 && i === 0) continue;

        // skip moves where destination card is identical in rank and color
        const prev = i > 0 ? t.cards[i - 1] : null;
        const sameColor = (a, b) => {
          const red = a === 'H' || a === 'D';
          const redB = b === 'H' || b === 'D';
          return red === redB;
        };
        if (prev && dstTop && prev.rank === dstTop.rank && sameColor(prev.suit, dstTop.suit))
          continue;

        if (Model.canDropOnTableau(c, dstTop))
          return { srcPileId:t.id, cardIndex:i, dstPileId:dstPile.id };
      }
    }
  }

  return null;
}

    // Event Emitter minimal
    function EventEmitter(){
      const map=new Map();
      return {
        on(ev,fn){ map.set(ev,(map.get(ev)||[]).concat(fn)); return this; },
        emit(ev,p){ (map.get(ev)||[]).forEach(fn=>{ try{fn(p);}catch(e){console.error(e);} }); }
      };
    }
	
    function tick(){
      if (!state) return;
      state.time.elapsedMs = Date.now() - state.time.startedAt;
      api.emit("tick", state.time);
    }

    function undo(){
      if (!undoStack.length || !state) return;
      redoStack.push(cloneState(state));
      state = undoStack.pop();
      state.time.elapsedMs = Date.now() - state.time.startedAt;
      emit();
          endCheck();
    }

    function redo(){
      if (!redoStack.length || !state) return;
      undoStack.push(cloneState(state));
      state = redoStack.pop();
      state.time.elapsedMs = Date.now() - state.time.startedAt;
      emit();
          endCheck();
    }
	
function autoMoveOne({srcPileId, cardIndex}){
  const src = pileById(srcPileId);
  if (!src) return;

  const card = src.cards[cardIndex];
  if (!card) return;

  // Try to drop onto correct foundation
  const f = state.piles.foundations.find(x => x.suit === card.suit);
  const top = f.cards.length ? f.cards[f.cards.length-1] : null;
  if (Model.canDropOnFoundation(card, top, f.suit)){
    move({ srcPileId, cardIndex, dstPileId: f.id });
  }
}


    return { ...api, newGame, getState, draw, move, tick, findHint, autoMoveOne, undo, redo };
  })();

  window.Engine = Engine;
})();
