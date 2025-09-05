/* jonv11-solitaire-onepager - js/popup.js
   Utility helpers for modal popups: open, close, focus trapping.
*/
(function(){
  'use strict';
  const SEL = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

  function trapFocus(overlay){
    overlay.addEventListener('keydown', e => {
      if(!overlay.classList.contains('show')) return;
      if(e.key === 'Escape'){
        close(overlay);
        return;
      }
      if(e.key !== 'Tab') return;
      const items = overlay.querySelectorAll(SEL);
      if(!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if(e.shiftKey && document.activeElement === first){
        e.preventDefault();
        last.focus();
      } else if(!e.shiftKey && document.activeElement === last){
        e.preventDefault();
        first.focus();
      }
    });
    overlay.addEventListener('click', e => {
      if(e.target === overlay) close(overlay);
    });
  }

  function open(overlay, opener){
    overlay.hidden = false;
    overlay.classList.add('show');
    document.body.classList.add('modal-open');
    overlay._opener = opener;
    const first = overlay.querySelector(SEL);
    if(first) first.focus();
  }

  function close(overlay){
    overlay.classList.remove('show');
    overlay.hidden = true;
    document.body.classList.remove('modal-open');
    const opener = overlay._opener;
    if(opener) opener.focus();
  }

  window.Popup = { open, close, trapFocus };
})();
