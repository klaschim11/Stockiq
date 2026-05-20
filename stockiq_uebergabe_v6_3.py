#!/usr/bin/env python3
# stockiq_uebergabe_v6_3.py
# Aufruf in Juno: python3 stockiq_uebergabe_v6_3.py
#
# NEU v6.3: Doku-Pflege-Check mit hartem Enforcement
#   - Prueft ob alle Dokumente auf gleicher Version wie Dashboard sind
#   - Gibt WARNUNG wenn Doku-Versionen abweichen
#   - Schreibt doku_status.json fuer Roadmap-Tab
#   - SKILL.md enthaelt aktualisierte Score-Architektur (v5.9.85+)
#
# Was dieses Script tut:
#   1. Liest stockiq_config.json
#   2. Prueft Doku-Versionen (NEU v6.3)
#   3. Merged techdoku_offen.json
#   4. Schreibt SKILL.md neu (mit aktuellen Gewichten)
#   5. Gibt Checkliste + Doku-Status-Report aus

import json, datetime, os, sys

# ── CRLF-Normalisierung (NEU v6: Windows -> LF) ───────────────────────────────
def normalize_crlf(filepath):
    """Liest Datei, ersetzt CRLF durch LF, schreibt zurueck wenn noetig."""
    try:
        with open(filepath, 'r', encoding='utf-8', newline='') as f:
            content = f.read()
        if '\r\n' in content or '\r' in content:
            content = content.replace('\r\n', '\n').replace('\r', '\n')
            with open(filepath, 'w', encoding='utf-8', newline='\n') as f:
                f.write(content)
            return True  # wurde normalisiert
        return False
    except Exception as e:
        print(f"  WARNUNG: CRLF-Check fehlgeschlagen fuer {filepath}: {e}")
        return False

# ── Pfade ─────────────────────────────────────────────────────────────────────
SCRIPT_DIR  = os.path.dirname(os.path.abspath(__file__))
CONFIG_FILE   = os.path.join(SCRIPT_DIR, "stockiq_config.json")
TECHDOKU_FILE = os.path.join(SCRIPT_DIR, "techdoku_offen.json")
CONFIG_OUT    = os.path.join(SCRIPT_DIR, "stockiq_config_updated.json")
SKILL_FILE    = os.path.join(SCRIPT_DIR, "stockiq_skill.md")

# ── CRLF-Scan: alle HTML/PY-Dateien im Script-Ordner ─────────────────────────
CRLF_EXTENSIONS = ('.html', '.py', '.json', '.md')
crlf_fixed = []
for fname in os.listdir(SCRIPT_DIR):
    if fname.endswith(CRLF_EXTENSIONS):
        fpath = os.path.join(SCRIPT_DIR, fname)
        if normalize_crlf(fpath):
            crlf_fixed.append(fname)
if crlf_fixed:
    print(f"[v6] CRLF normalisiert ({len(crlf_fixed)} Dateien): {', '.join(crlf_fixed)}")
else:
    print("[v6] CRLF-Check: alle Dateien OK (LF)")

# ── Config laden ──────────────────────────────────────────────────────────────
if not os.path.exists(CONFIG_FILE):
    print(f"FEHLER: {CONFIG_FILE} nicht gefunden.")
    print("Bitte stockiq_config.json im selben Ordner ablegen.")
    sys.exit(1)

with open(CONFIG_FILE, encoding="utf-8") as f:
    c = json.load(f)

# ── techdoku_offen.json mergen (NEU v5) ───────────────────────────────────────
techdoku_merged = False
if os.path.exists(TECHDOKU_FILE):
    with open(TECHDOKU_FILE, encoding="utf-8") as f:
        td = json.load(f)
    neue = td.get("techdoku_offen", [])
    bestehend = c.get("techdoku_offen", [])
    # Neue Eintraege vorne einfuegen — Duplikat-Erkennung via Versions-Prefix (z.B. "v5.9.81:")
    def version_prefix(s):
        return s.split(":")[0].strip() if ":" in s else s
    neue_prefixe = set(version_prefix(e) for e in neue)
    combined = neue + [e for e in bestehend if version_prefix(e) not in neue_prefixe]
    c["techdoku_offen"] = combined
    techdoku_merged = True
    print(f"[v5] techdoku_offen.json gefunden: {len(neue)} neue Eintraege gemergt.")

