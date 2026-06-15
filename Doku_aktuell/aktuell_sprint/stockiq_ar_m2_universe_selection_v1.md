# AR-M2 -- Universe Selection: WL3 Aufnahmekriterien
*StockIQ interne Methodik-Dokumentation*
*Version 1.0 | 08. Juni 2026 | Sprint 27*
*Ablage: Doku_aktuell\aktuell_sprint\*

---

## Zweck

Dieses Dokument kodifiziert die bisher impliziten Kriterien fuer
die Aufnahme und den Verbleib von Titeln in WL3 (dem skorierten
Universum von StockIQ). Es dient als Referenz fuer zukuenftige
Aufnahme-Entscheidungen und ersetzt ad-hoc-Urteile durch einen
dokumentierten, nachvollziehbaren Prozess.

Aktueller Stand: **WL3 v1.7 | 305 Ticker | Stand 08.06.2026**

---

## 1 -- Quantitative Mindestanforderungen (Hard Criteria)

Alle drei Kriterien muessen erfuellt sein. Kein Ermessen.

| Kriterium | Schwelle | Begruendung |
|---|---|---|
| **ROCE** | > 10% (letzte 3 Jahre, Median) | Qualitaets-Gate. Belegt Kapitaleffizienz. Quelle: IC-Analyse Mai 2026: ROCE als Aufnahme-Kriterium valide, nicht als Ranking-Faktor |
| **Free Cash Flow** | Positiv in >= 2 der letzten 3 Jahre | Solvenz-Signal. Strukturell negative FCF = Kapitalvernichtung |
| **Daten-Coverage yfinance** | >= 3 von 5 Kern-Feldern verfuegbar (netIncome, ebitda, freeCashflow, marketCap, price) | Ohne Grunddaten kein verlaessl. Score. 9613.T-Fall: 0/5 -> abgelehnt |

**Kern-Felder Definition (Mindest-Coverage):**
```
netIncomeToCommon   -> fSc Berechnung
ebitda              -> ev_eb Komponente
freeCashflow        -> fcf Komponente
marketCap           -> Yield-Normierung
price / history     -> MACD, 200MA, 50MA (immer verfuegbar wenn gelistet)
```

---

## 2 -- Qualitative Kriterien (Soft Criteria)

Soft Criteria erfordern Urteilsbildung. Sie koennen einander aufwiegen.
Mindestens 2 von 3 sollten erfuellt sein.

| Kriterium | Operationalisierung | Beispiele |
|---|---|---|
| **Wide Moat** | Erkennbarer struktureller Wettbewerbsvorteil (Marke, Netzwerk, Switching Costs, Kostenstruktur) | AAPL, ASML, NOVO-B, INDITEX |
| **Nachvollziehbares Geschaeftsmodell** | Geschaeft verstaendlich, kein reiner Finanzwert oder Sonderstruktur | Ausschluss: SPACs, Royalty-Pure-Plays, reine Holdingstrukturen ohne Kerngeschaeft |
| **Branchenrelevanz** | Sektor mit nachgewiesener IC-Relevanz oder strategischer Portfolio-Bedeutung | Technology, Healthcare, Industrials bevorzugt; nicht: Micro-Nischen |

---

## 3 -- Geografische und Sektor-Balance

WL3 ist kein passives Marktportfolio. Aktive Balance-Ziele:

| Dimension | Zielband | Aktuell (WL3 v1.7) | Grund |
|---|---|---|---|
| US-Anteil | 40-60% | ~50% | Datenverfuegbarkeit + Liquiditaet |
| EU-Anteil | 20-35% | ~28% | Diversifikation + Sektor-Abdeckung |
| ASIA/CH/sonstige | 10-25% | ~22% | Wachstumsmaetrkte + Nicht-Korrelation |
| Titelanzahl je Sektor | >= 20 | 11 Sektoren x ~28 | IC-Test-Anforderung (MH-2: N>=20 pro Sektor) |

**Sektor-Mindest-N = 20** ist harte Untergrenze fuer den Sektor-IC-Test
(sektor_ic_historisch.py, P4). Sektoren unter 20 Titeln liefern keine
statistisch stabilen IC-Werte.

---

## 4 -- Datenverfuegbarkeit (neu kodifiziert Sprint 27)

Aus dem FMP-Pilot (Sprint 27) abgeleitete Regeln:

**Reihenfolge der Datenquellen:**
```
1. yfinance tk.info    (Primaer, taeglich)
2. yfinance tk.cashflow (Fallback fuer capex, FCF)
3. FMP Free-Tier       (Fallback, Sprint 28 wenn Pilot positiv)
```

**Coverage-Schwellen fuer Aufnahme:**
```
>= 60% Kern-Felder vorhanden -> Aufnahme moeglich
40-59%                       -> Aufnahme mit Beobachtungs-Flag
< 40%                        -> Aufnahme abgelehnt bis Datenproblem geloest
```

**Bekannte strukturelle Luecken (kein Ausschlussgrund):**
- `capitalExpenditures` in tk.info = fast immer None -> tk.cashflow verwenden
- Japanische Ticker (.T): tk.info oft duenn -> capex aus tk.cashflow
- HK-Ticker (.HK): tk.info Coverage variabel -> Beobachtungs-Flag

---

## 5 -- Ausschlusskriterien (Knock-Out)

Titel werden nicht aufgenommen ODER werden entfernt wenn:

