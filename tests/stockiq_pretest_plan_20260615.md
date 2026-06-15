# StockIQ — Pre-Test-Plan
**Datum:** 2026-06-15 | **Version:** 1.0 | **Prio 1 — vor jedem Teststart**

---

## Pre-Test-Schema (gilt für jede Hypothese)

Vor jedem Test MUSS dieses Protokoll durchlaufen und dokumentiert werden.

```
PRE-[ID]:
  Datum:      YYYY-MM-DD
  Durchgefuehrt von: [Analyst]
  Ergebnis:   BEREIT | BLOCKIERT | UMKLASSIFIZIERT

  [F1] Feld-Existenz:
       Erwartetes Feld -> scores.json-Key -> vorhanden? ja/nein
       Erwartetes Feld -> Archiv-Feld     -> vorhanden? ja/nein

  [F2] Null-Rate (letzter Snapshot):
       python: sum(1 for e in snap['entries'] if e.get('FELD') is None)
       Ergebnis: N_null / N_total -> Akzeptiert wenn < 5%

  [F3] Werte-Plausibilitaet:
       Erwarteter Bereich: [MIN, MAX]
       Tatsaechlicher Median, Min, Max aus letztem Snapshot

  [F4] Logik-Konsistenz:
       Ist Testfilter mit Systemlogik vereinbar? ja/nein
       Begruendung wenn nein:

  [F5] N-Ziel:
       Benoetigt: N Events / N Snapshots
       Aktuell: N Events / N Snapshots
       Erreichbar bis: [Datum]

  [F6] Script:
       Analyse-Script vorhanden: ja/nein
       Dateiname:
       Gegen Dummy-Daten getestet: ja/nein

  Blocker (falls BLOCKIERT):
  Naechster Schritt:
```

---

## Hypothesen-Uebersicht mit Pre-Test-Status

| ID | Titel | Pre-Test-Status | Blocker | Prioritaet |
|----|-------|-----------------|---------|------------|
| SH-1 | cSc IC auf 6M Forward Returns | AUSSTEHEND | F4: Script fehlt | B |
| SH-3 | Multifaktor > Einzel-Faktor | BLOCKIERT | F1: msc jetzt im Archiv (pruef.) | A |
| RH-2 | VIX moduliert Momentum | BLOCKIERT | F1: msc+vix (vix OK, msc pruef.) | A |
| RH-4 | 50MA Hard Gate | BEREIT | — | OK |
| RH-6 | mom3m < -10% Daempfer | BEREIT | — | OK |
| FH-3b | FCF-Trend YoY IC | BLOCKIERT | F1: fcf_trend_yoy fehlt | A |
| FH-4 | Piotroski IC | AUSSTEHEND | F4+F5: Script+Zeit | B |
| FH-5 | Real FCF Yield IC | BLOCKIERT | F1: bri jetzt pruef. | A |
| FH-6 | ROCE-Stabilitaet IC | UMKLASSIFIZIERT | F2: strukturell | C |
| FH-7 | Accruals IC | AUSSTEHEND | F4+F5: Script+Zeit | B |
| FH-8 | Net Buyback Yield IC | AUSSTEHEND | F1: buyback-Feld pruef. | A |
| FH-9 | Gross Profitability | BLOCKIERT | F2: field fehlt in fund_juno | C |
| TR-2 | 50MA Gate Walk-Forward | BEREIT | — | OK |
| TR-3 | Trendwechsel-Bestaet. | AUSSTEHEND | F6: warten auf TR-2 | C |
| SR-1 | HC-Filter | AUSSTEHEND | F5: WL3 Run 3 | C |
| SR-2 | DR-Filter | BLOCKIERT | F1+F6: bri + INF-01 | B |
| PH-4 | Position Sizing | AUSSTEHEND | F5: 50 Exits fehlen | B |
| TU-1 | HOLD->BUY WR | NEG.INDIZ | — | Re-Test Aug 2026 |
| TU-2 | sw=False vs True | GESCHLOSSEN | F3: strukturell | — |

---

## Prioritaet A — Sofort nach run_daily (heute)

Diese Pre-Tests pruefen ob B2-Fix (archive_update.py v1.4) korrekt wirkt.
Ausfuehren: nach naechstem run_daily, direkt auf neuem Snapshot.

---

### PRE-SH3/RH2-A | msc-Feld im Archiv

```
ZWECK: Pruefe ob msc (mom_score) jetzt korrekt im Archiv landet.
DATEI: stockiq_dev_archive.json

Ccode:
  python script pre_msc.py:
    import json
    d = json.load(open('stockiq_dev_archive.json'))
    snap = d['snapshots'][0]  # neuester
    e0 = snap['entries'][0]
    felder = ['msc','rfcf','bbk','bri_snap']
    for f in felder:
        vals = [e.get(f) for e in snap['entries']]
        n_none = sum(1 for v in vals if v is None)
        print(f, 'vorhanden:', f in e0,
              'null-rate:', n_none,'/',len(vals))
    # bri auf snap-Ebene
    print('snap.bri:', snap.get('bri'))
    print('snap.vix:', snap.get('vix'))
  python pre_msc.py
  Ausgabe in debugs\debug_pre_a1.txt
```

**Akzeptanzkriterium:**
- msc: vorhanden, null-rate < 15% (manche Ticker ohne Momentum-Daten)
- rfcf, bbk: vorhanden, null-rate < 30%
- snap.bri, snap.vix: beide nicht None

---

### PRE-FH8-A | buyback-Feld = shares_change_yoy?

