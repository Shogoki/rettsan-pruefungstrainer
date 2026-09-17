# RettSan Prüfungstrainer

Ein Trainer für die **schriftliche Abschlussprüfung Rettungssanitäter/in** – offene Fragen,
Fallbeispiele und Multiple Choice, alles mit Verweis auf die Stelle in den zugrunde liegenden
Lernzusammenfassungen. Läuft komplett im Browser, ohne Server und ohne Konto.

**→ [App öffnen](https://shogoki.github.io/rettsan-pruefungstrainer/)**

---

## Was drin ist

| | Anzahl | Punkte |
|---|---:|---:|
| Offene Fragen | 125 | je 2 |
| Fallbeispiele (49 Teilfragen) | 14 | je 2 pro Teilfrage |
| Multiple-Choice-Fragen | 108 | je 1 |
| **Gesamt** | **247 Aufgaben** | **456 Punkte** |

Themen: Respiratorische Notfälle · Herz-Kreislauf & Schock · Anatomie & Physiologie ·
Pharmakologie · Infektionen & Hygiene · Untersuchung & Einsatzablauf · Fallbeispiele.

## Die vier Modi

**Prüfungssimulation** – gemischter Bogen wie auf dem echten Prüfungsbogen. Multiple Choice
macht höchstens die Hälfte der Aufgaben aus; reicht der Vorrat an offenen Fragen nicht,
wird der Bogen lieber kürzer, als die MC-Quote zu überschreiten.

**Offene Fragen** – nur offene Fragen und Fallbeispiele. Frei formulieren, danach anhand der
Musterlösung selbst bewerten (0 / 0,5 / 1 / 1,5 / 2 Punkte).

**Multiple Choice** – nur Ankreuzfragen mit genau einer richtigen Antwort, automatisch
ausgewertet. Die Reihenfolge der Antwortoptionen wird bei jedem Start neu gemischt, damit
nicht die Position auswendig gelernt wird.

**Lernmodus** – Karte für Karte mit gestaffelter Wiederholung (SM-2). Du deckst die
Musterlösung auf und sagst selbst, wie gut es lief: *Nochmal · Schwer · Gut · Leicht*.
Was sitzt, kommt in immer größeren Abständen wieder; Wackelkandidaten bleiben im kurzen Takt.

Dazu **Nachschlagen** (Volltextsuche über alle Fragen und Lösungen) und **Statistik**
(Lernstand je Thema, Prüfungsverlauf, Sicherung als Datei).

## Punkte und Noten

Bewertung nach der **APVO-RettSan (Niedersachsen)**:

- Schriftliche Prüfung: 120 Minuten, höchstens 50 % Multiple-Choice-Fragen (§ 14)
- Multiple Choice: 1 Punkt – nur bei genau einer markierten, richtigen Antwort.
  Keine, eine falsche oder mehrere Antworten ergeben 0 Punkte (§ 15)
- Offene Frage: 2 Punkte; teilweise richtig 0,5 / 1,0 / 1,5 Punkte (§ 15)
- Notenschlüssel (§ 15):

  | Anteil | Note |
  |---|---|
  | 100–92 % | 1 – sehr gut |
  | < 92–81 % | 2 – gut |
  | < 81–67 % | 3 – befriedigend |
  | < 67–50 % | 4 – ausreichend |
  | < 50–30 % | 5 – mangelhaft |
  | < 30 % | 6 – ungenügend |

  Bestanden ist der Prüfungsteil bei einem Mittelwert von 4,4 oder besser – für die
  schriftliche Prüfung also ab 50 %.

> Quellen: [§ 14 APVO-RettSan](https://voris.wolterskluwer-online.de/browse/document/b004bdd8-2c9a-3a8f-b012-4d0f9752589c)
> und [§ 15 APVO-RettSan](https://voris.wolterskluwer-online.de/browse/document/8a4fc279-9104-3ac7-92c9-70f8169c75c1)
> im Niedersächsischen Vorschrifteninformationssystem.
> **Andere Bundesländer weichen ab** – Punkteschema und Bestehensgrenze bitte an der eigenen Schule prüfen.

## Quellen der Inhalte

Alle Fragen stammen aus drei eigenen Lernzusammenfassungen, die als PDF unter `data/` liegen:

| Kürzel | Datei | ursprünglicher Name | Inhalt |
|---|---|---|---|
| `N` | `data/notfaelle.pdf` | Notfälle.pdf | Respiratorische Notfälle, Schock, Herz-Kreislauf |
| `K` | `data/der-koerper.pdf` | RetSan Der Körper.pdf | Anatomie/Physiologie, Pharmakologie, Infektionen |
| `U` | `data/untersuchung.pdf` | RetSan Untersuchung.pdf | 4S, xABCDE, STU, SAMPLER, BEFAST |

Jede Musterlösung trägt einen Quellenverweis (Datei – Abschnitt – Seite). Der Verweis ist ein
Link und öffnet das PDF direkt auf der passenden Seite.

> Die Dateien wurden auf ASCII-Namen umbenannt, damit die Seitenlinks auf GitHub Pages in
> jedem Browser funktionieren. Umlaute und Leerzeichen in URLs sind dort erfahrungsgemäß
> eine Fehlerquelle.

### Eine bewusste Abweichung von der Vorlage

`RetSan Der Körper.pdf` nennt auf S. 13 als Indikation für **Noradrenalin** „schwere
Hypertonie, Schock“. Noradrenalin ist ein Katecholamin und *hebt* den Blutdruck – die
Indikation ist die Hypo­tonie. Der Fragenkatalog schreibt deshalb „schwere Hypotonie,
Schock“. Wenn im Unterricht die Formulierung der Zusammenfassung gilt, bitte dort ändern:
`js/data/open.js`, Frage „Noradrenalin: Nennen Sie Indikation …“.

Nicht übernommen wurden außerdem die Blutdruckgrenzen „Hypertonie > 100, Hypotonie < 100“
(S. 5) – die zugehörige Frage nennt nur den unstrittigen Normwert 120/80 mmHg.

## Benutzung

Online über den Link oben – oder lokal:

```sh
git clone https://github.com/Shogoki/rettsan-pruefungstrainer.git
cd rettsan-pruefungstrainer
python3 -m http.server 8000     # dann http://localhost:8000 öffnen
```

`index.html` funktioniert auch per Doppelklick (kein Build, keine Module). Über `file://`
entfällt lediglich der Offline-Modus, weil Browser dort keine Service Worker erlauben.

**Aufs Handy:** Seite im Browser öffnen → „Zum Startbildschirm hinzufügen“. Danach läuft
die App als eigene App und funktioniert offline. Die PDFs werden erst gespeichert, wenn du
sie einmal geöffnet hast.

Fortschritt liegt im `localStorage` dieses Browsers und wird nirgendwohin gesendet. Für den
Wechsel auf ein anderes Gerät: **Statistik → Fortschritt sichern** und dort wieder einlesen.

## Tastatur

| Taste | Wirkung |
|---|---|
| `←` `→` | in der Prüfung blättern |
| `1`–`9` | MC-Antwort wählen |
| `Leertaste` | im Lernmodus aufdecken |
| `1` `2` `3` `4` | im Lernmodus bewerten: nochmal · schwer · gut · leicht |

## Aufbau

Statische Seite ohne Build-Schritt. Alle Skripte sind klassische `<script>`-Dateien,
damit die App auch per Doppelklick läuft.

```
index.html               Grundgerüst, lädt Katalog und Anwendung
css/app.css              Design-Tokens (hell/dunkel), Layout, Prüfungsbogen-Optik
js/data/docs.js          Kürzel → PDF unter data/
js/data/open.js          offene Fragen
js/data/cases.js         Fallbeispiele
js/data/mc.js            Multiple-Choice-Fragen
js/catalog.js            führt die drei Kataloge zusammen, vergibt stabile IDs
js/store.js              Zustand, localStorage, Wiederholungsplanung (SM-2)
js/ui.js                 gemeinsame Bausteine, Notenschlüssel, Quellenlinks
js/exam.js               Bogen zusammenstellen, bewerten, abgeben
js/view-*.js             die sechs Ansichten
js/app.js                Router, Kopfzeile, Tastatur, Theme, Service Worker
sw.js                    Offline-Cache
tools/validate.js        prüft den Fragenkatalog
```

### Fragen ergänzen

Neue Frage ans passende Array in `js/data/` anhängen:

```js
// offene Frage – js/data/open.js
{t:"Respiratorische Notfälle",
 q:"Definieren Sie den Begriff Dyspnoe …",
 a:["Stichpunkt 1","Stichpunkt 2"],
 r:{d:"N", s:"Atemnot (Dyspnoe)", p:"S. 1"}}

// Multiple Choice – js/data/mc.js
{t:"Pharmakologie",
 q:"Welches Antidot wird bei einer Opioidvergiftung eingesetzt?",
 o:["Flumazenil","Naloxon","Atropin","Aktivkohle"],
 c:1,                                   // Index der richtigen Option
 e:"Naloxon ist der Opioid-Antagonist.",
 r:{d:"K", s:"Pharmakologie – Antidote", p:"S. 13"}}

// Fallbeispiel – js/data/cases.js
{t:"Fallbeispiele",
 c:"Szenariotext …",
 parts:[{q:"Teilfrage a)", a:["…"], r:{d:"N", s:"…", p:"S. 6"}}]}
```

Danach prüfen:

```sh
node tools/validate.js
```

Der Validator meldet fehlende Felder, unbekannte Dokument-Kürzel, doppelte Fragen und
MC-Fragen, deren richtige Antwort außerhalb der Optionen liegt, und zeigt die Verteilung
über die Themen.

Ein neues Thema entsteht automatisch, sobald eine Frage es als `t` verwendet.
Die Seitenzahl für den PDF-Link wird aus `p` gelesen (erste Zahl, also `"S. 6–7"` → Seite 6).

**Frage-IDs** werden aus dem Fragetext gebildet, nicht aus der Position im Array. Fragen
dürfen daher umsortiert, ergänzt und gelöscht werden, ohne den Lernstand der übrigen Fragen
zu verlieren. Wird der Fragetext selbst geändert, gilt die Frage als neu – das ist gewollt,
denn dann hat sich auch der Lernstoff geändert.

### Anpassen

| Was | Wo |
|---|---|
| Zeit je Frage | `MS_MC` / `MS_OPEN` in `js/exam.js` |
| Notenschlüssel | `GRADES` in `js/ui.js` |
| Punkteskala der Selbstbewertung | `SCALE` in `js/view-results.js` |
| Neue Karten pro Lernrunde | `newPerSession` in `js/store.js` |
| Farben | Tokens in `:root` in `css/app.css` |

Nach Änderungen an den Dateien `VERSION` in `sw.js` erhöhen, damit der Offline-Cache erneuert wird.

## Deployment

Die Seite wird über GitHub Actions aus dem `main`-Branch auf GitHub Pages veröffentlicht
(`.github/workflows/pages.yml`). Es gibt keinen Build-Schritt – das Repository wird
unverändert ausgeliefert.

## Hinweise

- Die Musterlösungen geben den Stand der Zusammenfassungen wieder. Sie ersetzen kein Lehrbuch
  und keine aktuelle Leitlinie; bei Abweichungen gilt der Unterricht.
- Seitenangaben beziehen sich auf die Seitenzählung der jeweiligen PDF-Datei.
- Es werden keine Daten an einen Server gesendet und keine Cookies gesetzt.

## Lizenz

Der Code steht unter der [MIT-Lizenz](LICENSE).

Die **Inhalte** – die PDFs unter `data/` sowie der daraus abgeleitete Fragenkatalog unter
`js/data/` – sind davon ausgenommen und nicht zur Weiterverwendung lizenziert.
