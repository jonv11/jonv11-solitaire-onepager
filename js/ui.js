/* eslint-disable no-console */
/* jonv11-solitaire-onepager - js/ui.js
   UI rendering + interactions.
   - Tap or click stock to draw.
   - Click source pile then destination pile to request a move.
   - Basic drag visuals; drops call Engine.move if present.
   Engine is responsible for rule validation and state updates.
*/
/* global EventEmitter, Model, Engine */
(function () {
  "use strict";

  // Simple wrapper to allow stripping debug logging in production
  function _debugLog(txt) {
    if (console && console.log) console.log("DEBUG:", txt);
  }

  const UI = (() => {
    const api = EventEmitter();
    let root, scoreEl, movesEl, _timeEl;
    let state = null;
    let _selection = null; // { pileId, cardIndex }

    // ---------- Public
    function init(rootEl) {
      root = rootEl;
      scoreEl = document.getElementById("score");
      movesEl = document.getElementById("moves");
      _timeEl = document.getElementById("time");
    }

    function render(nextState) {
      state = nextState;
      if (!root || !state) return;

      // Clear piles
      const ids = [
        "stock",
        "waste",
        "foundation-S",
        "foundation-H",
        "foundation-D",
        "foundation-C",
        "tab-1",
        "tab-2",
        "tab-3",
        "tab-4",
        "tab-5",
        "tab-6",
        "tab-7",
      ];
      ids.forEach((id) => {
        const el = document.getElementById(id);
        if (!el) return;
        clear(el);
        const pile = findPileById(state, id);
        if (!pile) return;
        pile.cards.forEach((c, i) => el.appendChild(makeCardEl(c, i, pile)));
      });

      // stock tap → draw (pointer events work for mouse + touch)
      const stockEl = document.getElementById("stock");
      stockEl && stockEl.addEventListener("pointerup", onStockClick);
    }

    function applyDeltas(_deltas, st) {
      render(st);
    }

    function updateStatus(st) {
      if (scoreEl) scoreEl.textContent = "Score: " + (st?.score?.total ?? 0);
      if (movesEl) movesEl.textContent = "Moves: " + (st?.score?.moves ?? 0);
    }

    // ---------- Elements
    function makeCardEl(card, i, pile) {
      const el = document.createElement("div");
      el.className = "card " + (card.faceUp ? "face-up" : "face-down");
      el.style.setProperty("--i", String(i));
      el.dataset.suit = card.suit;
      el.dataset.rank = String(card.rank);
      el.tabIndex = -1;

      if (card.faceUp) {
        const tl = document.createElement("div");
        tl.className = "corner top-left";
        // Render rank/suit in the card's top-left corner
        tl.textContent =
          Model.rankToText(card.rank) + Model.suitToChar(card.suit);
        const br = document.createElement("div");
        br.className = "corner bottom-right";
        // Mirror rank/suit bottom-right for symmetry
        br.textContent =
          Model.rankToText(card.rank) + Model.suitToChar(card.suit);
        const center = document.createElement("div");
        center.className = "center";
        // Center of card only shows the suit symbol
        center.textContent = Model.suitToChar(card.suit);
        el.appendChild(tl);
        el.appendChild(br);
        el.appendChild(center);
      }

      // Only allow interaction if faceUp and (not waste OR top of waste)
      let allow = true;
      if (!card.faceUp) allow = false;
      if (pile.kind === "waste" && i !== pile.cards.length - 1) allow = false;
      if (allow) {
        el.addEventListener("pointerdown", onDragStart);
        el.addEventListener("pointerup", onCardTap);
        // Desktop users expect a native double-click to auto-move
        el.addEventListener("dblclick", onCardDoubleClick);
      }
      return el;
    }

    function clear(el) {
      // Remove all child nodes from the given pile element
      while (el.firstChild) el.removeChild(el.firstChild);
    }

    // ---------- Helpers
    // rank/suit helpers are provided by Model (rankToText/suitToChar)

    function pileElToId(el) {
      // Accept a pile element or any child within it and return the pile id
      if (!el) return null;
      if (el.id) return el.id;
      const p = el.closest(".pile");
      return p ? p.id : null;
    }

    function findPileById(st, id) {
      // Locate a pile object in the state by its DOM id
      if (id === "stock") return st.piles.stock;
      if (id === "waste") return st.piles.waste;
      if (id.startsWith("foundation-")) {
        const suit = id.split("-")[1];
        return st.piles.foundations.find((p) => p.suit === suit) || null;
      }
      if (id.startsWith("tab-")) {
        const idx = Number(id.split("-")[1]) - 1;
        return st.piles.tableau[idx] || null;
      }
      return null;
    }

    function highlightValidTargetsForCard(card) {
      // Visual hint: highlight foundation piles where `card` may be dropped
      document.querySelectorAll(".pile.foundation").forEach((el) => {
        const suit = el.getAttribute("data-suit");
        const pile = findPileById(state, el.id);
        const dstTop =
          pile && pile.cards.length ? pile.cards[pile.cards.length - 1] : null;
        const ok =
          window.Model && Model.canDropOnFoundation(card, dstTop, suit);
        el.classList.toggle("valid-target", !!ok);
      });
    }
    function clearValidTargets() {
      // Remove any highlighting added by highlightValidTargetsForCard
      document
        .querySelectorAll(".pile.valid-target")
        .forEach((el) => el.classList.remove("valid-target"));
    }
    function _topFaceUpIndex(pile) {
      // Index of the uppermost face-up card (or -1 if none)
      for (let i = pile.cards.length - 1; i >= 0; i--) {
        if (pile.cards[i].faceUp) return i;
      }
      return -1;
    }

    function toast(msg) {
      showBanner(msg, { kind: "info", ms: 1500 });
    }

    // Critical banner helpers
    let liveTimer = 0;
    function showBanner(msg, opts = {}) {
      const el = document.getElementById("live");
      if (!el) return;
      const { kind = "alert", ms = 2000 } = opts; // kind: "alert"|"info"|"ok"
      el.textContent = msg;
      el.setAttribute("role", "alert");
      el.classList.remove("sr-only", "info", "ok");
      if (kind === "info") el.classList.add("info");
      if (kind === "ok") el.classList.add("ok");
      el.classList.add("show");
      if (liveTimer) clearTimeout(liveTimer);
      liveTimer = setTimeout(hideBanner, ms);
    }
    function hideBanner() {
      const el = document.getElementById("live");
      if (!el) return;
      el.classList.remove("show", "info", "ok");
      // keep text for accessibility; it will update on the next show
    }

    // Simple win celebration: shower the screen with cards
    function winAnimation() {
      // Overlay to hold temporary animated cards
      const overlay = document.createElement("div");
      overlay.className = "win-animation";
      document.body.appendChild(overlay);

      const suits = ["S", "H", "D", "C"];

      // Generate a full deck of face-up cards
      for (const suit of suits) {
        for (let rank = 1; rank <= 13; rank++) {
          const card = makeCardEl({ suit, rank, faceUp: true }, 0, {
            kind: "foundation",
            cards: [],
          });
          card.classList.add("celebration-card");
          overlay.appendChild(card);

          // Random horizontal start position and drift/rotation via CSS vars
          const w = card.getBoundingClientRect().width;
          card.style.left = Math.random() * (window.innerWidth - w) + "px";
          card.style.setProperty("--dx", Math.random() * 200 - 100 + "px");
          card.style.setProperty("--rot", Math.random() * 720 + 360 + "deg");
          card.style.animationDelay = Math.random() * 0.5 + "s";
        }
      }

      // Clean up after animations finish
      setTimeout(() => overlay.remove(), 4000);
    }

    function highlightMove(move) {
      clearValidTargets();
      if (!move) return;
      const srcEl = document
        .getElementById(move.srcPileId)
        ?.querySelectorAll(".card")[move.cardIndex];
      const dstPile = document.getElementById(move.dstPileId);
      const dstEl = dstPile?.querySelector(".card:last-child");
      if (srcEl) srcEl.classList.add("hint");
      if (dstPile) dstPile.classList.add("valid-target");
      if (dstEl) dstEl.classList.add("valid-target");
      setTimeout(() => {
        srcEl?.classList.remove("hint");
        dstEl?.classList.remove("valid-target");
        dstPile?.classList.remove("valid-target");
      }, 1500);
    }

    /**
     * Animate a card flying from its source pile to a destination pile.
     * This helper clones the DOM node so the real card can remain in place
     * until the Engine updates the state. The clone is positioned using a
     * simple FLIP (First, Last, Invert, Play) transition.
     * @param {{srcPileId:string, cardIndex:number, dstPileId:string}} move
     * @param {number} [ms=200] duration of the animation
     * @returns {Promise<void>} resolves once the animation finishes
     */
    function animateMove(move, ms = 200) {
      return new Promise((resolve) => {
        const srcPile = document.getElementById(move.srcPileId);
        const dstPile = document.getElementById(move.dstPileId);
        const srcEl = srcPile?.querySelectorAll(".card")[move.cardIndex];
        if (!srcEl || !dstPile) {
          resolve();
          return;
        }

        // Starting and ending geometry
        const start = srcEl.getBoundingClientRect();
        const end = dstPile.getBoundingClientRect();

        // Clone the card so the original can be hidden during the flight
        const ghost = srcEl.cloneNode(true);
        ghost.style.position = "fixed";
        ghost.style.left = start.left + "px";
        ghost.style.top = start.top + "px";
        ghost.style.margin = "0";
        ghost.style.transition = `transform ${ms}ms ease`;
        document.body.appendChild(ghost);
        srcEl.style.visibility = "hidden";

        // Play the animation on the next frame
        requestAnimationFrame(() => {
          const dx = end.left - start.left;
          const dy = end.top - start.top;
          ghost.style.transform = `translate(${dx}px, ${dy}px)`;
        });

        // Cleanup after the animation completes
        setTimeout(() => {
          ghost.remove();
          srcEl.style.visibility = "";
          resolve();
        }, ms);
      });
    }

    // ---------- Click interactions
    function onStockClick(e) {
      if (e) e.preventDefault();
      if (window.Engine?.draw) window.Engine.draw();
    }

    function _tryMove(srcPileId, cardIndex, dstPileId) {
      if (window.Engine?.move) {
        window.Engine.move({ srcPileId, cardIndex, dstPileId });
      } else {
        // Visual feedback only
        flashPile(document.getElementById(dstPileId));
      }
    }

    function flashPile(el) {
      if (!el) return;
      el.classList.add("is-target");
      setTimeout(() => el.classList.remove("is-target"), 180);
    }

    // ---------- Drag interactions (visual only unless Engine.move exists)
    let drag = null; // { el, startX, startY, ox, oy, srcPileId, cardIndex }
    let isDragging = false;

    function moveTo(el, x, y) {
      // Position `el` at screen coordinates during drag
      el.style.position = "fixed";
      el.style.left = Math.round(x) + "px";
      el.style.top = Math.round(y) + "px";
    }

    function assignStyleForDrag(target) {
      // Prepare card for dragging: elevate and ignore pointer events
      target.classList.add("dragging");
      target.style.pointerEvents = "none";
    }

    function resetStyleAfterDrag(el) {
      // Restore original positioning after drag completes or cancels
      el.style.position = "";
      el.style.left = "";
      el.style.top = "";
      el.style.pointerEvents = "";
    }

    function onDragStart(ev) {
      // Begin a drag sequence when the user presses on a face-up card
      const target = ev.currentTarget;
      const pileEl = target.closest(".pile");
      const cards = Array.from(pileEl.querySelectorAll(".card"));
      const index = cards.indexOf(target); // position of the selected card
      const stack = cards.slice(index); // cards to move (includes target)
      const srcPileId = pileElToId(pileEl);
      if (!srcPileId) {
        //debugLog("!srcPileId")
        return;
      }

      // Only prevent default browser behavior for non-mouse pointers.
      // Preventing default on mouse would cancel native dblclick events.
      if (ev.pointerType !== "mouse") {
        // Touch inputs need default prevented to avoid scrolling during drag.
        ev.preventDefault();
      }
      ev.stopPropagation();

      // bounding rect of the origin card
      const baseRect = target.getBoundingClientRect();

      // snapshot positions before changing style
      const snapshots = stack.map((el) => ({
        el,
        rect: el.getBoundingClientRect(),
        dy: el.getBoundingClientRect().top - baseRect.top, // relative vertical offset
      }));

      // apply drag style to all cards in the stack
      snapshots.forEach(({ el }) => {
        assignStyleForDrag(el);
      });

      const p = pointFromEvent(ev);

      drag = {
        el: target,
        els: stack,
        startX: p.x,
        startY: p.y,
        baseRect: baseRect,
        ox: p.x - baseRect.left,
        oy: p.y - baseRect.top,
        offsets: snapshots.map((s) => s.dy), // for onDragMove
        srcPileId,
        cardIndex: index,
      };
      isDragging = true;

      // get the domain card object for highlighting
      const pile = findPileById(state, srcPileId);
      const card = pile ? pile.cards[drag.cardIndex] : null;
      if (card) highlightValidTargetsForCard(card);

      window.addEventListener("pointermove", onDragMove, { passive: false });
      window.addEventListener("pointerup", onDragEnd, { passive: false });
      window.addEventListener("pointercancel", onDragEnd, { passive: false });
    }

    function onDragMove(ev) {
      // Update the position of all dragged cards as the pointer moves
      if (!isDragging || !drag) return;
      ev.preventDefault();

      const p = pointFromEvent(ev);

      drag.els.forEach((el, i) => {
        moveTo(
          el,
          p.x - drag.startX + drag.baseRect.left,
          p.y - drag.startY + drag.baseRect.top + drag.offsets[i],
        );
      });
    }

    function onDragEnd(ev) {
      // Finish the drag sequence, performing a move if valid
      if (!drag) {
        //debugLog("!drag")
        return;
      }
      ev.preventDefault();
      const p = pointFromEvent(ev);
      const dst = document.elementFromPoint(p.x, p.y);
      const dstPileEl = dst ? dst.closest(".pile") : null;
      const dstPileId = pileElToId(dstPileEl);

      //debugLog("p = " + p)
      //debugLog("dst = " + dst)
      //debugLog("dstPileEl = " + dstPileEl)
      //debugLog("dstPileId = " + dstPileId)

      drag.els.forEach((el) => {
        el.classList.remove("dragging");
      });
      let moved = false;
      if (dstPileId && window.Engine?.move) {
        const before = JSON.stringify(Engine.getState());
        Engine.move({
          srcPileId: drag.srcPileId,
          cardIndex: drag.cardIndex,
          dstPileId,
        });
        //debugLog("Engine.move({ srcPileId: " + drag.srcPileId + ", cardIndex: " + drag.cardIndex + ", " + dstPileId + " });")
        moved = JSON.stringify(Engine.getState()) !== before;
      }
      if (!moved) {
        // snap back to original position
        drag.els.forEach((el) => {
          resetStyleAfterDrag(el);
        });
        //debugLog("!moved")
      }
      drag = null;
      clearValidTargets();

      window.removeEventListener("pointermove", onDragMove);
      window.removeEventListener("pointerup", onDragEnd);
      window.removeEventListener("pointercancel", onDragEnd);
      setTimeout(() => {
        isDragging = false;
      }, 0);
    }

    function pointFromEvent(ev) {
      // Normalize mouse vs touch events into common {x,y} object
      if (ev.touches && ev.touches[0])
        return { x: ev.touches[0].clientX, y: ev.touches[0].clientY };
      return { x: ev.clientX, y: ev.clientY };
    }

    // ---------- Double-activation helpers
    let lastTap = 0;
    let autoMoveLock = false; // debounce guard for double-click/tap

    function autoMoveFromCard(el) {
      if (autoMoveLock) return; // ignore re-entrant calls
      autoMoveLock = true;
      const pileEl = el.closest(".pile");
      const srcPileId = pileElToId(pileEl);
      const cardIndex = Array.from(pileEl.querySelectorAll(".card")).indexOf(
        el,
      );
      // Ask engine to auto-move this card to its foundation
      Engine.autoMoveOne?.({ srcPileId, cardIndex });
      // release lock next tick so subsequent user actions are honoured
      setTimeout(() => {
        autoMoveLock = false;
      }, 0);
    }

    function onCardTap(e) {
      // Pointer events with type "touch" emulate double-tap for mobile
      if (e.pointerType && e.pointerType !== "touch") return;
      const now = Date.now();
      if (now - lastTap < 500) {
        // 500ms threshold for human double taps
        e.preventDefault();
        autoMoveFromCard(e.currentTarget);
      }
      lastTap = now;
    }

    function onCardDoubleClick(e) {
      // Native desktop double-click handler
      e.preventDefault();
      autoMoveFromCard(e.currentTarget);
    }

    return {
      ...api,
      init,
      render,
      toast,
      applyDeltas,
      updateStatus,
      highlightMove,
      winAnimation,
      animateMove,
    };
  })();

  window.UI = UI;
})();
