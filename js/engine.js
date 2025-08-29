/* jonv11-solitaire-onepager - js/engine.js
   Core game rules for Klondike.
   Relies on Model and Store. Emits events for UI.
*/
(function(){
  'use strict';

  const Engine = (() => {
    const api = EventEmitter();
    let state = null;

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
      emit();
      return state;
    }

    function getState(){ return state; }

    function draw(){
      if (!state) return;
      const n = state.settings.drawCount || 1;
      for (let i=0;i<n;i++){
        if (!state.piles.stock.cards.length){
          // redeal
          if (state.piles.waste.cards.length && state.settings.redealPolicy!=="none"){
            state.piles.stock.cards = state.piles.waste.cards.reverse().map(c=>({...c,faceUp:false}));
            state.piles.waste.cards = [];
          } else break;
        }
        const c = state.piles.stock.cards.pop();
        if (!c) break;
        c.faceUp = true;
        state.piles.waste.cards.push(c);
      }
      state.score.moves++;
      emit();
    }

    /** @param {{srcPileId:string, cardIndex:number, dstPileId:string}} move */
    function move({srcPileId, cardIndex, dstPileId}){
      const src = pileById(srcPileId);
      const dst = pileById(dstPileId);
      if (!src || !dst) return;

      const cards = src.cards.slice(cardIndex);
      if (!cards.length) return;
      if (!canMoveCard(cards[0], dst)) return;

      dst.cards.push(...cards);
      src.cards.length = cardIndex;
      flipIfNeeded(src);

      // scoring (basic)
      if (dst.kind==="foundation") state.score.total += 10;
	  if (src.kind==="foundation") state.score.total -= 10;
      state.score.moves++;

      emit();
    }

    // Event Emitter minimal
    function EventEmitter(){
      const map=new Map();
      return {
        on(ev,fn){ map.set(ev,(map.get(ev)||[]).concat(fn)); return this; },
        emit(ev,p){ (map.get(ev)||[]).forEach(fn=>{ try{fn(p);}catch(e){console.error(e);} }); }
      };
    }

    return { ...api, newGame, getState, draw, move };
  })();

  window.Engine = Engine;
})();
