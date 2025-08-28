
/* jonv11-solitaire-onepager - js/main.js
   App controller and wiring. Delegates to Engine (rules) and UI (render).
   Safe if Engine/UI/Store are missing: stubs keep the page interactive.
*/
(() => {
  'use strict';

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

  // ---------- Store stub (fallback to localStorage)
  const Store = window.Store || (() => {
    const read = (k, fallback = null) => {
      try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fallback; }
      catch { return fallback; }
    };
    const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
    return {
      getSettings: () => Object.assign({}, DEFAULTS, read(KEYS.settings, {})),
      setSettings: (s) => write(KEYS.settings, s),
      loadSavedState: () => read(KEYS.saved, null),
      saveState: (state) => write(KEYS.saved, state),
      clearSavedState: () => { try { localStorage.removeItem(KEYS.saved); } catch {} },
      loadStats: () => read(KEYS.stats, { plays:0, wins:0, timeSec:0 }),
      saveStats: (st) => write(KEYS.stats, st)
    };
  })();

  // ---------- Minimal Event Emitter
  const Emitter = () => {
    const map = new Map();
    return {
      on(ev, fn){ map.set(ev, (map.get(ev) || []).concat(fn)); return this; },
      emit(ev, payload){ (map.get(ev) || []).forEach(fn => { try { fn(payload); } catch(e){ console.error(e); } }); }
    };
  };

  // ---------- UI stub (if not provided)
  const UI = window.UI || (() => {
    const api = Emitter();
    let root, scoreEl, movesEl, timeEl;
    function init(rootEl) {
      root = rootEl;
      scoreEl = $("#score");
      movesEl = $("#moves");
      timeEl = $("#time");
    }
    function clearPile(pileEl){ while (pileEl.firstChild) pileEl.removeChild(pileEl.firstChild); }
    function render(state) {
      // Basic render of empty piles or face-down placeholders, for bootstrap only.
      if (!root || !state) return;
      const ids = ["stock","waste","foundation-S","foundation-H","foundation-D","foundation-C",
        "tab-1","tab-2","tab-3","tab-4","tab-5","tab-6","tab-7"];
      ids.forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        clearPile(el);
        const pile = findPileById(state, id);
        if (!pile) return;
        pile.cards.forEach((c, i) => {
          const card = document.createElement("div");
          card.className = "card " + (c.faceUp ? "face-up" : "face-down");
          card.style.setProperty("--i", String(i));
          card.tabIndex = -1;
          card.dataset.suit = c.suit;
          card.dataset.rank = String(c.rank);
          if (c.faceUp){
            const tl = document.createElement("div");
            tl.className = "corner top-left";
            tl.textContent = rankText(c.rank) + suitText(c.suit);
            const br = document.createElement("div");
            br.className = "corner bottom-right";
            br.textContent = rankText(c.rank) + suitText(c.suit);
            const center = document.createElement("div");
            center.className = "center";
            center.textContent = suitText(c.suit);
            card.appendChild(tl); card.appendChild(br); card.appendChild(center);
          }
          el.appendChild(card);
        });
      });
      updateStatus(state);
    }
    function applyDeltas(_deltas, state){ render(state); }
    function updateStatus(state){
      if (scoreEl) scoreEl.textContent = "Score: " + (state?.score?.total ?? 0);
      if (movesEl) movesEl.textContent = "Moves: " + (state?.score?.moves ?? 0);
    }
    function rankText(r){ return ({1:"A",11:"J",12:"Q",13:"K"})[r] || String(r); }
    function suitText(s){ return ({S:"♠", H:"♥", D:"♦", C:"♣"})[s] || "?"; }
    function findPileById(state, id){
      if (id === "stock") return state.piles.stock;
      if (id === "waste") return state.piles.waste;
      if (id.startsWith("foundation-")){
        const suit = id.split("-")[1];
        return state.piles.foundations.find(p => p.suit === suit) || null;
      }
      if (id.startsWith("tab-")){
        const idx = Number(id.split("-")[1]) - 1;
        return state.piles.tableau[idx] || null;
      }
      return null;
    }
    return { ...api, init, render, applyDeltas, updateStatus };
  })();

  // ---------- Engine stub (if not provided)
  const Engine = window.Engine || (() => {
    // This stub deals a valid Klondike layout and allows draw() only.
    const api = Emitter();
    let state = null;

    function shuffle(a){
      for (let i=a.length-1; i>0; i--){ const j = Math.floor(Math.random()*(i+1)); [a[i],a[j]] = [a[j],a[i]]; }
      return a;
    }
    function newDeck(){
      const suits = ["S","H","D","C"];
      const deck = [];
      for (const s of suits){ for (let r=1; r<=13; r++) deck.push({ id: s+r, rank:r, suit:s, color: (s==="H"||s==="D")?"red":"black", faceUp:false }); }
      return deck;
    }
    function deal(settings){
      const deck = shuffle(newDeck());
      const tableau = Array.from({length:7}, (_,i) => ({ id:"T"+(i+1), kind:"tableau", cards:[] }));
      for (let col=0; col<7; col++){
        for (let row=0; row<=col; row++){
          const c = deck.pop();
          c.faceUp = (row===col);
          tableau[col].cards.push(c);
        }
      }
      const stock = { id:"STOCK", kind:"stock", cards: deck };
      const waste = { id:"WASTE", kind:"waste", cards: [] };
      const foundations = ["S","H","D","C"].map(s => ({ id:"F"+s, kind:"foundation", suit:s, cards: [] }));
      return {
        seed: Math.floor(Math.random()*1e9),
        piles: { tableau, foundations, stock, waste },
        settings: settings,
        score: { total:0, moves:0 },
        history: [],
        time: { startedAt: Date.now(), elapsedMs: 0 }
      };
    }

    function newGame(settings){
      state = deal(settings);
      api.emit("state", state);
      return state;
    }

    function draw(){
      if (!state) return;
      const n = state.settings.drawCount === 3 ? 3 : 1;
      for (let i=0; i<n; i++){
        if (state.piles.stock.cards.length === 0){
          // redeal if allowed
          if (state.piles.waste.cards.length && state.settings.redealPolicy !== "none"){
            state.piles.stock.cards = state.piles.waste.cards.reverse().map(c => ({...c, faceUp:false}));
            state.piles.waste.cards = [];
          } else {
            break;
          }
        }
        const c = state.piles.stock.cards.pop();
        if (!c) break;
        c.faceUp = true;
        state.piles.waste.cards.push(c);
      }
      state.score.moves++;
      api.emit("state", state);
    }

    function tick(){
      if (!state) return;
      state.time.elapsedMs = Date.now() - state.time.startedAt;
      api.emit("tick", state.time);
    }

    return { ...api, newGame, draw, tick, getState: () => state };
  })();

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
    let settings = Store.getSettings();
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
      settings = {
        drawCount: Number(refs.selDraw?.value ?? 1),
        redealPolicy: String(refs.selRedeal?.value ?? "unlimited"),
        leftHandMode: !!refs.chkLeft?.checked,
        hints: !!refs.chkHints?.checked,
        autoComplete: !!refs.chkAuto?.checked,
        animations: !!refs.chkAnim?.checked,
        sound: !!refs.chkSound?.checked
      };
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
    function undo(){ /* to be implemented with Engine */ }
    function redo(){ /* to be implemented with Engine */ }
    function hint(){ /* to be implemented with Engine */ }
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

    return { newGame, draw, undo, redo, hint, autoComplete, applySettingsToControls };
  })();

  // ---------- Wire controls
  function wireControls(){
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
