# StockIQ — CLAUDE.md
Version: v6.3.9 | Stand: 04. Juni 2026 | Sprint 15 laufend

---

## PROJEKT-UEBERSICHT

StockIQ ist ein privates, quantitatives Aktien-Scoring-System.
- **Dashboard**: klaschim11.github.io/Stockiq (`index.html`)
- **Repo lokal**: `C:\Users\klasc\Stockiq`
- **Ticker**: 298 | **Snapshots**: laufend
- **OOS AVG**: 59.5% (301 Ticker, Baseline 06.06.2026) | **Stabilitaet**: 3.0pp

---

## PRODUKTIONS-STACK

| Datei | Version | Zweck |
|-------|---------|-------|
| `index.html` | v6.3.9 | Dashboard (laedt scores.json + ticker_names.json) |
| `fund_juno_v7_9_29.py` | v7.9.35 | Fundamentaldaten + Makro + FRED breakeven + price_to_book (Windows, PRIVAT) |
| `stockiq_score.py` | v1.4.9 | Score-Berechnung -> scores.json (Windows, PRIVAT) |
| `stockiq_alpha_juno_v6b_6m.py` | v6b_6m-u4 | Walk-Forward PRODUKTION |
| `stockiq_wl3_signal_tracking_v1_6.py` | v1.6 | WL3 IC-Analyse (Windows) |
| `stockiq_test.js` | aktuell | QA: 26 Tests, 0 Fehler (13 Script-Bloecke) |
| `stockiq_ticker_names.json` | 2026-06-04 | 298 Klarnamen (yfinance longName, public) |
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

## ARCHITEKTUR (ab v6.3.9)

```
LOKAL (privat, nicht im Repo):
  fund_juno_v7_9_29.py      Datenabruf (298 Ticker, ~40 Felder + price_to_book)
  stockiq_score.py           Score-Berechnung v1.4.9 (f_sc_standard/financial/utilities)
  stockiq_fundamentals.json  Rohdaten
  hypotheses_status.json     Hypothesenbaum (32 Hypothesen)
  hypotheses_update.py       Auto-Update SH-2/RH-4/TU-1 + --list
  stockiq_snapshots.json     Snapshot-Archiv (lokal, gitignored ab v6.3.7)

REPO (oeffentlich, GitHub Pages):
  index.html                 Dashboard-Shell + Render-Logik
  stockiq_scores.json        298 Ticker, tagesaktuelle Scores + Signale + sector
  stockiq_ticker_names.json  298 Klarnamen (yfinance longName)
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
OOS AVG: 59.5% (301 Ticker, Baseline 06.06.2026) | Stabilitaet: 3.0pp
Fenster: F1 60.7% / F2 62.7% / F3 54.9% / F4 61.3%
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

v6.3.7  Snapshot-Sync entfernt + Repo-Bereinigung:
  - syncSnapshotsFromRepo() + showSyncHint() entfernt
  - stockiq_snapshots.json: untracked (gitignored, lokal erhalten)
  - PAGE_VERSION + alle UI-Versionsstrings auf v6.3.7
  - dashboard_version in score.py -> "6.3.7"
  - score.py v1.4.4: pb-Signal (PEG-Block-Logik portiert, BUG-01 behoben)
  - Repo-Cleanup: dev_archive untracked, package.json committet,
    README auf v6.3.6 aktualisiert (299 Ticker, 6 Tabs, ticker_names)

v6.3.8  mSig() Score-Filter + SH-4 Hypothese:
  - mSig() Z.1199: isSell(_raw) + Score >= 55 -> 'hold'
    (scores.json-Pfad, konsistent mit SELL_SCORE_FILTER Z.1229)
  - SH-4 eingetragen: "Score-SELL-Gate" (aktiv, test: ~Feb 2027)
  - hypotheses_status.json: 33 Keys / 32 nicht-axiom
    n_active 3->4, Meta-Zaehler-Bug geschlossen
  - dashboard_version in score.py -> "6.3.8"

v6.3.9  Sektor-Score-Architektur + P8a (Sprint 19):
  - f_sc_financial(): P/B + ROE + EV/EBITDA + div_yield (Financial Services)
  - f_sc_utilities(): EV/EBITDA + div_yield + P/B + ROE (Utilities)
  - f_sc() als Router (gleiche Signatur wie f_sc_standard)
  - FINANCIAL_SECTORS / UTILITY_SECTORS Konstanten in score.py
  - fund_juno v7.9.34: price_to_book (yfinance priceToBook)
  - ROG.SW entfernt: TICKERS + SECTOR_OVERRIDES + ticker_names.json
  - score.py v1.4.9, dashboard_version 6.3.9
  - breakeven_inflation: 2.67 (P6a behoben)
  - Ticker: 299 -> 298
  - git tag v6.3.9
  + fund_juno v7.9.35: gold_eur/silver_eur (__macro__), history()-Fallback fuer Futures
  + GSR Auto-Fill in loadScores()-Callback (Async-Timing)
```

