---
name: stockiq-dev
description: StockIQ-Entwicklungs-Skill. Immer verwenden wenn der Nutzer StockIQ erwähnt, am Dashboard arbeitet, Python-Scripts (fund_juno, alpha_juno, backfill, ic, chart) bearbeitet, Bugs debuggt, neue Features entwickelt oder Fragen zu Score-Architektur, Walk-Forward, Piotroski, VIX-Regime, DQ-Monitor, IC-Test oder Snapshot-Analyse stellt. Auch triggern wenn: "neue Version", "v5.9", "Fundamentals-Tab", "WL", "Synopse", "Allokation", "iOS Safari", "Juno", "GitHub Pages klaschim11", "QA", "scoreQuality", "DQ-Banner", "IC-Analyse", "Owner Earnings", "Chart", "Deploy". Dieses Skill verhindert Fehler durch vollständigen Projektkontext.
---

# StockIQ Development Skill

Vollständiger Entwicklungskontext. Vor jedem Feature/Bugfix/Script-Edit vollständig lesen.

---

## 1 — PRODUKTIONS-STACK (Mai 2026)

| DATEI | VERSION | ZWECK |
|-------|---------|-------|
| `stockiq-v5.9.85.html` | v5.9.85 | Dashboard (iOS Safari, GitHub Pages) |
| `stockiq_fund_juno_v7_9_23.py` | v7.9.23 | Fund + VIX + Piotroski + trend + rsi_val + neue Felder |
| `stockiq_alpha_juno_v6b_6m.py` | v6b_6m-u4 | Walk-Forward 6M OOS |
| `stockiq_annual_ic_v1_2.py` | v1.2 | Faktor-IC-Analyse (14 Faktoren, ausgeführt Mai 2026) |
| `stockiq_annual_backfill_v1_3.py` | v1.3 | Neue Felder in annual.json (ENRICH_ONLY) |
| `stockiq_chart.py` | v1.0 | Kurs-Charts PNG (WL2-Export-Integration) |
| `stockiq_deploy.py` | v1.0 | GitHub Pages Auto-Deploy via REST API |
| `stockiq_uebergabe_v6_2.py` | v6.2 | Handover-Generator |

GitHub Pages: klaschim11.github.io/Stockiq | 269 Ticker | 7 Tabs | 13 Script-Blöcke

---

## 2 — KRITISCHE REGELN

### PRE-RELEASE — PFLICHT
```bash
node --check script_block.js   # ALLE 13 Blöcke einzeln prüfen
# Kombinierten Check NICHT verwenden (HTML-Kommentare zwischen Blöcken = false errors)
```

### HTML str.replace Regeln
```
NIEMALS content[:position]
NIEMALS Kommentare /* */ als Anker → } */ Bug!
IMMER eindeutige Funktions-Signatur als Anker
Hilfe-Tab: NIEMALS Formeln / Gewichte / Dämpfungsfaktoren einfügen (IP-Schutz)
```

### JavaScript ES5-only (iOS Safari)
```
Verboten: ?. => const let async ** Template-Literals \u{xxxx}
Verboten: nicht-ASCII in Script-Blöcken (Non-ASCII-Bug)
Erlaubt:  var function || && normale Strings \u2265 (Unicode-Escape)
```

### Python-Script-Edits
1. Original vorlegen lassen vor jedem Fix
2. Minimale Zeilen ändern — nie neu schreiben
3. tk.history() ≠ yf.download() — nie mischen
4. Syntax: `python3 -c "import ast; ast.parse(open('f.py').read())"`
5. Ticker-Bereinigung: Token-weise (re.sub), NICHT zeilenweise
6. sanitize() für alle yfinance-Werte (NaN/Inf → None) — JS JSON.parse() lehnt NaN ab

---

## 3 — SCORE-ARCHITEKTUR (v5.9.85)

