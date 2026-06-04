# StockIQ — CLAUDE.md
Version: v6.3.6 | Stand: 04. Juni 2026 | Sprint 15 laufend

---

## PROJEKT-UEBERSICHT

StockIQ ist ein privates, quantitatives Aktien-Scoring-System.
- **Dashboard**: klaschim11.github.io/Stockiq (`index.html`)
- **Repo lokal**: `C:\Users\klasc\Stockiq`
- **Ticker**: 299 | **Snapshots**: laufend
- **OOS AVG**: 60.1% | **Stabilitaet**: 2.8pp

---

## PRODUKTIONS-STACK

| Datei | Version | Zweck |
|-------|---------|-------|
| `index.html` | v6.3.6 | Dashboard (laedt scores.json + ticker_names.json) |
| `fund_juno_v7_9_29.py` | v7.9.32 | Fundamentaldaten + Makro + FRED breakeven (Windows, PRIVAT) |
| `stockiq_score.py` | v1.4.3 | Score-Berechnung -> scores.json (Windows, PRIVAT) |
| `stockiq_alpha_juno_v6b_6m.py` | v6b_6m-u4 | Walk-Forward PRODUKTION |
| `stockiq_wl3_signal_tracking_v1_6.py` | v1.6 | WL3 IC-Analyse (Windows) |
| `stockiq_test.js` | aktuell | QA: 26 Tests, 0 Fehler (13 Script-Bloecke) |
| `stockiq_ticker_names.json` | 2026-06-03 | 299 Klarnamen (yfinance longName, public) |
| `hypotheses_status.json` | 2026-06-04 | 32 Hypothesen (lokal, gitignored) |
| `hypotheses_update.py` | 2026-06-04 | SH-2/RH-4/TU-1 Auto-Update + --list (lokal, gitignored) |
| `stockiq_filter_test_ui.js` | 2026-06-02 | Puppeteer UI-Test WL-Filter (lokal, gitignored) |

**Schutzziel A**: `fund_juno*.py`, `stockiq_score.py`, `hypotheses_status.json`,
`hypotheses_update.py` sind in `.gitignore` — sie liegen NICHT im Repo.

---

## TAEGLICH-WORKFLOW

```powershell
# 1. Daten holen (Windows, ~20 Min)
python fund_juno_v7_9_29.py  ->  stockiq_fundamentals.json

# 2. Scores berechnen (Windows, ~5 Sek)
python stockiq_score.py  ->  stockiq_scores.json

# 3. Hypothesen aktualisieren (optional)
python hypotheses_update.py

# 4. Deployen
cd C:\Users\klasc\Stockiq
git add stockiq_scores.json
git commit -m "scores: update DATUM"
git push origin main
```

Oder 1-Click: `run_daily.bat` (erledigt Schritte 1-4 automatisch).

---

## ARCHITEKTUR (ab v6.3.6)

```
LOKAL (privat, nicht im Repo):
  fund_juno_v7_9_29.py      Datenabruf (299 Ticker, ~40 Felder)
  stockiq_score.py           Score-Portierung aus index.html (v1.4.3)
  stockiq_fundamentals.json  Rohdaten
  hypotheses_status.json     Hypothesenbaum (32 Hypothesen)
  hypotheses_update.py       Auto-Update SH-2/RH-4/TU-1 + --list

REPO (oeffentlich, GitHub Pages):
  index.html                 Dashboard-Shell + Render-Logik
  stockiq_scores.json        299 Ticker, tagesaktuelle Scores + Signale + sector
  stockiq_ticker_names.json  299 Klarnamen (yfinance longName)
  stockiq_snapshots.json     Snapshot-Archiv (ARCH_MAX=120)
  stockiq_test.js            QA (26 Tests)
  CLAUDE.md                  diese Datei
  .gitignore                 Schutzziel A
```

---

## SCORE-ARCHITEKTUR

```
W = {fund:0.35, mom:0.25, trend:0.20, risk:0.20}

cSc = fSc()*0.35 + momSc()*0.25 + s.trend*0.20 + rSc*0.20

fSc() = valSc*0.30 + max(FCF,OE)*0.30 + ROCE*0.20 + Debt*0.15 + consScore*0.05
  valSc = PEG*0.40 + EV_EBITDA*0.15 + EV_EBIT*0.45
  Piotroski B1: pioScore<2 -> Fund*0.85

momSc() = volAdjScore() * vixFactor
  VIX<20->*1.00 | 20-30->*0.60 | >30->*0.20

rSc = s.risk*0.60 + betaSc(beta)*0.40
```

---

## ENGINEERING-REGELN

### JavaScript (ES5 PFLICHT — iOS Safari + GitHub Pages)
```
VERBOTEN: ?. => const let async await ** Template-Literals
           \u{xxxx} nicht-ASCII in Script-Bloecken
ERLAUBT:  var function || && normale Strings
```

### HTML-Edits
```
IMMER: str.replace() mit eindeutiger Funktions-Signatur als Anker
NIEMALS: content[:position] oder Positional-Slicing
NIEMALS: /* */ Kommentare als Anker
```

### Node-Validierung (PFLICHT nach jeder Aenderung)
```powershell
node stockiq_test.js index.html
# Erwartet: 26 Tests / 0 Fehler (13 Script-Bloecke)
# 2 bekannte Warnungen: EV/EBIT + max(FCF,OE) veraltet (kein Fehler)
# Kein Deploy ohne gruenen Test!
```

