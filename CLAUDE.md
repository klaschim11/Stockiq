# StockIQ — Claude Code Kontext

Projekt: StockIQ v5.9.85
Repo:    klaschim11.github.io/Stockiq
Stack:   Single-File HTML (index.html) + Python Scripts (Juno/iPhone)

## Pflicht vor jeder Änderung
1. SKILL_stockiq-dev_v5985.md lesen (vollständiger Entwicklungskontext)
2. Relevanten Abschnitt der Datei lesen
3. Änderung durchführen
4. `node stockiq_test.js index.html` ausführen
5. Erst committen wenn: ALLE TESTS BESTANDEN

## Kritische Regeln (Kurzfassung)
- ES5-only: kein const/let/=>/?./** in Script-Blöcken
- HTML-Edits: str_replace() — NIEMALS Zeilen-Slicing
- File-Inputs: IMMER <label for="id"> — nie div+onclick
- Script-Blöcke: 13 Stück — nie zusammenführen vor Test
- Deploy: git push origin main (nach grünem Test)

## Score-Architektur (v5.9.85)
fSc = valSc*0.30 + max(FCF,OE)*0.30 + ROCE*0.20 + Debt*0.15 + Cons*0.05
valSc (beide): PEG*0.40 + EV/EBITDA*0.15 + EV/EBIT*0.45

## Doku-Pflege (automatisch prüfen)
- Roadmap-Tab Version = Dashboard-Version?
- SKILL.md aktuell?
- Wenn nein: sofort nachziehen
