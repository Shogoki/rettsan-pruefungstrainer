/* Prüfungsansicht: ein Bogen, eine Aufgabe, Navigation und Timer. */
(function () {
  "use strict";
  const U = RS.ui, S = RS.store, E = RS.exam, $ = U.$;

  const V = {};
  RS.viewExam = V;

  let tick = null;

  V.leave = function () { clearInterval(tick); tick = null; };

  V.render = function () {
    const s = S.state.session;
    if (!s) { RS.app.go("setup"); return; }
    const el = $("#viewExam");
    const id = s.order[s.cur];
    const q = RS.get(id);
    const n = s.order.length;

    el.innerHTML =
      '<div class="status">' +
        '<span class="small muted" id="statusText"></span>' +
        '<div class="progress"><i id="progressBar"></i></div>' +
        '<span class="timer' + (s.deadline ? "" : " hidden") + '" id="timer" role="timer" aria-live="off">–</span>' +
      "</div>" +
      '<div class="paper sheet" id="sheet"></div>' +
      '<div class="overview" id="overview" role="group" aria-label="Aufgaben"></div>' +
      '<div class="btn-row">' +
        '<button class="btn danger" id="btnSubmit">Abgeben und auswerten</button>' +
        '<button class="btn ghost" id="btnAbort">Abbrechen</button>' +
      "</div>" +
      '<p class="small muted" style="margin-top:14px">Tastatur: <b>←</b> / <b>→</b> blättern' +
      (q.kind === "mc" ? ", <b>1</b>–<b>" + q.o.length + "</b> antworten" : "") + ".</p>";

    renderSheet();
    renderOverview();
    updateProgress();

    $("#btnSubmit").onclick = function () { trySubmit(false); };
    $("#btnAbort").onclick = function () {
      if (confirm("Übung abbrechen? Deine Antworten gehen verloren.")) {
        V.leave(); S.state.session = null; S.saveNow(); RS.app.go("setup");
      }
    };

    clearInterval(tick);
    if (s.deadline) { updateTimer(); tick = setInterval(updateTimer, 1000); }
  };

  function sheetHTML(q, s) {
    const id = q.id;
    const head =
      '<div class="sheet-head"><div class="qnum">Aufgabe <b>' + (s.cur + 1) + "</b> / " + s.order.length +
      '<span class="topic">' + U.esc(q.t) + "</span></div>" +
      '<div class="points">' + U.pointsLabel(q) + "</div></div>";

    if (q.kind === "mc") {
      const opts = E.optionsFor(id);
      const pick = E.pick(id);
      return head +
        '<div class="question">' + U.esc(q.q) + "</div>" +
        '<div class="options" role="group" aria-label="Antwortmöglichkeiten">' +
          opts.map(function (o, i) {
            return '<button type="button" class="opt" data-i="' + i + '" aria-pressed="' + (pick === i) + '">' +
              '<span class="key" aria-hidden="true">' + String.fromCharCode(65 + i) + "</span>" +
              "<span>" + U.esc(o) + "</span></button>";
          }).join("") +
        "</div>" +
        (s.peeked[id] ? mcSolution(q) : "");
    }

    return head + U.caseHTML(q) +
      q.parts.map(function (p, k) {
        const single = q.parts.length === 1;
        return (single ? '<div class="question">' + U.esc(p.q) + "</div>"
                       : '<div class="part">' + U.partLabel(q, k) + U.esc(p.q) + "</div>") +
          '<div class="answer"><textarea data-k="' + k + '" rows="8" spellcheck="false" ' +
          'aria-label="Antwort auf Aufgabe ' + (s.cur + 1) + (single ? "" : ", Teilfrage " + String.fromCharCode(97 + k)) + '" ' +
          'placeholder="Antwort in Stichpunkten oder Sätzen …">' + U.esc(E.answer(q.id, k)) + "</textarea>" +
          '<span class="count" data-count="' + k + '"></span></div>' +
          (s.peeked[id] ? U.solutionHTML(p) : "");
      }).join("");
  }

  function mcSolution(q) {
    return '<div class="solution"><h3>Richtige Antwort</h3><ul><li>' + U.esc(q.o[q.correct]) + "</li>" +
      (q.e ? "<li>" + U.esc(q.e) + "</li>" : "") + "</ul>" + U.refHTML(q.r) + "</div>";
  }

  function renderSheet() {
    const s = S.state.session;
    const id = s.order[s.cur];
    const q = RS.get(id);
    const sheet = $("#sheet");

    sheet.innerHTML = sheetHTML(q, s) +
      '<div class="sheet-foot">' +
        '<button class="btn" id="btnPrev"' + (s.cur === 0 ? " disabled" : "") + ">Zurück</button>" +
        '<button class="btn" id="btnNext"' + (s.cur === s.order.length - 1 ? " disabled" : "") + ">Weiter</button>" +
        '<span class="spacer"></span>' +
        (s.peekAllowed
          ? '<button class="btn sm ghost" id="btnPeek">' + (s.peeked[id] ? "Lösung ausblenden" : "Lösung anzeigen") + "</button>"
          : '<span class="small muted">Lösung nach der Abgabe</span>') +
      "</div>";

    U.$$("#sheet textarea", sheet).forEach(function (ta) {
      const k = ta.dataset.k;
      const counter = sheet.querySelector('[data-count="' + k + '"]');
      const upd = function () {
        const words = ta.value.trim() ? ta.value.trim().split(/\s+/).length : 0;
        counter.textContent = words ? words + " " + U.plural(words, "Wort", "Wörter") : "";
      };
      upd();
      ta.addEventListener("input", function () {
        E.setAnswer(id, k, ta.value);
        upd(); updateProgress(); renderOverview();
      });
    });

    U.$$("#sheet .opt", sheet).forEach(function (b) {
      b.onclick = function () {
        E.setPick(id, +b.dataset.i);
        renderSheet(); updateProgress(); renderOverview();
      };
    });

    $("#btnPrev").onclick = function () { V.goTo(s.cur - 1); };
    $("#btnNext").onclick = function () { V.goTo(s.cur + 1); };
    if (s.peekAllowed) $("#btnPeek").onclick = function () {
      s.peeked[id] = !s.peeked[id]; S.save(); renderSheet(); renderOverview();
    };

    const first = sheet.querySelector("textarea");
    if (first && document.activeElement && document.activeElement.tagName !== "TEXTAREA") {
      first.focus({ preventScroll: true });
    }
  }

  V.goTo = function (i) {
    const s = S.state.session;
    if (i < 0 || i >= s.order.length) return;
    s.cur = i; S.save();
    renderSheet(); renderOverview(); U.scrollTop();
  };

  function renderOverview() {
    const s = S.state.session;
    const o = $("#overview");
    if (!o) return;
    o.innerHTML = s.order.map(function (id, i) {
      const q = RS.get(id);
      const cls = [
        E.isAnswered(id) ? "done" : "",
        i === s.cur ? "cur" : "",
        s.peeked[id] ? "peeked" : "",
      ].filter(Boolean).join(" ");
      return '<button type="button" class="' + cls + '" data-i="' + i + '" ' +
        'title="' + U.esc(q.t + " · " + U.kindLabel(q.kind)) + '" ' +
        'aria-label="Aufgabe ' + (i + 1) + (E.isAnswered(id) ? ", beantwortet" : ", offen") + '"' +
        (i === s.cur ? ' aria-current="true"' : "") + ">" + (i + 1) + "</button>";
    }).join("");
    U.$$("button", o).forEach(function (b) { b.onclick = function () { V.goTo(+b.dataset.i); }; });
  }

  function updateProgress() {
    const s = S.state.session;
    const n = s.order.length;
    const done = s.order.filter(E.isAnswered).length;
    const t = $("#statusText"), bar = $("#progressBar");
    if (t) t.textContent = done + " von " + n + " beantwortet";
    if (bar) bar.style.width = (n ? (done / n) * 100 : 0) + "%";
  }

  function updateTimer() {
    const s = S.state.session;
    const el = $("#timer");
    if (!el || !s || !s.deadline) return;
    const ms = s.deadline - Date.now();
    if (ms <= 0) {
      clearInterval(tick);
      el.textContent = "0:00";
      U.toast("Zeit abgelaufen – der Bogen wurde abgegeben.");
      doSubmit();
      return;
    }
    el.textContent = U.mmss(ms);
    el.classList.toggle("low", ms < 5 * 60000);
    el.classList.toggle("crit", ms < 60000);
  }

  function trySubmit(auto) {
    const s = S.state.session;
    const open = s.order.filter(function (id) { return !E.isAnswered(id); }).length;
    if (!auto && open > 0) {
      const msg = open + " " + U.plural(open, "Aufgabe ist", "Aufgaben sind") + " noch unbeantwortet. Trotzdem abgeben?";
      if (!confirm(msg)) return;
    }
    doSubmit();
  }

  function doSubmit() {
    V.leave();
    E.submit();
    RS.app.go("results");
  }

  /* Tastatur: blättern und MC per Zifferntaste beantworten. */
  V.onKey = function (e) {
    const s = S.state.session;
    if (!s) return;
    const inText = /^(TEXTAREA|INPUT)$/.test(document.activeElement.tagName);
    if (e.key === "ArrowLeft" && !inText) { V.goTo(s.cur - 1); e.preventDefault(); return; }
    if (e.key === "ArrowRight" && !inText) { V.goTo(s.cur + 1); e.preventDefault(); return; }
    const q = RS.get(s.order[s.cur]);
    if (q.kind === "mc" && /^[1-9]$/.test(e.key) && !inText) {
      const i = +e.key - 1;
      if (i < q.o.length) { E.setPick(q.id, i); renderSheet(); updateProgress(); renderOverview(); e.preventDefault(); }
    }
  };
})();
