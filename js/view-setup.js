/* Startbildschirm: Modus, Themen, Umfang, Optionen. */
(function () {
  "use strict";
  const U = RS.ui, S = RS.store, E = RS.exam, $ = U.$;

  const MODES = [
    { id: "pruefung", name: "Prüfungssimulation",
      desc: "Gemischter Bogen als Aufsichtsarbeit: Multiple Choice und offene Fragen, Anteil frei wählbar.",
      tag: "120 Min." },
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
      '<p class="muted">Vorbereitung auf den <strong>schriftlichen Teil der staatlichen ' +
      "Abschlussprüfung</strong> in Hessen – die Aufsichtsarbeit von 120 Minuten nach dem " +
      "Abschlusslehrgang. Offene Fragen frei beantworten und anhand der Musterlösung selbst " +
      "bewerten, Multiple Choice automatisch auswerten lassen, beides mit Quellenverweis in die " +
      "Zusammenfassungen. Alles läuft im Browser, nichts wird gesendet.</p>" +
      examOverview() +

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
      U.$$("#mcSeg button", el).forEach(function (b) {
        b.onclick = function () { set.mcShare = +b.dataset.s; S.save(); V.render(); };
      });
      $("#optPeek").onchange = function (e) { set.peek = e.target.checked; S.save(); };
      $("#optTimer").onchange = function (e) { set.timer = e.target.checked; S.save(); V.render(); };
      $("#optShuffle").onchange = function (e) { set.shuffle = e.target.checked; S.save(); };
      $("#btnStart").onclick = function () {
        const ok = E.start({ mode: set.mode, topics: set.topics, count: set.count,
                             peek: set.peek, timer: set.timer, shuffle: set.shuffle,
                             mcShare: set.mcShare });
        if (ok) RS.app.go("exam");
      };
    }
  };

  function examPanel(set) {
    const pool = E.pool(set.mode, set.topics);
    const n = pool.length;
    const take = set.count === 0 ? n : Math.min(set.count, n);

    let hint, warn = "", mcPicker = "";
    if (!n) {
      hint = "Wähle mindestens ein Thema mit passenden Aufgaben.";
    } else if (set.mode === "pruefung") {
      const p = E.preview(pool, set.count, set.mcShare);
      hint = p.mc + " MC-Fragen und " + p.offen + " offene Aufgaben (" + p.gesamt + " von " + n + ")";
      if (p.gesamt < take) {
        warn = '<div class="note warn"><strong>Weniger Aufgaben als gewünscht:</strong> ' +
          "im gewählten Themenzuschnitt gibt es nicht genug Aufgaben. Wähle mehr Themen oder einen kleineren Umfang.</div>";
      }
      mcPicker =
        "<fieldset><legend>Anteil Multiple Choice</legend>" +
        '<div class="seg" id="mcSeg">' +
          [0, 25, 50, 75, 100].map(function (v) {
            return '<button type="button" data-s="' + v + '"' + (set.mcShare === v ? ' class="on"' : "") + ">" + v + " %</button>";
          }).join("") +
        "</div>" +
        '<p class="small muted" style="margin-top:8px">Hessen schreibt keinen Höchstanteil vor – ' +
        "die Fragen bestimmt der Prüfungsausschuss auf Vorschlag der Schule (§ 7 Abs. 2 APORettSan).</p>" +
        "</fieldset>";
    } else {
      hint = take + " von " + n + " verfügbaren Aufgaben";
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
      mcPicker +

      "<fieldset><legend>Prüfungsmodus</legend>" +
        '<label class="toggle"><input type="checkbox" id="optPeek"' + (set.peek ? " checked" : "") + ">" +
          "<span><b>Lösungen während der Prüfung erlauben</b>" +
          '<span class="small muted">Sonst erst nach der Abgabe sichtbar.</span></span></label>' +
        '<label class="toggle"><input type="checkbox" id="optTimer"' + (set.timer ? " checked" : "") + ">" +
          "<span><b>Zeitlimit</b>" +
          '<span class="small muted">' + (set.timer ? "Für diesen Bogen: " + mins + " Minuten. " : "") +
          "Die Aufsichtsarbeit dauert in Hessen 120 Minuten; hier anteilig 2 Minuten je offener " +
          "Teilfrage und 1 Minute je MC-Frage. Danach wird automatisch abgegeben.</span></span></label>" +
        '<label class="toggle"><input type="checkbox" id="optShuffle"' + (set.shuffle ? " checked" : "") + ">" +
          "<span><b>Fragen mischen</b>" +
          '<span class="small muted">Antwortoptionen werden immer gemischt.</span></span></label>' +
      "</fieldset>" +

      '<button class="btn primary" id="btnStart" style="width:100%; padding:12px; justify-content:center"' +
      (pool.length ? "" : " disabled") + ">Prüfung starten</button>" +

      '<div class="note"><strong>Hessen (APORettSan):</strong> die schriftliche Prüfung ist eine ' +
      "Aufsichtsarbeit von 120 Minuten und ist bestanden, wenn sie mindestens mit „ausreichend“ " +
      "benotet wird (§ 7 Abs. 2). Ein Punkteschema und einen Prozentschlüssel gibt die Verordnung " +
      "nicht vor – die Punkte hier sind eine Übungshilfe.</div>";
  }

  /* Kompakter Überblick über die staatliche Abschlussprüfung.
     Alle Angaben aus der APORettSan (Hessen) vom 1. Oktober 2021. */
  function examOverview() {
    const weg = [
      ["Theoretisch-praktische Ausbildung", "240 Stunden an der Schule, abgeschlossen durch eine Erfolgskontrolle", false],
      ["Praktische Ausbildung in der Klinik", "80 Stunden im Krankenhaus oder einer geeigneten Einrichtung", false],
      ["Praktische Ausbildung im Rettungsdienst", "160 Stunden auf der Lehrrettungswache", false],
      ["Abschlusslehrgang", "40 Stunden – ohne ihn wird die Zulassung zur Prüfung widerrufen (§ 6 Abs. 3)", true],
      ["Staatliche Abschlussprüfung", "schriftlich und praktisch (§ 7)", true],
    ];

    return '<details class="paper exam-info">' +
      "<summary>Was in der staatlichen Abschlussprüfung auf dich zukommt" +
      '<span class="src">APORettSan Hessen</span></summary>' +
      '<div class="oe-body">' +

        "<h3>Der Weg dahin (§ 2 Abs. 1)</h3>" +
        '<ol class="weg">' +
          weg.map(function (w, i) {
            return '<li class="' + (w[2] ? "todo" : "") + '"><span class="no">' + (i + 1) + "</span>" +
              "<span>" + U.esc(w[0]) + '<span class="h">' + U.esc(w[1]) + "</span></span></li>";
          }).join("") +
        "</ol>" +
        '<p class="muted small">Die Abschnitte sind in dieser Reihenfolge zu absolvieren. ' +
        "Die Bescheinigungen über 1 bis 3 gehören zum Zulassungsantrag.</p>" +

        "<h3>Zulassung (§ 6)</h3>" +
        "<ul>" +
          "<li>Antrag über die Ausbildungsstätte, <b>spätestens vier Wochen</b> vor Prüfungsbeginn</li>" +
          "<li>Beizulegen: beglaubigte Kopie von Personalausweis oder Reisepass und die " +
            "Originalbescheinigungen über die Abschnitte 1 bis 3</li>" +
          "<li>Zulassung und Termin kommen <b>spätestens zwei Wochen</b> vorher schriftlich</li>" +
        "</ul>" +

        '<div class="oe-split">' +
          "<div>" +
            "<h3>Schriftlicher Teil (§ 7 Abs. 2)</h3>" +
            "<ul>" +
              "<li>Aufsichtsarbeit von <b>120 Minuten</b></li>" +
              "<li>Fragen vom Prüfungsausschuss auf Vorschlag der Schule – kein vorgeschriebenes " +
                "Format, kein Höchstanteil Multiple Choice</li>" +
              "<li>Bewertung durch zwei Fachprüfer</li>" +
              "<li>bestanden ab <b>„ausreichend“</b></li>" +
            "</ul>" +
            '<p class="small muted"><b>Diesen Teil übt die App.</b></p>' +
          "</div>" +
          "<div>" +
            "<h3>Praktischer Teil (§ 7 Abs. 3–5)</h3>" +
            "<ul>" +
              "<li><b>Zwei Fallbeispiele</b>, je 20 bis 40 Minuten</li>" +
              "<li>eines aus qualifiziertem Krankentransport oder notfallmedizinischer Versorgung – " +
                "dazu ein <b>Fachgespräch</b>: eigenes Handeln erläutern und die Prüfungssituation reflektieren</li>" +
              "<li>das zweite immer <b>Herzkreislaufstillstand mit Reanimation</b></li>" +
              "<li>jedes Fallbeispiel muss mindestens „ausreichend“ sein</li>" +
            "</ul>" +
            '<p class="small muted">Verlangt werden dabei: Einschätzung der Gesamtsituation, Umgang mit ' +
            "medizinisch-technischen Geräten, Sofortmaßnahmen, Dokumentation sowie Transportbereitschaft " +
            "und Übergabe.</p>" +
          "</div>" +
        "</div>" +

        "<h3>Noten und Bestehen (§§ 8, 9)</h3>" +
        "<ul>" +
          "<li>Die Noten sind nur mit Worten definiert – einen Prozentschlüssel gibt die Verordnung nicht vor</li>" +
          "<li>Bestanden ist die Abschlussprüfung, wenn <b>beide Teile</b> bestanden sind</li>" +
          "<li>Nicht bestandene Teile können auf Antrag <b>einmal</b> wiederholt werden, innerhalb eines " +
            "Jahres nach dem letzten Prüfungstag</li>" +
        "</ul>" +

        '<p class="small muted" style="margin-bottom:0">Die Fallbeispiele in dieser App sind ' +
        "schriftliche Aufgaben mit Teilfragen – sie ersetzen nicht das praktische Fallbeispiel " +
        "vor dem Prüfungsausschuss.</p>" +
      "</div></details>";
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
