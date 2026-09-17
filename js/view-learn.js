/* Lernmodus: eine Karte nach der anderen, mit gestaffelter Wiederholung.

   Reihenfolge der Warteschlange:
     1. fällige Wiederholungen (älteste zuerst)
     2. neue Fragen
   Mit "Nochmal" bewertete Karten wandern ans Ende der laufenden Runde. */
(function () {
  "use strict";
  const U = RS.ui, S = RS.store, $ = U.$;

  const V = {};
  RS.viewLearn = V;

  let queue = [];
  let revealed = false;
  let session = { done: 0, again: 0 };

  V.enter = function () {
    const topics = S.state.settings.topics;
    const now = Date.now();
    const due = [], fresh = [];
    RS.QUESTIONS.forEach(function (q) {
      if (topics.indexOf(q.t) < 0) return;
      if (S.isNew(q.id)) fresh.push(q.id);
      else if (S.isDue(q.id, now)) due.push(q.id);
    });
    due.sort(function (a, b) { return S.stat(a).due - S.stat(b).due; });

    /* Nichts fällig? Dann die am längsten nicht geübten Fragen anbieten,
       damit der Lernmodus nie in eine Sackgasse läuft. */
    if (!due.length && !fresh.length) {
      const all = RS.QUESTIONS.filter(function (q) { return topics.indexOf(q.t) >= 0; })
        .map(function (q) { return q.id; });
      all.sort(function (a, b) { return (S.stat(a).lastAt || 0) - (S.stat(b).lastAt || 0); });
      queue = all.slice(0, 20);
    } else {
      queue = due.concat(U.shuffle(fresh).slice(0, S.state.settings.newPerSession || 10));
    }
    revealed = false;
    session = { done: 0, again: 0 };
  };

  V.leave = function () { queue = []; };

  V.render = function () {
    const el = $("#viewLearn");
    if (!queue.length) { el.innerHTML = doneHTML(); wireDone(); return; }

    const id = queue[0];
    const q = RS.get(id);
    const st = S.stat(id);
    const counts = S.dueCount(S.state.settings.topics);

    el.innerHTML =
      '<div class="learnbar">' +
        '<span class="pill">Warteschlange <b>' + queue.length + "</b></span>" +
        '<span class="pill' + (counts.due ? " due" : "") + '">fällig <b>' + counts.due + "</b></span>" +
        '<span class="pill' + (counts.neu ? " new" : "") + '">neu <b>' + counts.neu + "</b></span>" +
        '<span class="pill">in dieser Runde <b>' + session.done + "</b></span>" +
        '<span class="spacer" style="flex:1"></span>' +
        '<button class="btn sm ghost" id="btnEndLearn">Beenden</button>' +
      "</div>" +
      '<div class="paper sheet" id="card"></div>' +
      '<p class="small muted" style="margin-top:14px">Tastatur: <b>Leertaste</b> aufdecken, ' +
      "danach <b>1</b> nochmal · <b>2</b> schwer · <b>3</b> gut · <b>4</b> leicht.</p>";

    renderCard(q, st);
    $("#btnEndLearn").onclick = function () { RS.app.go("setup"); };
  };

  function renderCard(q, st) {
    const card = $("#card");
    const overdue = st.seen && st.due <= Date.now();
    const seenInfo = st.seen
      ? st.seen + "× geübt · " + U.relDay(st.due)
      : "neue Frage";

    let body;
    if (q.kind === "mc") {
      body = '<div class="question">' + U.esc(q.q) + "</div>" +
        '<div class="options">' +
          q.o.map(function (o, i) {
            const cls = revealed ? (i === q.correct ? " right" : "") : "";
            return '<button type="button" class="opt' + cls + '" data-i="' + i + '"' +
              (revealed ? " disabled" : "") + ">" +
              '<span class="key" aria-hidden="true">' + String.fromCharCode(65 + i) + "</span>" +
              "<span>" + U.esc(o) + "</span></button>";
          }).join("") +
        "</div>" +
        (revealed && q.e ? '<div class="solution"><h3>Erläuterung</h3><ul><li>' + U.esc(q.e) + "</li></ul>" +
          U.refHTML(q.r) + "</div>" : "");
    } else {
      body = U.caseHTML(q) +
        q.parts.map(function (p, k) {
          const single = q.parts.length === 1;
          return (single ? '<div class="question">' + U.esc(p.q) + "</div>"
                         : '<div class="part">' + U.partLabel(q, k) + U.esc(p.q) + "</div>") +
            (revealed ? U.solutionHTML(p) : "");
        }).join("") +
        (revealed ? "" : '<div class="selfcheck">Beantworte die Frage im Kopf oder auf Papier. ' +
          "Erst danach aufdecken – das Abrufen aus dem Gedächtnis ist der Teil, der wirkt.</div>");
    }

    card.innerHTML =
      '<div class="sheet-head"><div class="qnum"><span class="topic">' + U.esc(q.t) + "</span>" +
      '<span class="topic">' + U.kindLabel(q.kind) + "</span></div>" +
      '<div class="cardmeta' + (overdue ? " due" : "") + '">' + U.esc(seenInfo) + "</div></div>" +
      body +
      (revealed ? srsHTML(q) :
        '<div class="sheet-foot"><button class="btn primary" id="btnReveal" style="width:100%; justify-content:center">' +
        (q.kind === "mc" ? "Auflösen" : "Musterlösung anzeigen") + "</button></div>");

    if (!revealed) {
      $("#btnReveal").onclick = reveal;
      U.$$(".opt", card).forEach(function (b) { b.onclick = reveal; });
    } else {
      U.$$(".srs button", card).forEach(function (b) {
        b.onclick = function () { rate(+b.dataset.q); };
      });
    }
  }

  function srsHTML(q) {
    const st = S.peekStat(q.id) || { interval: 0, ease: 2.5 };
    const preview = function (quality) {
      if (quality === 0) return "gleich nochmal";
      const iv = st.interval === 0 ? [0, 1, 2, 4][quality]
        : quality === 1 ? Math.max(1, st.interval * 1.2)
        : quality === 2 ? st.interval * st.ease
        : st.interval * st.ease * 1.3;
      const d = Math.min(365, Math.round(iv));
      return d <= 1 ? "1 Tag" : d + " Tage";
    };
    return '<div class="srs" role="group" aria-label="Wie gut lief es?">' +
      '<button type="button" class="again" data-q="0"><b>Nochmal</b><small>' + preview(0) + "</small></button>" +
      '<button type="button" class="hard" data-q="1"><b>Schwer</b><small>' + preview(1) + "</small></button>" +
      '<button type="button" class="good" data-q="2"><b>Gut</b><small>' + preview(2) + "</small></button>" +
      '<button type="button" class="easy" data-q="3"><b>Leicht</b><small>' + preview(3) + "</small></button>" +
      "</div>";
  }

  function reveal() {
    revealed = true;
    renderCard(RS.get(queue[0]), S.stat(queue[0]));
  }

  function rate(quality) {
    const id = queue.shift();
    S.schedule(id, quality);
    session.done++;
    if (quality === 0) { queue.push(id); session.again++; }
    revealed = false;
    V.render();
    U.scrollTop();
  }

  function doneHTML() {
    const counts = S.dueCount(S.state.settings.topics);
    return '<div class="paper" style="padding:28px 24px; text-align:center">' +
      "<h2>Runde geschafft</h2>" +
      '<p class="muted" style="margin:0 auto 6px; max-width:46ch">' +
        session.done + " " + U.plural(session.done, "Karte", "Karten") + " bearbeitet" +
        (session.again ? ", davon " + session.again + "× „Nochmal“" : "") + ". " +
        (counts.due + counts.neu > 0
          ? "Es " + U.plural(counts.due + counts.neu, "wartet", "warten") + " noch " +
            (counts.due + counts.neu) + " " + U.plural(counts.due + counts.neu, "Frage", "Fragen") + "."
          : "Für heute ist nichts mehr fällig.") +
      "</p>" +
      '<div class="btn-row" style="justify-content:center">' +
        '<button class="btn primary" id="btnMore">Weiter lernen</button>' +
        '<button class="btn" id="btnToStats">Statistik</button>' +
        '<button class="btn ghost" id="btnToSetup">Zum Start</button>' +
      "</div></div>";
  }

  function wireDone() {
    $("#btnMore").onclick = function () { V.enter(); V.render(); U.scrollTop(); };
    $("#btnToStats").onclick = function () { RS.app.go("statistik"); };
    $("#btnToSetup").onclick = function () { RS.app.go("setup"); };
  }

  V.onKey = function (e) {
    if (!queue.length) return;
    if (/^(TEXTAREA|INPUT)$/.test(document.activeElement.tagName)) return;
    if (!revealed && (e.key === " " || e.key === "Enter")) { reveal(); e.preventDefault(); return; }
    if (revealed && /^[1-4]$/.test(e.key)) { rate(+e.key - 1); e.preventDefault(); }
  };
})();
