
/* jonv11-solitaire-onepager - js/main.js
   App controller and wiring. Delegates to Engine (rules) and UI (render).
   Safe if Engine/UI/Store are missing: stubs keep the page interactive.
*/
(() => {
  'use strict';
  
  // Disable zoom on mobile browsers
  document.addEventListener('touchstart', (event) => {
    if (event.touches.length > 1) {
      event.preventDefault();
    }
  }, { passive: false });

  // ---------- Utilities
  const $ = (sel, root = document) => root.querySelector(sel);
  const on = (el, ev, fn, opts) => el && el.addEventListener(ev, fn, opts);
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

  // ---------- Defaults and keys
  const DEFAULTS = Object.freeze({
    drawCount: 1,
    redealPolicy: "unlimited", // "unlimited" | "limited(n)" | "none"
    leftHandMode: false,
    animations: true,
    hints: true,
    autoComplete: true,
    sound: false
  });

  const KEYS = Object.freeze({
    settings: "solitaire.settings",
    saved: "solitaire.saved",
    stats: "solitaire.stats"
  });

  // ---------- Minimal Event Emitter
  const Emitter = () => {
    const map = new Map();
    return {
      on(ev, fn){ map.set(ev, (map.get(ev) || []).concat(fn)); return this; },
      emit(ev, payload){ (map.get(ev) || []).forEach(fn => { try { fn(payload); } catch(e){ console.error(e); } }); }
    };
  };

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
    chkSound: $("#sound")
  };

  // ---------- Controller
  const Controller = (() => {
    let settings = Object.assign({}, DEFAULTS, (Store.getSettings && Store.getSettings()) || {});
    let timerId = 0;

    function applySettingsToControls(){
      if (refs.selDraw) refs.selDraw.value = String(settings.drawCount);
      if (refs.selRedeal) refs.selRedeal.value = String(settings.redealPolicy);
      if (refs.chkLeft) refs.chkLeft.checked = !!settings.leftHandMode;
      if (refs.chkHints) refs.chkHints.checked = !!settings.hints;
      if (refs.chkAuto) refs.chkAuto.checked = !!settings.autoComplete;
      if (refs.chkAnim) refs.chkAnim.checked = !!settings.animations;
      if (refs.chkSound) refs.chkSound.checked = !!settings.sound;
      document.body.classList.toggle("left-hand", !!settings.leftHandMode);
    }

    function readSettingsFromControls(){
      settings = Object.assign({}, DEFAULTS, {
        drawCount: Number(refs.selDraw?.value ?? 1),
        redealPolicy: String(refs.selRedeal?.value ?? "unlimited"),
        leftHandMode: !!refs.chkLeft?.checked,
        hints: !!refs.chkHints?.checked,
        autoComplete: !!refs.chkAuto?.checked,
        animations: !!refs.chkAnim?.checked,
        sound: !!refs.chkSound?.checked
      });
      Store.setSettings(settings);
      document.body.classList.toggle("left-hand", !!settings.leftHandMode);
    }

    function updateStatus(state){
      if (refs.score) refs.score.textContent = "Score: " + (state?.score?.total ?? 0);
      if (refs.moves) refs.moves.textContent = "Moves: " + (state?.score?.moves ?? 0);
    }

    function formatTime(ms){
      const s = Math.floor(ms/1000);
      const m = Math.floor(s/60);
      const ss = String(s % 60).padStart(2,"0");
      const mm = String(m).padStart(2,"0");
      return mm + ":" + ss;
    }

    function startTimer(){
      stopTimer();
      timerId = window.setInterval(() => {
        const st = Engine.getState && Engine.getState();
        if (st && refs.time) refs.time.textContent = "Time: " + formatTime(st.time.elapsedMs);
        if (Engine.tick) Engine.tick();
      }, 1000);
    }
    function stopTimer(){ if (timerId) { clearInterval(timerId); timerId = 0; } }

    function newGame(){
      readSettingsFromControls();
      const st = Engine.newGame ? Engine.newGame(settings) : null;
      if (st) {
        UI.render(st);
        updateStatus(st);
        Store.saveState(st);
        startTimer();
      }
    }

    function draw(){ Engine.draw && Engine.draw(); }
    function undo(){ Engine.undo && Engine.undo(); }
    function redo(){ Engine.redo && Engine.redo(); }
	function hint(){
	  const move = Engine.findHint && Engine.findHint();
	  if (move) UI.highlightMove(move);
	  else { UI.toast("No moves"); }
	}
    function autoComplete(){ /* to be implemented with Engine */ }

    // Event wires
    Engine.on && Engine.on("state", (st) => {
      // Full re-render for now; later, UI.applyDeltas(deltas, st)
      UI.render(st);
      updateStatus(st);
      Store.saveState(st);
    });

    Engine.on && Engine.on("tick", (time) => {
      if (refs.time) refs.time.textContent = "Time: " + formatTime(time.elapsedMs);
    });
	
	Engine.on && Engine.on("win",  () => UI.toast("You win!"));
	Engine.on && Engine.on("stuck",() => UI.toast("No moves. Stuck."));


    return { newGame, draw, undo, redo, hint, autoComplete, applySettingsToControls };
  })();

  // ---------- Wire controls
  function wireControls(){
    if (window.UI && typeof UI.init === 'function') { UI.init(refs.root); }
    Controller.applySettingsToControls();
    on(refs.btnNew, "click", Controller.newGame);
    on(refs.btnUndo, "click", Controller.undo);
    on(refs.btnRedo, "click", Controller.redo);
    on(refs.btnHint, "click", Controller.hint);
    on(refs.btnAuto, "click", Controller.autoComplete);
    ["change","input"].forEach(evt => {
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
        case " ": e.preventDefault(); Controller.draw(); break;
        case "u": case "U": Controller.undo(); break;
        case "r": case "R": Controller.redo(); break;
        case "h": case "H": Controller.hint(); break;
        case "a": case "A": Controller.autoComplete(); break;
        default: break;
      }
    });

    // Start first game
    Controller.newGame();
  }

  // ---------- Boot
  if (document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", wireControls);
  } else {
    wireControls();
  }

})();
