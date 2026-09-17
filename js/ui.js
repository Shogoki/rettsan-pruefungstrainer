/* Gemeinsame Bausteine für alle Ansichten. */
(function () {
  "use strict";

  const U = {};
  RS.ui = U;

  U.$ = function (sel, root) { return (root || document).querySelector(sel); };
  U.$$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  U.esc = function (s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  };

  /* Komma statt Punkt – deutsche Punktschreibweise. */
  U.num = function (v) { return String(Math.round(v * 100) / 100).replace(".", ","); };

  U.plural = function (n, one, many) { return n === 1 ? one : many; };

  /* Fisher-Yates: gleichverteilt, anders als sort(() => Math.random()-.5). */
  U.shuffle = function (arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  };

  /* ---------- Noten nach §15 APVO-RettSan (Niedersachsen) ---------- */
  const GRADES = [
    { min: 92, num: 1, label: "sehr gut" },
    { min: 81, num: 2, label: "gut" },
    { min: 67, num: 3, label: "befriedigend" },
    { min: 50, num: 4, label: "ausreichend" },
    { min: 30, num: 5, label: "mangelhaft" },
    { min: 0,  num: 6, label: "ungenügend" },
  ];
  U.grade = function (pct) {
    for (let i = 0; i < GRADES.length; i++) if (pct >= GRADES[i].min) return GRADES[i];
    return GRADES[GRADES.length - 1];
  };
  /* Bestanden: Mittelwert der Bewertungen 4,4 oder besser (§15 Abs. 4). */
  U.passed = function (pct) { return U.grade(pct).num <= 4; };
  U.GRADES = GRADES;

  /* ---------- Quellenverweis ---------- */
  const refIcon =
    '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">' +
    '<path d="M4 2h5l3 3v9H4z"/><path d="M9 2v3h3"/></svg>';

  /* Erste Zahl aus "S. 6–7" ergibt die Zielseite des PDF-Links. */
  U.pageOf = function (p) {
    const m = /(\d+)/.exec(p || "");
    return m ? parseInt(m[1], 10) : null;
  };

  U.refHTML = function (r) {
    if (!r) return "";
    const doc = RS.DOCS[r.d];
    const text = U.esc((doc ? doc.title : r.d) + " – " + r.s + " (" + r.p + ")");
    if (!doc) return '<span class="ref">' + refIcon + text + "</span>";
    const page = U.pageOf(r.p);
    const href = doc.path + (page ? "#page=" + page : "");
    return '<a class="ref" href="' + U.esc(href) + '" target="_blank" rel="noopener" ' +
           'title="' + U.esc(doc.orig) + (page ? ", Seite " + page : "") + ' öffnen">' + refIcon + text + "</a>";
  };

  U.solutionHTML = function (part, heading) {
    if (!part.a) return "";
    return '<div class="solution"><h3>' + U.esc(heading || "Musterlösung") + "</h3><ul>" +
      part.a.map(function (x) { return "<li>" + U.esc(x) + "</li>"; }).join("") +
      "</ul>" + U.refHTML(part.r) + "</div>";
  };

  U.caseHTML = function (q) {
    return q.caseText ? '<div class="case"><b>Fallbeispiel</b>' + U.esc(q.caseText) + "</div>" : "";
  };

  U.partLabel = function (q, k) {
    if (q.parts.length <= 1) return "";
    return "<small>Teilfrage " + String.fromCharCode(97 + k) + ") · 2 Punkte</small>";
  };

  U.kindLabel = function (kind) {
    return { open: "Offen", mc: "MC", case: "Fall" }[kind] || kind;
  };

  U.pointsLabel = function (q) {
    return q.pts + " " + U.plural(q.pts, "Punkt", "Punkte");
  };

  /* ---------- Kurzmeldung ---------- */
  let toastEl = null, toastTimer = null;
  U.toast = function (msg) {
    if (!toastEl) {
      toastEl = document.createElement("div");
      toastEl.className = "toast";
      toastEl.setAttribute("role", "status");
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove("show"); }, 2200);
  };

  /* ---------- Zeit ---------- */
  U.mmss = function (ms) {
    if (ms < 0) ms = 0;
    const m = Math.floor(ms / 60000), s = Math.floor((ms % 60000) / 1000);
    return m + ":" + String(s).padStart(2, "0");
  };
  U.relDay = function (ts) {
    if (!ts) return "–";
    const days = Math.round((ts - Date.now()) / 86400000);
    if (days <= 0) return "jetzt fällig";
    if (days === 1) return "morgen";
    if (days < 31) return "in " + days + " Tagen";
    const months = Math.round(days / 30);
    return "in " + months + " " + U.plural(months, "Monat", "Monaten");
  };
  U.dateShort = function (ts) {
    const d = new Date(ts);
    return String(d.getDate()).padStart(2, "0") + "." + String(d.getMonth() + 1).padStart(2, "0") + "." + d.getFullYear();
  };

  U.scrollTop = function () { window.scrollTo({ top: 0, behavior: "auto" }); };
})();
