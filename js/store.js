
/* jonv11-solitaire-onepager - js/store.js
   Persistence API: localStorage with jQuery cookie fallback.
   Keys: solitaire.settings, solitaire.saved, solitaire.stats
*/
(function(){
  'use strict';

  const KEYS = {
    settings: "solitaire.settings",
    saved: "solitaire.saved",
    stats: "solitaire.stats"
  };

  // ---------- JSON helpers
  function safeParse(str, fallback){
    try { return JSON.parse(str); } catch { return fallback; }
  }
  function safeStringify(obj){ 
    try { return JSON.stringify(obj); } catch { return null; }
  }

  // ---------- Storage drivers
  const driverLocal = {
    get(k, fb){ return safeParse(localStorage.getItem(k), fb); },
    set(k, v){ const s=safeStringify(v); if (s!==null) localStorage.setItem(k,s); },
    remove(k){ localStorage.removeItem(k); }
  };

  const driverCookie = {
    get(k, fb){
      if (typeof $ === "undefined" || !$.cookie) return fb;
      const raw = $.cookie(k);
      return raw ? safeParse(raw, fb) : fb;
    },
    set(k, v){
      if (typeof $ === "undefined" || !$.cookie) return;
      const s = safeStringify(v);
      if (s!==null) $.cookie(k, s, { path:"/", expires:365 });
    },
    remove(k){ if ($ && $.cookie) $.removeCookie(k); }
  };

  // Pick driver: localStorage if available, else cookie
  function testLocal(){
    try {
      const t="__test__";
      localStorage.setItem(t,"1"); localStorage.removeItem(t);
      return true;
    } catch { return false; }
  }
  const driver = testLocal() ? driverLocal : driverCookie;

  // ---------- Public API
  const Store = {
    getSettings(){ return driver.get(KEYS.settings, {}); },
    setSettings(obj){ driver.set(KEYS.settings, obj); },

    loadSavedState(){ return driver.get(KEYS.saved, null); },
    saveState(state){ driver.set(KEYS.saved, state); },
    clearSavedState(){ driver.remove(KEYS.saved); },

    loadStats(){ return driver.get(KEYS.stats, { plays:0, wins:0, timeSec:0 }); },
    saveStats(st){ driver.set(KEYS.stats, st); }
  };

  window.Store = Store;
})();
