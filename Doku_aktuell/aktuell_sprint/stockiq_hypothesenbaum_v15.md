# StockIQ -- Hypothesenbaum
*Modellvalidierung durch empirische Tests*
Version 1.5 | 15. Juni 2026 | Aktualisiert in Sprint 41

---

## Zweck dieses Dokuments

Dieses Dokument definiert den expliziten Hypothesenbaum, gegen den das
StockIQ-Modell empirisch getestet wird. Jede Modellentscheidung ist einer
testbaren Hypothese zugeordnet. Falsifikationen sind wertvoll -- sie
verhindern, dass unwirksame Regeln produktiv bleiben.

**Grundprinzip:** Keine Scoring- oder Strategie-Aenderung ohne
Out-of-Sample-Bestaetigung. Walk-Forward und IC-Analyse sind die
empirischen Arbiters.

---

## Versionierung

| Version | Datum | Aenderung |
|---------|-------|-----------|
| 1.0 | 01.06.2026 | Initialversion: alle bekannten Hypothesen dokumentiert |
| 1.1 | 07.06.2026 | AH-Praefix neu; AH-1 aufgenommen; RH-5 validiert; WH-4 ergaenzt; Literatur erweitert |
| 1.2 | 08.06.2026 | FH-3b neu (FCF-Trend); Testplan-Kalender aktualisiert |
| 1.3 | 10.06.2026 | TU-1 NEG.INDIZ; PH-3 widerlegt (WH-4); TU-2 geschlossen (WH-5) |
| 1.4 | 14.06.2026 | Testdesign-Review; Pre-Test-Status; FH-8 blockiert; FH-9 blockiert; FH-6 langfristig |
| 1.5 | 15.06.2026 | MH-3 neu (historischer Backtest); FH-3b aufgeteilt (H+P); fcft/fcft_q im Archiv |

---

## Ebenen-Uebersicht

| Praefix | Ebene | Testmethode | Beispiele |
|---------|-------|-------------|-----------|
| A | Epistemisches Axiom | nicht testbar | EMH als Nullhypothese |
| MH | Methodisch (Meta) | rechnerisch | t-Schwelle, Stichprobengroesse |
| SH | System-Hypothesen | Walk-Forward + IC | cSc IC, OOS Win Rate |
| RH | Regime-Hypothesen | Walk-Forward + IC | SPY-Filter, VIX, Sektor-Momentum |
| FH | Faktor-Hypothesen | IC-Analyse | OE, EV/EBIT, FCF, Accruals |
| TR | Technische Regeln | Walk-Forward | MA-Filter, Trendbestaetigung |
| SR | Sonderregeln | WL3 Signal-Tracking | HC-Filter, DR-Filter |
| PH | Parameter | Walk-Forward | BUY-Schwelle, Gewichtung |
| WH | Widerlegt / Geschlossen | bereits getestet | RSI, Bond-Regime, Score-Filter, TU-2 |
| AH | Allokations-Hypothesen | Literatur + Regime-Monitoring | Bond-Korrelation, Zyklusphase |

---

## A -- Epistemisches Axiom (nicht testbar)

**A-0**
Maerkte sind ueberwiegend effizient, aber nicht vollstaendig.
Systematische, regelbasierte Analyse kann selektives positives Alpha
gegenueber zufaelliger Selektion erzielen.
Das Modell sucht spezifische Evidenz gegen die Effiziente-Markt-
Hypothese (EMH) als Nullhypothese.

*Anmerkung: A-0 ist der Rahmen, nicht eine Hypothese im testbaren Sinne.
Alle SH/RH/FH sind Operationalisierungen dieses Axioms.*

---

## MH -- Methodische Meta-Hypothesen

### MH-1 | Multiple-Testing-Korrektur
**Aussage:** Mit mehr als 5 parallel getesteten Faktoren gilt als
Signifikanzhuerde t > 3.0, nicht das traditionelle t > 2.0.

**Begruendung:** Harvey, Liu & Zhu (2016, Journal of Finance) zeigen,
dass bei der Vielzahl publizierter Faktoren (316+) die traditionelle
t=2.0-Schwelle zu vielen Falsch-Positiven fuehrt. StockIQ testet
simultan 10+ Faktoren, daher gilt die erhoehte Schwelle.

**Status:** aktiv (Rechenwert, kein Testbedarf)
**Gilt fuer:** alle FH-*, RH-2, RH-5, SH-1

