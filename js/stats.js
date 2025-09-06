/* jonv11-solitaire-onepager - js/stats.js
   LocalStorage-based statistics and session tracker.
   Schema v1. All keys are under soli.v1.* prefix.
*/
(function(){
  'use strict';

  const PREFIX = 'soli.v1.';
  const KEYS = {
    meta: PREFIX + 'meta',
    sessions: PREFIX + 'sessions',
    stats: PREFIX + 'stats',
    current: PREFIX + 'current'
  };

  const DEFAULTS = { n:200, k:10 }; // retain N sessions, checkpoint every K actions

  let cfg = Object.assign({}, DEFAULTS);
  let meta = null;
  let sessions = [];
  let aggregates = null;
  let current = null;
  let actionCount = 0;

  // ---------- helpers
  function _clone(obj){ return JSON.parse(JSON.stringify(obj)); }

  function initAgg(){
    return {
      played:0,
      wins:0,
      bestTime:null,
      bestScore:null,
      winStreak:0,
      bestStreak:0,
      sumTime:0,
      sumMoves:0,
      sumRecycles:0,
      sumScore:0,
      avgTime:0,
      avgMoves:0,
      avgRecycles:0,
      avgScore:0,
      histT:[0,0,0,0,0],
      histM:[0,0,0,0,0]
    };
  }

  function bucketTime(t){
    if (t <= 180) return 0;
    if (t <= 300) return 1;
    if (t <= 480) return 2;
    if (t <= 720) return 3;
    return 4;
  }
  function bucketMoves(m){
    if (m <= 80) return 0;
    if (m <= 110) return 1;
    if (m <= 150) return 2;
    if (m <= 200) return 3;
    return 4;
  }

  function safeGet(key, fb){
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fb;
    } catch { return fb; }
  }

  // Drop oldest sessions until write succeeds; recompute aggregates after removal
  function safeSet(key, value){
    const str = JSON.stringify(value);
    try {
      localStorage.setItem(key, str);
      return true;
    } catch (e) {
      if (e && e.name === 'QuotaExceededError') {
        // try removing batches of 10 oldest sessions
        let changed = false;
        while (sessions.length) {
          sessions.splice(0, Math.min(10, sessions.length));
          localStorage.setItem(KEYS.sessions, JSON.stringify(sessions));
          changed = true;
          try {
            localStorage.setItem(key, str);
            if (changed) recomputeAgg();
            return true;
          } catch (err) {
            if (!(err && err.name === 'QuotaExceededError')) break;
          }
        }
      }
    }
    return false;
  }

  function safeRemove(key){
    try {
      localStorage.removeItem(key);
    } catch (e) {
      /* no-op */
    }
  }

  // ---------- load helpers
  function loadMeta(){ meta = safeGet(KEYS.meta, { ver:1, n: cfg.n }); return meta; }
  function loadSessions(){ sessions = safeGet(KEYS.sessions, []); return sessions; }
  function loadAgg(){
    aggregates = safeGet(KEYS.stats, { g:initAgg(), d1:initAgg(), d3:initAgg() });
    for (const k of ['g','d1','d3']) {
      aggregates[k] = Object.assign(initAgg(), aggregates[k] || {});
    }
    return aggregates;
  }

  // ---------- API
  function initStats(config){
    cfg = Object.assign({}, DEFAULTS, config||{});
    meta = loadMeta();
    if (!meta.ver) meta.ver = 1;
    if (!meta.n) meta.n = cfg.n;
    safeSet(KEYS.meta, meta);
    sessions = loadSessions();
    aggregates = loadAgg();
    current = safeGet(KEYS.current, null);
    actionCount = 0;
  }

  function saveCurrent(snapshot){
    current = Object.assign(current||{}, snapshot);
    safeSet(KEYS.current, current);
  }

  function clearCurrent(){
    current = null; actionCount = 0; safeRemove(KEYS.current);
  }

  function checkpoint(ev){
    if (!current) return;
    actionCount++;
    current = Object.assign(current, ev);
    if (actionCount % cfg.k === 0) safeSet(KEYS.current, current);
  }

  function incAgg(agg, sum){
    agg.played++;
    if (sum.w) {
      agg.wins++;
      agg.winStreak++;
      agg.bestStreak = Math.max(agg.bestStreak, agg.winStreak);
      if (sum.t && (agg.bestTime === null || sum.t < agg.bestTime)) agg.bestTime = sum.t;
      if (sum.sc != null && (agg.bestScore === null || sum.sc > agg.bestScore)) agg.bestScore = sum.sc;
    } else {
      agg.winStreak = 0;
    }
    agg.sumTime += sum.t || 0;
    agg.sumMoves += sum.m || 0;
    agg.sumRecycles += sum.rv || 0;
    agg.sumScore += sum.sc || 0;
    agg.avgTime = agg.played ? Math.round(agg.sumTime / agg.played) : 0;
    agg.avgMoves = agg.played ? Math.round(agg.sumMoves / agg.played) : 0;
    agg.avgRecycles = agg.played ? Math.round(agg.sumRecycles / agg.played) : 0;
    agg.avgScore = agg.played ? agg.sumScore / agg.played : 0;
    agg.histT[bucketTime(sum.t||0)]++;
    agg.histM[bucketMoves(sum.m||0)]++;
  }

  function commitResult(summary){
    if (!summary || typeof summary.ts !== 'number') return;
    sessions.push(summary);
    while (sessions.length > meta.n) sessions.shift();
    safeSet(KEYS.sessions, sessions);
    if (!aggregates) aggregates = { g:initAgg(), d1:initAgg(), d3:initAgg() };
    incAgg(aggregates.g, summary);
    if (summary.dr === 1) incAgg(aggregates.d1, summary);
    else incAgg(aggregates.d3, summary);
    safeSet(KEYS.stats, aggregates);
    clearCurrent();
  }

  function recomputeAgg(){
    aggregates = { g:initAgg(), d1:initAgg(), d3:initAgg() };
    for (const s of sessions) {
      incAgg(aggregates.g, s);
      if (s.dr === 1) incAgg(aggregates.d1, s);
      else incAgg(aggregates.d3, s);
    }
    safeSet(KEYS.stats, aggregates);
  }

  function exportAll(){
    return JSON.stringify({ meta: loadMeta(), sessions: loadSessions(), stats: loadAgg() });
  }

  function importAll(json, mode){
    const obj = JSON.parse(json);
    if (mode === 'replace') {
      meta = obj.meta || { ver:1, n: cfg.n };
      sessions = obj.sessions || [];
    } else {
      meta = loadMeta();
      sessions = loadSessions();
      sessions = sessions.concat(obj.sessions || []);
    }
    while (sessions.length > meta.n) sessions.shift();
    safeSet(KEYS.meta, meta);
    safeSet(KEYS.sessions, sessions);
    recomputeAgg();
  }

  function migrateIfNeeded(){
    const m = loadMeta();
    if (m.ver !== 1) {
      // Future schema migrations go here
      m.ver = 1;
      safeSet(KEYS.meta, m);
    }
  }

  window.SoliStats = {
    initStats,
    loadMeta,
    loadSessions,
    loadAgg,
    saveCurrent,
    clearCurrent,
    checkpoint,
    commitResult,
    recomputeAgg,
    exportAll,
    importAll,
    migrateIfNeeded,
    safeGet,
    safeSet,
    safeRemove
  };
})();
