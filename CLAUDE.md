# StockIQ — CLAUDE.md
Version: v6.4.15 | Stand: 28.06.2026 | Sprint 53 abgeschlossen

---

## ABSOLUTER PROJEKTPFAD

```
C:\Users\klasc\Stockiq\
```

---

## VERZEICHNISSTRUKTUR

| Verzeichnis | Inhalt | Ccode-relevant |
|---|---|---|
| Root/ | index.html, score.py, run_daily.bat, *.json, *.md | Hauptarbeitsort |
| debugs/ | debug_*.txt — PFLICHT-Output fuer alle Ccode-Briefe | immer schreiben hier |
| scripts/ | Python-Patch-Scripts (Ccode ablegen + ausfuehren hier) | Ccode-Scripts |
| tests/ | stockiq_test.js, test_score.py, Testplan-Docs | Unit + pytest |
| utils/ | stockiq_filter_test_ui.js (Puppeteer) | Puppeteer-Tests |
| Doku_aktuell/ | SKILL, Uebergabe, Architekturmap (HTML), Hypothesenbaum | Doku |
| Archiv/ | aeltere SKILL/Uebergabe-Versionen | Backups |
| Berichte/ | Exportierte Bericht-Dateien | Output |
| logs/ | run_daily_*.log | Laufzeit |
| experiments/ | Pilot-Scripts | Nicht-Produktiv |
| dev/ | stockiq_dev.html (Kategorie-B) | Nicht-Produktiv |

---

## PRODUKTIONS-STACK (aktuell)

| Datei | Version | Zweck | GitHub |
|---|---|---|---|
| index.html | v6.4.15 | Dashboard | JA |
| score.py | v1.4.19 | Score-Berechnung | NEIN (IP) |
| fund_juno_v7_9_29.py | v7.9.29 | Fundamentaldaten + Makro | NEIN (IP) |
| alpha_juno_v6b_6m.py | v6b_6m-u4 | Walk-Forward Produktion | NEIN (IP) |
| stockiq_scores.json | tagesaktuell | 296 Ticker, Scores + Signale | JA |
| stockiq_ticker_names.json | aktuell | Klarnamen | JA |
| stockiq_ui_berichte.js | v1.0.0 | Bericht-Modul (Presentation) | JA |
| README.md | aktuell | Repo-Beschreibung | JA |
| .gitignore | aktuell | Schutzziel A | JA |
| CLAUDE.md | v6.4.15 | Diese Datei | JA |

**Schutzziel A:** score.py, fund_juno*.py, alpha_juno*.py, hypotheses_status.json,
alle *.py Scripts — in .gitignore, NIE committen.

---

## TESTING-GATE (Pflicht vor jedem Commit)

```powershell
# Reihenfolge einhalten. Kein Deploy bei rotem Test.

# 1. Unit-Tests (kein localhost noetig)
node tests\stockiq_test.js index.html
# Erwartet: 35 OK | 0 Fehler | 12 Script-Bloecke (extern: stockiq_ui_berichte.js)

# 2. Puppeteer UI-Tests (localhost:8080 noetig)
node utils\stockiq_filter_test_ui.js
# Erwartet: 52 OK | 0 FAIL

# 3. Python Gates (nur nach score.py-Aenderung)
pytest tests\test_score.py
# Erwartet: 24 Gates OK
```

---

## GIT-WORKFLOW

```powershell
cd C:\Users\klasc\Stockiq
# Tests zuerst (s.o.)
git add <dateien>
git commit -m "typ: Beschreibung (vX.Y.Z)"
git push origin main
# Nach Sprint-Abschluss:
git tag vX.Y.Z
git push origin vX.Y.Z
```

**Invariante:** PAGE_VERSION in index.html == dashboard_version in scores.json == git-tag

---

## ENGINEERING-REGELN

### JavaScript (ES5 PFLICHT — iOS Safari + GitHub Pages)

```
VERBOTEN:  => (Arrow)  const  let  async  await
           ?.  (optional chaining)  **  Template-Literals
           nicht-ASCII in <script>-Bloecken (\uXXXX verwenden)
ERLAUBT:   var  function  ||  &&  normale Strings
Externe Module (.js): charset="utf-8" auf <script src>-Tag
```

### HTML-Edits

```
IMMER:    str.replace() mit einmaligem Funktions-Signatur-Anker
NIEMALS:  Positional-Slicing (html[:pos])
NIEMALS:  Kommentar-Strings als Anker
```

### Ccode-Brief-Pflichten

```
- Ausfuehrungsort explizit: Ccode / PS / Browser-Console
- Output IMMER nach debugs\debug_sNN_*.txt
- PS5: kein && chaining (Semikolon oder separate Zeilen)
- Scripts ablegen in scripts\, ausfuehren via python scripts\<datei>.py
- Pfade immer absolut oder relativ zu C:\Users\klasc\Stockiq\
```

### Python

```python
# Daten: IMMER tk.history(), NIE yf.download()
# Alle yfinance-Werte: sanitize() (NaN/Inf -> None)
# Dateien: encoding="utf-8" bei allen open()
# Kein nicht-ASCII in print() (Windows cp1252)
# Vor Ausfuehren: python -m py_compile <datei>
```

---

## ARCHITEKTUR-INVARIANTEN

- _scoresIdx ist SSOT fuer alle Dashboard-Lesezugriffe
- scores.json Struktur: `{__macro__: {...}, scores: [LIST]}`
- 49 Felder pro Ticker (inkl. sector, signal, fund_score, etc.)
- Archiv: `{n_snapshots, snapshots: []}` newest-first
- ALIAS-Bloecke: BEIDE synchron halten (var ALIAS Z.~3092 + applyFund Z.~3134)
- Pflicht-Aliase: ITX->INDITEX, AI->AIRLIQ, SAN->SANOFI, SAND->SANDVIK
- GitHub-Whitelist (ADR-002): index.html, stockiq_scores.json,
  stockiq_ticker_names.json, stockiq_ui_berichte.js, README.md,
  .gitignore, CLAUDE.md
- Neue UI-Module: stockiq_ui_*.js Pattern (nur Presentation-Layer)

---

## SPRINT-ABSCHLUSS-PFLICHT

```
0. SESSION-BACKLOG-SCAN (vor allem anderen):
   "Welche neuen Bugs/Features/Items wurden in dieser Session
    erwaehnt, die noch nicht in der Uebergabe stehen?"
1. python scripts\doc_sync_check.py
2. Sync-Fehler beheben
3. Uebergabe + SKILL erzeugen (Doku_aktuell\aktuell_sprint\)
4. SKILL in Claude Settings > Skills reinstallieren
5. Project Knowledge: alte Uebergabe/SKILL entfernen, neue hinzufuegen
```

---

## ZEITKRITISCHE ITEMS

| Datum | Item |
|---|---|
| **06.07.2026** | **WH-7 Re-Run N=339** |
| August 2026 | TR-8 / MF-1 IC-Test |
| Oktober 2026 | TR-7 IC-Test (Pattern-Set v1.1) |
| Dezember 2026 | WH-7 Volltest, TR-9, MF-3 |

---

*StockIQ CLAUDE.md | v6.4.15 | 28.06.2026*
*296 Ticker effektiv | OOS 59.5% / Stab 1.5pp | Schutzziel A aktiv*
