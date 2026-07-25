# StockIQ - CLAUDE.md

**Stand:** 23.07.2026 | Sprint 113

> **REGEL FUER DIESE DATEI:** Sie enthaelt **Befehle, Pfade und
> Reihenfolgen** -- keine Zahlen, die ein Ergebnis beschreiben.
> Keine Schwellenwerte, keine Performance-Kennzahlen, keine
> Ticker-Counts, keine Testfall-Sollzahlen, keine Score-Konstanten.
> Zwei Gruende: (1) Diese Datei ist ADR-002-oeffentlich im GitHub-Repo.
> (2) Jede Ergebniszahl veraltet still und wird dann zur Falschmeldung --
> genau das ist der Vorgaengerversion passiert (Stand Sprint 53,
> ~60 Sprints Rueckstand, falsche Testfall-Sollwerte und Pfade).
> Sollwerte gibt der Testlauf selbst aus. Die Doku wiederholt sie nicht.

---

## ABSOLUTER PROJEKTPFAD

```
C:\Users\klasc\Stockiq\
```

---

## VERZEICHNISSTRUKTUR

| Verzeichnis | Inhalt | Ccode-relevant |
|---|---|---|
| Root/ | index.html, *.json, *.md | Hauptarbeitsort |
| debugs/ | PFLICHT-Output fuer alle Ccode-Briefe | immer hierhin schreiben |
| scripts/ | Python-Scripts (ablegen + ausfuehren) | Ccode-Scripts |
| tests/ | stockiq_test.js, test_score.py, stockiq_filter_test_ui.js | alle Tests |
| utils/ | Hilfsscripts | selten |
| Doku_aktuell/aktuell_sprint/ | SKILL, Uebergabe, Architekturmap, Hypothesenbaum | Doku (SSOT) |
| Archiv/ | aeltere Versionen | Backups |
| Archiv/sprints/ | Sprint-Artefakte + Ccode-Analysen | **Plural, nicht "sprint"** |
| experiments/ | einmalige Analyse-Scripts | Nicht-Produktiv |
| Berichte/ | exportierte Berichte | Output |
| logs/ | Laufzeit-Logs | Laufzeit |
| dev/ | stockiq_dev.html | Nicht-Produktiv |

---

## PRODUKTIONS-STACK

| Datei | Ort | Zweck | Im Repo |
|---|---|---|---|
| `index.html` | Root | Dashboard (single-file, ES5) | JA |
| `stockiq_score.py` | Root | Score-Berechnung | NEIN (IP) |
| `fund_juno_v7_9_*.py` | Root | Fundamentaldaten + Makro | NEIN (IP) |
| `stockiq_alpha_juno_*.py` | scripts/ | Walk-Forward | NEIN (IP) |
| `run_daily.bat` | Root | Tages-Automatisierung | NEIN |
| `stockiq_scores.json` | Root | Scores + Signale | JA |
| `stockiq_ticker_names.json` | Root | Klarnamen | JA |
| `stockiq_ui_berichte.js` | Root | Bericht-Modul | JA |
| `stockiq_datenquellen_registry.json` | Root | SSOT Datenquellen (Laufzeit-Read durch `data_preflight.py`) | s. ADR-REG |
| `README.md` / `.gitignore` / `CLAUDE.md` | Root | Repo-Basis | JA |

**Versionsstaende NICHT hier nachschlagen** -- immer aus
`Doku_aktuell\aktuell_sprint\` (SKILL + Uebergabe) lesen.
Exakte Dateinamen wechseln mit der Version; Muster oben verwenden.

**Schutzziel A:** `stockiq_score.py`, `fund_juno*.py`, `*alpha_juno*.py`,
alle `*.py` -- in `.gitignore`, NIE committen.

---

## TESTING-GATE (Pflicht vor jedem Commit)

```powershell
cd C:\Users\klasc\Stockiq

# 1. Unit-Tests (kein localhost noetig)
node tests\stockiq_test.js index.html

# 2. Puppeteer UI-Tests (localhost:8080 noetig)
node tests\stockiq_filter_test_ui.js

