/* Auswertung: Punkte, Note nach § 8 APORettSan, Selbstbewertung, Wiederholung. */
(function () {
  "use strict";
  const U = RS.ui, S = RS.store, E = RS.exam, $ = U.$;

  const V = {};
  RS.viewResults = V;

  const SCALE = [0, 0.5, 1, 1.5, 2];

  V.render = function () {
    const s = S.state.session;
    if (!s || !s.submitted) { RS.app.go("setup"); return; }
    const el = $("#viewResults");
    const tot = E.totals();
    const openLeft = tot.n - tot.rated;

    el.innerHTML =
      '<div class="paper score" id="scoreBox"></div>' +
      '<div id="scoreHint"></div>' +
      '<div class="filters" role="group" aria-label="Aufgaben filtern">' +
        ["all:Alle", "unrated:Noch nicht bewertet", "weak:Unter voller Punktzahl", "wrong:Falsch beantwortet"]
          .map(function (f) {
            const k = f.split(":")[0], label = f.split(":")[1];
            return '<button class="btn sm' + (s.filter === k ? " on" : "") + '" data-f="' + k + '">' + label + "</button>";
          }).join("") +
      "</div>" +
      '<div id="resultList"></div>' +
      '<div class="btn-row">' +
        '<button class="btn primary" id="btnAgain">Neue Übung</button>' +
        '<button class="btn" id="btnRetryWeak">Schwache Aufgaben wiederholen</button>' +
        '<button class="btn ghost" id="btnPrint">Drucken</button>' +
      "</div>";

    renderScore(tot, openLeft);
    renderList();

    U.$$(".filters button", el).forEach(function (b) {
      b.onclick = function () { s.filter = b.dataset.f; S.save(); V.render(); };
    });
    $("#btnAgain").onclick = function () {
      E.finish(); S.state.session = null; S.saveNow(); RS.app.go("setup");
    };
    $("#btnRetryWeak").onclick = function () {
      E.finish();
      const weak = E.weakIds();
      if (!weak.length) { U.toast("Alle Aufgaben haben volle Punktzahl."); return; }
      const set = S.state.settings;
      if (E.start({ mode: set.mode, ids: weak, peek: set.peek, timer: false, shuffle: set.shuffle })) {
        RS.app.go("exam");
      }
    };
    $("#btnPrint").onclick = function () { window.print(); };
  };

  function renderScore(tot, openLeft) {
    const s = S.state.session;
    const pct = Math.round(tot.pct * 10) / 10;
    const g = tot.grade;
    const rows = E.byTopic().map(function (r) {
      const w = r.max ? (r.pts / r.max) * 100 : 0;
      return '<div class="trow"><span>' + U.esc(r.t) + "</span>" +
        '<div class="bar"><i style="width:' + w.toFixed(0) + '%"></i></div>' +
        '<span class="v">' + U.num(r.pts) + " / " + r.max + "</span></div>";
    }).join("");

    const verdict = openLeft > 0
      ? '<div class="grade"><span class="unrated">Noch ' + openLeft + " " +
        U.plural(openLeft, "Aufgabe ist", "Aufgaben sind") + " nicht vollständig bewertet – " +
        "die Note steht erst danach fest.</span></div>"
      : '<div class="gradebox ' + (U.passed(pct) ? "pass" : "fail") + '">' +
        '<span class="num">' + g.num + "</span><span>" + U.esc(g.label) + "</span>" +
        "<span>· " + U.num(pct) + " %</span></div>" +
        '<div class="grade">' + (U.passed(pct) ? "bestanden" : "nicht bestanden") +
        " – der schriftliche Teil ist ab „ausreichend“ bestanden (§ 7 Abs. 2 APORettSan).</div>" +
        '<div class="grade" style="margin-top:8px">„' + U.esc(g.label) + "“ (" + g.num + "): " +
        U.esc(g.def) + " <span class=\"muted\">(§ 8 APORettSan)</span></div>";

    $("#scoreBox").innerHTML =
      "<div>" +
        '<div class="big">' + U.num(tot.pts) + "<small>/ " + tot.max + " Punkte</small></div>" +
        verdict +
      "</div>" +
      '<div class="topics">' + rows + "</div>";

    const hint = $("#scoreHint");
    hint.innerHTML = openLeft > 0 ? "" :
      '<div class="note warn"><strong>Prozentwert ist ein Richtwert:</strong> ' +
      "Hessen definiert die Noten nur mit den Worten aus § 8 APORettSan und legt keinen " +
      "Prozentschlüssel fest. Welche Punktzahl an deiner Schule welcher Note entspricht, " +
      "sagt dir die Schule.</div>";
  }

  function renderList() {
    const s = S.state.session;
    const list = $("#resultList");
    const parts = [];

    s.order.forEach(function (id, i) {
      const q = RS.get(id);
      if (s.filter === "unrated" && E.isRated(id)) return;
      if (s.filter === "weak" && E.score(id) >= q.pts) return;
      if (s.filter === "wrong" && !(q.kind === "mc" ? !E.isCorrect(id) : E.score(id) < q.pts)) return;
      parts.push(q.kind === "mc" ? mcCard(q, i) : openCard(q, i));
    });

    if (!parts.length) {
      list.innerHTML = '<p class="muted" style="padding:16px 4px">Keine Aufgaben in dieser Ansicht.</p>';
      return;
    }
    list.innerHTML = parts.join("");

    U.$$(".part-rate button", list).forEach(function (b) {
      b.onclick = function () {
        E.setRating(b.dataset.id, b.dataset.k, +b.dataset.v);
        V.render();
      };
    });
  }

  function head(q, i, scoreText, ok) {
    return '<div class="sheet-head"><div class="qnum">Aufgabe <b>' + (i + 1) + "</b>" +
      '<span class="topic">' + U.esc(q.t) + "</span></div>" +
      '<div class="points' + (ok ? " ok" : "") + '">' + scoreText + " / " + q.pts + "</div></div>";
  }

  function mcCard(q, i) {
    const id = q.id;
    const opts = E.optionsFor(id);
    const pick = E.pick(id);
    const right = E.correctPos(id);
    const ok = E.isCorrect(id);

    return '<div class="paper sheet result">' +
      head(q, i, ok ? "1" : "0", ok) +
      '<div class="question">' + U.esc(q.q) + "</div>" +
      '<div class="options">' +
        opts.map(function (o, k) {
          const cls = k === right ? " right" : (k === pick ? " wrong" : "");
          return '<button type="button" class="opt' + cls + '" disabled aria-pressed="' + (pick === k) + '">' +
            '<span class="key" aria-hidden="true">' + String.fromCharCode(65 + k) + "</span>" +
            "<span>" + U.esc(o) +
            (k === right ? ' <b style="color:var(--green)">— richtig</b>' : "") +
            (k === pick && k !== right ? ' <b style="color:var(--red)">— deine Antwort</b>' : "") +
            "</span></button>";
        }).join("") +
      "</div>" +
      '<div class="verdict ' + (ok ? "right" : "wrong") + '">' +
        (pick === null ? "Nicht beantwortet – 0 Punkte" : ok ? "Richtig – 1 Punkt" : "Falsch – 0 Punkte") +
      "</div>" +
      (q.e ? '<div class="solution"><h3>Erläuterung</h3><ul><li>' + U.esc(q.e) + "</li></ul>" + U.refHTML(q.r) + "</div>"
           : '<div style="padding:0 var(--pad) 16px">' + U.refHTML(q.r) + "</div>") +
      "</div>";
  }

  function openCard(q, i) {
    const id = q.id;
    const rated = E.isRated(id);
    const score = E.score(id);

    return '<div class="paper sheet result">' +
      head(q, i, rated ? U.num(score) : "–", rated && score >= q.pts) +
      U.caseHTML(q) +
      q.parts.map(function (p, k) {
        const mine = E.answer(id, k).trim();
        const r = E.rating(id, k);
        return '<div class="part">' + U.partLabel(q, k) + U.esc(p.q) + "</div>" +
          '<div class="yours' + (mine ? "" : " empty") + '" style="margin-top:10px">' +
            (mine ? U.esc(mine) : "Keine Antwort gegeben.") + "</div>" +
          U.solutionHTML(p) +
          '<div class="rate part-rate"><span class="lbl">Punkte:</span><div class="seg">' +
            SCALE.map(function (v) {
              return '<button type="button" data-id="' + id + '" data-k="' + k + '" data-v="' + v + '" ' +
                'class="' + (r === v ? "on" + (v === 2 ? " full" : "") : "") + '">' + U.num(v) + "</button>";
            }).join("") +
          "</div>" +
          (r === undefined ? '<span class="unrated">Vergleiche deine Antwort mit den Stichpunkten.</span>' : "") +
          "</div>";
      }).join("") +
      "</div>";
  }
})();
