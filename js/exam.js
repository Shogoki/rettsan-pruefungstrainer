/* Prüfungsbetrieb: Bogen zusammenstellen, bearbeiten, abgeben, auswerten. */
(function () {
  "use strict";

  const U = RS.ui, S = RS.store, $ = U.$;
  const E = {};
  RS.exam = E;

  /* Zeitbudget: die APVO gibt für die schriftliche Prüfung 120 Minuten vor.
     Für kürzere Übungsbögen wird anteilig gerechnet: 1 Minute je MC-Frage,
     2 Minuten je offener (Teil-)Frage. */
  const MS_MC = 60000, MS_OPEN = 120000, EXAM_MS = 120 * 60000;

  E.budget = function (ids) {
    let ms = 0;
    ids.forEach(function (id) {
      const q = RS.get(id);
      ms += q.kind === "mc" ? MS_MC : q.parts.length * MS_OPEN;
    });
    return ms;
  };

  /* ---------- Bogen zusammenstellen ---------- */

  /* Pool nach Modus und Themen. */
  E.pool = function (mode, topics) {
    return RS.QUESTIONS.filter(function (q) {
      if (topics.indexOf(q.t) < 0) return false;
      if (mode === "mc") return q.kind === "mc";
      if (mode === "offen") return q.kind !== "mc";
      return true; /* pruefung: alles */
    });
  };

  /* Reihenfolge so bauen, dass MC höchstens die Hälfte der Aufgaben stellt
     (§14 APVO-RettSan: "Höchstens 50 Prozent der Prüfungsfragen dürfen
     Multiple-Choice-Fragen sein"). */
  function buildPruefung(pool, count, shuffle) {
    const mc = pool.filter(function (q) { return q.kind === "mc"; });
    const rest = pool.filter(function (q) { return q.kind !== "mc"; });
    const mcList = shuffle ? U.shuffle(mc) : mc.slice();
    const restList = shuffle ? U.shuffle(rest) : rest.slice();

    const total = count > 0 ? Math.min(count, pool.length) : pool.length;
    let wantMC = Math.min(mcList.length, Math.floor(total / 2));
    let wantRest = Math.min(restList.length, total - wantMC);
    /* Fehlt es an offenen Fragen, darf MC den Rest NICHT auffüllen –
       sonst wären mehr als 50 % Multiple Choice. */
    const picked = mcList.slice(0, wantMC).concat(restList.slice(0, wantRest));
    return shuffle ? U.shuffle(picked) : picked;
  }

  E.start = function (opts) {
    const st = S.state;
    const mode = opts.mode;
    const topics = opts.topics || st.settings.topics;
    let list;

    if (opts.ids) {
      list = opts.ids.slice();
    } else {
      const pool = E.pool(mode, topics);
      if (mode === "pruefung") {
        list = buildPruefung(pool, opts.count, opts.shuffle);
      } else {
        list = opts.shuffle ? U.shuffle(pool) : pool.slice();
        if (opts.count > 0) list = list.slice(0, opts.count);
      }
      list = list.map(function (q) { return q.id; });
    }
    if (!list.length) { U.toast("Keine passenden Aufgaben gefunden."); return false; }

    /* Antwortoptionen je MC-Frage einmal pro Prüfung mischen, damit die
       Position der richtigen Antwort nicht auswendig gelernt wird. */
    const optOrder = {};
    list.forEach(function (id) {
      const q = RS.get(id);
      if (q.kind !== "mc") return;
      const idx = q.o.map(function (_, i) { return i; });
      optOrder[id] = opts.shuffle === false ? idx : U.shuffle(idx);
    });

    const useTimer = !!opts.timer;
    const ms = mode === "pruefung" && (!opts.count || opts.count === 0) ? EXAM_MS : E.budget(list);

    st.session = {
      mode: mode,
      order: list,
      optOrder: optOrder,
      answers: {},
      picks: {},
      ratings: {},
      peeked: {},
      cur: 0,
      startedAt: Date.now(),
      durationMs: useTimer ? ms : null,
      deadline: useTimer ? Date.now() + ms : null,
      peekAllowed: !!opts.peek,
      submitted: false,
      filter: "all",
      retry: !!opts.ids,
    };
    S.saveNow();
    return true;
  };

  /* ---------- Zugriff auf Antworten ---------- */
  function sess() { return S.state.session; }

  E.answer = function (id, k) {
    const a = sess().answers[id];
    return (a && a[k]) || "";
  };
  E.setAnswer = function (id, k, text) {
    const s = sess();
    if (!s.answers[id]) s.answers[id] = {};
    s.answers[id][k] = text;
    S.save();
  };
  E.pick = function (id) {
    const p = sess().picks[id];
    return p === undefined ? null : p;
  };
  E.setPick = function (id, optIndex) { sess().picks[id] = optIndex; S.save(); };

  E.isAnswered = function (id) {
    const q = RS.get(id);
    if (q.kind === "mc") return E.pick(id) !== null;
    return q.parts.some(function (_, k) { return E.answer(id, k).trim() !== ""; });
  };

  /* Richtige Antwort einer MC-Frage in der gemischten Reihenfolge. */
  E.correctPos = function (id) {
    const q = RS.get(id);
    const order = sess().optOrder[id] || q.o.map(function (_, i) { return i; });
    return order.indexOf(q.correct);
  };
  E.optionsFor = function (id) {
    const q = RS.get(id);
    const order = sess().optOrder[id] || q.o.map(function (_, i) { return i; });
    return order.map(function (i) { return q.o[i]; });
  };
  E.isCorrect = function (id) {
    const p = E.pick(id);
    return p !== null && p === E.correctPos(id);
  };

  /* ---------- Bewertung ---------- */
  E.rating = function (id, k) {
    const r = sess().ratings[id];
    return r ? r[k] : undefined;
  };
  E.setRating = function (id, k, v) {
    const s = sess();
    if (!s.ratings[id]) s.ratings[id] = {};
    s.ratings[id][k] = v;
    S.save();
  };

  /* Punkte einer Aufgabe. MC wird automatisch bewertet, offene Fragen
     per Selbstbewertung. */
  E.score = function (id) {
    const q = RS.get(id);
    if (q.kind === "mc") return E.isCorrect(id) ? 1 : 0;
    return q.parts.reduce(function (sum, _, k) {
      const r = E.rating(id, k);
      return sum + (r === undefined ? 0 : r);
    }, 0);
  };
  E.isRated = function (id) {
    const q = RS.get(id);
    if (q.kind === "mc") return true;
    return q.parts.every(function (_, k) { return E.rating(id, k) !== undefined; });
  };

  E.totals = function () {
    const s = sess();
    let pts = 0, max = 0, rated = 0;
    s.order.forEach(function (id) {
      const q = RS.get(id);
      max += q.pts;
      pts += E.score(id);
      if (E.isRated(id)) rated++;
    });
    const pct = max ? (pts / max) * 100 : 0;
    return { pts: pts, max: max, pct: pct, rated: rated, n: s.order.length, grade: U.grade(pct) };
  };

  E.byTopic = function () {
    const s = sess();
    const rows = [];
    RS.TOPICS.forEach(function (t) {
      const ids = s.order.filter(function (id) { return RS.get(id).t === t; });
      if (!ids.length) return;
      let pts = 0, max = 0;
      ids.forEach(function (id) { pts += E.score(id); max += RS.get(id).pts; });
      rows.push({ t: t, pts: pts, max: max, n: ids.length });
    });
    return rows;
  };

  /* ---------- Abgeben ---------- */
  E.submit = function () {
    const s = sess();
    s.submitted = true;
    s.deadline = null;
    /* MC-Fragen fließen sofort in die Wiederholungsplanung ein; offene
       Fragen erst, wenn sie in der Auswertung bewertet wurden. */
    s.order.forEach(function (id) {
      if (RS.get(id).kind !== "mc") return;
      S.schedule(id, E.isCorrect(id) ? 2 : 0);
    });
    S.saveNow();
  };

  /* Nach Abschluss der Selbstbewertung in Verlauf und Lernstand schreiben. */
  E.finish = function () {
    const s = sess();
    if (!s || s.finished) return;
    const tot = E.totals();
    s.order.forEach(function (id) {
      const q = RS.get(id);
      if (q.kind === "mc") return;               /* schon bei submit erfasst */
      if (!E.isRated(id)) return;
      S.schedule(id, S.qualityFromScore(E.score(id) / q.pts));
    });
    S.pushHistory({
      at: Date.now(),
      mode: s.mode,
      n: s.order.length,
      pts: tot.pts,
      max: tot.max,
      pct: Math.round(tot.pct * 10) / 10,
      grade: tot.grade.num,
      retry: !!s.retry,
    });
    s.finished = true;
    S.saveNow();
  };

  E.weakIds = function () {
    const s = sess();
    return s.order.filter(function (id) {
      const q = RS.get(id);
      return E.score(id) < q.pts;
    });
  };
})();
