# StockIQ — CLAUDE.md
Version: v5.9.93 | Stand: 25. Mai 2026 | Sprint 5 Phase A+B abgeschlossen

---

## PROJEKT-UEBERSICHT

StockIQ ist ein privates, quantitatives Aktien-Scoring-System.
- **Dashboard**: klaschim11.github.io/Stockiq (`index.html`)
- **Repo lokal**: `C:\Users\klasc\Stockiq`
- **Ticker**: 298 | **Snapshots**: 66 (25.04.–25.05.2026)
- **OOS AVG**: 60.1% | **Stabilitaet**: 2.8pp

---

## PRODUKTIONS-STACK

| Datei | Version | Zweck |
|-------|---------|-------|
| `index.html` | v5.9.93 | Dashboard (laedt scores.json) |
| `fund_juno_v7.9.27.py` | v7.9.27 | Fundamentaldaten + Makro (Juno/iPhone, PRIVAT) |
| `stockiq_score.py` | v1.0 | Score-Berechnung -> scores.json (Windows, PRIVAT) |
| `stockiq_alpha_juno_v6b_6m.py` | v6b_6m-u4 | Walk-Forward PRODUKTION |
| `stockiq_wl3_signal_tracking_v1_5.py` | v1.5 | WL3 IC-Analyse (Windows) |
| `stockiq_test.js` | aktuell | QA: 27 Tests, 0 Fehler |

**Schutzziel A**: `fund_juno*.py` und `stockiq_score.py` sind in `.gitignore` —
sie liegen NICHT im Repo.

---

## TAEGLICH-WORKFLOW (stabil ab v5.9.93)

```powershell
# 1. Daten holen (Juno, iPhone, ~10 Min)
fund_juno_v7.9.27.py  ->  stockiq_fundamentals.json  (iCloud)

# 2. Scores berechnen (Windows, ~5 Sek)
python stockiq_score.py  ->  stockiq_scores.json

# 3. Deployen
cd C:\Users\klasc\Stockiq
git add stockiq_scores.json
git commit -m "scores: update DATUM"
git push origin main
# -> Dashboard laedt scores.json automatisch
```

---

## ARCHITEKTUR (ab v5.9.93)

```
LOKAL (privat, nicht im Repo):
  fund_juno_v7.9.27.py      Datenabruf (298 Ticker, 35 Felder)
  stockiq_score.py           Score-Portierung aus index.html
  stockiq_fundamentals.json  Rohdaten

REPO (oeffentlich, GitHub Pages):
  index.html                 Dashboard-Shell + Render-Logik
  stockiq_scores.json        298 Ticker, tagesaktuelle Scores + Signale
  stockiq_snapshots.json     66 Eintraege (ARCH_MAX=120)
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

**scores.json**: `stockiq_score.py` berechnet alle Scores lokal und schreibt
fertige Werte. `index.html` liest nur noch `_scoresIdx[s.t]` — keine
Berechnung im Browser mehr (ausser Render-Dependencies in Phase C).

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
# Erwartet: 27 Tests / 0 Fehler (14 Script-Bloecke erwartet)
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
git commit -m "v5.9.XX: Beschreibung"
git push origin main
# Credential Manager konfiguriert (PAT, kein Passwort)
# Claude Code kann nicht interaktiv pushen -> manuell im Terminal
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
- Bond-Regime Entry-Daempfer: -3.2 bis -3.9pp (gefilterte Trades waren die BESTEN)

---

## OFFENE PUNKTE (Stand 25.05.2026)

```
P1  v5.9.94  Hilfe-Tab aktualisieren (Synopse weg, Experten-Toggle, neuer Workflow)
P2  README.md + CLAUDE.md committen
P3  Phase C  Detail-Panel -> scores.json (optional)
P4  Sektor-IC-Test (~Mitte Juni 2026, +10 Snapshots)
P5  alpha_juno auf 298 Ticker (nach IC-Test, OOS-pflichtig)
WL3 Naechster Run: Mitte Juli 2026
```

---

## KERN-BEFUNDE

```
+ SPY-200MA-Filter: +23pp OOS WR (dominante Verbesserung)
+ 6M-Fenster: Stab. 2.8pp vs. 3M: 10.0pp
+ Owner Earnings: IC=+0.155 ***
+ EV/EBIT: IC=-0.143 ***
+ WL3 7-14d: IC=+0.0361 ***
- Bond-Regime Entry-Daempfer: WIDERLEGT
- Statische Score-Filter: WIDERLEGT
- RSI-Filter: WIDERLEGT
~ Quality-Screening-Bias: Annual IC Fund-Faktoren NEUTRAL (Limitation, kein Fehler)
```

---

*StockIQ CLAUDE.md | v5.9.93 | 25. Mai 2026*
*298 Ticker | 66 Snapshots | OOS AVG 60.1% | Schutzziel A aktiv*