---

### MH-2 | Cross-Sectional IC bei N=305
**Aussage:** Mit N=305 Titeln pro Snapshot ist der cross-sektionale
Spearman-IC bereits pro Zeitpunkt statistisch auswertbar.

**Begruendung:** Effective IC (Northfield/Kane) nutzt eine Beobachtung
pro Asset pro Periode, nicht eine pro Periode. Bei N=305 gilt:
SE(IC) = 1/sqrt(N-3) ≈ 0.057 -> t=IC/SE.
Fuer IC=0.10: t ≈ 1.75 (ein Zeitpunkt).
Fuer IC=0.10 ueber 20 Perioden: ICIR = IC_mean/IC_std -> t ≈ 2-3.

**Implikation:** Einzelner Snapshot informativ; ICIR (Stabilitaet)
braucht 8-10 Zeitpunkte. IC-Berechnung beginnt wenn Forward-Return
bekannt (p-Feld im Archiv ab 01.06.2026, Forward-Window 6M = Dez 2026).

**Status:** aktiv

---

### MH-3 | Historischer Backtest unabhaengig von Snapshot-Alter (NEU 15.06.2026)
**Aussage:** Alle Fundamentalhypothesen (FH-*) koennen via historischem
yfinance-Backtest getestet werden -- unabhaengig davon, wie viele
StockIQ-Snapshots vorliegen.

**Begruendung:** Fundamentale Jahreswerte (OE, EV/EBIT, FCF etc.) sind
in yfinance historisch abrufbar (typisch 10+ Jahre). Ein
cross-sektionaler IC ueber 10 unabhaengige Jahreszeitpunkte x 305 Ticker
liefert N=3050 Beobachtungen mit vollstaendiger ICIR-Berechnung.

**Konsequenz fuer Testpfade:**
Zwei Pfade fuer jede Fundamentalhypothese:
  Pfad H (Historisch): ic_analysis_historical.py
    yfinance-Jahresabschluesse 2015-2025 x 305 Ticker
    Unabhaengige Jahreszeitpunkte -> valide ICIR
    Testbar: ab Aug 2026 (wenn Script geschrieben)

  Pfad P (Prospektiv): ic_analysis.py auf Snapshot-Archiv
    Nur fuer Faktoren die sich haeufig aendern (nicht reine Jahreswerte)
    Jahreswerte: ~1 unabh. Punkt/Jahr -> ICIR bis 2027 nicht erreichbar
    Same-Quarter-Werte (fcft_q): ~4 unabh. Punkte/Jahr -> ICIR Feb 2027

**Gilt fuer:** FH-1..FH-9, SH-1, SH-3

**Status:** aktiv (15.06.2026)

---

## SH -- System-Hypothesen

### SH-1 | cSc hat positiven IC auf 6M Forward Returns
**Aussage:** Spearman-IC(cSc, Return_6M) > 0 mit t > 3.0.

**Testmethode:** IC-Analyse (ic_analysis.py, noch nicht geschrieben)
**Datenbedarf:** p-Feld im Archiv (ab Snapshot 1, 01.06.2026) +
Forward-Return nach 6M (= ab ca. Dez 2026)
**Trigger:** ~20 Snapshots mit p-Feld (ca. Feb 2027)
**Status:** ausstehend

---

### SH-2 | OOS Win Rate > 55% (Walk-Forward)
**Aussage:** Walk-Forward OOS Win Rate > 55% ueber 4 Fenster (6M OOS),
Stabilitaet < 5pp.

**Testmethode:** Walk-Forward (alpha_juno)
**Ergebnis:** OOS AVG 60.1%, Stabilitaet 2.8pp, kein Fenster unter 50%
**Status:** VALIDIERT (alpha_juno v6b_6m-u4)

---

### SH-3 | Multifaktor schlaegt Einzel-Faktor
**Aussage:** Kombiniertes cSc-Scoring uebertrifft reine Fundamental-
oder Momentum-Modelle im IC.

**Testmethode:** IC-Komponentenzerlegung (Faktor-IC einzeln vs. cSc)
**Testpfad:** H (historisch, ic_analysis_historical.py) + P (prospektiv)
**Trigger:** Aug 2026 (Pfad H) / ~20 Snapshots (Pfad P)
**Status:** ausstehend

---

## RH -- Regime-Hypothesen

### RH-1 | SPY 200MA verbessert OOS Win Rate
**Aussage:** OOS WR mit SPY 200MA-Filter > OOS WR ohne Filter.

