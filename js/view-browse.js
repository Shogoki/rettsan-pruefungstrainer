/* Nachschlagen: alle Fragen samt Lösung durchsuchen. */
(function () {
  "use strict";
  const U = RS.ui, S = RS.store, $ = U.$;

  const V = {};
  RS.viewBrowse = V;

  let query = "";
  let topic = "";
  let kind = "";
  let open = {};

  V.render = function () {
    const el = $("#viewBrowse");
    el.innerHTML =
      "<h1>Nachschlagen</h1>" +
      '<p class="muted">Alle ' + RS.QUESTIONS.length + " Aufgaben mit Musterlösung und Quellenverweis. " +
      "Die Suche durchsucht Fragen, Lösungen und Abschnitte.</p>" +
      '<div class="searchbar">' +
        '<input type="search" id="q" placeholder="Suchen, z.B. Lungenödem, SAMPLER, Adrenalin …" ' +
        'value="' + U.esc(query) + '" aria-label="Fragen durchsuchen">' +
        '<select id="fTopic" class="btn" aria-label="Thema filtern">' +
          '<option value="">alle Themen</option>' +
          RS.TOPICS.map(function (t) {
            return '<option value="' + U.esc(t) + '"' + (topic === t ? " selected" : "") + ">" + U.esc(t) + "</option>";
          }).join("") +
        "</select>" +
        '<select id="fKind" class="btn" aria-label="Fragetyp filtern">' +
          [["", "alle Typen"], ["open", "offene Fragen"], ["mc", "Multiple Choice"], ["case", "Fallbeispiele"]]
            .map(function (o) {
              return '<option value="' + o[0] + '"' + (kind === o[0] ? " selected" : "") + ">" + o[1] + "</option>";
            }).join("") +
        "</select>" +
      "</div>" +
      '<p class="small muted" id="hits"></p>' +
      '<div id="browseList"></div>';

    const input = $("#q");
    input.oninput = function () { query = input.value; renderList(); };
    $("#fTopic").onchange = function (e) { topic = e.target.value; renderList(); };
    $("#fKind").onchange = function (e) { kind = e.target.value; renderList(); };
    renderList();
    /* Direkt lostippen können – aber auf dem Handy nicht die Tastatur aufklappen. */
    if (window.matchMedia("(min-width: 760px)").matches) input.focus({ preventScroll: true });
  };

  function haystack(q) {
    const bits = [q.t, q.caseText || "", q.e || ""];
    q.parts.forEach(function (p) {
      bits.push(p.q);
      if (p.a) bits.push(p.a.join(" "));
      if (p.r) bits.push(p.r.s);
    });
    if (q.o) bits.push(q.o.join(" "));
    return bits.join(" ").toLowerCase();
  }

  function matches(q, terms) {
    if (!terms.length) return true;
    const h = haystack(q);
    return terms.every(function (t) { return h.indexOf(t) >= 0; });
  }

  function highlight(text, terms) {
    let out = U.esc(text);
    if (!terms.length) return out;
    terms.forEach(function (t) {
      if (t.length < 2) return;
      const re = new RegExp("(" + t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + ")", "gi");
      out = out.replace(re, '<span class="mark">$1</span>');
    });
    return out;
  }

  function renderList() {
    const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
    const hits = RS.QUESTIONS.filter(function (q) {
      if (topic && q.t !== topic) return false;
      if (kind && q.kind !== kind) return false;
      return matches(q, terms);
    });

    $("#hits").textContent = hits.length + " " + U.plural(hits.length, "Treffer", "Treffer") +
      (hits.length > 60 ? " – die ersten 60 werden gezeigt" : "");

    const list = $("#browseList");
    if (!hits.length) {
      list.innerHTML = '<p class="muted" style="padding:16px 4px">Nichts gefunden. Andere Schreibweise probieren?</p>';
      return;
    }

    list.innerHTML = hits.slice(0, 60).map(function (q) {
      const isOpen = !!open[q.id];
      const title = q.kind === "case" ? q.caseText : q.parts[0].q;
      const st = S.peekStat(q.id);
      return '<details class="paper browse-item"' + (isOpen ? " open" : "") + ' data-id="' + q.id + '">' +
        '<summary class="browse-q">' +
          '<span class="kind ' + q.kind + '">' + U.kindLabel(q.kind) + "</span>" +
          "<span>" + highlight(title.length > 190 ? title.slice(0, 190) + " …" : title, terms) +
            '<br><span class="small muted">' + U.esc(q.t) +
            (st && st.seen ? " · " + st.seen + "× geübt · " + U.relDay(st.due) : " · noch nicht geübt") +
            "</span></span>" +
          '<span class="chev" aria-hidden="true">›</span>' +
        "</summary>" +
        '<div class="browse-body">' + bodyHTML(q) + "</div>" +
      "</details>";
    }).join("");

    U.$$("details", list).forEach(function (d) {
      d.addEventListener("toggle", function () { open[d.dataset.id] = d.open; });
    });
  }

  function bodyHTML(q) {
    if (q.kind === "mc") {
      return '<div class="options">' +
          q.o.map(function (o, i) {
            return '<div class="opt' + (i === q.correct ? " right" : "") + '">' +
              '<span class="key">' + String.fromCharCode(65 + i) + "</span><span>" + U.esc(o) +
              (i === q.correct ? ' <b style="color:var(--green)">— richtig</b>' : "") + "</span></div>";
          }).join("") +
        "</div>" +
        (q.e ? '<div class="solution"><h3>Erläuterung</h3><ul><li>' + U.esc(q.e) + "</li></ul>" +
          U.refHTML(q.r) + "</div>" : '<div style="padding:0 var(--pad) 16px">' + U.refHTML(q.r) + "</div>");
    }
    return U.caseHTML(q) +
      q.parts.map(function (p, k) {
        return (q.parts.length > 1 ? '<div class="part">' + U.partLabel(q, k) + U.esc(p.q) + "</div>" : "") +
          U.solutionHTML(p);
      }).join("");
  }
})();
