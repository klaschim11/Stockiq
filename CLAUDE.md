# StockIQ — CLAUDE.md
Version: v6.2.2 | Stand: 31. Mai 2026 | Sprint 11 abgeschlossen

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
| `index.html` | v6.2.2 | Dashboard (laedt scores.json) |
| `fund_juno_v7_9_29.py` | v7.9.29 | Fundamentaldaten + Makro (Juno/iPhone, PRIVAT) |
| `stockiq_score.py` | v1.3 | Score-Berechnung -> scores.json (Windows, PRIVAT) |
| `stockiq_alpha_juno_v6b_6m.py` | v6b_6m-u4 | Walk-Forward PRODUKTION |
| `stockiq_wl3_signal_tracking_v1_6.py` | v1.6 | WL3 IC-Analyse (Windows) |
| `stockiq_test.js` | aktuell | QA: 26 Tests, 0 Fehler (2 Warnungen: EV/EBIT + max(FCF,OE) veraltet) |

**Schutzziel A**: `fund_juno*.py` und `stockiq_score.py` sind in `.gitignore` —
sie liegen NICHT im Repo.

---

## TAEGLICH-WORKFLOW

```powershell
# 1. Daten holen (Juno, iPhone, ~10 Min)
fund_juno_v7_9_29.py  ->  stockiq_fundamentals.json  (iCloud)

# 2. Scores berechnen (Windows, ~5 Sek)
python stockiq_score.py  ->  stockiq_scores.json

# 3. Deployen
cd C:\Users\klasc\Stockiq
git add stockiq_scores.json
git commit -m "scores: update DATUM"
git push origin main
# -> Dashboard laedt scores.json automatisch
```

Oder 1-Click: `run_daily.bat` (erledigt Schritte 1-4 automatisch).

---

## ARCHITEKTUR (ab v6.2.2)

```
LOKAL (privat, nicht im Repo):
  fund_juno_v7_9_29.py      Datenabruf (299 Ticker, 35 Felder)
  stockiq_score.py           Score-Portierung aus index.html
  stockiq_fundamentals.json  Rohdaten

REPO (oeffentlich, GitHub Pages):
  index.html                 Dashboard-Shell + Render-Logik
  stockiq_scores.json        299 Ticker, tagesaktuelle Scores + Signale
  stockiq_snapshots.json     Snapshot-Archiv (ARCH_MAX=120)
  stockiq_test.js            QA
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
# Erwartet: 26 Tests / 0 Fehler (13 Script-Bloecke erwartet)
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
git commit -m "v6.1.X: Beschreibung"
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

## SPRINT 10 (abgeschlossen, Mai 2026)

```
v6.0.10  Walk-Forward komplett aus index.html entfernt
         (Tab, JS-Bloecke, Dead Code bereinigt)

v6.0.11  Onboarding-Dialog (3 Schritte: Horizont / Orientierung / Klassen)
         + Profil-Badge im Header

v6.0.12  ETF-Score calcEtfScores() im Sektoren-Tab
         Formel: Mom*0.40 + Trend*0.35 + Risk*0.25

v6.0.13  Allokations-Tab S/E/A/G/C profil-abhaengig
         + ETF-Rangliste + Hilfe-Tab aktualisiert
```

---

## SPRINT 11 (abgeschlossen, 31. Mai 2026)

```
v6.1.0  P0 + P1 kombiniert:
  - 9 Textfixes (Version, fund_juno-Referenz, Ticker-Anzahl)
  - WL2-Tab entfernt: 7 -> 6 Tabs
  - WL1 zweizeilige Filterstruktur:
      Zeile 1: Signal-Buttons + Sort (Score/A-Z) + SPY-Badge
      Zeile 2: Sektorfilter-Dropdown + SF/HC/DR + Favoriten + Export/Import
  - Stern-Toggle pro Titelzeile (Favoriten direkt in WL1)
  - buildSectorOptions(): Sektor-Dropdown dynamisch aus scores.json
  - goTab() + pgs-Array: 6 Tabs neu verdrahtet
  - 4 tote Funktionen entfernt (rWL2, wl2CheckOrigin, wl2SelAll, wl2ChartExport)

v6.1.1  Bugfixes + Suchfeld:
  - Suchfeld (Ticker/Name live-Filter) statt SPY-Banner
  - SPY-Phase als kompakter Badge in Zeile 1 (spy-phase-badge Span)
  - dpFillWL2(): Encoding-Fix + A-Z-Sort nach Klarname
  - Allokation-Subtitle Versionsstring aktualisiert
```

---

## OFFENE PUNKTE (Stand 31.05.2026)

```
P2  Allokations-Tab Umbau (Sprint 12):
    - Eingabefelder neu: S/E/A/G/R/C
    - buildAllocTargets(profil, phase) verdrahten
    - detectCyclePhase() + Phasen-Dropdown
    - fund_juno: curve_slope_bps in __macro__

P3  Hilfe/Roadmap Bereinigung (Sprint 12):
    - Versionshistorie aus Hilfe entfernen
    - Roadmap: Sprint 4-11 ergaenzen

P4  Sektor-IC-Test: ~Mitte Juni 2026 (+10 Snapshots, sr-Feld benoetigt)
P5  WL3 Run: Mitte Juli 2026
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

*StockIQ CLAUDE.md | v6.2.2 | 31. Mai 2026*
*299 Ticker | OOS AVG 60.1% | Schutzziel A aktiv*