---

## OFFENE PUNKTE (Stand 06.06.2026)

```
P4  ABGESCHLOSSEN: RH-5 validiert (06.06.2026)
    Naechster Schritt: sektorFactor in momSc() nach Walk-Forward OOS>=60.1%
P5  WL3 Run: Mitte Juli 2026
P7  Walk-Forward Tab: dev/stockiq_dev.html Tab 1 ausbauen
P8c Neue Ticker-Kandidaten (nach IC-Validierung FH-10)
```

---

## ENGINEERING-LEKTIONEN

```
FUTURES / FX via yfinance (gelernt v7.9.35):
  fetch_price() via info.get("regularMarketPrice") liefert None fuer:
    GC=F (Gold), SI=F (Silber), EURUSD=X, andere Futures/FX
  IMMER history()-Fallback fuer Futures-Symbole verwenden:
    val = fetch_price(sym)
    if val is None:
        _h = yf.Ticker(sym).history(period="2d")
        if not _h.empty: val = float(_h["Close"].iloc[-1])

ASYNC-TIMING in loadScores() (gelernt v6.3.9):
  gold_eur/silver_eur Auto-Fill MUSS im .then()-Callback von loadScores()
  stehen, NICHT in initAlloc() oder initFund() allein.
  Grund: loadScores() ist async (fetch) -- zum Zeitpunkt von initAlloc()
  sind die Daten aus scores.json noch nicht verfuegbar.
  Muster: if(mac.gold_eur) { document.getElementById('gsr-gold').value = ... }
```

---

## KERN-BEFUNDE

```
+ SPY-200MA-Filter: +23pp OOS WR (dominante Verbesserung)
+ 6M-Fenster: Stab. 2.8pp vs. 3M: 10.0pp
+ Owner Earnings: IC=+0.155 ***
+ EV/EBIT: IC=-0.143 ***
+ WL3 7-14d: IC=+0.036 ***
+ Sektor-Momentum IC: 7d=-0.128** | 14d=-0.157*** | 30d=-0.102** (RH-5 validiert, P4)
  IC negativ: Rang 1 (bester Sektor) -> positive Forward-Returns
  n=39/32/16 Perioden | 2026-04-01 bis 2026-06-06 | script: stockiq_sektor_ic_v1.py
- Bond-Regime Entry-Daempfer: WIDERLEGT
- Statische Score-Filter: WIDERLEGT
- RSI-Filter: WIDERLEGT
~ Quality-Screening-Bias: Annual IC Fund-Faktoren NEUTRAL (Limitation, kein Fehler)
```

---

*StockIQ CLAUDE.md | v6.3.9 | 04. Juni 2026*
*301 Ticker (NZYM-B.CO skipped) | OOS AVG 59.5% | Schutzziel A aktiv*