```
W = {mom:0.25, trend:0.20, fund:0.35, risk:0.20}
cSc = momSc()×0.25 + s.trend×0.20 + fSc()×0.35 + rSc×0.20

fSc() MIT Konsistenz (v5.9.84 IC-Update):
  valSc×0.30 + max(fcfSc,oeSc)×0.30 + roceSc×0.20 + debtSc()×0.15 + consSc×0.05
  Begründung: OE-Yield IC=+0.155***, EV/EBIT IC=-0.143***, ROCE ICIR=-0.21

fSc() OHNE Konsistenz:
  valSc×0.30 + max(fcfSc,oeSc)×0.30 + roceSc×0.25 + debtSc()×0.15

  max(fcfSc, oeSc): owner_earnings_yield als FCF-Komplement
    Stufen (beide): >6%=100 | >4%=85 | >2%=65 | >0%=40 | <=0=10

  valSc() dual-signal (v5.9.84):
    PEG×0.40 + EV/EBITDA×0.15 + EV/EBIT×0.45  (beide verfügbar)
    PEG×0.55 + EV/EBIT×0.45                     (nur EV/EBIT)
    PEG×0.60 + EV/EBITDA×0.40                   (nur EV/EBITDA)
    PEG×1.00                                      (kein EV-Signal)

  Piotroski B1: pioScore<2 + >=2 messbar -> Fund×0.85

debtSc(dte, sector) — v5.9.78 sektor-aware:
  Finanzwerte (Financial Services / Bank / Insurance) -> 65
  Sonstige: <30->100 | <100->80 | <200->55 | <350->30 | else->10

rSc = s.risk×0.50 + betaSc(beta)×0.40 + evarRelSc(t)×0.10
momSc: volAdj × vixFactor (VIX<20->×1.00 | 20-30->×0.60 | >30->×0.20)
```

### IC-BEFUNDE Mai 2026 (annual_ic_v1.2, 260 Ticker):
```
owner_earnings_yield: IC=+0.155  t=4.19  *** -> max(fcfSc,oeSc) integriert (v5.9.84)
ev_ebit:              IC=-0.143  t=-3.69 *** -> Gewicht 0.30->0.45 (v5.9.84)
debt:                 IC=+0.095  t=2.52  **  -> Gegenrichtung, Sektor-Split genügt
fcf:                  IC=+0.065  t=1.80      -> ICIR=1.70 stabil, bestätigt
roce:                 IC=-0.053  t=-1.45     -> ICIR=-0.21 instabil, 30%->20%
fcf_debt_cover:       IC=-0.045  instabil    -> Vorzeichenwechsel, kein Score
mom_skip/evar/shares: n=0 (keine hist. Daten) -> backfill_v1.3 liefert ev_ebit
```

### Display only (kein Score):
```
shares_change_yoy    — n=0 im IC-Test, keine hist. quarterly Daten
fcf_debt_cover       — IC instabil (Vorzeichenwechsel 2022/2025)
```

---

## 4 — FUND_JUNO v7.9.23 — JSON-FELDER

```json
{
  "meta": {"version": "7.9.23", "n_tickers": 278},
  "data": {
    "AAPL": {
      "fcf": 3.1,
      "roce": 45.2,
      "roe": 28.0,
      "peg": 1.8,
      "beta": 1.1,
      "debt": 85.0,
      "trend": 68,
      "rsi_val": 54,
      "ev_ebitda": 22.4,
      "ev_ebit": 28.1,
      "eps_growth": 12.5,
      "evar": 0.08,
      "accruals_ok": true,
      "piotroski": 7,
      "sector": "Technology",
      "owner_earnings_yield": 4.2,
      "fcf_debt_cover": 0.31,
      "shares_change_yoy": -2.8,
      "mom_skip": 18.4,
      "div_yield": 0.5,
      "shareholder_return": 3.3
    },
    "__macro__": {"vix": 17.8, "vix_date": "2026-05-17"}
  }
}
```

Parser-Reihenfolge: `rawData.data || rawData.fundamentals || rawData`

---

