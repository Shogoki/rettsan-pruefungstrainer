/* Statistik: Lernstand je Thema, Verlauf, Sicherung. */
(function () {
  "use strict";
  const U = RS.ui, S = RS.store, $ = U.$;

  const V = {};
  RS.viewStats = V;

  /* Lernstand einer Frage in vier Stufen, an der SRS-Intervalllänge abgelesen. */
  function level(id) {
    const st = S.peekStat(id);
    if (!st || !st.seen) return -1;          /* noch nie bearbeitet */
    if (st.interval >= 21) return 3;         /* sitzt */
    if (st.interval >= 7) return 2;          /* stabil */
    if (st.interval >= 1) return 1;          /* im Aufbau */
    return 0;                                /* wackelig */
  }

  V.render = function () {
    const el = $("#viewStats");
    const st = S.state;
    const now = Date.now();

    const total = RS.QUESTIONS.length;
    const touched = RS.QUESTIONS.filter(function (q) { return level(q.id) >= 0; }).length;
    const solid = RS.QUESTIONS.filter(function (q) { return level(q.id) >= 2; }).length;
    const counts = S.dueCount(null);
    const hist = st.history.slice();
    const exams = hist.length;
    const best = hist.reduce(function (m, h) { return Math.max(m, h.pct); }, 0);
    const last = hist.length ? hist[hist.length - 1] : null;

    el.innerHTML =
      "<h1>Statistik</h1>" +
      '<div class="statgrid">' +
        stat("Bearbeitet", touched + " / " + total, Math.round((touched / total) * 100) + " % des Katalogs") +
        stat("Sitzt", solid + " / " + total, "Wiederholung in 7+ Tagen") +
        stat("Heute fällig", String(counts.due), counts.neu + " neue Fragen offen") +
        stat("Prüfungen", String(exams), last ? "zuletzt " + U.num(last.pct) + " % (Note " + last.grade + ")" : "noch keine") +
      "</div>" +

      '<div class="paper" style="padding:18px 20px; margin-bottom:16px">' +
        "<h2>Lernstand je Thema</h2>" +
        '<div class="mastery">' + RS.TOPICS.map(topicRow).join("") + "</div>" +
        '<div class="legend">' +
          '<span><i style="background:var(--green)"></i>sitzt (21+ Tage)</span>' +
          '<span><i style="background:var(--blue)"></i>stabil (7+ Tage)</span>' +
          '<span><i style="background:var(--amber)"></i>im Aufbau</span>' +
          '<span><i style="background:var(--red)"></i>wackelig</span>' +
          '<span><i style="background:var(--line)"></i>noch nicht geübt</span>' +
        "</div>" +
      "</div>" +

      '<div class="paper" style="padding:18px 20px; margin-bottom:16px">' +
        "<h2>Prüfungsverlauf</h2>" +
        (exams
          ? '<div class="bars" aria-hidden="true">' +
              hist.slice(-40).map(function (h) {
                return '<i class="' + (U.passed(h.pct) ? "" : "fail") + '" style="height:' +
                  Math.max(4, h.pct) + '%" title="' + U.num(h.pct) + ' %"></i>';
              }).join("") +
            "</div>" +
            '<p class="small muted">Bestes Ergebnis ' + U.num(best) + " %. Rote Balken liegen unter 50 %.</p>" +
            hist.slice(-12).reverse().map(function (h) {
              return '<div class="histrow"><span class="when">' + U.dateShort(h.at) + "</span>" +
                '<span class="what">' + U.esc(modeName(h.mode)) + " · " + h.n + " Aufgaben" +
                (h.retry ? " (Wiederholung)" : "") + "</span>" +
                '<span class="res" style="color:' + (U.passed(h.pct) ? "var(--green)" : "var(--red)") + '">' +
                U.num(h.pct) + " % · " + h.grade + "</span></div>";
            }).join("")
          : '<p class="muted">Noch keine abgeschlossene Prüfung. Sobald du einen Bogen abgibst und bewertest, ' +
            "erscheint er hier.</p>") +
      "</div>" +

      '<div class="paper" style="padding:18px 20px">' +
        "<h2>Daten</h2>" +
        '<p class="small muted">Dein Fortschritt liegt ausschließlich in diesem Browser. Für einen Wechsel ' +
        "auf ein anderes Gerät kannst du ihn als Datei sichern und dort wieder einlesen.</p>" +
        '<div class="btn-row" style="margin-top:10px">' +
          '<button class="btn" id="btnExport">Fortschritt sichern</button>' +
          '<button class="btn" id="btnImport">Sicherung einlesen</button>' +
          '<button class="btn ghost" id="btnResetStats">Lernstand zurücksetzen</button>' +
        "</div>" +
        '<input type="file" id="fileImport" accept="application/json,.json" hidden>' +
      "</div>";

    $("#btnExport").onclick = doExport;
    $("#btnImport").onclick = function () { $("#fileImport").click(); };
    $("#fileImport").onchange = doImport;
    $("#btnResetStats").onclick = function () {
      if (!confirm("Lernstand und Prüfungsverlauf löschen? Die Fragen bleiben erhalten.")) return;
      S.state.stats = {}; S.state.history = []; S.saveNow(); V.render();
      U.toast("Lernstand zurückgesetzt.");
    };
  };

  function stat(k, v, s) {
    return '<div class="paper stat"><div class="k">' + U.esc(k) + '</div><div class="v">' + U.esc(v) +
      '</div><div class="s">' + U.esc(s) + "</div></div>";
  }

  function modeName(m) {
    return { pruefung: "Prüfungssimulation", offen: "Offene Fragen", mc: "Multiple Choice" }[m] || m;
  }

  function topicRow(t) {
    const qs = RS.QUESTIONS.filter(function (q) { return q.t === t; });
    const buckets = [0, 0, 0, 0];
    let untouched = 0;
    qs.forEach(function (q) {
      const l = level(q.id);
      if (l < 0) untouched++; else buckets[l]++;
    });
    const n = qs.length;
    const seg = function (cls, cnt) {
      return cnt ? '<i class="' + cls + '" style="width:' + ((cnt / n) * 100).toFixed(1) + '%"></i>' : "";
    };
    return '<div class="mrow"><span>' + U.esc(t) + "</span>" +
      '<span class="track">' + seg("s3", buckets[3]) + seg("s2", buckets[2]) +
        seg("s1", buckets[1]) + seg("s0", buckets[0]) + "</span>" +
      '<span class="v">' + (n - untouched) + " / " + n + "</span></div>";
  }

  function doExport() {
    const blob = new Blob([S.exportJSON()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "rettsan-fortschritt-" + new Date().toISOString().slice(0, 10) + ".json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    U.toast("Sicherung heruntergeladen.");
  }

  function doImport(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function () {
      try {
        S.importJSON(String(reader.result));
        U.toast("Fortschritt eingelesen.");
        V.render();
      } catch (err) {
        alert("Die Datei konnte nicht gelesen werden: " + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }
})();
