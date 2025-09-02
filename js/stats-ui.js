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

  // Build panel DOM once
  const panel = document.createElement('div');
  panel.id = 'statsPanel';
  panel.style.cssText = 'position:fixed;top:10%;left:50%;transform:translateX(-50%);background:#fff;padding:1em;border:1px solid #333;max-width:90%;z-index:1000;display:none;';
  panel.innerHTML = '<div id="statsContent"></div>\n<div style="margin-top:0.5em;">\n  <button id="statsExport">Export</button>\n  <button id="statsImport">Import</button>\n  <button id="statsReset">Reset</button>\n  <button id="statsClose">Close</button>\n</div>';
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