## 5 — DATENQUALITÄTS-SYSTEM (v5.9.85)

### DQ-Banner (Synopse)
```
DQ  278/278  AI:265  JSON:2  stat:11  Trend:live  RSI:live
Farbe: grün=ok | gelb=<20 stat | rot=>=20 stat
```
- nLoaded gegen STOCKS.length zählen (NICHT FD-Keys → Suffix-Duplikate!)
- Sanity nur prüfen wenn fd && typeof fd==='object'

### Synopse Top-3 (v5.9.82)
- rSyn() = Spiegel der WL1-Filter: HC-Filter + WL2 wirken jetzt auch in Synopse
- Filter-Info-Zeile zeigt aktive Filter + Gesamtuniverse-Zähler

---

## 6 — TAB / STORAGE / TICKER

Tabs: p0=Synopse | p1=WL1 | p2=WL2 | p3=Fund | p4=WF | p5=Allok | p6=Hilfe

Storage-Keys (NICHT ändern!):
- 'stockiq_fund_v515' | 'stockiq_wl2_v59' | 'stockiq_alloc_v520'

Ticker-Stand 278: 13 Script-Blöcke
Entfernt: HELN.SW, BALN.SW, FCA.MI, MMC, ANSS, STM.PA, NZYM-B.CO + 12 EM-Exoten

ALIAS-Mapping (Dashboard + fund_juno + alpha_juno IDENTISCH halten!):
- ITX → INDITEX (ES0148396007)
- AI  → AIRLIQ  (FR0000120073)
- SAN → SANOFI  (FR0000120578)
- SAND→ SANDVIK (SE0020288127)

---

## 7 — WALK-FORWARD (v6b_6m-u4)

OOS WR ~60.5% | IS WR ~61.0% | Stabilität ~2.3pp | 4 Fenster alle >57%
Strategie: conditional trail stop 10%@+3% + SPY-Filter + SL-8%
JSON: global_stats.alpha.win_rate + walk_forward[].win_rate
Bekannter Bug: IS-WR/Alpha-WR zeigen 0% (JSON-Parser-Bug, OOS AVG korrekt)

---

## 8 — IC-ANALYSE / SNAPSHOT-ROADMAP

IC-Test ausgeführt: Mai 2026 | annual_ic_v1.2 | Ergebnisse in v5.9.84 integriert

| Meilenstein | Status |
|-------------|--------|
| 20 Snapshots | ✅ |
| 30 Snapshots | ✅ |
| IC-Test v1.2 | ✅ ausgeführt — Gewichte angepasst |
| backfill_v1.3 | ⏳ ausführen — ev_ebit hatte n=0! |
| IC-Test v1.2 (nach Backfill) | ⏳ — ev_ebit bekommt Daten |
| WL3 Signal-Tracking | ⏳ startbereit ab 30+ Dashboard-Snapshots |

### Nächste Score-Entscheidungen (noch offen):
```
shares_change_yoy -> Score?   IC n=0 — quarterly Daten historisch nicht verfügbar
norm_pe (Shiller)             Noch nicht implementiert
KBV Fama-French               Geplant v5.9.9x
```

---

## 9 — ARCHITEKTUR-ENTSCHEIDE (Mai 2026)

### IP-Schutz (v5.9.81-83)
- Anwender-Leitfaden (public): KEINE Formeln / Gewichte / Dämpfungsfaktoren
- methodik_intern (intern): vollständige Dokumentation
- Hilfe-Tab: NUR Anwender-Sicht (Zwei-Pfad-Regel)
- Kennzahlen-Panel: fund_score Gewichte entfernt, auf 2 Stellen gerundet (v5.9.83, bleibt)

### MomRisk-Banner (v5.9.75)
- Zeigt Momentum-Crash-Risiko basierend auf VIX-Regime
- JP Morgan Q2 2026 Basis

### Snapshot-Status-Badge (v5.9.79)
- DQ-Banner zeigt Snapshot-Aktualität