# 3. Python Gates
pytest tests\test_score.py
```

Alle drei muessen gruen sein. **Kein Deploy bei rotem Test.**
Sollwerte gibt der jeweilige Lauf selbst aus -- hier bewusst nicht
dupliziert.

---

## GIT-WORKFLOW

```powershell
cd C:\Users\klasc\Stockiq
git ls-files          # VORHER: nur ADR-002-Whitelist darf getrackt sein
git add <dateien>
git commit -m "typ: Beschreibung (vX.Y.Z)"
git push origin main
git tag vX.Y.Z
git push origin vX.Y.Z
```

**Invariante:** `PAGE_VERSION` (index.html) == `dashboard_version`
(scores.json) == git-tag.

**Versions-Bump-Kopplung** -- gemeinsam ziehen:
`VERSION.txt` + `PAGE_VERSION` + `scores.json dashboard_version` +
git-tag + **alle sichtbaren UI-Versions-Strings**.

Beim Bump unterscheiden:
- UI-sichtbare Versions-Strings -> bumpen
- Aenderungshistorie-Kommentare (`/* vX.Y.Z: Feature ... */`) und
  Changelog-Zeilen -> **NICHT** bumpen (verfaelscht die Historie)

---

## ENGINEERING-REGELN

### JavaScript (ES5 PFLICHT -- iOS Safari + GitHub Pages)

```
VERBOTEN:  => (Arrow)  const  let  async  await
           ?.  (optional chaining)  **  Template-Literals
           nicht-ASCII in <script>-Bloecken (\uXXXX verwenden)
ERLAUBT:   var  function  ||  &&  normale Strings
Externe Module (.js): charset="utf-8" auf <script src>-Tag
```

Nach Edits: auf dekodierte Escapes pruefen (`grep -P` auf Non-ASCII
in Script-Bloecken).

### HTML-Edits

```
IMMER:    str.replace() mit einmaligem Funktions-Signatur-Anker
NIEMALS:  Positional-Slicing (html[:pos])
NIEMALS:  Kommentar-Strings als Anker
PFLICHT:  expect=N-Assert je Ersetzungsregel.
          Bei count != N: ABBRUCH ohne Schreiben, melden.
          Eine Regel ohne expect laeuft still mit 0 durch
          und meldet trotzdem Erfolg.
```

### ARCHIV-VOR-REFRESH

Vor jedem Edit an einer versionierten Datei: Kopie nach `Archiv\`
mit Versions- und Sprint-Kennzeichnung
(Muster: `Archiv\index_<alte-version>_pre_<sprintkey>.html`).
Ohne Vorher-Stand ist kein Baseline-Vergleich moeglich -- und ohne
Baseline laesst sich nicht unterscheiden, ob ein Befund neu ist
oder praeexistent.

### Python

```python
# Daten: IMMER tk.history(), NIE yf.download()
# Alle yfinance-Werte: sanitize() (NaN/Inf -> None)
# Dateien: encoding="utf-8" bei allen open()
# Kein nicht-ASCII in print() (Windows cp1252)
# Vor Ausfuehren: python -m py_compile <datei>
# FRED-Abruf: curl.exe -- NICHT requests/urllib (haengt auf Windows, TLS)
```

**AP-3:** Fehlende Werte als `None` durchreichen, **nie** `or 0`.
0 kann ein valider Signalwert sein.

### PowerShell

```
Nur fuer node-Tests und git.
Kein && chaining (PS5) -- Semikolon oder separate Zeilen.
Mehrzeiler via @'...'@ | Out-File
Select-String auf grossen JSONs kann haengen.
```

### Ccode-Brief-Pflichten

```
- Ausfuehrungsort explizit: Ccode / PS / Browser-Console
- Auftrag als DATEI erzeugen; der Brief verweist nur darauf
  (Brief-Grenze ~965 Byte). Auftragsinhalt NICHT zusaetzlich
  im Chat ausschreiben -- zwei Quellen driften.
- Diagnose-Output IMMER nach debugs\ -- nie als Screenshot
- Interpretierende ANALYSE zusaetzlich als Datei nach
  Archiv\sprints\ccode_analyse_<key>.md
  KANAL-PFLICHT: Das braucht einen EIGENEN Schreibauftrag im Brief.
  Ohne Auftrag antwortet Ccode im Chat -- kein Ccode-Fehler,
  sondern ein fehlender Kanal.
  PFADPFLICHT: Zielordner ist Archiv\sprints\ (PLURAL).
- Scripts ablegen in scripts\, ausfuehren via
  python scripts\<datei>.py
