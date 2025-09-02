/* jonv11-solitaire-onepager - js/solver.js
   Simple deterministic solver to detect proven dead-ends in Klondike.
   Exposes Solver.isNoHope(state, budgetMs=200) which returns true when no
   sequence of legal moves can lead to a win within the time budget.
   The solver is pure and does not touch the DOM. It relies on Engine's
   pure helpers for move generation and application.
   Test states for manual experiments are available under Solver.testStates.
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

    // ----- Test states for manual usage -----
    const TEST_SETTINGS = { drawCount:1, redealPolicy:"none", leftHandMode:false, animations:false, hints:true, autoComplete:false, sound:false };
    function card(s,r,faceUp){ return { id:s+r, rank:r, suit:s, color: Model.isRed(s)?"red":"black", faceUp:!!faceUp }; }
    function emptyTableau(){ return { id:"", kind:"tableau", col:0, cards:[] }; }

    function stateSkeleton(){
      return { seed:0, piles:{ tableau:[], foundations:[], stock:{id:"stock",kind:"stock",cards:[]}, waste:{id:"waste",kind:"waste",cards:[]} }, settings:TEST_SETTINGS, score:{total:0,moves:0}, redealsRemaining:0, history:[], time:{startedAt:0,elapsedMs:0} };
    }

    function trivialWin(){
      const st = stateSkeleton();
      const suits = ['S','H','D','C'];
      for(const s of suits){
        const cards=[]; for(let r=1;r<=12;r++) cards.push(card(s,r,true));
        st.piles.foundations.push({id:'foundation-'+s,kind:'foundation',suit:s,cards});
      }
      st.piles.tableau = suits.map((s,i)=>({id:'tab-'+(i+1),kind:'tableau',col:i+1,cards:[card(s,13,true)]}));
      for(let i=4;i<7;i++) st.piles.tableau.push({id:'tab-'+(i+1),kind:'tableau',col:i+1,cards:[]});
      return st;
    }

    function kingBlock(){
      const st = stateSkeleton();
      const tbl = [
        {id:'tab-1',kind:'tableau',col:1,cards:[card('S',5,false),card('H',13,true)]},
        {id:'tab-2',kind:'tableau',col:2,cards:[card('D',2,true)]},
        {id:'tab-3',kind:'tableau',col:3,cards:[card('C',4,true)]},
        {id:'tab-4',kind:'tableau',col:4,cards:[card('H',6,true)]},
        {id:'tab-5',kind:'tableau',col:5,cards:[card('C',8,true)]},
        {id:'tab-6',kind:'tableau',col:6,cards:[card('H',10,true)]},
        {id:'tab-7',kind:'tableau',col:7,cards:[card('C',12,true)]},
      ];
      st.piles.tableau = tbl;
      st.piles.foundations = ['S','H','D','C'].map(s=>({id:'foundation-'+s,kind:'foundation',suit:s,cards:[]}));
      return st;
    }

    function drawCycle(){
      const st = stateSkeleton();
      st.settings.drawCount = 3;
      st.settings.redealPolicy = 'unlimited';
      st.piles.stock.cards = [card('S',5,false), card('H',7,false), card('C',9,false)];
      st.piles.foundations = ['S','H','D','C'].map(s=>({id:'foundation-'+s,kind:'foundation',suit:s,cards:[]}));
      st.piles.tableau = Array.from({length:7}, (_,i)=>({id:'tab-'+(i+1),kind:'tableau',col:i+1,cards:[card('D',2*i+2,true)]}));
      return st;
    }

    const testStates = { trivialWin, kingBlock, drawCycle };

    return { isNoHope, searchWins, autoSafeToFoundationClosure, generateLegalMoves, fastNoHope, hashState, orderedMoves, heuristic, testStates };
  })();

  window.Solver = Solver;
})();
