/* jonv11-solitaire-onepager - js/options-ui.js
   Options popup wiring using shared Popup helpers.
*/
(function(){
  'use strict';
  const overlay = document.getElementById('optionsPopup');
  if(!overlay) return;
  const opener = document.getElementById('btnOptions');
  const closeBtn = overlay.querySelector('.popup-close');
  const selLang = overlay.querySelector('#languageSelect');
  if(window.Popup){
    Popup.trapFocus(overlay);
    opener && opener.addEventListener('click', () => Popup.open(overlay, opener));
    closeBtn && closeBtn.addEventListener('click', () => Popup.close(overlay));
  }
  if(selLang && window.I18n){
    selLang.value = I18n.getLanguage();
    selLang.addEventListener('change', (e) => I18n.setLanguage(e.target.value));
    document.addEventListener('languagechange', () => {
      selLang.value = I18n.getLanguage();
    });
  }
})();