- Pfade absolut oder relativ zu C:\Users\klasc\Stockiq\
```

### Diagnose vor Patch

```
Schritt-0 READ-ONLY vor jeder Aenderung.
Diagnose erfasst die GANZE KLASSE des Symptoms,
nicht die vermutete Einzelursache.
Suchmuster IMMER case-insensitiv (re.I) --
ein negatives Ergebnis ohne re.I ist KEIN Beleg fuer Abwesenheit.
Read-Only-Breite ist kostenlos, ein Roundtrip nicht.
```

---

## ARCHITEKTUR-INVARIANTEN

- `_scoresIdx` ist SSOT fuer alle Dashboard-Lesezugriffe
- `scores.json` Struktur: `{__macro__: {...}, scores: [LIST]}`
- Archiv-Struktur: `{n_snapshots, snapshots: []}` newest-first
- Rename-Fallen in scores.json: `price`->`p`, `macd_hist`->`hist`,
  `ticker`->`t`
- ALIAS-Bloecke: BEIDE synchron halten (`var ALIAS` + `applyFund`)
- Pflicht-Aliase: ITX->INDITEX, AI->AIRLIQ, SAN->SANOFI, SAND->SANDVIK
- Panel-IDs: p1=Watchlist, p3=Fundamentals, p5=Allokation, p6=Hilfe,
  p7=Roadmap, p8=Depot, p9=Sektoren
- Neue UI-Module: `stockiq_ui_*.js` (nur Presentation-Layer)
- **ADR-002-Whitelist (7 Dateien, permanent):** `.gitignore`,
  `CLAUDE.md`, `README.md`, `index.html`, `stockiq_scores.json`,
  `stockiq_ticker_names.json`, `stockiq_ui_berichte.js`
- Stille Fehler (falsche JSON-Struktur -> kein Crash, leere Werte)
  sind gefaehrlicher als Crashes. Existenz eines Feldes pruefen
  reicht nicht -- Befuellung separat verifizieren.

---

## SPRINT-ABSCHLUSS-PFLICHT

```
0. SESSION-BACKLOG-SCAN (vor allem anderen):
   "Welche neuen Bugs/Features/Items wurden in dieser Session
    erwaehnt, die noch nicht in der Uebergabe stehen?"

1. python stockiq_doc_sync_check.py
   (Root, NICHT scripts\. Info-Tool ohne Exit-Code --
    Ausgabe lesen, nicht auf Exit-Status verlassen.)

2. Sync-Fehler beheben

3. Uebergabe + SKILL erzeugen (Doku_aktuell\aktuell_sprint\)
   Beide als VOLLSTAENDIGE Ersatzdateien, nie als Delta.

4. HARTES GATE: python scripts\s_skillcheck.py <pfad-zur-SKILL.md>
   Exit 0 = clean, Exit 1 = Abbruch.

5. HARTES GATE: python scripts\s_endcheck.py
   Exit 0 = Root sauber. Exit 2 = Sediment -> einsortieren
   (Sprint-Artefakt -> Archiv\sprints\sprint_NN\,
    einmalige Analyse -> experiments\,
    produktives Root-File -> KEEP_EXACT mit Begruendung).

6. Erst bei gruenen Gates: git tag + push

7. SKILL in claude.ai Settings > Skills reinstallieren  [MANUELL, Kla]

8. Project Knowledge: alte Uebergabe/SKILL entfernen,
   neue hinzufuegen                                     [MANUELL, Kla]
```

**Hinweis zu 4 und 5:** Diese Gates existieren unter `scripts\` und sind
via `.gitignore` bewusst NICHT im Repo (lokal-only). Sie muessen
manuell aufgerufen werden -- kein Automatismus ruft sie auf.

---

## SSOT-HIERARCHIE

Bei Widerspruch gilt diese Reihenfolge:

1. Aktuelle Uebergabe + SKILL in `Doku_aktuell\aktuell_sprint\`
2. Versionierte SSOT-Dokumente (Hypothesenbaum, Datenmodell,
   Architekturmap, Leitplanken)
3. Diese Datei (`CLAUDE.md`) -- Engineering-Konventionen
4. Aeltere Projektdateien = historischer Kontext

Die Architekturmap ist SSOT fuer Architektur: vor jeder Code-Aenderung
lesen, danach mit Version-Bump aktualisieren.

---

*StockIQ CLAUDE.md | Sprint 113 | Schutzziel A aktiv*
*Versionsstaende: siehe Doku_aktuell\aktuell_sprint\*
