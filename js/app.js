/* Bootstrap: Ansichten umschalten, Kopfzeile, Tastatur, Theme, Service Worker. */
(function () {
  "use strict";
  const U = RS.ui, S = RS.store, $ = U.$;

  const A = {};
  RS.app = A;

  const VIEWS = {
    setup:      { el: "#viewSetup",   view: function () { return RS.viewSetup; },   nav: "start" },
    exam:       { el: "#viewExam",    view: function () { return RS.viewExam; },    nav: "start" },
    results:    { el: "#viewResults", view: function () { return RS.viewResults; }, nav: "start" },
    lernen:     { el: "#viewLearn",   view: function () { return RS.viewLearn; },   nav: "lernen" },
    nachschlagen:{ el: "#viewBrowse", view: function () { return RS.viewBrowse; },  nav: "nachschlagen" },
    statistik:  { el: "#viewStats",   view: function () { return RS.viewStats; },   nav: "statistik" },
  };

  let current = "setup";

  A.go = function (name) {
    const prev = VIEWS[current];
    if (prev && prev.view().leave) prev.view().leave();

    current = VIEWS[name] ? name : "setup";
    const cfg = VIEWS[current];

    Object.keys(VIEWS).forEach(function (k) {
      $(VIEWS[k].el).classList.toggle("hidden", k !== current);
    });

    const v = cfg.view();
    if (v.enter) v.enter();
    v.render();

    U.$$("#nav button").forEach(function (b) {
      b.classList.toggle("on", b.dataset.nav === cfg.nav);
      b.setAttribute("aria-current", b.dataset.nav === cfg.nav ? "page" : "false");
    });

    if (location.hash.slice(1) !== current) history.replaceState(null, "", "#" + current);
    U.scrollTop();
  };

  A.current = function () { return current; };

  /* ---------- Theme ---------- */
  function applyTheme(t) {
    const root = document.documentElement;
    if (t === "system") root.removeAttribute("data-theme");
    else root.setAttribute("data-theme", t);
    const btn = $("#btnTheme");
    if (btn) {
      const label = { system: "System", light: "Hell", dark: "Dunkel" }[t];
      btn.textContent = { system: "◐", light: "☀", dark: "☾" }[t] + " " + label;
      btn.title = "Darstellung: " + label + " (klicken zum Wechseln)";
      btn.setAttribute("aria-label", "Darstellung: " + label);
    }
  }
  A.applyTheme = applyTheme;

  /* ---------- Speicherhinweis ---------- */
  let hintTimer = null;
  S.onSaved = function (ok) {
    const el = $("#savedHint");
    if (!el) return;
    el.textContent = ok ? "gespeichert" : "Speichern nicht möglich";
    el.style.opacity = "1";
    clearTimeout(hintTimer);
    hintTimer = setTimeout(function () { el.style.opacity = "0"; }, 1400);
  };

  /* ---------- Start ---------- */
  function boot() {
    S.load();
    applyTheme(S.state.settings.theme || "system");

    U.$$("#nav button").forEach(function (b) {
      b.onclick = function () {
        const n = b.dataset.nav;
        if (n === "start") {
          const s = S.state.session;
          A.go(s && s.submitted ? "results" : s ? "exam" : "setup");
        } else A.go(n);
      };
    });

    $("#brand").onclick = function () { A.go("setup"); };

    $("#btnTheme").onclick = function () {
      const order = ["system", "light", "dark"];
      const next = order[(order.indexOf(S.state.settings.theme || "system") + 1) % order.length];
      S.state.settings.theme = next;
      S.saveNow();
      applyTheme(next);
    };

    $("#btnReset").onclick = function () {
      if (!confirm("Alles zurücksetzen? Antworten, Lernstand und Einstellungen werden gelöscht.")) return;
      S.reset();
      applyTheme("system");
      A.go("setup");
      U.toast("Zurückgesetzt.");
    };

    const bar = document.querySelector(".topbar");
    const onScroll = function () { bar.classList.toggle("stuck", window.scrollY > 4); };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    document.addEventListener("keydown", function (e) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (current === "exam" && RS.viewExam.onKey) RS.viewExam.onKey(e);
      if (current === "lernen" && RS.viewLearn.onKey) RS.viewLearn.onKey(e);
    });

    window.addEventListener("hashchange", function () {
      const h = location.hash.slice(1);
      if (VIEWS[h] && h !== current) A.go(h);
    });

    /* Laufende Prüfung wiederherstellen. Ist die Zeit inzwischen abgelaufen,
       gilt der Bogen als abgegeben. */
    const s = S.state.session;
    let startView = "setup";
    if (s) {
      if (s.submitted) startView = "results";
      else if (s.deadline && s.deadline < Date.now()) { RS.exam.submit(); startView = "results"; }
      else startView = "exam";
    }
    const hash = location.hash.slice(1);
    if (VIEWS[hash] && ["lernen", "nachschlagen", "statistik"].indexOf(hash) >= 0) startView = hash;

    A.go(startView);

    /* Offlinefähig nur, wenn über http(s) ausgeliefert – beim Öffnen per
       Doppelklick (file://) gibt es keinen Service Worker. */
    if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
      window.addEventListener("load", function () {
        navigator.serviceWorker.register("sw.js").catch(function () { /* offline optional */ });
      });
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