**Testmethode:** Walk-Forward A/B
**Ergebnis:** +23pp OOS WR (dominierender Faktor)
**Status:** VALIDIERT
**Quelle:** Faber (2007) "A Quantitative Approach to Tactical Asset
Allocation"

---

### RH-2 | VIX moduliert Momentum-Qualitaet
**Aussage:** IC(momSc) bei VIX < 20 > IC(momSc) bei VIX > 20.

**Testmethode:** IC-Analyse (VIX-segmentiert)
**Trigger:** ~20 Snapshots mit VIX-Feld (im Archiv vorhanden)
**Status:** ausstehend

---

### RH-3 | Yield Curve Slope als Zyklusphase-Indikator
**Aussage:** VIX x curve_slope_bps (Hansen 2021) erkennt Zyklusphase
(Early/Mid/Late/Recession) valide fuer Portfolio-Allokation.

**Testmethode:** Portfolio-Backtest (2+ Jahre Daten benoetigt)
**Status:** ausstehend (langfristig, Daten noch nicht ausreichend)
**Quelle:** Hansen (2021) "Business Cycle Phases"

---

### RH-4 | 50MA Hard Gate verbessert OOS Win Rate
**Aussage:** OOS WR mit 50MA-Filter (BUY nur wenn price > 50MA) >
Baseline ohne 50MA-Filter.

**Testmethode:** Walk-Forward (TM-02)
**Implementiert:** score.py v1.4.1 ab 01.06.2026
**Validierung laeuft:** Ergebnis nach ~10 Datenpunkten
**Status:** AKTIV (laeuft seit 01.06.2026)
**Quelle:** Minervini Trend Template; Faber (2007)

---

### RH-5 | Sektor-Momentum hat positiven IC auf Sektor-Returns
**Aussage:** IC(Sektor-Rang sr, Sektor-Forward-Return) > 0.

**Testmethode:** Sektor-IC-Test
**Datenbedarf:** sr-Feld im Archiv (vorhanden ab Snapshot 1) +
Sektor-ETF-Preise
**Ergebnis:** IC = -0.157 *** (14d-Fenster, 06.06.2026)
             Richtung: Rang 1 (bester Sektor) -> hoehere Stock-Returns
**Status:** VALIDIERT (Sektor-IC-Test, 06.06.2026)
**Quelle:** Moskowitz/Grinblatt (1999), Mamais (2025)
**Naechster Schritt:** sektor_ic_historisch.py (historische Validierung 2020-2026)

**Historischer Backtest (07.06.2026):** sektor_ic_historisch.py
Zeitraum: Jan 2020 - Mai 2026 (77 Monate), Forward-Fenster: 21 Tage
ICIR = -0.209 | t = -1.834 | p < 0.05 (einseitig)
Top-4-Sektoren: +2.09%/M vs. Bottom-4: +1.06%/M (Spread +1.03%/M)
Einschraenkung: Harvey/Liu/Zhu (t>3.0) nicht erfuellt.
Signal horizon-abhaengig: 14d-Fenster (Live-Test) staerker als 21d.
Phase-4-Entscheidung: Schattenmodell GO, Produktion ausstehend (P4-Rerun Juli 2026)

---

### RH-6 | mom3m_ret < -10% als BUY-Daempfer
**Aussage:** Kein BUY wenn 3M-Return < -10% verbessert OOS WR.

**Testmethode:** Walk-Forward (TM-01)
**Datenbedarf:** m3-Feld im Archiv (vorhanden ab Snapshot 5)
**Status:** ausstehend (Daten vorhanden, kein Score-Impact)

---

## FH -- Faktor-Hypothesen (Fundamentals)

### FH-1 | Owner Earnings Yield IC > 0
**Aussage:** Spearman-IC(owner_earnings_yield, Return_6M) > 0, t > 3.0.

**Ergebnis:** IC = +0.155 ***
**Status:** VALIDIERT (Annual IC-Analyse, Mai 2026)
**Quelle:** Buffett/Munger Owner Earnings-Konzept; Novy-Marx (2013)

---

### FH-2 | EV/EBIT invers korreliert mit Forward Returns
**Aussage:** IC(ev_ebit, Return_6M) < 0 (hoch EV/EBIT = teuer =
schlechter Return), |IC| > 0, t > 3.0.

