import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// Use the global object to simulate a browser-like environment
global.window = global;
const store = {};
class QuotaError extends Error {
  constructor(){
    super('QuotaExceededError');
    this.name = 'QuotaExceededError';
  }
}
let quotaFail = false;

// Simple localStorage stub for testing persistence
global.localStorage = {
  getItem(k){ return Object.prototype.hasOwnProperty.call(store,k)?store[k]:null; },
  setItem(k,v){ if(quotaFail){ quotaFail=false; throw new QuotaError(); } store[k]=v; },
  removeItem(k){ delete store[k]; }
};

// Load stats.js into the global context so SoliStats is available
const code = fs.readFileSync(new URL('../js/stats.js', import.meta.url), 'utf8');
vm.runInThisContext(code);
const S = global.SoliStats;

test('SoliStats aggregates and persists statistics', () => {
  // Fresh init and commit two results
  S.initStats({n:5,k:1});
  S.saveCurrent({ts:0,dr:1,mv:0,rv:0,ru:0,fu:[0,0,0,0],um:0});
  S.commitResult({ts:0,te:1,w:1,m:50,t:100,dr:1,sc:500,rv:0,fu:[13,13,13,13],ab:'none'});
  S.commitResult({ts:2,te:3,w:0,m:40,t:200,dr:3,sc:300,rv:1,fu:[5,4,3,2],ab:'block'});
  let agg = S.loadAgg().g;
  assert.equal(agg.played,2);
  assert.equal(agg.wins,1);
  assert.equal(agg.winStreak,0);
  assert.equal(agg.bestStreak,1);

  // Histogram boundaries
  const bucketsT = agg.histT.reduce((a,b)=>a+b,0);
  assert.equal(bucketsT,2);

  // Ring buffer truncation
  for(let i=0;i<10;i++){
    S.commitResult({ts:10+i,te:11+i,w:0,m:10,t:10,dr:1,sc:0,rv:0,fu:[0,0,0,0],ab:'user'});
  }
  const sessions = S.loadSessions();
  assert.ok(sessions.length <= 5);

  // Quota simulation
  quotaFail = true;
  S.safeSet('soli.v1.current',{a:1}); // should handle quota and not throw

  // Export/import round trip
  const exp = S.exportAll();
  S.initStats({n:5,k:1});
  S.importAll(exp,'replace');
  agg = S.loadAgg().g;
  assert.equal(agg.played, sessions.length);
});