### Python
```
tk.history() — NIE yf.download()
sanitize() auf ALLE yfinance-Werte (NaN/Inf -> None)
encoding="utf-8" bei ALLEN open()
kein nicht-ASCII in print() (Windows cp1252)
python -m py_compile <datei> vor Ausfuehren
```

### Git
```powershell
cd C:\Users\klasc\Stockiq
git pull origin main
node stockiq_test.js index.html   # MUSS gruen sein
git add index.html stockiq_scores.json
git commit -m "v6.3.X: Beschreibung"
git push origin main
```

---

## WALK-FORWARD (PRODUKTION: v6b_6m-u4)

```
OOS AVG: 60.1% | Stabilitaet: 2.8pp
Fenster: F1 57.8% / F2 63.6% / F3 59.1% / F4 63.7%
Strategie: MACD ZL + ATR*0.05 + SMA200 + SPY-Filter
           + Trail 10%@+3% + SL-8%
```

**Widerlegte Hypothesen (nicht wieder oeffnen ohne neue Evidenz):**
- Statische Score-Filter (Score>=65): OOS WR -3pp
- RSI-Filter / Hysterese: NULL Effekt
- Bond-Regime Entry-Daempfer: -3.2 bis -3.9pp
- Business-Cycle-Sektor-Rotation: kein Beweis (Molchanov 2024)

---

## SPRINT 13 (abgeschlossen, 02. Juni 2026)

```
v6.3.1  WL-Filter: 4-Zeilen-Struktur, wlReset vollstaendig,
        NEM+BAS XETRA-Fix, Footer-Version

v6.3.2  Auto-Cache-Buster via dashboard_version in scores.json

v6.3.3  wlReset vollstaendig (Flags, Buttons, Synopse)
```

---

## SPRINT 14 (abgeschlossen, 03. Juni 2026)

```
v6.3.4  WL-Filter Bugfixes:
  - wlReset: Inline-Styles vollstaendig zuruecksetzen (HC/SF/DR/Sync)
  - wlSetSort: deaktiviert Alle-Button korrekt
  - Versionsstrings synchronisiert (title, header, footer, tabs)
  - Puppeteer UI-Test (stockiq_filter_test_ui.js, 29/29 OK)

v6.3.5  Sektor-Dropdown + Klarnamen:
  - _scoresArr / _scoresIdx aus scores.json (loadScores)
  - buildSectorOptions() liest _scoresArr (kein FD-Abhaengigkeit)
  - wlRend Sektor-Filter: _scoresIdx[t].sector mit FD-Fallback
  - stockiq_ticker_names.json (299 Ticker, yfinance longName)
  - dName(s): Klarname-Lookup fuer alle WL-Zeilen
  - WL_SEARCH: sucht auch in Klarnamen
  - score.py v1.4.3: sector-Feld im Output
  - fund_juno v7.9.32: breakeven_inflation via FRED T10YIE
    + Fallback (us10y - 1.8pp), breakeven_source im __macro__

P_HYP  Hypothesen-Tab (dev/stockiq_dev.html):
  - hypotheses_status.json (30 Hypothesen, Sprint 14 Init)
  - hypotheses_update.py (SH-2/RH-4 Auto-Update)
  - Dev-Dashboard Tab 5 mit Filter, Badges, Level-Gruppen
```

---

## SPRINT 15 (laufend, ab 04. Juni 2026)

```
v6.3.6  Hilfe-Tab + Roadmap-Tab aktualisiert:
  - Hilfe: Schnellstart "6. Roadmap" ergaenzt
  - Roadmap: Sprint 13+14 in Versionsübersicht eingetragen
  - Roadmap: Geplante Features P1-P3 (erledigt) -> P4-P8 ersetzt
  - Roadmap: Footer Mai -> Juni 2026
  - Alle 7 Versionsstrings synchronisiert (title, header, Allokation,
    Hilfe, Roadmap, Footer, JS-String)

  hypotheses_update.py:
  - TU-1 Readiness-Check (delta_score + prev_signal + n_transitions)
  - --list Flag: tabellarische Ausgabe aller Hypothesen-IDs + Status
  - hypotheses_status.json: 32 Hypothesen (TU-1 eingetragen)
```

---

## OFFENE PUNKTE (Stand 04.06.2026)

```
P4  Sektor-IC-Test: ~Mitte Juni 2026 (+10 Snapshots, sr-Feld)
P5  WL3 Run: Mitte Juli 2026
P6a TIPS-Fetch fixen: breakeven_inflation via FRED liefert
    "estimated" (urllib-Timeout auf Windows) -> Ticket offen
P7  Walk-Forward Tab: dev/stockiq_dev.html Tab 1 ausbauen
P8  Ticker-Review: 7 Fehler-Ticker entfernen + 15 EM evaluieren
```

---

## KERN-BEFUNDE

```
+ SPY-200MA-Filter: +23pp OOS WR (dominante Verbesserung)
+ 6M-Fenster: Stab. 2.8pp vs. 3M: 10.0pp
+ Owner Earnings: IC=+0.155 ***
+ EV/EBIT: IC=-0.143 ***
+ WL3 7-14d: IC=+0.036 ***
- Bond-Regime Entry-Daempfer: WIDERLEGT
- Statische Score-Filter: WIDERLEGT
- RSI-Filter: WIDERLEGT
~ Quality-Screening-Bias: Annual IC Fund-Faktoren NEUTRAL (Limitation, kein Fehler)
```

---

*StockIQ CLAUDE.md | v6.3.6 | 04. Juni 2026*
*299 Ticker | OOS AVG 60.1% | Schutzziel A aktiv*