**Ergebnis:** IC = -0.143 *** (Richtung korrekt: hoch = schlecht)
**Status:** VALIDIERT (Annual IC-Analyse, Mai 2026)
**Quelle:** Greenblatt (2006) Magic Formula, Earnings Yield

---

### FH-3 | FCF Yield IC > 0
**Aussage:** Spearman-IC(fcf_yield, Return_6M) > 0.

**Ergebnis:** IC = +0.062, IC-IR = 1.39 (stabilst aller Faktoren)
**Status:** VALIDIERT (Annual IC-Analyse, Mai 2026)
**Quelle:** Novy-Marx (2013)

---

### FH-3b | FCF-Trend (YoY) hat hoeheren IC als FCF-Yield Stichtagswert

**Aussage:** IC(fcf_trend_yoy, Return_6M) > IC(fcf_yield, Return_6M)

FCF-Trend-Wachstum ist ein besserer Praediktor fuer Forward Returns
als der reine Stichtagswert.

**Begruendung:** PSX (Sprint 26): FCF/share sank von 18.19 (2021) auf 0.30 (2025).
Stichtagswert zeigte keine Warnung; Trendwert haette den Rueckgang sichtbar gemacht.
fcf_trend_yoy < -30% signalisiert Qualitaetsabnahme; > +20% operativen Leverage.

**Messgroessen (AKTUALISIERT 15.06.2026):**

  fcft (Produktion, Scoring):
    = (annual_FCF_t0 - annual_FCF_t1) / |annual_FCF_t1|
    Quelle: tk.cashflow (Jahresabschluss, col[0] vs. col[1])
    Benoetigt: >= 2 Jahres-Spalten | |t1| > 1 Mio.
    Update-Frequenz: ~1x/Jahr (mit Jahresabschluss)
    Archiv-Feld: fcft

  fcft_q (Test, IC-Analyse):
    = (Q_aktuell - Q_vorjahr_gleiches_Quartal) / |Q_vorjahr|
    Quelle: tk.quarterly_cashflow (col[0] vs. col[4])
    Benoetigt: >= 5 Quartals-Spalten | |col[4]| > 1 Mio.
    Update-Frequenz: ~4x/Jahr (mit Earnings-Saison)
    Archiv-Feld: fcft_q

**Kein Scoring-Einfluss** beider Felder bis IC-Bestaetigung.

**Zwei Testpfade (gemaess MH-3):**

  FH-3b-H | Historischer Test (Pfad H):
    Methode: ic_analysis_historical.py
    Praediktor: fcf_trend_annual aus yfinance Jahresabschluessen 2015-2025
    N: 305 Ticker x 10 Jahreszeitpunkte = 3050 Obs.
    ICIR: valide (10 unabh. Jahreszeitpunkte)
    Trigger: ic_analysis_historical.py geschrieben (~Aug 2026)
    Vergleich: IC(fcft_H) > IC(fcf_yield) aus FH-3 (0.062)

  FH-3b-P | Prospektiver Test (Pfad P):
    Methode: ic_analysis.py auf Snapshot-Archiv
    Praediktor: fcft_q (Same-Quarter YoY, 4x/Jahr)
    Update: ~4x/Jahr mit Earnings-Saison
    ICIR: 8 unabh. Punkte erreichbar ~Feb/Maerz 2027
    Trigger: 6M Forward-Return ab Dez 2026
    Einschraenkung: fcft (annual) nur 1x/Jahr -> kein ICIR bis 2027

**Signifikanzschwelle:** |IC| > 0.05, t > 3.0 (MH-1)
**Status:** Daten bereit (fcft: 0->~280/305 nach run_daily; fcft_q: neu)
**Abhaengigkeit:** FH-3 validiert (erfuellt)

**Quellen:**
- Novy-Marx (2013) JFE: Profitabilitaet als Qualitaetsproxy
- Chan/Karceski/Lakonishok (2003) JFQA: Persistenz von Wachstumsraten
- Buffett/Berkshire (2024 Letter): struktureller FCF-Rueckgang als Qualitaets-Warnsignal

---

### FH-4 | Piotroski-Filter verbessert Rendite-Selektion
**Aussage:** IC(piotroski_score, Return_6M) > 0, t > 3.0.

**Testmethode:** IC-Analyse (Pfad H + Pfad P, gemaess MH-3)
**Pfad H:** ic_analysis_historical.py (~Aug 2026)
**Pfad P:** 6M Forward-Return ab Dez 2026
**Status:** ausstehend
**Quelle:** Piotroski (2000) F-Score; 34.1% vs. 7.8% Return (1976-1996)

