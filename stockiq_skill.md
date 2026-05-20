---
name: stockiq-dev
description: StockIQ-Entwicklungs-Skill. Immer verwenden wenn der Nutzer StockIQ erwaehnt, am Dashboard arbeitet, Python-Scripts (fund_juno, alpha_juno) bearbeitet, Bugs debuggt, neue Features entwickelt oder Fragen zu Score-Architektur, Walk-Forward, Piotroski, VIX-Regime, DQ-Monitor oder Snapshot-Analyse stellt. Auch triggern wenn: "neue Version", "v5.9", "Fundamentals-Tab", "WL", "Synopse", "Allokation", "iOS Safari", "Juno", "GitHub Pages klaschim11", "QA", "scoreQuality", "DQ-Banner". Dieses Skill verhindert Fehler durch vollstaendigen Projektkontext.
---

# StockIQ Development Skill
# Automatisch generiert von stockiq_uebergabe_v3.py am 2026-05-20

## 1 - PRODUKTIONS-STACK

| Datei          | Version      |
|----------------|--------------|
| Dashboard      | v5.9.85      |
| fund_juno      | v7.9.23      |
| alpha_juno     | v6b_6m-u4     |
| Doku           | v2.2      |
| Ticker         | 269       |
| Snapshots      | 58      |
| OOS WR         | 60.1%        |
| IS WR          | 61.0%        |
| Stabilitaet    | 2.0pp       |

GitHub Pages: klaschim11.github.io/Stockiq

## 2 - NAECHSTER SCHRITT

IC-Test v1.2 wiederholen nach backfill_v1.3 (ev_ebit) + WL3 naechster Run Mitte Juli 2026

Offene Punkte:
- IC-Test v1.2 wiederholen nach backfill_v1.3 (ev_ebit bekommt Daten)
- WL3 naechster belastbarer Run: Mitte Juli 2026 (30-60d-Bucket)
- shares_change_yoy -> fSc() nach IC-Bestaetigung
- norm_pe (Shiller-EPS) nach IC-Test

## 3 - KRITISCHE REGELN

HTML: IMMER str.replace() - NIEMALS content[:pos]
JS: ES5-only - NIEMALS const/let/=>/?./template-literals in Scripts
QA: node --check auf alle 13 Script-Bloecke nach JEDER Aenderung
Python: sanitize() fuer alle yfinance-Werte (NaN/Inf -> None)
CRLF: Windows speichert \r\n statt \n - str.replace() schlaegt lautlos fehl!
      uebergabe_v6.py normalisiert automatisch alle HTML/PY/JSON-Dateien.
      Manuell: content = content.replace('\r\n','\n') nach jedem file.read()
      open() immer mit encoding='utf-8' (nie cp1252-Default auf Windows)
Unicode: Keine Non-ASCII in JS-Ausdruecken - nur \uXXXX Escapes verwenden
Skill-Update: PFLICHT nach jedem Versions-Bump - Script laufen lassen!

ZWEI-PFAD-REGEL (v5.9.81+):
  Hilfe-Tab (.html)  -> nur Verhalten-Aenderungen (neues Signal, neue Kennzahl)
  Tech-Doku (intern) -> IMMER: Formel, Gewicht, IC-Ergebnis, vollstaendiger Changelog
  Faustregel: Implementierung -> Tech-Doku, NICHT in den Hilfe-Tab


## 4 - SCORE-ARCHITEKTUR (v5.9.84+)

cSc = momSc x0.25 + trend x0.20 + fSc x0.35 + rSc x0.20

fSc (mit Konsistenz): valSc x0.30 + max(FCF,OE) x0.30 + ROCE x0.20 + Debt x0.15 + Cons x0.05
fSc (ohne Konsistenz): valSc x0.30 + max(FCF,OE) x0.30 + ROCE x0.25 + Debt x0.15
valSc (beide): PEG x0.40 + EV/EBITDA x0.15 + EV/EBIT x0.45
valSc (nur EV/EBIT): PEG x0.55 + EV/EBIT x0.45
IC-Basis Mai 2026: OE IC=+0.155*** | EV/EBIT IC=-0.143*** | ROCE ICIR=-0.21
rSc = statSc x0.50 + betaSc x0.40 + evarRelSc x0.10
VIX: <20 x1.00 | 20-30 x0.60 | >30 x0.20

## 5 - TABS

p0=Synopse | p1=WL1 | p2=WL2 | p3=Fund | p4=WF | p5=Allok | p6=Roadmap | p7=Hilfe | p8=Depot

## 6 - SHILLER-BESCHLUESSE (Mai 2026)

Mean-Reversion (CAPE): NICHT im Score - Makroanzeige Allokations-Tab (Roadmap v8)
EPS-Glaettung (norm_pe): IC-Test nach Snapshot 30 zuerst
EV/EBIT: 0.25->0.30 implementiert (v5.9.75), Buffett 2024

## 7 - HAEUFIGE BUGS

} */ Syntax-Error    → Funktions-Signatur als Anker, nie Kommentar
Non-ASCII in Script  → Nur ASCII in JS-Kommentaren (kein →, ö, ü)
valSc ev_ebit null   → Ab v7.9.22 behoben (Feld fehlte im JSON)
OOS WR 0% angezeigt  → JSON-Parser-Bug IS/Alpha-WR, bekannt, OOS korrekt

## 8 - NEUER CHAT EINSTIEG

StockIQ Weiterentwicklung - neuer Chat.
Aktuell: v{dash} / fund_juno v{fund} / {tick} Ticker
Naechster Schritt: {next_}
Uploads: stockiq-v{dash.replace('.','_')}.html + stockiq_fund_juno_v{fund.replace('.','_')}.py


## 9 - LOKALE DOKUMENTATION (nie auf GitHub)

  stockiq_methodik_intern_v5985.html            -- Formeln + IC-Befunde (intern, nie GitHub)
  stockiq_anwender_leitfaden_v5985.html         -- Workflow + Scripts (public)
  stockiq_scripts_reference_v5985.md            -- Scripts-Inventar + Einsatzregeln

## 10 - DOKU-PFLEGE-REGEL (Evaluation je Chat)

AUTOMATISCH am Chat-Anfang pruefen:
  [ ] Roadmap-Tab: Version = Dashboard-Version?
  [ ] SKILL.md in Claude-Projekt: Version aktuell?
  [ ] methodik_intern: Formeln + IC-Befunde aktuell?
  [ ] anwender_leitfaden: Workflow-Schritte vollstaendig?
  [ ] scripts_reference: Alle Scripts eingetragen?
  -> Wenn nein: SOFORT nachziehen, nicht auf Nachfrage warten!
  -> Evaluation ist systematischer Auftrag, keine Einzelfrage.

NACH JEDEM VERSIONS-BUMP (node --check bestanden):
  1. Roadmap-Tab aktualisieren (Stack + Score + Offene Punkte)
  2. SKILL.md in Claude-Projekt-Settings eintragen
  3. methodik_intern: neue Formeln/IC-Befunde
  4. scripts_reference: neue Scripts
  5. uebergabe_v6_3.py ausfuehren (prueft Doku-Versionen)
  6. doku_versionen in config.json anpassen
