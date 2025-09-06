/* jonv11-solitaire-onepager - js/stats-ui.js
   Overlay panel displaying statistics from SoliStats.
*/
/* global SoliStats, Popup */
(function(){
  'use strict';

  if (!window.SoliStats) return; // stats disabled when storage unavailable

  const $ = (sel, root=document) => root.querySelector(sel);

  function formatSecs(s){
    if (s == null) return '--';
    const m = Math.floor(s/60); const ss = String(s%60).padStart(2,'0');
    return m+":"+ss;
  }

  // Build overlay and panel
  const overlay = document.createElement('div');
  overlay.id = 'statsOverlay';
  overlay.className = 'popup-overlay';
  overlay.innerHTML = `
    <div class="popup" role="dialog" aria-modal="true" aria-labelledby="statsTitle">
      <div class="popup-header">
        <h2 id="statsTitle">Stats</h2>
        <button class="popup-close" id="statsClose" aria-label="Close stats">&times;</button>
      </div>
      <div id="statsContent" class="popup-content"></div>
      <div class="stats-actions">
        <button id="statsExport" class="btn">Export</button>
        <button id="statsImport" class="btn">Import</button>
        <button id="statsReset" class="btn">Reset</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  Popup.trapFocus(overlay);

  function render(){
    const agg = SoliStats.loadAgg().g;
    const played = agg.played || 0;
    const wins = agg.wins || 0;
    const rate = played ? ((wins/played)*100).toFixed(1) : '0.0';
    const c = $('#statsContent');
    c.innerHTML = ''+
      `<p>Played: ${played}</p>`+
      `<p>Wins: ${wins}</p>`+
      `<p>Win rate: ${rate}%</p>`+
      `<p>Current streak: ${agg.winStreak}</p>`+
      `<p>Best streak: ${agg.bestStreak}</p>`+
      `<p>Best time: ${formatSecs(agg.bestTime)}</p>`+
      `<p>Best score: ${agg.bestScore??'--'}</p>`+
      `<p>Avg time: ${formatSecs(agg.avgTime)}</p>`+
      `<p>Avg moves: ${agg.avgMoves}</p>`+
      `<p>Avg recycles: ${agg.avgRecycles}</p>`+
      `<p>Avg score: ${Number(agg.avgScore||0).toFixed(1)}</p>`;
  }

  function show(opener){ render(); Popup.open(overlay, opener); }
  function hide(){ Popup.close(overlay); }

  $('#statsClose', overlay).addEventListener('click', hide);
  $('#statsExport', overlay).addEventListener('click', () => {
    const blob = new Blob([SoliStats.exportAll()], {type:'application/json'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'solitaire-stats.json';
    a.click();
    URL.revokeObjectURL(a.href);
  });
  $('#statsImport', overlay).addEventListener('click', () => {
    const inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = 'application/json';
    inp.onchange = () => {
      const file = inp.files[0];
      if (!file) return;
      const r = new FileReader();
      r.onload = () => {
        try { SoliStats.importAll(r.result, 'merge'); render(); } catch (err) { /* no-op */ }
      };
      r.readAsText(file);
    };
    inp.click();
  });
  $('#statsReset', overlay).addEventListener('click', () => {
    if (confirm('Reset all stats?')) {
      const ks = ['soli.v1.meta','soli.v1.sessions','soli.v1.stats','soli.v1.current'];
      ks.forEach((k)=>SoliStats.safeRemove(k));
      SoliStats.initStats();
      render();
    }
  });

  function initButton(){
    const btn = document.createElement('button');
    btn.id = 'statsBtn';
    btn.className = 'action-btn';
    btn.setAttribute('aria-label','Show stats');
    btn.innerHTML = '<span class="icon" aria-hidden="true">📊</span><span class="label">Stats</span>';
    const bar = document.querySelector('nav.toolbar');
    if (bar) bar.appendChild(btn);
    btn.addEventListener('click', e => show(e.currentTarget));
  }

  initButton();

  window.StatsUI = { show, hide };
})();
