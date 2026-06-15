# StockIQ — Testdesign-Review
**Datum:** 2026-06-15 | **Auslöser:** TU-1/TU-2 GAU | **Status: PFLICHTLEKTÜRE vor jedem Test**

---

## Hintergrund

TU-1-Analyse hat gezeigt: Das Testdesign war von Anfang an fehlerhaft.
- `sw_pre_entry` misst sw beim BUY-Einstieg, nicht während der HOLD-Phase
- `sw_pre_entry=True` ist durch die Signallogik strukturell unmöglich bei BUY
- Ergebnis: Daten gesammelt, die den Test nie ermöglichen konnten

**Konsequenz:** Jede ausstehende Hypothese wird jetzt auf dieselben
Fehlerklassen geprüft, bevor weitere Daten gesammelt oder Tests durchgeführt werden.

---

## Fehlerklassen (Taxonomie)

| Code | Bezeichnung | Beschreibung |
|------|-------------|--------------|
| F-1 | Feld fehlt im Archiv | Benötigtes Datenfeld wird nicht von archive_update.py gespeichert |
| F-2 | Feld nicht in fund_juno | Grundlagendaten fehlen in der Quelle |
| F-3 | Strukturell unmöglich | Testdesign widerspricht der Systemlogik |
| F-4 | Script fehlt | Daten vorhanden, Analyse-Script nicht geschrieben |
| F-5 | Daten noch nicht gereift | Feld vorhanden, aber Forward-Window noch nicht abgelaufen |
| F-6 | Abhängigkeit nicht erfüllt | Vorgelagerte Hypothese nicht validiert |
| F-7 | Spaltennamen-Drift | CSV-Schema geändert ohne Dokumentation |
| OK  | Testbereit | Alle Voraussetzungen erfüllt |

---

## Archiv-Felder (Ist-Stand, archive_update.py v1.3)

Verfügbar pro Ticker-Eintrag ab Snapshot 5 (01.06.2026):
`t, sig, sc, sr, p, p50, m3, oe, ev_eb, fcf, pio, acr, prev_sig, delta_sc, sw, fsc`

**NICHT im Archiv (obwohl für Tests benötigt):**
- `momSc` (Momentum-Subscore) — nur cSc (sc) gespeichert
- `vix` per Snapshot — nur in `__macro__` (aktueller Tageswert)
- `fcf_trend_yoy` — noch nicht implementiert
- `shares_change_yoy` — nicht bestätigt
- `breakeven_inflation` per Snapshot — nur in `__macro__`
- ROCE-Zeitreihe — nicht trackbar aus Einzelsnapshots

---

## Hypothesen-Review

### SH-1 | cSc IC auf 6M Forward Returns
| Prüfpunkt | Status |
|-----------|--------|
| sc im Archiv | ✓ ab Snap 1 |
| p im Archiv | ✓ ab Snap 5 |
| 6M Forward Return berechenbar | ✓ (p_t+6M / p_t) ab Dez 2026 |
| ic_analysis.py vorhanden | ✗ nicht geschrieben |
| Testdesign korrekt | ✓ |

**Fehler: F-4.** Daten sammeln korrekt. Script fehlt.
**Pre-Test:** Prüfen ob sc und p beide nicht-null für >95% der Ticker in letzten 5 Snaps.

---

### SH-3 | Multifaktor schlägt Einzel-Faktor
| Prüfpunkt | Status |
|-----------|--------|
| sc (cSc) im Archiv | ✓ |
| oe, ev_eb, fcf im Archiv | ✓ ab Snap 5 |
| momSc (Momentum-Subscore) im Archiv | ✗ FEHLT |
| ic_analysis.py vorhanden | ✗ nicht geschrieben |

**Fehler: F-1 + F-4.** `momSc` wird nie gespeichert — nur der kombinierte `sc`.
Ohne momSc kann Einzel-Faktor Momentum nicht isoliert werden.
**Empfehlung:** Entweder momSc in Archiv ergänzen ODER Test-Definition ändern
auf oe/ev_eb/fcf-IC vs. cSc-IC (ohne Momentum-Komponente).

---

