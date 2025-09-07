import { test, expect } from "@jest/globals";
import fs from "node:fs";
import { JSDOM } from "jsdom";

test("Stats panel re-renders on language change", () => {
  const dom = new JSDOM(
    '<!DOCTYPE html><body><nav class="toolbar"></nav></body>',
  );
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  globalThis.Popup = {
    trapFocus() {},
    open(o) {
      o.classList.add("show");
    },
    close(o) {
      o.classList.remove("show");
    },
  };
  globalThis.SoliStats = {
    loadAgg() {
      return {
        g: {
          played: 1,
          wins: 1,
          winStreak: 1,
          bestStreak: 1,
          bestTime: 60,
          bestScore: 100,
          avgTime: 60,
          avgMoves: 10,
          avgRecycles: 1,
          avgScore: 50,
        },
      };
    },
    exportAll() {
      return "{}";
    },
    importAll() {},
    safeRemove() {},
    initStats() {},
  };

  const dict = {
    en: {
      "toolbar.stats": "Stats",
      "toolbar.stats.aria": "Show stats",
      "stats.title": "Stats",
      "stats.close.aria": "Close stats",
      "stats.export": "Export",
      "stats.import": "Import",
      "stats.reset": "Reset",
      "stats.reset.confirm": "Reset all stats?",
      "stats.played": "Played: {value}",
    },
    fr: {
      "toolbar.stats": "Stats",
      "toolbar.stats.aria": "Afficher les stats",
      "stats.title": "Stats",
      "stats.close.aria": "Fermer les stats",
      "stats.export": "Exporter",
      "stats.import": "Importer",
      "stats.reset": "Réinitialiser",
      "stats.reset.confirm": "Réinitialiser toutes les stats?",
      "stats.played": "Parties: {value}",
    },
  };

  let lang = "en";
  globalThis.I18n = {
    t(key, vars) {
      const str = dict[lang][key];
      return str.replace("{value}", vars?.value);
    },
    apply(root = document) {
      root.querySelectorAll("[data-i18n]").forEach((el) => {
        el.textContent = dict[lang][el.getAttribute("data-i18n")];
      });
      root.querySelectorAll("[data-i18n-attr]").forEach((el) => {
        const [attr, key] = el.getAttribute("data-i18n-attr").split(":");
        el.setAttribute(attr, dict[lang][key]);
      });
    },
    setLanguage(l) {
      lang = l;
      this.apply();
      document.dispatchEvent(
        new dom.window.CustomEvent("languagechange", { detail: { lang: l } }),
      );
    },
    getLanguage() {
      return lang;
    },
  };

  const code = fs.readFileSync(
    new URL("../js/stats-ui.js", import.meta.url),
    "utf8",
  );
  dom.window.eval(code);

  globalThis.StatsUI.show();
  const playedEn = document.querySelector("#statsContent p").textContent;
  expect(playedEn).toBe("Played: 1");

  I18n.setLanguage("fr");
  const playedFr = document.querySelector("#statsContent p").textContent;
  expect(playedFr).toBe("Parties: 1");
});
