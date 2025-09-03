/* eslint-disable no-console */
/* Simple event emitter used across modules */
(function () {
  "use strict";
  function EventEmitter() {
    const map = new Map();
    return {
      on(ev, fn) {
        map.set(ev, (map.get(ev) || []).concat(fn));
        return this;
      },
      emit(ev, payload) {
        (map.get(ev) || []).forEach((fn) => {
          try {
            fn(payload);
          } catch (e) {
            console.error(e);
          }
        });
      },
    };
  }
  window.EventEmitter = EventEmitter;
})();