### RH-2 | VIX moduliert Momentum-Qualität
| Prüfpunkt | Status |
|-----------|--------|
| momSc im Archiv | ✗ FEHLT |
| VIX per Snapshot im Archiv | ✗ FEHLT (nur aktueller Tageswert) |
| ic_analysis.py vorhanden | ✗ |

**Fehler: F-1 (doppelt).** Beide benötigten Felder fehlen im Archiv.
**Empfehlung:** VIX und momSc in archive_update.py ergänzen BEVOR weitere
Snapshots gesammelt werden. Jeder verpasste Snapshot ist unwiederbringlich.
**Priorität: HOCH** — Datenverlust läuft täglich.

---

### RH-4 / TR-2 | 50MA Hard Gate (laufend)
| Prüfpunkt | Status |
|-----------|--------|
| Walk-Forward via alpha_juno | ✓ |
| Implementiert seit | ✓ score.py v1.4.1, 01.06.2026 |
| Testdesign korrekt | ✓ |

**Fehler: keiner.** Walk-Forward läuft korrekt. **Status: OK**

---

### RH-6 | mom3m_ret < -10% als BUY-Dämpfer
| Prüfpunkt | Status |
|-----------|--------|
| m3 im Archiv | ✓ ab Snap 5 |
| Walk-Forward via alpha_juno | ✓ |
| Testdesign korrekt | ✓ |

**Fehler: keiner.** Voraussetzungen erfüllt. **Status: OK**
**Pre-Test:** m3 null-Rate in letztem Snapshot prüfen (<5% erwartet).

---

### FH-3b | FCF-Trend YoY IC > FCF-Yield IC
| Prüfpunkt | Status |
|-----------|--------|
| fcf_trend_yoy in fund_juno | ✓ v7.9.38 implementiert |
| fcf_trend_yoy im Archiv | ✗ FEHLT (nicht in archive_update.py) |
| 6M Forward Return | ✗ F-5 (erst Dez 2026) |

**Fehler: F-1.** fund_juno berechnet das Feld, aber archive_update.py
speichert es nicht. Jeder vergangene Snapshot fehlt für den Test.
**Priorität: HOCH** — sofort in archive_update.py ergänzen.

---

### FH-4 | Piotroski-Filter IC > 0
| Prüfpunkt | Status |
|-----------|--------|
| pio im Archiv | ✓ ab Snap 5 |
| 6M Forward Return | ✗ F-5 (erst Dez 2026) |
| ic_analysis.py | ✗ F-4 |

**Fehler: F-4 + F-5 (zeitbedingt).** Daten sammeln korrekt. Warten auf
Forward-Return-Reife und Script.

---

### FH-5 | Real FCF Yield IC > nominaler FCF Yield IC
| Prüfpunkt | Status |
|-----------|--------|
| fcf im Archiv | ✓ ab Snap 5 |
| breakeven_inflation per Snapshot | ✗ FEHLT im Archiv |
| INF-01 (P6a-Fix) | ✗ blockiert |

**Fehler: F-1 + F-6.** breakeven_inflation ist in `__macro__` vorhanden,
aber nicht per Snapshot im Archiv gespeichert. Für historischen IC-Vergleich
muss der Zeitpunkt-Wert bekannt sein.
**Empfehlung:** breakeven_inflation in archive_update.py ergänzen.

---

### FH-6 | Konsistenz-Score ROCE-Stabilität IC > 0
| Prüfpunkt | Status |
|-----------|--------|
| ROCE-Zeitreihe in fund_juno | ✗ nicht multi-year trackbar |
| Konsistenz-Score berechenbar | ✗ braucht 5+ Jahre ROCE-Geschichte |

**Fehler: F-2.** ROCE aus einem Snapshot ist kein Stabilitätsmaß.
Multi-Year-Stabilität braucht entweder historische yfinance-Abfrage
(verfügbar, aber aufwändig) oder jährliche Snapshot-Akkumulation (5 Jahre!).
**Empfehlung:** Hypothese in "langfristig/offen" umklassifizieren.
Kein Trigger definierbar mit aktuellem System.

---

### FH-7 | Accruals-Malus IC
| Prüfpunkt | Status |
|-----------|--------|
| acr im Archiv | ✓ ab Snap 5 |
| 6M Forward Return | ✗ F-5 (erst Dez 2026) |
| ic_analysis.py | ✗ F-4 |

