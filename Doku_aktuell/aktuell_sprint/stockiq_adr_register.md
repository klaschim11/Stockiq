# StockIQ Architecture Decision Records

---

## ADR-001: Score-gesteuertes Sell-Override (Score-Filter)

**Status:** In Revision (Sprint 33)
**Datum:** 11.06.2026
**Entscheider:** Kla Schimmelpenning

---

### Kontext

Das MACD-Primärpfad-Signal produziert bei technischen Korrekturen SELL-Signale
auch für Ticker mit starken Fundamentaldaten. Ein langfristiger Anlagehorizont
(>= 2 Jahre) erfordert Differenzierung: nicht jedes SELL bedeutet "Position schließen".

---

### Entscheidung v1 (original, v5.9.13)

```
if isSell(raw_signal) AND cSc(s) >= 55:
    return 'hold_sf'   # SELL unterdrückt, Position halten
```

- Schwelle: cSc >= 55 (Composite Score, alle Sub-Scores)
- Anzeige: Badge 'HOLD SF', kein visueller Hinweis auf unterdrücktes SELL

---

### Probleme mit v1 (identifiziert Sprint 33, 11.06.2026)

**Problem 1 — Falsche Metrik:**
cSc enthält momSc und trendSc. Bei technischer Korrektur fallen genau diese
Sub-Scores — cSc sinkt. Ein Qualitätsfilter der technische Schwäche mit
misst, widerspricht seiner eigenen Absicht.

**Problem 2 — Schwelle zu breit:**
cSc 55 liegt unter dem System-Median (ca. 62). Ca. 80% aller Ticker
werden geschützt. Eine "Qualitätsschwelle" die das Gros filtert ist keine.

**Problem 3 — Fehlende OOS-Validierung:**
Nicht dokumentiert ob der Filter bei OOS-Walkforward aktiv war.
Falls nicht: live läuft eine andere Strategie als die validierte (59.5%).

**Problem 4 — Intransparenz:**
Anwender sieht 'HOLD SF' — kein Hinweis dass ein SELL unterdrückt wurde.
Konsistenzbruch: Depot zeigte raw-Signal (SELL), WL zeigte hold_sf (HOLD*).

---

### Entscheidung v2 (Sprint 33, 11.06.2026)

```
if isSell(raw_signal) AND fund_score(_scoresIdx[t]) >= 70:
    return 'hold_sf'   # SELL unterdrückt, Position halten
```

- Schwelle: fund_score (fSc) >= 70 aus scores.json
  → Fundamentale Qualitätsdimension, unabhängig von Momentum/Trend
  → 70 = Startwert, intern konsistent mit PH-4-Qualitätsgrenzen (75)
  → Durch SF-1 empirisch zu optimieren (~August 2026)
- Anzeige: Badge 'HOLD*' (alle hold_sf-Varianten)
  → Visuell unterscheidbar von regulärem HOLD
  → Tooltip-Text zeigt fSc-Wert und Schwelle
- Depot-Signal: mSig() (konsistent mit WL) — kein raw-Signal mehr

---

### Implizierte Invariante (nach Sprint 33)

```
WL-Badge[t] == Depot-Sig[t]   für alle t in DEPOT_POSITIONS
Bruch erlaubt: NEIN
Test: Block 9 Puppeteer (sw/above200/hist/price) -- reicht nicht
Offene Testlücke: kein direkter mSig-Konsistenz-Test WL vs. Depot
→ Block 10 (Sprint 33 oder 34): Page.evaluate mSig vs dp_sig vergleichen
```

---

### Betroffene Komponenten

```
mSig()           Filterlogik (Zeile ~1228)
dpRenderTable()  Depot-Signal-Source (Zeile ~3958)
holdSFLabel()    Badge-Text (Zeile ~1259)
toggleSellFilter() SF-Button-Label (Zeile ~2325)
Tooltip-Texte    Zeilen ~2018, ~2091
```

---

### Offene Fragen

```
OF-1: War der Filter beim OOS-Walkforward aktiv?
      → Rückschluss auf 59.5% OOS-Baseline mit/ohne Filter
      → Klärt ob 59.5% der validierte Wert mit oder ohne Override ist

OF-2: Optimale fSc-Schwelle?
      → SF-1 (~August 2026): testet 65/70/75/80 auf signal_returns.csv
      → Finale Schwelle durch Daten, nicht Prior

OF-3: Sektorspezifische Schwellen sinnvoll?
      → Finance/Utilities: fSc mit anderen Metriken (P/B, ROE)
      → Explorativ nach SF-1
```

---

### Verwandte Dokumente

```
stockiq_architektur_review_v1.md  AP-1 bis AP-5
hypothesenbaum v1.4               SF-1 (ausstehend)
methodik_intern v6.4.1            Score-Architektur
signal_return_tracker.py v1.0     SF-1 Datenbasis (Erweiterung nötig)
```

---

## Fortschreibungsprotokoll

| ADR   | Version | Datum      | Änderung                                    |
|-------|---------|------------|---------------------------------------------|
| 001   | v1      | 11.06.2026 | Initialdokument, Sprint 33 Post-Mortem v1   |
| 001   | v2      | 11.06.2026 | Revision: fSc>=70, HOLD*, Depot-Konsistenz  |

---

*StockIQ ADR-Register -- erstellt 11.06.2026*
