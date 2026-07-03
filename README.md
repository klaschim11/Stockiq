# StockIQ

Quantitatives Aktien-Scoring-Dashboard fuer private Investoren.

**Live:** [klaschim11.github.io/Stockiq](https://klaschim11.github.io/Stockiq)

---

## Was ist StockIQ?

StockIQ bewertet taeglich 298 Aktien aus globalen Maerkten (USA, Europa, Japan, EM)
mit einem wissenschaftlich fundierten Composite Score und liefert klare
BUY / HOLD / SELL-Signale.

> StockIQ ist ein privates Analyse-Werkzeug und stellt keine Anlageberatung dar.
> Alle Signale sind Entscheidungshilfen, keine Kauf- oder Verkaufsempfehlungen.

---

## Score-Architektur

```
Composite Score = Fundamentals 35% + Momentum 25% + Trend 20% + Risk 20%
```

| Komponente | Inhalt |
|---|---|
| Fundamentals | PEG, EV/EBIT, FCF-Yield, Owner Earnings, ROCE, Verschuldung, Piotroski (Sektor-adaptiv ab v6.3.9) |
| Momentum | RSI, 12M-Momentum, MACD-Signal, VIX-Daempfung |
| Trend | SMA200-Abstand |
| Risk | Beta, Volatilitaet |

Signale: **STRONG BUY / BUY / PEG-BLOCK / HOLD / WATCH / SELL**

---

## Dashboard-Tabs

| Tab | Inhalt |
|---|---|
| 1. Watchlist | 298 Ticker nach Score, Signal-Filter, Sektor-Filter, Detail-Ansicht |
| 2. Depot | Portfolio-Positionen, Wertentwicklung, Zeitreihe aus Snapshots |
| 3. Fundamentals | Tagesaktuelle Scores aus scores.json, Experten-Modus (ROCE, PEG, IC-Detail) |
| 4. Sektoren | Sektor-Momentum-Raenge (11 SPDR-ETFs, RSS + 3M-Skip-Momentum, Dispersion) |
| 5. Hilfe | Bedienung, Signal-Erklaerung, Kennzahlen-Glossar |
| 6. Roadmap | Entwicklungsplan, Versions-Uebersicht, offene Features |

Experten-Modus (Exp-Button): ROCE, PEG, Debt, Moat, IC-Detail zusaetzlich sichtbar.

---

## Taeglich-Workflow

```
1. fund_juno.py auf iPhone (Juno)  ->  Marktdaten laden (~10 Min)
2. stockiq_score.py auf Windows    ->  scores.json berechnen
3. git push scores.json            ->  Dashboard aktualisiert automatisch
4. klaschim11.github.io/Stockiq    ->  Signale pruefen
```

Das Dashboard laedt `stockiq_scores.json` automatisch beim Start.
Kein manuelles JSON-Upload noetig.

---

## Marktphasen-Filter

Der **SPY > 200MA Filter** ist der wichtigste Einzelfaktor:

- SPY ueber 200MA (gruen): normale BUY-Signale gelten
- SPY unter 200MA (gelb): keine neuen Kaeufe empfohlen, auch bei hohem Score

Der aktuelle Status ist immer im Marktphasen-Banner oben in der Watchlist sichtbar.

---

## Akademische Grundlagen

- Jegadeesh/Titman (1993): Cross-Sectional Momentum
- Novy-Marx (2013): Gross Profitability
- Piotroski (2000): F-Score
- Faber (2007): Tactical Sector Rotation
- Whaley (2009): VIX als asymmetrischer Risikoindikator
- Moskowitz/Grinblatt (1999): Industry Momentum

---

## Technischer Stack

- Dashboard: Single-File HTML (GitHub Pages, ES5, keine externen Abhaengigkeiten)
- Datenfetching: Python / yfinance (iPhone + Juno)
- Score-Berechnung: Python (lokal, privat)
- Daten-Output: `stockiq_scores.json` (oeffentlich, nur Ergebnisse)
- Klarnamen: `stockiq_ticker_names.json` (298 Ticker, yfinance longName)
- Snapshots: `stockiq_snapshots.json` (lokal, gitignored)
- Walk-Forward: 6M OOS, SPY-Filter, OOS WR 60.1%, Stabilitaet 2.8pp

---

## Repo-Inhalt

| Datei | Zweck |
|---|---|
| `index.html` | Dashboard (komplette App) |
| `stockiq_scores.json` | Tagesaktuelle Scores + Signale (298 Ticker) |
| `stockiq_ticker_names.json` | Klarnamen (298 Ticker, yfinance longName) |
| `stockiq_test.js` | QA-Tests (node stockiq_test.js index.html) |
| `CLAUDE.md` | Entwicklungskontext fuer Claude Code |

Score-Algorithmen und Python-Scripts sind aus Datenschutzgruenden nicht im Repo.

---

*StockIQ v6.4.0 | Juni 2026 | 305 Ticker | OOS WR 59.5%*