**Fehler: F-4 + F-5 (zeitbedingt).** Daten sammeln korrekt.

---

### FH-8 | Net Buyback Yield IC > 0
| Prüfpunkt | Status |
|-----------|--------|
| shares_change_yoy in fund_juno | ✓ seit v7.9.x |
| shares_change_yoy im Archiv | ? NICHT BESTÄTIGT |
| 6M Forward Return | ✗ F-5 |

**Fehler: F-1 (unbestätigt) + F-5.** Sofort prüfen ob
shares_change_yoy in archive_update.py gespeichert wird.
**Pre-Test PFLICHT:** Letzten Snapshot öffnen, Feld suchen.

---

### FH-9 | Gross Profitability IC > 0
| Prüfpunkt | Status |
|-----------|--------|
| Gross Profitability in fund_juno | ✗ nicht implementiert |
| Feld im Archiv | ✗ |

**Fehler: F-2.** Keine Daten. Kein Trigger sinnvoll.
**Empfehlung:** Erst nach FH-1..8 Abschluss (Ressourcen-Priorisierung).

---

### SR-1 | HC-Filter
| Prüfpunkt | Status |
|-----------|--------|
| WL3 Signal-Tracking | ✓ läuft |
| Mindestens 2 WL3-Zyklen | ✗ erst WL3 Run 3 (Mitte Juli 2026 erste Daten) |

**Fehler: F-5 (zeitbedingt).** Testdesign korrekt. Warten.

---

### SR-2 | DR-Filter
| Prüfpunkt | Status |
|-----------|--------|
| INF-01 behoben | ✗ blockiert |
| breakeven_inflation im Archiv | ✗ F-1 |

**Fehler: F-1 + F-6.**

---

### PH-4 | Position Sizing
| Prüfpunkt | Status |
|-----------|--------|
| sig, sc, sr in signal_returns.csv | ? prüfen |
| fsc_at_entry in signal_returns.csv | ✓ |
| 50 BUY-Exits abgeschlossen | ✗ F-5 (ca. Jan 2027) |
| Risikoprofil aus localStorage | ✓ Onboarding vorhanden |
| return_pct (Exit-Return) | ✓ tracking läuft |

**Fehler: F-5 (zeitbedingt).** Daten sammeln korrekt, Exit-Zahl fehlt noch.
**Pre-Test:** Spalten sig, sc, sr in signal_returns.csv prüfen.

---

### TU-2 | sw=False vs. sw=True bei HOLD→BUY
**Fehler: F-3 (strukturell unmöglich).**
BUY-Signal erfordert sw=False per Signallogik (MACD positiv = hist<0 False).
sw_pre_entry=True kann bei BUY-Einstieg nie auftreten.
**Status: GESCHLOSSEN.** Hypothese aus Testplan entfernen.

Mögliche Reformulierung: "sw-Wert während HOLD-Phase (sw_at_hold_entry)
korreliert mit HOLD→BUY Return" — braucht neues Feld.

---

## Zusammenfassung Fehlermatrix

| Hypothese | Fehlerklasse | Blockiert | Maßnahme |
|-----------|-------------|-----------|----------|
| SH-1 | F-4 | Nein (Daten OK) | ic_analysis.py schreiben |
| SH-3 | F-1 + F-4 | Ja (momSc fehlt) | momSc ins Archiv |
| RH-2 | F-1 (2x) | Ja (2 Felder fehlen) | momSc + VIX ins Archiv |
| RH-4/TR-2 | — | — | OK, läuft |
| RH-6 | — | — | OK |
| FH-3b | F-1 | Ja (Archiv-Feld fehlt) | fcf_trend_yoy ins Archiv |
| FH-4 | F-4 + F-5 | Zeit | ic_analysis.py |
| FH-5 | F-1 + F-6 | Ja | breakeven_inflation ins Archiv |
| FH-6 | F-2 | Ja (grundsätzlich) | Umklassifizieren |
| FH-7 | F-4 + F-5 | Zeit | ic_analysis.py |
| FH-8 | F-1? + F-5 | Prüfen | Pre-Test jetzt |
| FH-9 | F-2 | Ja | Zurückstellen |
| SR-1 | F-5 | Zeit | Warten |
| SR-2 | F-1 + F-6 | Ja | breakeven_inflation |
| PH-4 | F-5 | Zeit | Warten |
| TU-1 | — | — | NEG. INDIZ, Re-Test Aug 2026 |
| TU-2 | F-3 | Strukturell | GESCHLOSSEN |