---

## 10 — iOS / JUNO REGELN

- **File-Input-Trigger:** NIEMALS `div onclick="el.click()"` → bricht auf Windows/Chrome + iOS — IMMER `<label for="input-id">` als Wrapper
- innerHTML → inline styles only (keine CSS-Klassen)
- Script-Blöcke > 12KB aufteilen
- Duplicate Top-Level-Funktionen → crash
- tk.history() bevorzugen | Zwischenspeichern alle 50 Ticker
- Unicode: \u2265 statt ≥ in Script-Blöcken (Non-ASCII-Bug)

---

## 11 — HÄUFIGE BUGS

| Bug | Ursache | Fix |
|-----|---------|-----|
| `} */` Syntax-Error | Kommentar als Anker aufgebrochen | Funktions-Signatur als Anker |
| OOS WR = 0% | SMA200 NaN weil Sub-DataFrame 130 Bars | Indikatoren auf vollem df |
| fetch_ticker_data undef | Funktion nach return in _dkey() | Eigene def-Zeile |
| 222 statt 269 Ticker | Zeilenweise Bereinigung | re.sub pro Token |
| DQ-Banner 489/278 | FD-Keys durch Suffix-Duplikate | Gegen STOCKS.length |
| Sanity:229 falsch | Check auf undefined fd_dq | typeof fd_dq==='object' |
| `div onclick=element.click()` auf file input | Browser blockiert programmatischen .click() auf file inputs (Windows/Chrome + iOS) | IMMER `<label for="id">` verwenden — nie div+onclick |
| Non-ASCII in JS | ≥ direkt im Script-Block | \u2265 verwenden |

---

## 12 — INVESTITIONS-PHILOSOPHIE

Horizont: 1-3 Jahre | Fokus: Economic Moat, ROCE/FCF, Owner Earnings
Allokation: 60% Aktien / 20% Anleihen / 15% Gold / 5% Cash
SPY-200MA: dominanter Filter (+23pp WR im Walk-Forward)
GSR: >90=Silber aggressiv | 70-90=Silber | <55=Gold

---

## 13 — NEUER CHAT PROTOKOLL

```
"StockIQ Weiterentwicklung — neuer Chat.
Aktuell: v5.9.85 / fund_juno v7.9.23 / 269 Ticker / 30+ Snapshots
IC-Ergebnisse Mai 2026: integriert in v5.9.84

Nächster Schritt: [Aufgabe]
z.B. backfill_v1.3 ausführen (ev_ebit-Daten fehlen noch)

Uploads: stockiq-v5_9_85.html
         stockiq_fund_juno_v7_9_23.py"
```

---

## 14 — ÜBERGABE-CHECKLISTE (am Chatende)

```
[ ] node --check auf ALLE 13 Script-Blöcke einzeln
[ ] Roadmap-Tab: Stack + Score + Offene Punkte aktuell?
[ ] SKILL.md Version = Dashboard-Version?
[ ] methodik_intern: neue Formeln/IC-Befunde eingetragen?
[ ] scripts_reference: neue Scripts eingetragen?
[ ] uebergabe_v6_3.py ausfuehren -> doku_status.json pruefen
[ ] doku_versionen in config.json anpassen
[ ] SKILL.md in Claude Projekt-Settings einfuegen
[ ] Alle Output-Dateien herunterladen
```

## 15 — DOKU-EVALUATIONS-REGEL (SYSTEMATISCHER AUFTRAG)

Diese Regel gilt in JEDEM Chat — nicht nur auf Nachfrage:

```
Am Chat-Anfang automatisch pruefen:
  Roadmap-Tab Version = Dashboard-Version?
  SKILL.md Version aktuell?
  methodik_intern aktuell?
  anwender_leitfaden aktuell?
  scripts_reference aktuell?

Bei Abweichung: SOFORT nachziehen.
Nicht warten bis der Nutzer fragt.
Evaluation ist systematischer Auftrag.
```
