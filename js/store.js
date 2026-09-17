/* Zustand, Speicherung und Wiederholungsplanung (SRS).

   Alles liegt im localStorage unter einem Schlüssel. Gespeichert werden:
     settings – Auswahl im Startbildschirm, Thema (hell/dunkel)
     session  – die laufende bzw. zuletzt abgegebene Prüfung
     stats    – pro Frage-ID: Lernstand und nächster Wiederholungstermin
     history  – abgeschlossene Prüfungen für die Statistik                    */
(function () {
  "use strict";

  const KEY = "rettsan-trainer-v3";
  const LEGACY = "rettsan-trainer-v2";
  const DAY = 86400000;

  const S = {};
  RS.store = S;

  /* ---------- Grundzustand ---------- */
  function fresh() {
    return {
      v: 3,
      settings: {
        mode: "lernen",
        topics: RS.TOPICS.slice(),
        count: 10,
        peek: false,
        timer: false,
        shuffle: true,
        mcShare: 50,
        theme: "system",
        newPerSession: 10,
      },
      session: null,
      stats: {},
      history: [],
    };
  }

  let state = fresh();
  S.state = state;

  /* ---------- Laden und Speichern ---------- */
  function load() {
    let raw = null;
    try { raw = localStorage.getItem(KEY); } catch (e) { return; }
    if (!raw) { migrateLegacy(); return; }
    try {
      const p = JSON.parse(raw);
      if (!p || typeof p !== "object") return;
      state = Object.assign(fresh(), p);
      state.settings = Object.assign(fresh().settings, p.settings || {});
      state.stats = p.stats || {};
      state.history = Array.isArray(p.history) ? p.history : [];
      /* Themen, die es nicht mehr gibt, aussortieren. */
      state.settings.topics = state.settings.topics.filter(function (t) {
        return RS.TOPICS.indexOf(t) >= 0;
      });
      if (!state.settings.topics.length) state.settings.topics = RS.TOPICS.slice();
      /* Fragen, die aus dem Katalog verschwunden sind, aus der Session werfen. */
      if (state.session && Array.isArray(state.session.order)) {
        state.session.order = state.session.order.filter(function (id) { return !!RS.BY_ID[id]; });
        if (!state.session.order.length) state.session = null;
      }
      S.state = state;
    } catch (e) { /* defekter Eintrag: wir starten frisch */ }
  }

  /* Fortschritt aus der alten Einzeldatei-Version retten, soweit möglich.
     Dort waren die IDs Array-Positionen, die heute nichts mehr bedeuten –
     übernommen wird daher nur, was ohne IDs sinnvoll ist. */
  function migrateLegacy() {
    let old = null;
    try { old = JSON.parse(localStorage.getItem(LEGACY) || "null"); } catch (e) { return; }
    if (!old) return;
    if (typeof old.peek === "boolean") state.settings.peek = old.peek;
    if (typeof old.timer === "boolean") state.settings.timer = old.timer;
    if (typeof old.shuffle === "boolean") state.settings.shuffle = old.shuffle;
    if (typeof old.count === "number") state.settings.count = old.count;
    if (Array.isArray(old.topics)) {
      const keep = old.topics.filter(function (t) { return RS.TOPICS.indexOf(t) >= 0; });
      if (keep.length) state.settings.topics = keep;
    }
    save();
  }

  let saveTimer = null;
  function save() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      try {
        localStorage.setItem(KEY, JSON.stringify(state));
        S.onSaved && S.onSaved(true);
      } catch (e) {
        S.onSaved && S.onSaved(false);
      }
    }, 150);
  }
  function saveNow() {
    clearTimeout(saveTimer);
    try { localStorage.setItem(KEY, JSON.stringify(state)); S.onSaved && S.onSaved(true); }
    catch (e) { S.onSaved && S.onSaved(false); }
  }

  S.load = load;
  S.save = save;
  S.saveNow = saveNow;
  S.reset = function () {
    try { localStorage.removeItem(KEY); localStorage.removeItem(LEGACY); } catch (e) {}
    state = fresh();
    S.state = state;
  };

  /* ---------- Lernstand pro Frage ----------
     ease     – Leichtigkeitsfaktor (SM-2), Startwert 2,5
     interval – aktueller Abstand in Tagen
     due      – Zeitpunkt der nächsten Wiederholung (ms)
     score    – letzte erreichte Quote 0..1
     seen     – wie oft bereits bearbeitet                                   */
  function blank() {
    return { seen: 0, ease: 2.5, interval: 0, due: 0, score: null, lastAt: 0, streak: 0 };
  }
  S.stat = function (id) {
    if (!state.stats[id]) state.stats[id] = blank();
    return state.stats[id];
  };
  S.peekStat = function (id) { return state.stats[id] || null; };

  /* quality: 0 = nochmal, 1 = schwer, 2 = gut, 3 = leicht */
  S.schedule = function (id, quality) {
    const st = S.stat(id);
    const now = Date.now();
    st.seen++;
    st.lastAt = now;
    st.score = [0, 0.4, 0.8, 1][quality];

    if (quality === 0) {
      st.streak = 0;
      st.ease = Math.max(1.3, st.ease - 0.2);
      st.interval = 0;
      st.due = now;                       /* in derselben Runde nochmal */
    } else {
      st.streak++;
      if (quality === 1) st.ease = Math.max(1.3, st.ease - 0.15);
      if (quality === 3) st.ease = Math.min(3.0, st.ease + 0.1);
      let iv;
      if (st.interval === 0) iv = [0, 1, 2, 4][quality];
      else if (quality === 1) iv = Math.max(1, st.interval * 1.2);
      else if (quality === 2) iv = st.interval * st.ease;
      else iv = st.interval * st.ease * 1.3;
      st.interval = Math.min(365, Math.round(iv * 10) / 10);
      st.due = now + st.interval * DAY;
    }
    save();
    return st;
  };

  /* Punktzahl einer offenen Frage in eine SRS-Qualität übersetzen. */
  S.qualityFromScore = function (ratio) {
    if (ratio <= 0.01) return 0;
    if (ratio < 0.6) return 1;
    if (ratio < 1) return 2;
    return 3;
  };

  S.isDue = function (id, now) {
    const st = state.stats[id];
    if (!st || !st.seen) return false;
    return st.due <= (now || Date.now());
  };
  S.isNew = function (id) {
    const st = state.stats[id];
    return !st || !st.seen;
  };

  S.dueCount = function (topics) {
    const now = Date.now();
    let due = 0, fresh_ = 0;
    RS.QUESTIONS.forEach(function (q) {
      if (topics && topics.indexOf(q.t) < 0) return;
      if (S.isNew(q.id)) fresh_++;
      else if (S.isDue(q.id, now)) due++;
    });
    return { due: due, neu: fresh_ };
  };

  /* ---------- Verlauf ---------- */
  S.pushHistory = function (entry) {
    state.history.push(entry);
    if (state.history.length > 200) state.history = state.history.slice(-200);
    saveNow();
  };

  /* ---------- Export / Import ---------- */
  S.exportJSON = function () {
    return JSON.stringify({ app: "rettsan-pruefungstrainer", v: 3, exportedAt: new Date().toISOString(),
                            settings: state.settings, stats: state.stats, history: state.history }, null, 2);
  };
  S.importJSON = function (text) {
    const p = JSON.parse(text);
    if (!p || p.app !== "rettsan-pruefungstrainer") throw new Error("Das ist keine Sicherung dieser App.");
    if (p.stats && typeof p.stats === "object") state.stats = p.stats;
    if (Array.isArray(p.history)) state.history = p.history;
    if (p.settings && typeof p.settings === "object") {
      state.settings = Object.assign(state.settings, p.settings);
      state.settings.topics = (state.settings.topics || []).filter(function (t) { return RS.TOPICS.indexOf(t) >= 0; });
      if (!state.settings.topics.length) state.settings.topics = RS.TOPICS.slice();
    }
    saveNow();
  };
})();
