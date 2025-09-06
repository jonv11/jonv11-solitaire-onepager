/* jonv11-solitaire-onepager - js/main.js
   App controller and wiring. Delegates to Engine (rules) and UI (render).
   Safe if Engine/UI/Store are missing: stubs keep the page interactive.
*/
/* global Store, Engine, SoliStats, UI, Solver */
(() => {
  "use strict";

  // Disable zoom on mobile browsers
  document.addEventListener(
    "touchstart",
    (event) => {
      if (event.touches.length > 1) {
        event.preventDefault();
      }
    },
    { passive: false },
  );

  // ---------- Utilities
  const $ = (sel, root = document) => root.querySelector(sel);
  const on = (el, ev, fn, opts) => el && el.addEventListener(ev, fn, opts);
  const _clamp = (n, a, b) => Math.max(a, Math.min(b, n));

  // ---------- Defaults and keys
  const DEFAULTS = Object.freeze({
    drawCount: 1,
    redealPolicy: "unlimited", // "unlimited" | "limited(n)" | "none"
    leftHandMode: false,
    animations: true,
    hints: true,
    autoComplete: true,
    sound: false,
  });

  const _KEYS = Object.freeze({
    settings: "solitaire.settings",
    saved: "solitaire.saved",
    stats: "solitaire.stats",
  });

  // ---------- DOM refs
const refs = {
  root: $("#game"),
  score: $("#score"),
  moves: $("#moves"),
  time: $("#time"),
  btnNew: $("#newGame"),
  btnUndo: $("#undo"),
  btnRedo: $("#redo"),
  btnHint: $("#hint"),
  btnAuto: $("#auto"),
  selDraw: $("#drawCount"),
  selRedeal: $("#redealPolicy"),
  chkLeft: $("#leftHandMode"),
  chkHints: $("#hints"),
  chkAuto: $("#autoComplete"),
  chkAnim: $("#animations"),
  chkSound: $("#sound"),
};

  // Capture touch gestures inside the game area to avoid iOS Safari
  // interpreting left-edge drags as history navigation or tab switching.
  on(refs.root, "touchstart", (ev) => ev.preventDefault(), { passive: false });
  on(refs.root, "touchmove", (ev) => ev.preventDefault(), { passive: false });

  // ---------- Controller
  const Controller = (() => {
    let settings = Object.assign(
      {},
      DEFAULTS,
      (Store.getSettings && Store.getSettings()) || {},
    );
    let timerId = 0;

    function applySettingsToControls() {
      if (refs.selDraw) refs.selDraw.value = String(settings.drawCount);
      if (refs.selRedeal) refs.selRedeal.value = String(settings.redealPolicy);
      if (refs.chkLeft) refs.chkLeft.checked = !!settings.leftHandMode;
      if (refs.chkHints) refs.chkHints.checked = !!settings.hints;
      if (refs.chkAuto) refs.chkAuto.checked = !!settings.autoComplete;
      if (refs.chkAnim) refs.chkAnim.checked = !!settings.animations;
      if (refs.chkSound) refs.chkSound.checked = !!settings.sound;
      document.body.classList.toggle("left-hand", !!settings.leftHandMode);
    }

    function readSettingsFromControls() {
      settings = Object.assign({}, DEFAULTS, {
        drawCount: Number(refs.selDraw?.value ?? 1),
        redealPolicy: String(refs.selRedeal?.value ?? "unlimited"),
        leftHandMode: !!refs.chkLeft?.checked,
        hints: !!refs.chkHints?.checked,
        autoComplete: !!refs.chkAuto?.checked,
        animations: !!refs.chkAnim?.checked,
        sound: !!refs.chkSound?.checked,
      });
      Store.setSettings(settings);
      document.body.classList.toggle("left-hand", !!settings.leftHandMode);
    }

    function updateStatus(state) {
      if (refs.score)
        refs.score.textContent = "Score: " + (state?.score?.total ?? 0);
      if (refs.moves)
        refs.moves.textContent = "Moves: " + (state?.score?.moves ?? 0);
    }

    function formatTime(ms) {
      const s = Math.floor(ms / 1000);
      const m = Math.floor(s / 60);
      const ss = String(s % 60).padStart(2, "0");
      const mm = String(m).padStart(2, "0");
      return mm + ":" + ss;
    }

    function startTimer() {
      stopTimer();
      timerId = window.setInterval(() => {
        const st = Engine.getState && Engine.getState();
        if (st && refs.time)
          refs.time.textContent = "Time: " + formatTime(st.time.elapsedMs);
        if (Engine.tick) Engine.tick();
      }, 1000);
    }
    function stopTimer() {
      if (timerId) {
        clearInterval(timerId);
        timerId = 0;
      }
    }

    // Toggle visibility of action buttons (undo/redo/hint/auto)
    function setActionButtonsVisible(show) {
      const display = show ? "" : "none";
      [refs.btnUndo, refs.btnRedo, refs.btnHint, refs.btnAuto].forEach(
        (btn) => {
          if (!btn) return;
          // Auto button only visible when setting allows it
          if (btn === refs.btnAuto && !settings.autoComplete) {
            btn.style.display = "none";
          } else {
            btn.style.display = display;
          }
        },
      );
    }

    function newGame() {
      // If an existing game is in progress, record it as a loss before starting over
      if (
        window.SoliStats &&
        window.localStorage &&
        window.localStorage.getItem("soli.v1.current")
      ) {
        SoliStats.initStats();
        const prev = Engine.getState && Engine.getState();
        if (prev) {
          Engine.tick && Engine.tick(); // update elapsed time
          const fu = prev.piles.foundations.map((f) => f.cards.length);
          const redealAllowed = (policy) => {
            if (policy === "unlimited") return Number.MAX_SAFE_INTEGER;
            if (policy === "none") return 0;
            const m = /limited\((\d+)\)/.exec(policy);
            return m ? Number(m[1]) : 0;
          };
          const rv =
            redealAllowed(prev.settings.redealPolicy) -
            (prev.redealsRemaining || 0);
          SoliStats.commitResult({
            ts: prev.time.startedAt,
            te: Date.now(),
            w: 0,
            m: prev.score.moves,
            t: Math.floor(prev.time.elapsedMs / 1000),
            dr: prev.settings.drawCount,
            sc: prev.score.total,
            rv,
            fu,
            ab: "user",
          });
        }
      }

      readSettingsFromControls();
      const st = Engine.newGame ? Engine.newGame(settings) : null;
      if (st) {
        if (window.SoliStats) {
          SoliStats.initStats();
          SoliStats.saveCurrent({
            ts: Date.now(),
            dr: settings.drawCount,
            mv: 0,
            rv: 0,
            ru: 0,
            fu: [0, 0, 0, 0],
            um: 0,
          });
        }
        UI.render(st);
        updateStatus(st);
        Store.saveState(st);
        if (refs.time) refs.time.textContent = "Time: 00:00"; // reset timer display
        setActionButtonsVisible(true); // show buttons for new game
        startTimer();
      }
    }

    function draw() {
      Engine.draw && Engine.draw();
    }
    function undo() {
      Engine.undo && Engine.undo();
    }
    function redo() {
      Engine.redo && Engine.redo();
    }
    function hint() {
      const move = Engine.findHint && Engine.findHint();
      if (move) UI.highlightMove(move);
      else {
        const st = Engine.getState && Engine.getState();
        if (st && window.Solver && Solver.isNoHope(JSON.parse(JSON.stringify(st)))) {
          UI.toast("No hope: proved dead end");
        } else {
          UI.toast("No moves");
        }
      }
    }
    // Automatically play all remaining safe cards to foundations
    let autoRunning = false;
    async function autoComplete() {
      if (!settings.autoComplete || autoRunning) return;
      const btn = refs.btnAuto;
      autoRunning = true;
      if (btn) btn.disabled = true;
      try {
        const res = await Engine.runAutoToFixpoint?.();
        if (res && res.moves === 0) UI.toast("No automatic moves available.");
      } catch (err) {
        console.error(err);
        UI.toast && UI.toast("Auto stopped due to error. See console.");
      } finally {
        if (btn) btn.disabled = false;
        autoRunning = false;
      }
    }

    // Event wires
    Engine.on &&
      Engine.on("state", (st) => {
        // Full re-render for now; later, UI.applyDeltas(deltas, st)
        UI.render(st);
        updateStatus(st);
        Store.saveState(st);
        if (window.SoliStats) {
          const fu = st.piles.foundations.map((f) => f.cards.length);
          const redealAllowed = (policy) => {
            if (policy === "unlimited") return Number.MAX_SAFE_INTEGER;
            if (policy === "none") return 0;
            const m = /limited\((\d+)\)/.exec(policy);
            return m ? Number(m[1]) : 0;
          };
          const rv = redealAllowed(st.settings.redealPolicy) - (st.redealsRemaining || 0);
          SoliStats.checkpoint({ mv: st.score.moves, rv, fu });
        }
      });

    Engine.on &&
      Engine.on("tick", (time) => {
        if (refs.time)
          refs.time.textContent = "Time: " + formatTime(time.elapsedMs);
      });

    Engine.on &&
      Engine.on("win", (st) => {
        stopTimer(); // freeze timer at win time
        setActionButtonsVisible(false); // hide undo/redo/hint buttons
        UI.toast("You win!"); // notify player
        if (settings.animations && UI.winAnimation) {
          UI.winAnimation(); // celebrate with falling cards
        }
        if (window.SoliStats) {
          const fu = st.piles.foundations.map((f) => f.cards.length);
          const redealAllowed = (policy) => {
            if (policy === "unlimited") return Number.MAX_SAFE_INTEGER;
            if (policy === "none") return 0;
            const m = /limited\((\d+)\)/.exec(policy);
            return m ? Number(m[1]) : 0;
          };
          const rv = redealAllowed(st.settings.redealPolicy) - (st.redealsRemaining || 0);
          SoliStats.commitResult({
            ts: st.time.startedAt,
            te: Date.now(),
            w: 1,
            m: st.score.moves,
            t: Math.floor(st.time.elapsedMs / 1000),
            dr: st.settings.drawCount,
            sc: st.score.total,
            rv,
            fu,
            ab: "none"
          });
        }
      });
    Engine.on &&
      Engine.on("stuck", (st) => {
        UI.toast("No moves. Stuck.");
        if (window.SoliStats) {
          const fu = st.piles.foundations.map((f) => f.cards.length);
          const redealAllowed = (policy) => {
            if (policy === "unlimited") return Number.MAX_SAFE_INTEGER;
            if (policy === "none") return 0;
            const m = /limited\((\d+)\)/.exec(policy);
            return m ? Number(m[1]) : 0;
          };
          const rv = redealAllowed(st.settings.redealPolicy) - (st.redealsRemaining || 0);
          SoliStats.commitResult({
            ts: st.time.startedAt,
            te: Date.now(),
            w: 0,
            m: st.score.moves,
            t: Math.floor(st.time.elapsedMs / 1000),
            dr: st.settings.drawCount,
            sc: st.score.total,
            rv,
            fu,
            ab: "block"
          });
        }
      });

    return {
      newGame,
      draw,
      undo,
      redo,
      hint,
      autoComplete,
      applySettingsToControls,
    };
  })();

  // ---------- Wire controls
  function wireControls() {
    if (window.UI && typeof UI.init === "function") {
      UI.init(refs.root);
    }
    Controller.applySettingsToControls();
    on(refs.btnNew, "click", Controller.newGame);
    on(refs.btnUndo, "click", Controller.undo);
    on(refs.btnRedo, "click", Controller.redo);
    on(refs.btnHint, "click", Controller.hint);
    on(refs.btnAuto, "click", Controller.autoComplete);
    ["change", "input"].forEach((evt) => {
      on(refs.selDraw, evt, () => Controller.newGame());
      on(refs.selRedeal, evt, () => Controller.newGame());
      on(refs.chkLeft, evt, () => Controller.newGame());
      on(refs.chkHints, evt, () => {});
      on(refs.chkAuto, evt, () => {});
      on(refs.chkAnim, evt, () => {});
      on(refs.chkSound, evt, () => {});
    });

    // Keyboard
    on(window, "keydown", (e) => {
      if (e.target && /input|select|textarea/i.test(e.target.tagName)) return;
      switch (e.key) {
        case " ":
          e.preventDefault();
          Controller.draw();
          break;
        case "u":
        case "U":
          Controller.undo();
          break;
        case "r":
        case "R":
          Controller.redo();
          break;
        case "h":
        case "H":
          Controller.hint();
          break;
        case "a":
        case "A":
          Controller.autoComplete();
          break;
        default:
          break;
      }
    });

    // Start first game
    Controller.newGame();
  }

  // ---------- Boot
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", wireControls);
  } else {
    wireControls();
  }
})();