| Ausschlussgrund | Beispiel | Aktion |
|---|---|---|
| yfinance Coverage < 40% (alle Datenquellen) | 9613.T (0%, 08.06.2026) | ABGELEHNT -- finale Entscheidung 09.06.2026 (FMP ebenfalls 0%, siehe Abschnitt 9) |
| ROCE < 0% in 2 von 3 Jahren | Strukturelle Verlustmacher | Entfernen bei naechstem WL3-Review |
| FCF negativ 3 Jahre in Folge | Kapitalvernichtung | Entfernen |
| Delisting / M&A abgeschlossen | Uebernahme vollzogen | Sofort entfernen |
| Sektor bereits > 35 Titel | Klumpenrisiko | Neuaufnahme pausieren |
| Ticker-Format inkompatibel (nach Alias-Fix) | - | Alias-Korrekturtabelle anwenden |

**Alias-Korrekturtabelle (Stand v1.7):**
```
Dashboard-Symbol -> yfinance -> ISIN
ITX              -> ITX.MC   -> ES0148396007 (Inditex)
AI               -> AI.PA    -> FR0000120073 (Air Liquide)
SAN              -> SAN.PA   -> FR0000120578 (Sanofi)
SAND             -> SAND.ST  -> SE0020288127 (Sandvik)
```

---

## 6 -- Review-Prozess

**Regelmaessiger Review:** Bei jedem WL3-Run (alpha_juno, ~halbjährlich)

**Ausloeser fuer ausserplanmaessige Review:**
- Datenverfuegbarkeit eines bestehenden Titels faellt unter 40%
- M&A-Ankuendigung (Abschluss abwarten)
- Sektor-N faellt unter 20 (Ergaenzungs-Kandidaten suchen)

**Entscheidungsprotokoll (Minimalform):**
```
Datum:    08.06.2026
Ticker:   9613.T (NTT Data)
Antrag:   Aufnahme WL3
Ergebnis: ABGELEHNT
Begruendung:
  - yfinance tk.info Coverage 0/5 Felder (fmp_pilot_results.json)
  - Ohne Grunddaten kein verlaessl. fSc berechenbar
  - Fallback-Pfad wuerde Phantom-Score erzeugen
Bedingung: FMP-Pilot v1.2 bestaetigt >= 60% Coverage -> Wiedervorlage Sprint 28
```

---

## 7 -- Zusammenhang mit Scoring-Architektur

Die Aufnahmekriterien sind bewusst so gesetzt, dass das resultierende
Universum einen **Quality-Screening-Bias** aufweist. Das ist gewollt:

**Konsequenz fuer IC-Analyse (technische Referenz Ch.9):**
Innerhalb eines qualitaets-vorgefilterten Universums haben ROCE und
andere Qualitaetsfaktoren niedrigen IC -- nicht weil sie schwache
Faktoren sind, sondern weil alle enthaltenen Titel bereits qualitativ
hochwertig sind und damit kaum Spread uebrig bleibt.

**Implikation:**
- ROCE > 10% bleibt Aufnahme-Kriterium (kein IC-Test benoetigt)
- ROCE als Ranking-Faktor innerhalb WL3: IC-Test erforderlich
- Der Pilot-Befund "ROCE IC schwach" widerlegt nicht die Aufnahmeregel

---

## Einzelentscheidungen (Sprint 27–28)

| Ticker | yf-Coverage | FMP-Coverage | Entscheidung | Datum |
|--------|-------------|--------------|--------------|-------|
| 9613.T | 0% | 0% | ABGELEHNT — strukturelle Null-Coverage beide Quellen | 08.06.2026 |
| ROG.SW | 0% | 0% | ABGELEHNT — beim Ticker-Sync 06.06.2026 aus WL3 entfernt | 06.06.2026 |
| 700.HK | 0% | 0% | ABGELEHNT — strukturelle Null-Coverage beide Quellen | 08.06.2026 |

## B1 — FMP /api/v3/ Pilot-Ergebnis (Sprint 27–28)

**Test:** 30 Ticker (10 US, 10 EU, 6 ASIA, 3 CH, 1 AUS), Endpunkt /api/v3/
**Felder getestet:** freeCashFlow, ebitda, netIncome, capitalExpenditure, marketCap

| Region | n | yfinance | FMP /api/v3/ |
|--------|---|----------|--------------|
| US | 10 | 96% | 80% |
| EU | 10 | 100% | 0% |
| ASIA | 6 | 67% | 0% |
| CH | 3 | 67% | 0% |
| AUS | 1 | 100% | 0% |
| **Gesamt** | **30** | **89%** | **27%** |

**Befund:** FMP /api/v3/ deckt ausschliesslich US-Ticker ohne Exchange-Suffix.
Alle EU-Ticker (.PA, .MC, .ST, .CO, .L, .AS, .DE) liefern 0%.
Auch 2 US-Ticker (PSX, AJG) haben ungeklaerte Datenpunkte mit 0% FMP-Coverage.
Interessant: JPM yf=60% vs. FMP=100% (fehlende ebitda/capex bei yf fuer Finanzsektor).

**Entscheidung: FMP-Integration abgelehnt. Thema geschlossen.**
Begruendung: 27% Gesamt-Coverage vs. 89% yfinance. Kein Mehrwert fuer StockIQ-Universum
(2/3 der WL3-Ticker sind non-US). Integration wuerde Komplexitaet und API-Abhaengigkeit
erhoehen ohne systematischen Coverage-Gewinn.
Datum: 09. Juni 2026

## 8 -- Offene Punkte / Naechste Schritte

| Punkt | Prioritaet | Zeitpunkt |
|---|---|---|
| Marktkapitalisierung als explizite Mindestgrenze definieren | Mittel | Sprint 28 |
| Daten-Coverage-Check in run_daily automatisieren | Niedrig | Sprint 29+ |

---

*AR-M2 v1.1 | 09.06.2026 | StockIQ Universe Selection Dokumentation*
*Naechste Aktualisierung: nach FMP-Pilot-Abschluss + WL3-Run Juli 2026*