dash  = c.get("dashboard_version",  "?")
fund  = c.get("fund_juno_version",  "?")
alpha = c.get("alpha_juno_version", "?")
doku  = c.get("doku_version",       "?")
tick  = c.get("ticker_count",       "?")
snaps = c.get("snapshot_count",     "?")
oos   = c.get("oos_wr",             "?")
isr   = c.get("is_wr",              "?")
stab  = c.get("stabilitaet",        "?")
next_ = c.get("naechster_schritt",  "?")
offen = c.get("offene_punkte",      [])
# NEU v4: Tech-Doku-Pflege (v5.9.81+)
techdoku_offen = c.get("techdoku_offen", [])
# NEU v6.1: Lokale Dokumentation
lokale_docs = c.get("lokale_dokumente", [])
datum = datetime.date.today().isoformat()

# ── NEU v6.3: Doku-Pflege-Check ───────────────────────────────────────────────
# config.json muss enthalten:
# "doku_versionen": {
#   "skill_md":            "5.9.85",
#   "methodik_intern":     "5.9.85",
#   "anwender_leitfaden":  "5.9.85",
#   "scripts_reference":   "5.9.85",
#   "roadmap_tab":         "5.9.85"
# }
DOKU_FELDER = {
    "skill_md":           "SKILL.md (Claude-Projekt)",
    "methodik_intern":    "methodik_intern.html",
    "anwender_leitfaden": "anwender_leitfaden.html",
    "scripts_reference":  "scripts_reference.md",
    "roadmap_tab":        "Roadmap-Tab (Dashboard)",
}
doku_versionen = c.get("doku_versionen", {})
doku_ok = True
doku_warnings = []
for key, label in DOKU_FELDER.items():
    ist = doku_versionen.get(key, "NICHT EINGETRAGEN")
    if ist != dash:
        doku_ok = False
        doku_warnings.append((label, ist, dash))

# doku_status.json schreiben
doku_status = {
    "dashboard_version": dash,
    "geprueft": datum,
    "alle_ok": doku_ok,
    "versionen": {k: {"label": v, "ist": doku_versionen.get(k, "?"), "soll": dash,
                      "ok": doku_versionen.get(k, "") == dash}
                  for k, v in DOKU_FELDER.items()}
}
with open(os.path.join(SCRIPT_DIR, "doku_status.json"), "w", encoding="utf-8") as f:
    json.dump(doku_status, f, ensure_ascii=False, indent=2)

if not doku_ok:
    print()
    print("=" * 55)
    print("WARNUNG: DOKU-VERSIONEN NICHT AKTUELL!")
    print("=" * 55)
    for label, ist, soll in doku_warnings:
        print(f"  {label}")
        print(f"    IST:  {ist}  SOLL: {soll}")
    print()
    print("  -> Vor naechstem Chat in Claude aktualisieren!")
    print("  -> doku_versionen in config.json danach anpassen")
    print("=" * 55)

# ── SKILL.md schreiben ────────────────────────────────────────────────────────
skill = f"""---
name: stockiq-dev
description: StockIQ-Entwicklungs-Skill. Immer verwenden wenn der Nutzer StockIQ erwaehnt, am Dashboard arbeitet, Python-Scripts (fund_juno, alpha_juno) bearbeitet, Bugs debuggt, neue Features entwickelt oder Fragen zu Score-Architektur, Walk-Forward, Piotroski, VIX-Regime, DQ-Monitor oder Snapshot-Analyse stellt. Auch triggern wenn: "neue Version", "v5.9", "Fundamentals-Tab", "WL", "Synopse", "Allokation", "iOS Safari", "Juno", "GitHub Pages klaschim11", "QA", "scoreQuality", "DQ-Banner". Dieses Skill verhindert Fehler durch vollstaendigen Projektkontext.
---

# StockIQ Development Skill
# Automatisch generiert von stockiq_uebergabe_v3.py am {datum}

## 1 - PRODUKTIONS-STACK

| Datei          | Version      |
|----------------|--------------|
| Dashboard      | v{dash}      |
| fund_juno      | v{fund}      |
| alpha_juno     | v{alpha}     |
| Doku           | v{doku}      |
| Ticker         | {tick}       |
| Snapshots      | {snaps}      |
| OOS WR         | {oos}        |
| IS WR          | {isr}        |
| Stabilitaet    | {stab}       |

GitHub Pages: klaschim11.github.io/Stockiq

## 2 - NAECHSTER SCHRITT

{next_}

Offene Punkte:
""" + "\n".join(f"- {p}" for p in offen) + """

## 3 - KRITISCHE REGELN

HTML: IMMER str.replace() - NIEMALS content[:pos]
JS: ES5-only - NIEMALS const/let/=>/?./template-literals in Scripts
QA: node --check auf alle 13 Script-Bloecke nach JEDER Aenderung
Python: sanitize() fuer alle yfinance-Werte (NaN/Inf -> None)
CRLF: Windows speichert \\r\\n statt \\n - str.replace() schlaegt lautlos fehl!
      uebergabe_v6.py normalisiert automatisch alle HTML/PY/JSON-Dateien.
      Manuell: content = content.replace('\\r\\n','\\n') nach jedem file.read()
      open() immer mit encoding='utf-8' (nie cp1252-Default auf Windows)
Unicode: Keine Non-ASCII in JS-Ausdruecken - nur \\uXXXX Escapes verwenden
Skill-Update: PFLICHT nach jedem Versions-Bump - Script laufen lassen!

ZWEI-PFAD-REGEL (v5.9.81+):
  Hilfe-Tab (.html)  -> nur Verhalten-Aenderungen (neues Signal, neue Kennzahl)
  Tech-Doku (intern) -> IMMER: Formel, Gewicht, IC-Ergebnis, vollstaendiger Changelog
  Faustregel: Implementierung -> Tech-Doku, NICHT in den Hilfe-Tab

""" + ("""
## 3b - TECH-DOKU OFFEN (nach letztem Release)

""" + "\n".join(f"- {p}" for p in techdoku_offen) + "\n" if techdoku_offen else "") + """
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
""" + ("""
TECH-DOKU REMINDER (intern zu aktualisieren):
""" + "\n".join(f"  - {p}" for p in techdoku_offen) + "\n" if techdoku_offen else "") + """

## 9 - LOKALE DOKUMENTATION (nie auf GitHub)

""" + (
  "\n".join(
    f"  {d['datei']:<45} -- {d.get('beschreibung','')}" if isinstance(d, dict)
    else f"  {d}"
    for d in lokale_docs
  ) if lokale_docs else "  (keine lokalen Dokumente konfiguriert)"
) + """

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
"""

