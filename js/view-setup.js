/* Startbildschirm: Modus, Themen, Umfang, Optionen. */
(function () {
  "use strict";
  const U = RS.ui, S = RS.store, E = RS.exam, $ = U.$;

  const MODES = [
    { id: "pruefung", name: "Prüfungssimulation",
      desc: "Gemischter Bogen wie in der schriftlichen Prüfung: Multiple Choice und offene Fragen, MC höchstens zur Hälfte.",
      tag: "wie echt" },
    { id: "offen", name: "Offene Fragen",
      desc: "Nur offene Fragen und Fallbeispiele. Frei formulieren, danach anhand der Musterlösung selbst bewerten.",
      tag: "2 Pkt." },
    { id: "mc", name: "Multiple Choice",
      desc: "Nur Ankreuzfragen mit genau einer richtigen Antwort. Wird automatisch ausgewertet.",
      tag: "1 Pkt." },
    { id: "lernen", name: "Lernmodus",
      desc: "Karte für Karte mit Wiederholungsplanung: Was sitzt, kommt seltener – was wackelt, kommt wieder.",
      tag: "täglich" },
  ];

  const V = {};
  RS.viewSetup = V;

  V.render = function () {
    const st = S.state, set = st.settings;
    const el = $("#viewSetup");

    const counts = S.dueCount(set.topics);
    const modeCards = MODES.map(function (m) {
      let tag = m.tag;
      if (m.id === "lernen") tag = counts.due + counts.neu > 0 ? counts.due + counts.neu + " offen" : "erledigt";
      return '<button type="button" class="mode" data-mode="' + m.id + '" aria-pressed="' + (set.mode === m.id) + '">' +
        "<b>" + U.esc(m.name) + '<span class="tag">' + U.esc(tag) + "</span></b>" +
        "<span>" + U.esc(m.desc) + "</span></button>";
    }).join("");

    const topicRows = RS.TOPICS.map(function (t) {
      const all = RS.QUESTIONS.filter(function (q) { return q.t === t; });
      const inMode = E.pool(set.mode === "lernen" ? "pruefung" : set.mode, [t]).length;
      const d = S.dueCount([t]);
      const badge = d.due ? '<span class="due">' + d.due + " fällig</span> · " : "";
      return '<label class="check"><input type="checkbox" data-topic="' + U.esc(t) + '"' +
        (set.topics.indexOf(t) >= 0 ? " checked" : "") + '><span>' + U.esc(t) + "</span>" +
        '<span class="n">' + badge + inMode + " von " + all.length + "</span></label>";
    }).join("");

    const isLearn = set.mode === "lernen";

    el.innerHTML =
      "<h1>Schriftliche Prüfung üben</h1>" +
      '<p class="muted">Offene Fragen frei beantworten und anhand der Musterlösung selbst bewerten, ' +
      "Multiple Choice automatisch auswerten lassen – beides mit Quellenverweis in die Zusammenfassungen. " +
      "Alles läuft im Browser, nichts wird gesendet.</p>" +

      '<div class="modes" role="group" aria-label="Modus wählen">' + modeCards + "</div>" +

      '<div class="grid">' +
        "<div><fieldset><legend>Themen</legend>" +
          '<div class="topiclinks"><button type="button" id="topicsAll">alle</button>' +
          '<button type="button" id="topicsNone">keine</button></div>' +
          '<div id="topicList">' + topicRows + "</div>" +
        "</fieldset></div>" +
        "<div>" +
          (isLearn ? learnPanel(counts) : examPanel(set)) +
        "</div>" +
      "</div>";

    /* Modus */
    U.$$(".mode", el).forEach(function (b) {
      b.onclick = function () { set.mode = b.dataset.mode; S.save(); V.render(); };
    });
    /* Themen */
    U.$$("#topicList input", el).forEach(function (cb) {
      cb.onchange = function () {
        const t = cb.dataset.topic;
        if (cb.checked) { if (set.topics.indexOf(t) < 0) set.topics.push(t); }
        else set.topics = set.topics.filter(function (x) { return x !== t; });
        S.save(); V.render();
      };
    });
    $("#topicsAll").onclick = function () { set.topics = RS.TOPICS.slice(); S.save(); V.render(); };
    $("#topicsNone").onclick = function () { set.topics = []; S.save(); V.render(); };

    if (isLearn) {
      $("#btnStart").onclick = function () { RS.app.go("lernen"); };
      $("#btnStart").disabled = !set.topics.length;
    } else {
      U.$$("#countSeg button", el).forEach(function (b) {
        b.onclick = function () { set.count = +b.dataset.n; S.save(); V.render(); };
      });
      $("#optPeek").onchange = function (e) { set.peek = e.target.checked; S.save(); };
      $("#optTimer").onchange = function (e) { set.timer = e.target.checked; S.save(); V.render(); };
      $("#optShuffle").onchange = function (e) { set.shuffle = e.target.checked; S.save(); };
      $("#btnStart").onclick = function () {
        const ok = E.start({ mode: set.mode, topics: set.topics, count: set.count,
                             peek: set.peek, timer: set.timer, shuffle: set.shuffle });
        if (ok) RS.app.go("exam");
      };
    }
  };

  function examPanel(set) {
    const pool = E.pool(set.mode, set.topics);
    const n = pool.length;
    const take = set.count === 0 ? n : Math.min(set.count, n);

    let hint, warn = "";
    if (!n) {
      hint = "Wähle mindestens ein Thema mit passenden Aufgaben.";
    } else {
      const mcAvail = pool.filter(function (q) { return q.kind === "mc"; }).length;
      if (set.mode === "pruefung") {
        const wantMC = Math.min(mcAvail, Math.floor(take / 2));
        const wantRest = Math.min(n - mcAvail, take - wantMC);
        hint = wantMC + " MC-Fragen und " + wantRest + " offene Aufgaben (" + (wantMC + wantRest) + " von " + n + ")";
        if (wantMC + wantRest < take) {
          warn = '<div class="note warn"><strong>Weniger Aufgaben als gewünscht:</strong> damit Multiple Choice ' +
            "höchstens die Hälfte des Bogens ausmacht, werden MC-Fragen nicht nachgefüllt. Wähle mehr Themen für einen vollen Bogen.</div>";
        }
      } else {
        hint = take + " von " + n + " verfügbaren Aufgaben";
      }
    }

    const ids = pool.slice(0, take).map(function (q) { return q.id; });
    const mins = Math.round(E.budget(ids) / 60000);

    return "<fieldset><legend>Umfang</legend>" +
      '<div class="seg" id="countSeg">' +
        [5, 10, 20, 40, 0].map(function (v) {
          return '<button type="button" data-n="' + v + '"' + (set.count === v ? ' class="on"' : "") + ">" +
            (v === 0 ? "alle" : v) + "</button>";
        }).join("") +
      "</div>" +
      '<p class="small muted" style="margin-top:8px">' + U.esc(hint) + "</p>" +
      warn +
      "</fieldset>" +

      "<fieldset><legend>Prüfungsmodus</legend>" +
        '<label class="toggle"><input type="checkbox" id="optPeek"' + (set.peek ? " checked" : "") + ">" +
          "<span><b>Lösungen während der Prüfung erlauben</b>" +
          '<span class="small muted">Sonst erst nach der Abgabe sichtbar.</span></span></label>' +
        '<label class="toggle"><input type="checkbox" id="optTimer"' + (set.timer ? " checked" : "") + ">" +
          "<span><b>Zeitlimit</b>" +
          '<span class="small muted">' + (set.timer ? "Für diesen Bogen: " + mins + " Minuten. " : "") +
          "2 Minuten je offener Teilfrage, 1 Minute je MC-Frage. Danach wird automatisch abgegeben.</span></span></label>" +
        '<label class="toggle"><input type="checkbox" id="optShuffle"' + (set.shuffle ? " checked" : "") + ">" +
          "<span><b>Fragen mischen</b>" +
          '<span class="small muted">Antwortoptionen werden immer gemischt.</span></span></label>' +
      "</fieldset>" +

      '<button class="btn primary" id="btnStart" style="width:100%; padding:12px; justify-content:center"' +
      (pool.length ? "" : " disabled") + ">Prüfung starten</button>" +

      '<div class="note"><strong>Punkte nach §15 APVO-RettSan:</strong> offene Frage 2 Punkte ' +
      "(teilweise richtig 0,5 / 1,0 / 1,5), Multiple Choice 1 Punkt – nur bei genau einer markierten, " +
      "richtigen Antwort. Bestanden ab 50 %.</div>";
  }

  function learnPanel(counts) {
    const total = counts.due + counts.neu;
    return "<fieldset><legend>Heute zu tun</legend>" +
      '<div class="statgrid" style="margin-bottom:10px">' +
        '<div class="paper stat"><div class="k">Wiederholen</div><div class="v">' + counts.due + "</div>" +
          '<div class="s">fällig</div></div>' +
        '<div class="paper stat"><div class="k">Neu</div><div class="v">' + counts.neu + "</div>" +
          '<div class="s">noch nie bearbeitet</div></div>' +
      "</div>" +
      '<p class="small muted">Im Lernmodus bekommst du eine Frage nach der anderen. Du beantwortest sie im Kopf ' +
      "oder auf Papier, deckst die Musterlösung auf und sagst selbst, wie gut es lief. Danach plant die App, " +
      "wann die Frage wiederkommt.</p>" +
      "</fieldset>" +
      '<button class="btn primary" id="btnStart" style="width:100%; padding:12px; justify-content:center">' +
      (total ? "Lernen starten" : "Trotzdem wiederholen") + "</button>" +
      '<div class="note">Der Lernmodus nutzt gestaffelte Wiederholung: richtig beantwortete Fragen kommen ' +
      "in immer größeren Abständen wieder, Wackelkandidaten bleiben im kurzen Takt.</div>";
  }
})();
