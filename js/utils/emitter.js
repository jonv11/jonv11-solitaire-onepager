// UMD-style adapter for both browser and Node.
export class SimpleEmitter {
  constructor(){ this._m = Object.create(null); }
  on(t, f){ (this._m[t] ||= []).push(f); return this; }
  off(t, f){ const a=this._m[t]; if (!a) return this; this._m[t]=a.filter(x=>x!==f); return this; }
  once(t, f){ const g=(...args)=>{ this.off(t, g); f(...args); }; return this.on(t, g); }
  emit(t, ...args){ const a=this._m[t]; if (!a) return false; for (const fn of [...a]) fn(...args); return a.length>0; }
  removeAllListeners(t){ if (t) delete this._m[t]; else this._m = Object.create(null); }
}

// Prefer Node’s EventEmitter when available.
let EmitterCtor = SimpleEmitter;
try {
  // Works in Node ESM tests; ignored in browsers.
  // eslint-disable-next-line n/no-unsupported-features/es-syntax
  const mod = await import('events');
  if (mod?.EventEmitter) EmitterCtor = mod.EventEmitter;
} catch { /* fall back */ }

export const Emitter = EmitterCtor;