---

## Kritische Datenlücken — sofort beheben

**TÄGLICH WACHSENDER VERLUST:** Jeder verpasste Snapshot ist permanent verloren.

### Priorität 1 — archive_update.py sofort ergänzen:
1. `vix` (aus fund_juno __macro__) — für RH-2
2. `momSc` (aus score.py Zwischenergebnis) — für RH-2, SH-3
3. `fcf_trend_yoy` (aus fund_juno) — für FH-3b
4. `breakeven_inflation` (aus fund_juno __macro__) — für FH-5, SR-2

### Priorität 2 — Bestätigung:
5. `shares_change_yoy` im Archiv prüfen — für FH-8

### Priorität 3 — Script:
6. `ic_analysis.py` schreiben — für SH-1, SH-3, FH-4, FH-7 etc.

---

## Pflicht-Pre-Tests (vor jedem künftigen Test)

Für jede Hypothese MUSS vor Teststart folgendes Protokoll durchlaufen werden:

### PRE-TEST CHECKLISTE
```
1. FELD-EXISTENZ:
   Öffne letzten Snapshot aus stockiq_dev_archive.json.
   Prüfe: Existiert jedes benötigte Feld?
   Prüfe: Null-Rate < 5%?

2. WERTE-PLAUSIBILITÄT:
   Prüfe: Wertebereich plausibel?
   Prüfe: Keine systematischen None-Cluster?

3. LOGIK-KONSISTENZ:
   Prüfe: Ist der Testfilter mit der Systemlogik vereinbar?
   (TU-2-Fehler: sw_pre=True ist per Logik ausgeschlossen)

4. SPALTENNAME-CHECK (für CSV-basierte Tests):
   print(df.columns.tolist())
   Abgleich mit erwarteten Spalten dokumentieren.

5. N-PLAUSIBILITÄT:
   Erwartetes N > tatsächliches N? -> Design-Fehler
   Erwartetes N < 30? -> Test noch nicht sinnvoll

6. SCRIPT-EXISTENZ:
   Existiert das Analyse-Script physisch?
   Wurde es gegen Dummy-Daten getestet?
```

---

## Empfehlungen Vorgehen

### Sofort (Sprint 40/41):
1. archive_update.py: 4 Felder ergänzen (vix, momSc, fcf_trend_yoy, breakeven_inflation)
2. FH-8 Pre-Test: shares_change_yoy in Archiv verifizieren
3. TU-2: Aus hypotheses_status.json als "geschlossen/strukturell" markieren
4. Dieses Dokument in Projektdokumentation aufnehmen

### Mittelfristig (bis Aug 2026):
5. ic_analysis.py schreiben (SH-1 Gerüst, erweiterbar)
6. TU-1 Re-Test mit gefilterten offenen Positionen
7. FH-6 als "langfristig/offen" umklassifizieren

### Grundsatz für alle künftigen Hypothesen:
**"Daten zuerst, Hypothese second."**
Vor jeder neuen Hypothese: Pre-Test-Protokoll durchführen.
Ergebnis dokumentieren. Erst dann Datensammlung starten.

---

## Lessons Learned

| # | Lektion |
|---|---------|
| L-1 | Feld in fund_juno ≠ Feld im Archiv. Immer archive_update.py prüfen. |
| L-2 | Systemlogik prüfen bevor Test-Design final. (sw_pre=True unmöglich) |
| L-3 | CSV-Spaltennamen sofort dokumentieren. Bei Änderung: alle Scripts updaten. |
| L-4 | Pre-Test-Protokoll ist nicht optional — es ist der erste Schritt. |
| L-5 | momSc/Sub-Scores: wenn sie für Tests gebraucht werden, müssen sie gespeichert werden. |
| L-6 | "Daten sammeln läuft" ≠ "die richtigen Daten werden gesammelt". |

---
*Dieses Dokument ersetzt keine Einzelhypothesen-Dokumentation,
sondern ist der Querschnitts-Check vor jedem Testlauf.*
