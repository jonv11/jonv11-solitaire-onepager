/* js/i18n.js
   Simple runtime internationalization helper.
   Loads JSON resource files and updates DOM on language changes.
*/
(function(){
  "use strict";
  const SUPPORTED = ["en", "fr", "nl", "es", "de"];
  const DEFAULT_LANG = "en";
  let currentLang = DEFAULT_LANG;
  const resources = {};

  function detectLanguage(){
    const params = new URLSearchParams(location.search);
    const urlLang = params.get("lang");
    if(urlLang && SUPPORTED.includes(urlLang)){
      params.delete("lang");
      const qs = params.toString();
      history.replaceState(null, "", location.pathname + (qs?"?"+qs:""));
      return urlLang;
    }
    const stored = localStorage.getItem("language");
    if(stored && SUPPORTED.includes(stored)) return stored;
    const nav = navigator.languages || [navigator.language];
    for(const l of nav){
      const primary = l.split("-")[0];
      if(SUPPORTED.includes(primary)) return primary;
    }
    return DEFAULT_LANG;
  }

  async function load(lang){
    if(resources[lang]) return resources[lang];
    try{
      const res = await fetch(`assets/i18n/${lang}.json`);
      resources[lang] = await res.json();
    }catch(err){
      resources[lang] = {};
    }
    return resources[lang];
  }

  function translate(key, vars = {}, lang = currentLang){
    let str = resources[lang]?.[key];
    if(str === undefined) str = resources[DEFAULT_LANG]?.[key];
    if(str === undefined) return key;
    if(typeof str === "object" && typeof vars.count === "number"){
      str = vars.count === 1 ? str.one : str.other;
    }
    return str.replace(/\{(\w+)\}/g, (_,k) => (vars[k] !== undefined ? vars[k] : `{${k}}`));
  }

  function apply(root = document){
    root.querySelectorAll("[data-i18n]").forEach(el => {
      const key = el.getAttribute("data-i18n");
      el.textContent = translate(key);
    });
    root.querySelectorAll("[data-i18n-attr]").forEach(el => {
      const pairs = el.getAttribute("data-i18n-attr").split(",");
      pairs.forEach(p => {
        const [attr, key] = p.split(":").map(s => s.trim());
        el.setAttribute(attr, translate(key || attr));
      });
    });
    document.title = translate("title");
    document.documentElement.lang = currentLang;
  }

  async function setLanguage(lang){
    if(!SUPPORTED.includes(lang)) lang = DEFAULT_LANG;
    currentLang = lang;
    if(!resources[DEFAULT_LANG]) await load(DEFAULT_LANG);
    if(lang !== DEFAULT_LANG) await load(lang);
    localStorage.setItem("language", lang);
    apply();
    document.dispatchEvent(new CustomEvent("languagechange", {detail:{lang}}));
  }

  async function init(){
    currentLang = detectLanguage();
    await setLanguage(currentLang);
  }

  window.I18n = { init, setLanguage, t: translate, getLanguage: () => currentLang };
})();