with open(SKILL_FILE, "w", encoding="utf-8") as f:
    f.write(skill)

# ── Ausgabe ───────────────────────────────────────────────────────────────────
print("=" * 50)
print("StockIQ Uebergabe erfolgreich")
print("=" * 50)
print(f"Stack:    v{dash} / fund_juno v{fund} / {tick} Ticker")
print(f"Datum:    {datum}")
print(f"SKILL.md: {SKILL_FILE}")
print()
print("NAECHSTER SCHRITT:")
print(f"  {next_}")
print()
print("CHAT-EINSTIEG (kopieren):")
print("-" * 50)
print(f"StockIQ Weiterentwicklung - neuer Chat.")
print(f"Aktuell: v{dash} / fund_juno v{fund} / {tick} Ticker")
print(f"Naechster Schritt: {next_}")
print(f"Uploads: stockiq-v{dash.replace('.','_')}.html")
print(f"         stockiq_fund_juno_v{fund.replace('.','_')}.py")
print("-" * 50)
print()
print("CHECKLISTE:")
print("  [x] config.json eingelesen")
if techdoku_merged:
    print(f"  [x] techdoku_offen.json gemergt ({len(neue)} Eintraege)")
    print(f"  [x] stockiq_config_updated.json geschrieben -> herunterladen + umbenennen")
else:
    print("  [ ] techdoku_offen.json nicht gefunden (optional)")
print("  [x] SKILL.md automatisch neu geschrieben")
print("  [x] doku_status.json geschrieben")
print()
print("DOKU-PFLEGE-STATUS:")
if doku_ok:
    print("  [OK] Alle Dokumente auf Dashboard-Version " + dash)
else:
    print("  [!!] Folgende Dokumente veraltet:")
    for label, ist, soll in doku_warnings:
        print(f"       {label}: IST={ist} SOLL={soll}")
    print()
    print("  -> In naechstem Chat aktualisieren!")
    print("  -> Danach doku_versionen in config.json anpassen")
print()
print("NOCH MANUELL:")
print("  [ ] SKILL.md in Claude-Projekt-Settings einfuegen")
print("  [ ] Dashboard + fund_juno herunterladen")
print("  [ ] Roadmap-Tab auf Version " + dash + " pruefen")
# Tech-Doku-Reminder
if techdoku_offen:
    print("TECH-DOKU AKTUALISIEREN (intern):")
    print("  Datei: stockiq_methodik_intern.html")
    for p in techdoku_offen:
        print(f"  [ ] {p}")
else:
    print("TECH-DOKU: Kein Eintrag offen (techdoku_offen in config leer)")

# ── config_updated.json schreiben (NEU v5) ────────────────────────────────────
with open(CONFIG_OUT, "w", encoding="utf-8") as f:
    json.dump(c, f, ensure_ascii=False, indent=2)
print()
print(f"CONFIG gespeichert: {CONFIG_OUT}")
