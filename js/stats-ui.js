/* jonv11-solitaire-onepager - js/stats-ui.js
   Minimal overlay panel displaying statistics from SoliStats.
*/
(function(){
  'use strict';

  if (!window.SoliStats) return; // stats disabled when storage unavailable

  const $ = (sel, root=document) => root.querySelector(sel);

  function formatSecs(s){
    if (s == null) return '--';
    const m = Math.floor(s/60); const ss = String(s%60).padStart(2,'0');
    return m+":"+ss;
  }

  // Build panel DOM once. Styling is defined in css/style.css for maintainability.
  const panel = document.createElement('div');
  panel.id = 'statsPanel';
  panel.innerHTML = `
    <div id="statsContent"></div>
    <div class="stats-actions">
      <button id="statsExport" class="btn">Export</button>
      <button id="statsImport" class="btn">Import</button>
      <button id="statsReset" class="btn">Reset</button>
      <button id="statsClose" class="btn">Close</button>
    </div>`;
  document.body.appendChild(panel);

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
      `<p>Avg recycles: ${agg.avgRecycles}</p>`;
  }

  function show(){ render(); panel.style.display='block'; }
  function hide(){ panel.style.display='none'; }

  $('#statsClose', panel).addEventListener('click', hide);
  $('#statsExport', panel).addEventListener('click', () => {
    const blob = new Blob([SoliStats.exportAll()], {type:'application/json'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'solitaire-stats.json';
    a.click();
    URL.revokeObjectURL(a.href);
  });
  $('#statsImport', panel).addEventListener('click', () => {
    const inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = 'application/json';
    inp.onchange = () => {
      const file = inp.files[0];
      if (!file) return;
      const r = new FileReader();
      r.onload = () => { try { SoliStats.importAll(r.result, 'merge'); render(); } catch{} };
      r.readAsText(file);
    };
    inp.click();
  });
  $('#statsReset', panel).addEventListener('click', () => {
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
    btn.className = 'btn';
    btn.textContent = 'Stats';
    const bar = document.querySelector('nav.toolbar');
    if (bar) bar.appendChild(btn);
    btn.addEventListener('click', show);
  }

  initButton();

  window.StatsUI = { show, hide };
})();
