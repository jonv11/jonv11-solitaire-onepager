/* jonv11-solitaire-onepager - js/stats-ui.js
   Overlay panel displaying statistics from SoliStats.
*/
/* global SoliStats, Popup, I18n */
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
        <h2 id="statsTitle" data-i18n="stats.title"></h2>
        <button class="popup-close" id="statsClose" data-i18n-attr="aria-label:stats.close.aria">&times;</button>
      </div>
      <div id="statsContent" class="popup-content"></div>
      <div class="stats-actions">
        <button id="statsExport" class="btn" data-i18n="stats.export"></button>
        <button id="statsImport" class="btn" data-i18n="stats.import"></button>
        <button id="statsReset" class="btn" data-i18n="stats.reset"></button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  Popup.trapFocus(overlay);
  if (window.I18n) I18n.apply(overlay);

  function render(){
    const agg = SoliStats.loadAgg().g;
    const played = agg.played || 0;
    const wins = agg.wins || 0;
    const rate = played ? ((wins/played)*100).toFixed(1) : '0.0';
    const c = $('#statsContent');
    c.innerHTML = ''+
      `<p>${I18n.t('stats.played',{value:played})}</p>`+
      `<p>${I18n.t('stats.wins',{value:wins})}</p>`+
      `<p>${I18n.t('stats.winRate',{value:rate})}</p>`+
      `<p>${I18n.t('stats.currentStreak',{value:agg.winStreak})}</p>`+
      `<p>${I18n.t('stats.bestStreak',{value:agg.bestStreak})}</p>`+
      `<p>${I18n.t('stats.bestTime',{value:formatSecs(agg.bestTime)})}</p>`+
      `<p>${I18n.t('stats.bestScore',{value:agg.bestScore??'--'})}</p>`+
      `<p>${I18n.t('stats.avgTime',{value:formatSecs(agg.avgTime)})}</p>`+
      `<p>${I18n.t('stats.avgMoves',{value:agg.avgMoves})}</p>`+
      `<p>${I18n.t('stats.avgRecycles',{value:agg.avgRecycles})}</p>`+
      `<p>${I18n.t('stats.avgScore',{value:Number(agg.avgScore||0).toFixed(1)})}</p>`;
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
    if (confirm(I18n.t('stats.reset.confirm'))) {
      const ks = ['soli.v1.meta','soli.v1.sessions','soli.v1.stats','soli.v1.current'];
      ks.forEach((k)=>SoliStats.safeRemove(k));
      SoliStats.initStats();
      render();
    }
  });

  let btn;
  function initButton(){
    btn = document.createElement('button');
    btn.id = 'statsBtn';
    btn.className = 'action-btn';
    btn.setAttribute('data-i18n-attr','aria-label:toolbar.stats.aria');
    btn.innerHTML = '<span class="icon" aria-hidden="true">📊</span><span class="label" data-i18n="toolbar.stats"></span>';
    const bar = document.querySelector('nav.toolbar');
    if (bar) bar.appendChild(btn);
    if (window.I18n) I18n.apply(btn);
    btn.addEventListener('click', e => show(e.currentTarget));
  }

  initButton();

  document.addEventListener('languagechange', () => {
    if (btn && window.I18n) I18n.apply(btn);
    if (overlay && window.I18n) I18n.apply(overlay);
    if (overlay.classList.contains('show')) render();
  });

  window.StatsUI = { show, hide };
})();
