/* Führt OPEN, CASES und MC zu einem einheitlichen Fragenkatalog zusammen.
   Jede Frage bekommt eine stabile ID aus ihrem Text – Fragen dürfen dadurch
   umsortiert, ergänzt oder gelöscht werden, ohne den Lernfortschritt der
   übrigen Fragen zu zerstören. Wird der Fragetext geändert, gilt die Frage
   als neu; das ist gewollt, weil sich dann auch der Lernstoff geändert hat. */
(function () {
  "use strict";

  /* FNV-1a, 32 Bit – kurz, schnell, für diesen Zweck kollisionsarm genug. */
  function hash(str) {
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
    }
    return h.toString(36);
  }

  const QUESTIONS = [];

  RS.OPEN.forEach(function (q) {
    QUESTIONS.push({
      id: "o" + hash(q.q),
      kind: "open",
      t: q.t,
      parts: [{ q: q.q, a: q.a, r: q.r }],
      pts: 2,
    });
  });

  RS.CASES.forEach(function (q) {
    QUESTIONS.push({
      id: "f" + hash(q.c),
      kind: "case",
      t: q.t,
      caseText: q.c,
      parts: q.parts.map(function (p) { return { q: p.q, a: p.a, r: p.r }; }),
      pts: q.parts.length * 2,
    });
  });

  RS.MC.forEach(function (q) {
    QUESTIONS.push({
      id: "m" + hash(q.q),
      kind: "mc",
      t: q.t,
      q: q.q,
      o: q.o,
      correct: q.c,
      e: q.e,
      r: q.r,
      parts: [{ q: q.q, r: q.r }],
      pts: 1,
    });
  });

  /* Doppelte IDs würden Fortschritt vermischen – lieber laut scheitern. */
  const ids = new Set();
  QUESTIONS.forEach(function (q) {
    if (ids.has(q.id)) console.error("Doppelte Frage-ID:", q.id, q.t, q.parts[0].q);
    ids.add(q.id);
  });

  RS.QUESTIONS = QUESTIONS;
  RS.BY_ID = {};
  QUESTIONS.forEach(function (q) { RS.BY_ID[q.id] = q; });

  /* Themenreihenfolge wie im Katalog, nicht alphabetisch. */
  RS.TOPICS = [];
  QUESTIONS.forEach(function (q) { if (RS.TOPICS.indexOf(q.t) < 0) RS.TOPICS.push(q.t); });

  RS.get = function (id) { return RS.BY_ID[id]; };
})();
