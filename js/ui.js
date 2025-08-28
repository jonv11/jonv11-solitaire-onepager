
/* jonv11-solitaire-onepager - js/ui.js
   UI rendering + interactions.
   - Click stock to draw.
   - Click source pile then destination pile to request a move.
   - Basic drag visuals; drops call Engine.move if present.
   Engine is responsible for rule validation and state updates.
*/
(function(){
  'use strict';

  const UI = (() => {
    const api = EventEmitter();
    let root, scoreEl, movesEl, timeEl;
    let state = null;
    let selection = null; // { pileId, cardIndex }

    // ---------- Public
    function init(rootEl){
      root = rootEl;
      scoreEl = document.getElementById("score");
      movesEl = document.getElementById("moves");
      timeEl  = document.getElementById("time");
    }

    function render(nextState){
      state = nextState;
      if (!root || !state) return;

      // Clear piles
      const ids = ["stock","waste","foundation-S","foundation-H","foundation-D","foundation-C",
        "tab-1","tab-2","tab-3","tab-4","tab-5","tab-6","tab-7"];
      ids.forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        clear(el);
        const pile = findPileById(state, id);
        if (!pile) return;
        pile.cards.forEach((c, i) => el.appendChild(makeCardEl(c, i, pile)));
        // pile click handler
        wirePile(el);
      });

      // stock click → draw
      const stockEl = document.getElementById("stock");
      stockEl && stockEl.addEventListener("click", onStockClick, { passive:true });
    }

    function applyDeltas(_deltas, st){ render(st); }

    function updateStatus(st){
      if (scoreEl) scoreEl.textContent = "Score: " + (st?.score?.total ?? 0);
      if (movesEl) movesEl.textContent = "Moves: " + (st?.score?.moves ?? 0);
    }

    // ---------- Elements
    function makeCardEl(card, i, pile){
      const el = document.createElement("div");
      el.className = "card " + (card.faceUp ? "face-up" : "face-down");
      el.style.setProperty("--i", String(i));
      el.dataset.suit = card.suit;
      el.dataset.rank = String(card.rank);
      el.tabIndex = -1;

      if (card.faceUp){
        const tl = document.createElement("div");
        tl.className = "corner top-left";
        tl.textContent = rankText(card.rank) + suitText(card.suit);
        const br = document.createElement("div");
        br.className = "corner bottom-right";
        br.textContent = rankText(card.rank) + suitText(card.suit);
        const center = document.createElement("div");
        center.className = "center";
        center.textContent = suitText(card.suit);
        el.appendChild(tl); el.appendChild(br); el.appendChild(center);
      }

      // Only allow interaction if faceUp and (not waste OR top of waste)
      let allow = true;
      if (!card.faceUp) allow = false;
      if (pile.kind === 'waste' && i !== pile.cards.length-1) allow = false;
      if (allow){
        el.addEventListener('mousedown', onDragStart);
        el.addEventListener('touchstart', onDragStart, { passive:false });
      }
      return el;
    }

    function clear(el){ while (el.firstChild) el.removeChild(el.firstChild); }

    // ---------- Helpers
    function rankText(r){ return ({1:"A",11:"J",12:"Q",13:"K"})[r] || String(r); }
    function suitText(s){ return ({S:"♠", H:"♥", D:"♦", C:"♣"})[s] || "?"; }

    function pileElToId(el){
      if (!el) return null;
      if (el.id) return el.id;
      const p = el.closest(".pile");
      return p ? p.id : null;
    }

    function findPileById(st, id){
      if (id === "stock") return st.piles.stock;
      if (id === "waste") return st.piles.waste;
      if (id.startsWith("foundation-")){
        const suit = id.split("-")[1];
        return st.piles.foundations.find(p => p.suit === suit) || null;
      }
      if (id.startsWith("tab-")){
        const idx = Number(id.split("-")[1]) - 1;
        return st.piles.tableau[idx] || null;
      }
      return null;
    }

    
    function highlightValidTargetsForCard(card){
      document.querySelectorAll('.pile.foundation').forEach(el => {
        const suit = el.getAttribute('data-suit');
        const pile = findPileById(state, el.id);
        const dstTop = pile && pile.cards.length ? pile.cards[pile.cards.length-1] : null;
        const ok = window.Model && Model.canDropOnFoundation(card, dstTop, suit);
        el.classList.toggle('valid-target', !!ok);
      });
    }
    function clearValidTargets(){
      document.querySelectorAll('.pile.valid-target').forEach(el => el.classList.remove('valid-target'));
    }
function topFaceUpIndex(pile){
      for (let i = pile.cards.length - 1; i >= 0; i--){
        if (pile.cards[i].faceUp) return i;
      }
      return -1;
    }

    // ---------- Click interactions
    function onStockClick(e){
      if (e) e.preventDefault();
      if (window.Engine?.draw) window.Engine.draw();
    }

    function wirePile(el){
      el.addEventListener("click", (e) => {
        const pileId = pileElToId(el);
        if (!pileId || !state) return;

        // If stock clicked, draw handled separately
        if (pileId === "stock") return;

        if (!selection){
          // select source
          const pile = findPileById(state, pileId);
          const idx = topFaceUpIndex(pile);
          if (idx >= 0){
            selection = { pileId, cardIndex: idx };
            el.classList.add("is-target");
            const card = findPileById(state, pileId).cards[idx];
            if (card) highlightValidTargetsForCard(card);
          }
        } else {
          // attempt move selection -> pileId
          tryMove(selection.pileId, selection.cardIndex, pileId);
          // clear UI selection
          document.querySelectorAll(".pile.is-target").forEach(p => p.classList.remove("is-target"));
          clearValidTargets();
          selection = null;
        }
      });
    }

    function tryMove(srcPileId, cardIndex, dstPileId){
      if (window.Engine?.move){
        window.Engine.move({ srcPileId, cardIndex, dstPileId });
      } else {
        // Visual feedback only
        flashPile(document.getElementById(dstPileId));
      }
    }

    function flashPile(el){
      if (!el) return;
      el.classList.add("is-target");
      setTimeout(() => el.classList.remove("is-target"), 180);
    }

    // ---------- Drag interactions (visual only unless Engine.move exists)
    let drag = null; // { el, startX, startY, ox, oy, srcPileId, cardIndex }
    function onDragStart(ev){
      const target = ev.currentTarget;
      const pileEl = target.closest(".pile");
      const srcPileId = pileElToId(pileEl);
      if (!srcPileId) return;

      ev.preventDefault();
      const p = pointFromEvent(ev);
      const rect = target.getBoundingClientRect();
      drag = {
        el: target,
        startX: p.x, startY: p.y,
        ox: p.x - rect.left, oy: p.y - rect.top,
        srcPileId,
        cardIndex: (function(){
          const list = Array.from(pileEl.querySelectorAll(".card"));
          return list.indexOf(target);
        })()
      };
      target.classList.add("dragging");
      const pileData = findPileById(state, srcPileId);
      const dragCard = pileData ? pileData.cards[drag.cardIndex] : null;
      if (dragCard) highlightValidTargetsForCard(dragCard);
      moveTo(target, rect.left, rect.top);
      window.addEventListener("mousemove", onDragMove, { passive:false });
      window.addEventListener("touchmove", onDragMove, { passive:false });
      window.addEventListener("mouseup", onDragEnd, { passive:false });
      window.addEventListener("touchend", onDragEnd, { passive:false });
    }

    function onDragMove(ev){
      if (!drag) return;
      ev.preventDefault();
      const p = pointFromEvent(ev);
      moveTo(drag.el, p.x - drag.ox, p.y - drag.oy);
    }

    function onDragEnd(ev){
      if (!drag) return;
      ev.preventDefault();
      const p = pointFromEvent(ev);
      const dst = document.elementFromPoint(p.x, p.y);
      const dstPileEl = dst ? dst.closest(".pile") : null;
      const dstPileId = pileElToId(dstPileEl);

      drag.el.classList.remove("dragging");
      clearValidTargets();
      drag = (function finalize(prev){
        if (dstPileId && window.Engine?.move){
          window.Engine.move({ srcPileId: prev.srcPileId, cardIndex: prev.cardIndex, dstPileId });
        }
        // trigger re-render from Engine event; otherwise snap back
        return null;
      })(drag);

      window.removeEventListener("mousemove", onDragMove);
      window.removeEventListener("touchmove", onDragMove);
      window.removeEventListener("mouseup", onDragEnd);
      window.removeEventListener("touchend", onDragEnd);
    }

    function moveTo(el, x, y){
      el.style.position = "fixed";
      el.style.left = Math.round(x) + "px";
      el.style.top  = Math.round(y) + "px";
      el.style.pointerEvents = "none";
    }

    function pointFromEvent(ev){
      if (ev.touches && ev.touches[0]) return { x: ev.touches[0].clientX, y: ev.touches[0].clientY };
      return { x: ev.clientX, y: ev.clientY };
    }

    // ---------- Tiny emitter to decouple if needed
    function EventEmitter(){
      const map = new Map();
      return {
        on(ev, fn){ map.set(ev, (map.get(ev)||[]).concat(fn)); return this; },
        emit(ev, payload){ (map.get(ev)||[]).forEach(fn => { try{ fn(payload); } catch(e){ console.error(e); } }); }
      };
    }

    return { ...api, init, render, applyDeltas, updateStatus };
  })();

  window.UI = UI;
})();
