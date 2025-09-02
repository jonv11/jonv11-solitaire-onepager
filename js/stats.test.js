/* Simple browser-run tests for stats.js */
(function(){
  'use strict';
  function assert(cond, msg){ if(!cond) throw new Error(msg); }
  function run(){
    const S = window.SoliStats;
    S.initStats({n:5,k:1});
    S.saveCurrent({ts:0,dr:1,mv:0,rv:0,ru:0,fu:[0,0,0,0],um:0});
    S.commitResult({ts:0,te:1,w:1,m:50,t:100,dr:1,sc:500,rv:0,fu:[13,13,13,13],ab:'none'});
    S.commitResult({ts:2,te:3,w:0,m:40,t:200,dr:3,sc:300,rv:1,fu:[5,4,3,2],ab:'block'});
    const agg = S.loadAgg().g;
    assert(agg.played === 2, 'played');
    assert(agg.wins === 1, 'wins');
    console.log('stats.test.js passed');
    return true;
  }
  window.runStatsTests = run;
})();