---

### FH-5 | Real FCF Yield hat hoeheren IC als nominaler FCF Yield
**Aussage:** IC(fcf_yield - breakeven_inflation) > IC(fcf_yield).

**Abhaengigkeit:** INF-01 (breakeven_inflation per Snapshot im Archiv)
**bri im Archiv:** ab 15.06.2026 (archive_update.py v1.5)
**Status:** ausstehend (INF-01 noch offen fuer historische Werte)

---

### FH-6 | Konsistenz-Score hat positiven IC
**Aussage:** IC(multi-year ROCE-Stabilitaet, Return_6M) > 0.

**Status:** LANGFRISTIG/OFFEN (umklassifiziert 14.06.2026)
**Begruendung:** ROCE-Stabilitaet erfordert 5+ Jahre ROCE-Zeitreihe pro Ticker.
Kein realistischer Trigger mit aktuellem System vor 2030.
Snapshot-Akkumulation zu langsam; historischer yfinance-Abruf aufwaendig
und nicht in fund_juno implementiert.
**Quelle:** Buffett (2024 Annual Letter): ROE ueber min. eine Wirtschaftsphase

---

### FH-7 | Accruals-Malus verbessert Rendite-Selektion
**Aussage:** IC(accruals_ok = False -> Abschlag, Return_6M) negativ
auf Forward Returns bei Aktien mit hohen Accruals.

**Testmethode:** IC-Analyse (Pfad H + P, gemaess MH-3)
**Pfad H:** ic_analysis_historical.py (~Aug 2026)
**Pfad P:** acr-Feld im Archiv ab Snapshot 5; Forward-Return ab Dez 2026
**Status:** ausstehend

**CAVEAT (Recherche 01.06.2026):**
Sloan (1996) beschreibt starken Effekt; jedoch:
- Post-2002 deutlich abgeschwaecht (Analysten liefern Cash-Flow-Forecasts)
- International: Signifikant nur US/UK/AU/CA -- NICHT in DE/JP/EM
- StockIQ-Universe ist qualitaets-vorselektiert -> weiterer Daempfer
Erwartetes IC im StockIQ-Universe: gering bis null.

---

### FH-8 | Net Buyback Yield hat positiven IC
**Aussage:** IC(shares_change_yoy < 0, Return_6M) > 0.

**Status:** BLOCKIERT (14.06.2026)
**Blocker:** shares_change_yoy = bool (True/False) in fund_juno + archive_update.
IC-Berechnung erfordert kontinuierlichen Float-Wert (z.B. -0.03 fuer 3% Rueckkauf).
**Naechster Schritt:** fund_juno + archive_update.py: bool -> float (Sprint 41 P1)
**Quelle:** Accelerate Research: Net Buyback Yield outperformed Div Yield

---

### FH-9 | Gross Profitability hat positiven IC
**Aussage:** IC((Revenue - COGS) / Total Assets, Return_6M) > 0.

**Status:** BLOCKIERT (14.06.2026)
**Blocker:** Gross Profitability-Feld fehlt in fund_juno (nicht implementiert).
Erst nach FH-1..8-Abschluss sinnvoll (Ressourcen-Priorisierung).
**Quelle:** Novy-Marx (2013) "The Other Side of Value", JFE 108(1)

---

## TR -- Technische Regel-Hypothesen

### TR-1 | Kein BUY unter eigenem 200MA verbessert Outcome
**Aussage:** OOS WR mit SMA200-Filter > Baseline ohne Filter.

**Ergebnis:** VALIDIERT (identisch mit RH-1; SPY-Filter und
eigener 200MA-Filter getrennt getestet)
**Status:** VALIDIERT

---

### TR-2 | Kein BUY unter eigenem 50MA verbessert Outcome
**Aussage:** OOS WR mit 50MA-Gate > Baseline.

**Status:** AKTIV (= RH-4, laeuft seit 01.06.2026)

---

### TR-3 | Trendwechsel-Bestaetigung verbessert Entry gegenueber statischem Gate
**Aussage:** BUY-Signal erst nach Kreuzung price > 50MA von unten
(nicht nur statisches Gate) erzielt besseren OOS-Entry.