```
ZWECK: Klaeren ob 'buyback' in scores.json semantisch
       gleich shares_change_yoy ist (FH-8 Datenbasis).

PS:
  python -c "
  import json
  d=json.load(open('stockiq_scores.json'))
  vals=[s.get('buyback') for s in d['scores'] if s.get('buyback') is not None]
  print('N not-null:', len(vals))
  print('Sample:', vals[:5])
  print('Bereich: min', min(vals), 'max', max(vals))
  " >> debugs\debug_pre_a1.txt
```

**Entscheidung:**
- Werte in [-1.0, +1.0] und typisch negativ bei Buyback = ja, FH-8 verwendbar
- Werte > 1.0 oder binär = anderes Feld, Definition klaeren

---

### PRE-FH5-A | breakeven_inflation im Archiv (bri)

```
Enthalten in pre_msc.py oben (snap.bri).
Zusaetzlich: Wertebereich pruefen.
Erwartet: 2.0 - 3.5 (aktuell 2.69 aus debug_s6)
```

---

### PRE-FH3b-A | fcf_trend_yoy in scores.json

```
PS:
  python -c "
  import json
  d=json.load(open('stockiq_scores.json'))
  key='fcf_trend_yoy'
  n=sum(1 for s in d['scores'] if s.get(key) is not None)
  print(key,'not-null:',n,'/',len(d['scores']))
  " >> debugs\debug_pre_a1.txt
```

**Ergebnis:**
- n > 0: Feld vorhanden, archive_update.py um 'fcft' ergaenzen
- n = 0: score.py muss fcf_trend_yoy aus fund_juno durchreichen (naechster Sprint)

---

## Prioritaet B — Bestehende Felder pruefen

Pruefen ob bereits gesammelte Felder vollstaendig und plausibel sind.

---

### PRE-SH1-B | sc + p Vollstaendigkeit

```
Ccode:
  python script pre_sh1.py:
    import json
    d = json.load(open('stockiq_dev_archive.json'))
    snap = d['snapshots'][0]
    n = len(snap['entries'])
    n_sc = sum(1 for e in snap['entries'] if e.get('sc') is not None)
    n_p  = sum(1 for e in snap['entries'] if e.get('p')  is not None)
    print('sc:', n_sc, '/', n)
    print('p: ', n_p, '/', n)
    print('n_snapshots:', d['n_snapshots'])
  python pre_sh1.py
  Ausgabe in debugs\debug_pre_b1.txt
```

**Akzeptanzkriterium:** sc > 95%, p > 90%

---

### PRE-FH4-B | pio Vollstaendigkeit

```
Ergaenzen in pre_sh1.py:
  n_pio = sum(1 for e in snap['entries'] if e.get('pio') is not None)
  print('pio:', n_pio, '/', n)
```

**Akzeptanzkriterium:** pio > 80%

---

### PRE-FH7-B | acr Vollstaendigkeit

```
Ergaenzen in pre_sh1.py:
  n_acr = sum(1 for e in snap['entries'] if e.get('acr') is not None)
  print('acr:', n_acr, '/', n)
```

**Akzeptanzkriterium:** acr > 80%

---

### PRE-PH4-B | signal_returns.csv Spalten

```
PS:
  python -c "
  import pandas as pd
  df=pd.read_csv('stockiq_signal_returns.csv')
  print('Spalten:', df.columns.tolist())
  print('N Zeilen:', len(df))
  for col in ['entry_sig','prev_sig','return_pct','exit_reason','sw_pre_entry']:
      if col in df.columns:
          n=df[col].notna().sum()
          print(col,'not-null:',n,'/',len(df))
      else:
          print(col,'FEHLT')
  " >> debugs\debug_pre_b1.txt
```

---

## Prioritaet C — Strukturell / Langfristig

| ID | Aktion |
|----|--------|
| FH-6 | In hypotheses_status.json umklassifizieren: 'langfristig/offen' |
| FH-9 | In hypotheses_status.json: 'blockiert/fund_juno-Feld fehlt' |
| TU-2 | In hypotheses_status.json: 'geschlossen/strukturell' |
| TR-3 | Kein Pre-Test noetig bis TR-2 validiert |
| SR-1 | Kein Pre-Test noetig bis WL3 Run 3 |

---

## Hypothesenbaum v1.5 — Aenderungen

Folgende Ergaenzung pro Hypothese im Hypothesenbaum:

```markdown
**Pre-Test-Status:** [BEREIT | AUSSTEHEND | BLOCKIERT | GESCHLOSSEN]
**Pre-Test-Datum:**  [YYYY-MM-DD | ausstehend]
**Pre-Test-Ergebnis:**
  - Feld-Existenz: [OK | FEHLT: feldname]
  - Null-Rate:     [N% | nicht geprueft]
  - Logik:         [OK | Problem: beschreibung]
  - Script:        [vorhanden: dateiname | fehlt]
  - Freigabe:      [JA | NEIN — Grund]
```

Neue Spalte im Testplan-Kalender:
```
| Zeitpunkt | Hypothesen | Methode | Voraussetzung | Pre-Test |
```

---

## Ausfuehrungs-Reihenfolge Heute

```
1. B2 + B3 in Claude Code (archive_update.py Fix + dev.html Fix)
2. PS: run_daily.bat manuell
3. Ccode: pre_msc.py + pre_sh1.py ausfuehren
4. PS: Pre-FH3b-A + Pre-FH8-A + Pre-PH4-B
5. Ergebnisse hier dokumentieren
6. hypotheses_status.json updaten (TU-2, FH-6, FH-9)
7. Hypothesenbaum v1.5 schreiben (Pre-Test-Felder ergaenzen)
```
