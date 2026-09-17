#!/usr/bin/env node
/* Prüft den Fragenkatalog auf typische Fehler.
   Aufruf:  node tools/validate.js      (Exit-Code 1 bei Fehlern) */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
global.window = global;
for (const f of ["docs.js", "open.js", "cases.js", "mc.js"]) {
  const file = path.join(root, "js/data", f);
  try { (0, eval)(fs.readFileSync(file, "utf8")); }
  catch (e) { console.error(`✗ ${f}: Syntaxfehler – ${e.message}`); process.exit(1); }
}

const errors = [];
const warnings = [];
const err = (m) => errors.push(m);
const warn = (m) => warnings.push(m);

const docKeys = Object.keys(RS.DOCS);
for (const [k, d] of Object.entries(RS.DOCS)) {
  if (!fs.existsSync(path.join(root, d.path))) warn(`DOCS.${k}: Datei fehlt – ${d.path}`);
}

function checkRef(r, where) {
  if (!r) return err(`${where}: Quellenverweis fehlt`);
  if (!docKeys.includes(r.d)) err(`${where}: unbekanntes Dokument-Kürzel "${r.d}"`);
  if (!r.s) err(`${where}: Abschnitt (s) fehlt`);
  if (!/\d/.test(r.p || "")) err(`${where}: Seitenangabe (p) ohne Zahl – "${r.p}"`);
}

const seen = new Map();
function checkUnique(text, where) {
  const key = text.trim().toLowerCase().replace(/\s+/g, " ");
  if (seen.has(key)) err(`${where}: doppelte Frage (auch in ${seen.get(key)})`);
  else seen.set(key, where);
}

RS.OPEN.forEach((q, i) => {
  const where = `OPEN[${i}]`;
  if (!q.t) err(`${where}: Thema fehlt`);
  if (!q.q) err(`${where}: Fragetext fehlt`);
  else checkUnique(q.q, where);
  if (!Array.isArray(q.a) || !q.a.length) err(`${where}: Musterlösung fehlt`);
  else if (q.a.some((x) => typeof x !== "string" || !x.trim())) err(`${where}: leerer Stichpunkt`);
  checkRef(q.r, where);
});

RS.CASES.forEach((q, i) => {
  const where = `CASES[${i}]`;
  if (!q.c) err(`${where}: Szenariotext (c) fehlt`);
  else checkUnique(q.c, where);
  if (!Array.isArray(q.parts) || !q.parts.length) return err(`${where}: keine Teilfragen`);
  q.parts.forEach((p, k) => {
    const w = `${where}.parts[${k}]`;
    if (!p.q) err(`${w}: Fragetext fehlt`);
    if (!Array.isArray(p.a) || !p.a.length) err(`${w}: Musterlösung fehlt`);
    checkRef(p.r, w);
  });
});

RS.MC.forEach((q, i) => {
  const where = `MC[${i}]`;
  if (!q.t) err(`${where}: Thema fehlt`);
  if (!q.q) err(`${where}: Fragetext fehlt`);
  else checkUnique(q.q, where);
  if (!Array.isArray(q.o) || q.o.length < 2) return err(`${where}: mindestens 2 Optionen nötig`);
  if (q.o.length !== 4) warn(`${where}: ${q.o.length} Optionen (üblich sind 4)`);
  if (new Set(q.o.map((s) => s.trim().toLowerCase())).size !== q.o.length) err(`${where}: doppelte Antwortoption`);
  if (!Number.isInteger(q.c) || q.c < 0 || q.c >= q.o.length) err(`${where}: c=${q.c} liegt außerhalb der Optionen`);
  if (!q.e) warn(`${where}: keine Erklärung (e)`);
  checkRef(q.r, where);
});

// Verteilung der richtigen Antwort über die Positionen – nur Info,
// die App mischt die Optionen ohnehin bei jedem Start neu.
const dist = [0, 0, 0, 0];
RS.MC.forEach((q) => { if (dist[q.c] !== undefined) dist[q.c]++; });

const topics = [...new Set([...RS.OPEN, ...RS.CASES, ...RS.MC].map((q) => q.t))];
const count = (t) => ({
  open: RS.OPEN.filter((q) => q.t === t).length,
  cases: RS.CASES.filter((q) => q.t === t).length,
  mc: RS.MC.filter((q) => q.t === t).length,
});

console.log("Fragenkatalog\n" + "─".repeat(58));
for (const t of topics) {
  const c = count(t);
  console.log(`  ${t.padEnd(30)} offen ${String(c.open).padStart(3)}   MC ${String(c.mc).padStart(3)}   Fälle ${String(c.cases).padStart(2)}`);
}
const caseParts = RS.CASES.reduce((s, c) => s + c.parts.length, 0);
console.log("─".repeat(58));
console.log(`  Summe: ${RS.OPEN.length} offene Fragen, ${RS.MC.length} MC-Fragen, ${RS.CASES.length} Fallbeispiele mit ${caseParts} Teilfragen`);
console.log(`  Punkte gesamt: ${RS.OPEN.length * 2 + caseParts * 2 + RS.MC.length}`);
console.log(`  Position der richtigen MC-Antwort (vor dem Mischen): ${dist.join(" / ")}`);

if (warnings.length) { console.log("\nHinweise:"); warnings.forEach((w) => console.log("  ! " + w)); }
if (errors.length) { console.log("\nFehler:"); errors.forEach((e) => console.log("  ✗ " + e)); process.exit(1); }
console.log("\n✓ Katalog in Ordnung.");