**CAVEAT:** Kein starker akademischer Beleg fuer "Kreuzung von unten"
als ueberlegener Entry vs. statischem Gate.
**Trigger:** nach TR-2-Validierung (Walk-Forward)
**Status:** ausstehend (nicht implementiert)

---

## SR -- Sonderregel-Hypothesen

### SR-1 | HC-Filter verbessert Hold-Return
**Aussage:** Positionen mit cSc + Qualitaet ueber Schwellenwert
bei voruebergehendem Kursrueckgang NOT zu verkaufen verbessert
Total Return vs. Sell-and-Replace.

**Testmethode:** WL3 Signal-Tracking (Outcome nach 3/6/12M)
**Trigger:** WL3 Run 3 (mindestens 2 vollstaendige Zyklen)
**Status:** ausstehend

---

### SR-2 | DR-Filter verbessert Total Return bei Dividendentiteln
**Aussage:** Kein SELL wenn Dividendenrendite > Anleihenrendite +
Risikoaufschlag verbessert Total Return vs. alternatives Portfolio.

**Testmethode:** WL3 Signal-Tracking
**Trigger:** WL3 Run 3+
**Status:** UMSTRITTEN (abhaengig von INF-01 fuer reale Anleihenrendite)

---

## PH -- Parameter-Hypothesen

### PH-1 | BUY-Schwelle cSc >= 70 ist optimal
**Testmethode:** Walk-Forward Parametertest
**Trigger:** nach SH-1-Bestaetigung
**Status:** ausstehend

---

### PH-2 | Aktuelle Gewichtung (fSc 35% / momSc 25% / trend 20% / rSc 20%) ist optimal
**Testmethode:** Walk-Forward nach IC-Analyse
**Trigger:** nach FH-1..8 IC-Ergebnissen (~Snapshot 30+)
**Status:** ausstehend

---

### PH-3 | Sektor-adjustiertes Scoring verbessert IC
**Ergebnis:** OOS -2.7pp | Stab +3.2pp | F3=46.7% (K.O.)
**Status:** WIDERLEGT (06.06.2026) -- siehe WH-4

---

### PH-4 | Gestuftes Position-Sizing erhoeht Portfolio-Return

**Aussage:** Dreistufiges, risikoprofil-abhaengiges Sizing
(Voll/Halb/Starter nach sig/sc/sr + Nutzerprofil) erzielt hoehere
simulierten Portfolio-Return als Gleichgewichtung aller BUY-Signale.

**Regelwerk (profilabhaengig):**
  Rendite-max:
    Voll  (1.0x): sig=strong ODER sig=buy+sc>=75+sr<=4
    Halb  (0.5x): sig=buy+sc<75 ODER sig=pb
    Start (0.25x): sig=buy_rsi_warn

  Ausgewogen:
    Voll  (1.0x): sig=strong
    Halb  (0.5x): sig=buy+sc>=75+sr<=4
    Start (0.25x): sig=buy+sc<75 ODER sig=buy_rsi_warn

  Kapitalerhalt:
    Voll  (1.0x): sig=strong+sc>=75
    Halb  (0.5x): sig=strong+sc<75
    Start (0.25x): alle anderen BUY-Signale

**Datenbedarf:** sig, sc, sr im Archiv (ab Snap 1).
  ca. 50 abgeschlossene BUY-Exits.

**Status:** ausstehend
**Trigger:** ca. 50 BUY-Exits abgeschlossen (~Jan 2027)
**Voraussetzung:** SH-2 validiert + Onboarding-Profil vorhanden

---

## WH -- Widerlegte / Geschlossene Hypothesen

### WH-1 | RSI Entry-Filter verbessert OOS Win Rate
**Ergebnis:** NULL OOS-Effekt. Auch Hysterese-Varianten getestet.
**Status:** WIDERLEGT

---

### WH-2 | Bond-Regime Entry-Daempfer verbessert OOS Win Rate
**Ergebnis:** -3.2 bis -3.9pp OOS WR vs. Baseline
**Status:** WIDERLEGT

---

### WH-3 | Statischer Score-Filter (cSc >= 65) verbessert Walk-Forward
**Ergebnis:** -3pp OOS WR.
**Status:** WIDERLEGT
**Lernprinzip:** Statische Scores sind NICHT rueckwirkend anwendbar.

---

