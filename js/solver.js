/* jonv11-solitaire-onepager - js/solver.js
   Simple deterministic solver to detect proven dead-ends in Klondike.
   Exposes Solver.isNoHope(state, budgetMs=200) which returns true when no
   sequence of legal moves can lead to a win within the time budget.
   The solver is pure and does not touch the DOM. It relies on Engine's
   pure helpers for move generation and application.
*/
(function(){
  "use strict";

  const Solver = (() => {
    /** Apply all safe foundation moves until none remain */
    function autoSafeToFoundationClosure(st){
      let cur = st;
      while(true){
        const moves = Engine.enumerateAutoSafeFoundationMoves(cur);
        if(!moves.length) break;
        for(const m of moves) cur = Engine.applyMove(cur, m);
      }
      return cur;
    }

    function generateLegalMoves(st){
      return Engine.listLegalMoves(st);
    }

    function fastNoHope(st){
      // quick check: no legal moves and not a win
      return !Engine.isWin(st) && generateLegalMoves(st).length === 0;
    }

    function foundationCount(st){
      return st.piles.foundations.reduce((s,f)=>s+f.cards.length,0);
    }

    function heuristic(st){
      return 52 - foundationCount(st);
    }

    function hashState(st){
      // simple canonical serialization
      const tbl = st.piles.tableau.map(p=>p.cards.map(c=>[c.suit,c.rank,c.faceUp?1:0]));
      const fnd = st.piles.foundations.map(f=>f.cards.length);
      const waste = st.piles.waste.cards.map(c=>[c.suit,c.rank]);
      const stock = st.piles.stock.cards.map(c=>[c.suit,c.rank]);
      return JSON.stringify({t:tbl,f:fnd,w:waste,s:stock,draw:st.settings.drawCount,redeal:st.redealsRemaining});
    }

    function orderedMoves(moves){
      const pri = (m)=>{
        if(m.type === 'flip') return 0;
        if(m.type === 'move' && m.dst.startsWith('foundation') && m.src.startsWith('tab')) return 1;
        if(m.type === 'move' && m.dst.startsWith('foundation') && m.src === 'waste') return 2;
        if(m.type === 'move' && m.src.startsWith('tab')) return 3;
        if(m.type === 'move' && m.src === 'waste') return 4;
        if(m.type === 'draw') return 5;
        return 6;
      };
      return moves.slice().sort((a,b)=>pri(a)-pri(b));
    }

    function searchWins(st, deadlineTs, seen = new Set()){
      if(Date.now() > deadlineTs) return false;
      const reduced = autoSafeToFoundationClosure(st);
      if(Engine.isWin(reduced)) return true;
      const key = hashState(reduced);
      if(seen.has(key)) return false;
      seen.add(key);
      const moves = orderedMoves(generateLegalMoves(reduced));
      for(const mv of moves){
        const next = Engine.applyMove(reduced, mv);
        if(searchWins(next, deadlineTs, seen)) return true;
        if(Date.now() > deadlineTs) return false;
      }
      return false;
    }

    function isNoHope(state, budgetMs=200){
      const start = Date.now();
      if(fastNoHope(state)) return true;
      const deadline = start + budgetMs;
      const clone = JSON.parse(JSON.stringify(state));
      return !searchWins(clone, deadline);
    }

    return { isNoHope, searchWins, autoSafeToFoundationClosure, generateLegalMoves, fastNoHope, hashState, orderedMoves, heuristic };
  })();

  window.Solver = Solver;
})();
