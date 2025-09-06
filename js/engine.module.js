// Engine wrapper for Node tests and environments without global EventEmitter.
// Sets up globals expected by legacy scripts and re-exports Engine and Model.
import { Emitter } from './utils/emitter.js';

const g = globalThis;
g.window ||= g;
g.EventEmitter = Emitter;

await import('./model.js');
await import('./engine.js');

// Export both the constructor and a pre-built singleton instance.
export const Engine = g.EngineCtor;
export const engine = g.Engine;
export const Model = g.Model;