### WH-4 | sektorFactor Entry-Filter verschlechtert OOS Win Rate
**Ergebnis:** OOS -2.7pp | Stab +3.2pp | F3=46.7% (K.O.)
Baseline: 57.6% OOS | Filter: 54.9% OOS | n=144 vs. 295
**Status:** WIDERLEGT (06.06.2026)
**Schlussfolgerung:** ETF-Level-IC impliziert nicht bessere
Stock-Level-Entry-Qualitaet.

---

### WH-5 | sw=False vs. sw=True bei HOLD->BUY (TU-2) -- GESCHLOSSEN
**Aussage (urspruenglich TU-2):** sw=False HOLD->BUY uebertrifft
sw=True HOLD->BUY im Return.

**Status:** GESCHLOSSEN -- strukturell unmoeglich (15.06.2026)
**Befund:** sw_pre_entry=True ist bei BUY-Signal per Systemlogik
ausgeschlossen. MACD-Primaerpfad erfordert sw=False (hist >= 0)
fuer jedes BUY-Signal. sw_pre_entry=True kann nie auftreten.
**Kein Datenproblem** -- Hypothesen-Design-Fehler.
**Lernprinzip:** Pre-Test-Logik-Konsistenz-Check (F4) ist Pflicht
vor jeder Hypothesen-Formulierung.

---

## AH -- Allokations-Hypothesen

### AH-1 | Bond Safe-Haven-Funktion strukturell beeintraechtigt
**Aussage:** Im aktuellen Fiskaldominanz-Regime (Korrelation SPY/TLT > 0)
erfuellt TLT die klassische Hedge-Funktion nicht mehr.

**Testmethode:** Beobachtung: rolling 12M Korr(SPY, TLT) >= 0
               in naechstem Rezessionsfenster (SPY<200MA + VIX>25, >=4W)
**Trigger:** Naechste Rezession (nicht vor 2027 erwartet)
**Status:** AKTIV (seit 06.06.2026)
**Implementiert:** ALLOC_TARGETS Ausgewogen Rezession: bonds=18, gold=21, cash=26
**Quellen:** Shiller (1871-2025), WGC (2025), Bekaert/Engstrom (2010),
            Berkshire Q1 2026 (Buffett/Abel Kommentar Kassenbestand)

---

## Testplan-Kalender

| Zeitpunkt | Hypothesen | Methode | Voraussetzung |
|-----------|-----------|---------|---------------|
| ~Aug 2026 | FH-3b-H, FH-4-H, FH-7-H | ic_analysis_historical.py | Script schreiben |
| ~Aug 2026 | TU-1 Re-Test | signal_returns.csv | offene Pos. filtern |
| ~Jul 2026 | RH-5 P4-Rerun | sektor_ic | ~30 Snapshots |
| Laufend | RH-4, TR-2 | Walk-Forward | laeuft seit 01.06.2026 |
| ~Dez 2026 | Erste 6M Forward-Returns | -- | p-Feld ab Jun 2026 |
| ~Feb 2027 | SH-1, FH-3b-P, SH-3 | ic_analysis.py | 6M Forward + fcft_q |
| ~Jan 2027 | PH-4 | Simulation | ~50 BUY-Exits |
| Nach INF-01 | FH-5, SR-2 | IC-Analyse | breakeven_inflation hist. |
| Nach TR-2 | TR-3 | Walk-Forward | TR-2 validiert |

---

## Archiv-Felder fuer IC-Berechnung

| Archiv-Feld | Hypothesen | Verfuegbar ab | Update-Freq. |
|-------------|-----------|---------------|--------------|
| sc | SH-1, SH-3 | Snapshot 1 | taeglich |
| sr | RH-5 | Snapshot 1 | taeglich |
| p (price) | SH-1, FH-* (Forward-Return) | Snapshot 5 | taeglich |
| p50 | RH-4, TR-2 | Snapshot 5 | taeglich |
| m3 | RH-6 | Snapshot 5 | taeglich |
| msc | RH-2, SH-3 | Snapshot 120+ (15.06.2026) | taeglich |
| oe | FH-1 | Snapshot 5 | ~1x/Jahr |
| ev_eb | FH-2 | Snapshot 5 | ~1x/Jahr |
| fcf | FH-3 | Snapshot 5 | ~1x/Jahr |
| fcft | FH-3b (Produktion) | Snapshot 121+ (15.06.2026) | ~1x/Jahr |
| fcft_q | FH-3b-P (Test) | Snapshot 121+ (15.06.2026) | ~4x/Jahr |
| pio | FH-4 | Snapshot 5 | ~1x/Jahr |
| rfcf | FH-5 | Snapshot 120+ (15.06.2026) | ~1x/Jahr |
| acr | FH-7 | Snapshot 5 | ~1x/Jahr |
| vix | RH-2 (snap-Ebene) | Snapshot 120+ (15.06.2026) | taeglich |
| bri | FH-5, SR-2 (snap-Ebene) | Snapshot 120+ (15.06.2026) | taeglich |

