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
| Fundamentals | PEG, EV/EBIT, FCF-Yield, Owner Earnings, ROCE, Verschuldung, Piotroski |
| Momentum | RSI, 12M-Momentum, MACD-Signal, VIX-Daempfung |
| Trend | SMA200-Abstand |
| Risk | Beta, Volatilitaet |

Signale: **STRONG BUY / BUY / WATCH / HOLD / SELL / SELL MA**

---

## Dashboard-Tabs

| Tab | Inhalt |
|---|---|
| Watchlist | 298 Ticker nach Score, BUY/HOLD/SELL gruppiert, Detail-Ansicht |
| WL2 | Persoenliche Auswahl (persistent) |
| Depot | Portfolio-Positionen, Soll/Ist-Allokation |
| Allokation | Multi-Asset-Uebersicht (Aktien/Anleihen/Gold/Cash) |
| Sektoren | Sektor-Momentum-Raenge (11 Sektoren, ETF-basiert) |
| Hilfe | Bedienung und Signal-Erklaerung |
| Roadmap | Entwicklungsstand und akademische Grundlagen |

Experten-Modus (Exp-Button): Fundamentals- und Walk-Forward-Tab zusaetzlich sichtbar.

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
- Snapshots: `stockiq_snapshots.json` (automatische Sync beim Dashboard-Start)
- Walk-Forward: 6M OOS, SPY-Filter, OOS WR 60.1%, Stabilitaet 2.8pp

---

## Repo-Inhalt

| Datei | Zweck |
|---|---|
| `index.html` | Dashboard (komplette App) |
| `stockiq_scores.json` | Tagesaktuelle Scores + Signale (298 Ticker) |
| `stockiq_snapshots.json` | Historische Tages-Snapshots (Archiv) |
| `stockiq_test.js` | QA-Tests (node stockiq_test.js index.html) |
| `CLAUDE.md` | Entwicklungskontext fuer Claude Code |

Score-Algorithmen und Python-Scripts sind aus Datenschutzgruenden nicht im Repo.

---

*StockIQ v5.9.92 | Mai 2026 | 298 Ticker | OOS WR 60.1%*
