/* jonv11-solitaire-onepager - js/invariants.js
   Runtime invariants used during development to ensure game state validity.
   Checks that each foundation pile contains cards of a single suit in
   strictly ascending order. In production builds this file can be omitted
   or `assertFoundationInvariant` left undefined.
*/
(function(){
  'use strict';

  /**
   * Verify that all foundation piles contain only cards of their declared suit
   * and that ranks increase sequentially from Ace upwards.
   * @param {import('./model.js').GameState} st
   */
  function assertFoundationInvariant(st){
    if (!st || !st.piles) return; // tolerate partially initialised state
    for (const f of st.piles.foundations){
      let prev = 0;
      for (const card of f.cards){
        if (card.suit !== f.suit){
          throw new Error(`Foundation ${f.id} expected ${f.suit} but saw ${card.suit}`);
        }
        if (prev === 0){
          if (card.rank !== 1) throw new Error(`Foundation ${f.id} must start at Ace`);
        } else if (card.rank !== prev + 1){
          throw new Error(`Foundation ${f.id} out of sequence at rank ${card.rank}`);
        }
        prev = card.rank;
      }
    }
  }

  // expose globally for engine and tests
  window.assertFoundationInvariant = assertFoundationInvariant;
})();