---

## Methodische Leitlinien

**IC-Interpretation:**
- IC 0.02-0.05: schwaches Signal
- IC 0.05-0.10: moderates Signal (praxisrelevant)
- IC 0.10-0.15: starkes Signal (aussergewoehnlich)
- IC > 0.15: sehr stark (StockIQ: OE IC=+0.155 liegt hier)

**Zwei Testpfade (MH-3):**
- Pfad H (Historisch): sofort testbar, yfinance 10 Jahre, ICIR valide
- Pfad P (Prospektiv): ab Dez 2026, Snapshot-basiert, ICIR nur bei
  haeufig updatendenden Feldern (msc, fcft_q) bis Feb 2027 erreichbar

**Walk-Forward-Bewertung:**
- Primaeres Kriterium: Stabilitaet (pp-Spanne)
- Sekundaeres Kriterium: OOS WR
- Kein Fenster unter 50% als Mindestanforderung

**Falsifikation als Fortschritt:**
Widerlegte Hypothesen (WH-*) dokumentieren, was NICHT funktioniert.

---

## Akademische Quellen (kumuliert)

| Quelle | Hypothesen | Relevanz |
|--------|-----------|---------|
| Faber (2007) Tactical Asset Allocation | RH-1, TR-1 | SMA200-Filter empirisch |
| Jegadeesh/Titman (1993) | SH-1, FH | Skip-Month Momentum |
| Daniel/Moskowitz (2016) | FH | Volatility-adjusted Momentum |
| Novy-Marx (2013) JFE | FH-1, FH-9 | Gross Profitability |
| Piotroski (2000) JAR | FH-4 | F-Score |
| Sloan (1996) TAR | FH-7 | Accruals (post-2002 abgeschwaecht) |
| Harvey/Liu/Zhu (2016) JoF | MH-1 | Multiple Testing t>3.0 |
| Moskowitz/Grinblatt (1999) | RH-5 | Sektor-Momentum |
| Hansen (2021) | RH-3 | VIX x Yield Curve Zyklusphase |
| Asness (2003) AQR | SR-2 | Fed Model Kritik |
| Damodaran (2025) | FH | PEG-Ratio-Methodik |
| Buffett/Berkshire (2024 Letter) | FH-1, FH-6 | Owner Earnings, Konsistenz |
| Greenblatt (2006) | FH-2 | Magic Formula EV/EBIT |
| Asness/Moskowitz/Pedersen (2013 JF) | SH-3 | Value + Momentum Everywhere |
| Bauer/Mertens (2018 FRBSF) | RH-3 | Yield Curve prediziert Rezessionen |
| Daniel/Moskowitz (2016 JFE) | RH-2 | Momentum Crashes bei hohem VIX |
| Peyer/Vermaelen (2009 RoFS) | FH-8 | Net Buyback Yield Outperformance |
| Ilmanen (2003 JFI) | AH-1 | Bond-Equity-Korrelation zeitvariabel |
| Bekaert/Engstrom (2010 JFE) | AH-1, SR-2 | Zeitvariable Bond-Equity-Korrelation |
| WGC (2025 Annual Report) | AH-1 | Gold als Safe-Haven im Fiskaldominanz-Regime |
| Chan/Karceski/Lakonishok (2003) JFQA | FH-3b | Persistenz von FCF-Wachstumsraten |

---

## Offene Dokumentationskorrektur (AR-T2)

Signal-Architektur score.py (07.06.2026 entdeckt):
Primaerpfad (MACD): buy/strong/pb/buy_rsi_warn/watch/watch_rsi/sell/sell_zl/sell_ma/sell_hist
Fallback (kein MACD): score>=70+50MA->buy | score>=55->hold | score>=40->watch | score<40->sell
Bisherige Doku beschrieb Fallback-Schwellen als Hauptmodell -- FALSCH.

---

*StockIQ Hypothesenbaum | Version 1.5 | 15. Juni 2026*
*Naechste geplante Aktualisierung: nach ic_analysis_historical.py Ergebnis (~Aug 2026)*
