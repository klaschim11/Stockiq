# ============================================================
# stockiq_annual_ic_v1_2.py
# StockIQ — Annual Faktor-IC-Analyse
# Information Coefficient: Faktorwert(Dez.Jahr) → Jahresrendite(Jahr+1)
# ============================================================
# METHODE:
#   IC = Spearman-Rangkorrelation zwischen Faktorwert und Folgejahrrendite
#   Faktorwerte: aus stockiq_annual.json (2021-2024)
#   Renditen:    yfinance tk.history (Dez.Jahr → Dez.Jahr+1)
#
#   Zeitpaare (Faktor → Rendite):
#     Faktor Dez 2021 → Rendite 2022 (Jan-Dez 2022)
#     Faktor Dez 2022 → Rendite 2023
#     Faktor Dez 2023 → Rendite 2024
#     Faktor Dez 2024 → Rendite 2025
#
#   Faktoren (v1.1): roce, fcf, roe, peg, beta, debt, mom_skip, evar, ev_ebitda, ev_ebit, eps_growth
#   Neu (v1.2):      owner_earnings_yield, fcf_debt_cover, shares_change_yoy
#
# NEU v1.2:
#   + owner_earnings_yield (Buffett Owner Earnings, fund_juno v7.9.7+)
#   + fcf_debt_cover       (O'Shaughnessy QVM Quality Gate, fund_juno v7.9.22+)
#   + shares_change_yoy    (Buyback-Signal, O'Shaughnessy Shareholder Yield, fund_juno v7.9.23+)
#   + IC-IR Berechnung     (IC / StdDev(IC) ueber Zeitpaare — Konsistenz-Metrik)
#   + Konfidenz-Score      (IC-Staerke x Konsistenz → Score-Gewicht-Empfehlung)
#
# OUTPUT:
#   Konsole: IC pro Faktor + t-Statistik + ICIR + Signifikanz
#   stockiq_annual_ic_results.json: maschinenlesbar fuer Dashboard-Integration
#
# INTERPRETATION:
#   IC > 0.10 + signifikant → Faktor prognostiziert Ueberrendite → Gewicht erhoehen
#   IC ~= 0   → kein Prognosewert → Gewicht neutral lassen
#   IC < -0.10 signifikant → Kontraindikator → Gewicht reduzieren
#   ICIR > 0.5 → konsistentes Signal (nicht nur 1 gutes Jahr)
# ============================================================

import json
import math
import datetime
import time
import yfinance as yf

# ── Konfiguration ─────────────────────────────────────────────
ANNUAL_FILE  = "stockiq_annual.json"
OUTPUT_FILE  = "stockiq_annual_ic_results.json"
SLEEP_SEC    = 0.5     # Rate-Limit-Pause zwischen Ticker-Batches

# Analysierte Faktor-Rendite-Paare (Faktor Jahr → Rendite Jahr+1)
YEAR_PAIRS = [
    (2021, 2022),
    (2022, 2023),
    (2023, 2024),
    (2024, 2025),
]

# Faktoren die analysiert werden
FAKTOREN = [
    # --- Kernfaktoren (v1.1) ---
    "roce", "fcf", "roe", "peg", "beta", "debt",
    "mom_skip", "evar", "ev_ebitda", "ev_ebit", "eps_growth",
    # --- Neue Faktoren (v1.2) ---
    "owner_earnings_yield",  # Buffett Owner Earnings: (NI + D&A - CapEx) / MC
    "fcf_debt_cover",        # O'Shaughnessy QVM: FCF / Total Debt
    "shares_change_yoy",     # Buyback-Signal: neg = Rueckkauf = besser
]

# Richtung: True = hoch ist gut (positiver Zusammenhang mit Rendite)
#           False = niedrig ist gut (negativer Zusammenhang erwartet)
FAKTOR_RICHTUNG = {
    # Kernfaktoren
    "roce":               True,   # hoch = besser (Kapitalrendite)
    "fcf":                True,   # hoch = besser (Free Cash Flow Yield %)
    "roe":                True,   # hoch = besser (Return on Equity)
    "peg":                False,  # niedrig = guenstiger (Price/Earnings/Growth)
    "beta":               False,  # niedrig = defensiver
    "debt":               False,  # niedrig = geringer verschuldet (D/E %)
    "mom_skip":           True,   # hoch = staerkeres 12M-Momentum (Skip-Month)
    "evar":               True,   # hoch = stabiler (Earnings-Variability, invers skaliert)
    "ev_ebitda":          False,  # niedrig = guenstiger (Buffett: EV/EBITDA)
    "ev_ebit":            False,  # niedrig = guenstiger (Damodaran: EV/EBIT sauberer)
    "eps_growth":         True,   # hoch = staerkeres EPS-Wachstum YoY
    # Neue Faktoren (v1.2)
    "owner_earnings_yield": True, # hoch = bessere Ertragskraft (Buffett 1985)
    "fcf_debt_cover":       True, # hoch = bessere Schuldendeckung (>0.20 = gut)
    "shares_change_yoy":    False,# NIEDRIG ist gut (neg = Rueckkauf = O'Shaughnessy)
}

# ── Hilfsfunktionen ───────────────────────────────────────────
def sanitize(v):
    if v is None: return None
    try:
        f = float(v)
        return None if (math.isnan(f) or math.isinf(f)) else f
    except (TypeError, ValueError):
        return None

def spearman(xs, ys):
    """Spearman-Rangkorrelation + t-Statistik + p-Wert-Proxy."""
    n = len(xs)
    if n < 5: return None, None, None
    def ranks(lst):
        s = sorted(range(n), key=lambda i: lst[i])
        r = [0] * n
        for rank, idx in enumerate(s):
            r[idx] = rank + 1
        return r
    rx = ranks(xs); ry = ranks(ys)
    d2 = sum((rx[i] - ry[i]) ** 2 for i in range(n))
    ic = 1 - 6 * d2 / (n * (n * n - 1))
    # t-Statistik fuer Signifikanztest
    if abs(ic) >= 1.0:
        t_stat = float('inf')
    else:
        t_stat = ic * math.sqrt((n - 2) / (1 - ic * ic))
    # Signifikant wenn |t| > 1.96 (p < 0.05, zweiseitig)
    sig = abs(t_stat) > 1.96
    return round(ic, 4), round(t_stat, 2), sig

def get_annual_return(tk, year_start, year_end):
    """
    Berechnet Jahresrendite: Kurs(letzter Handelstag Jahr) → Kurs(letzter HT Jahr+1).
    Gibt Return in % zurueck oder None bei Datenfehler.
    """
    try:
        start = datetime.date(year_start, 12, 1)
        end   = datetime.date(year_end,   12, 31)
        hist  = tk.history(
            start=start.isoformat(),
            end=(end + datetime.timedelta(days=3)).isoformat(),
            interval="1mo",
            auto_adjust=True
        )
        if hist is None or len(hist) < 2:
            return None
        closes = list(hist["Close"])
        # Erster Wert = Kurs Dez year_start, letzter = Kurs Dez year_end
        p0 = sanitize(closes[0])
        p1 = sanitize(closes[-1])
        if p0 and p1 and p0 > 0:
            ret = round((p1 - p0) / p0 * 100, 1)
            # Sanity: >500% oder < -99% = Datenfehler
            if -99 <= ret <= 500:
                return ret
        return None
    except Exception:
        return None

# ── Annual JSON laden ─────────────────────────────────────────
def load_annual(filepath):
    try:
        with open(filepath, "r") as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError) as e:
        print(f"FEHLER: {filepath} nicht gefunden: {e}")
        return []

# ── Hauptprogramm ─────────────────────────────────────────────
def main():
    ts_start = datetime.datetime.utcnow()
    print("=" * 65)
    print("StockIQ Annual IC-Analyse v1.0")
    print("Faktorwert(Dez.Jahr) → Jahresrendite(Folgejahr)")
    print(f"Zeitpaare: {YEAR_PAIRS}")
    print(f"Faktoren : {FAKTOREN}")
    print("=" * 65)

    # Annual-Daten laden
    annual = load_annual(ANNUAL_FILE)
    if not annual:
        print("Keine Annual-Daten gefunden. Abbruch.")
        return

    years_avail = [e["year"] for e in annual]
    print(f"Annual-Jahre verfuegbar: {years_avail}\n")

    # Alle Ticker aus dem letzten verfuegbaren Jahr
    last_entry = annual[-1]
    all_tickers = [t for t in last_entry["tickers"].keys()
                   if t != "__macro__"]
    print(f"Ticker: {len(all_tickers)}\n")

    # ── Renditen laden ───────────────────────────────────────
    print("Lade Jahresrenditen (yfinance)...")
    # returns[ticker][year_start] = return_%
    returns = {t: {} for t in all_tickers}
    errors  = []

    for idx, sym in enumerate(all_tickers):
        if (idx + 1) % 20 == 0:
            print(f"  [{idx+1}/{len(all_tickers)}] ...")
        try:
            tk = yf.Ticker(sym)
            for (y0, y1) in YEAR_PAIRS:
                ret = get_annual_return(tk, y0, y1)
                returns[sym][y0] = ret
            if (idx + 1) % 10 == 0:
                time.sleep(SLEEP_SEC)
        except Exception as e:
            errors.append(sym)
            for (y0, _) in YEAR_PAIRS:
                returns[sym][y0] = None

    print(f"Renditen geladen. Fehler: {len(errors)}\n")

    # ── IC berechnen ─────────────────────────────────────────
    print("Berechne Spearman-IC pro Faktor und Zeitpaar...")
    print()

    # annual_map[year][ticker] = {roce: ..., fcf: ..., ...}
    annual_map = {}
    for entry in annual:
        annual_map[entry["year"]] = entry.get("tickers", {})

    # Ergebnis-Struktur: {faktor: {year_pair: {ic, t, sig, n}, ...}}
    results = {f: {} for f in FAKTOREN}
    # Gepoolte IC (alle Jahre zusammen)
    pooled   = {f: {"xs": [], "ys": []} for f in FAKTOREN}

    for (y0, y1) in YEAR_PAIRS:
        if y0 not in annual_map:
            print(f"  Jahr {y0} nicht in Annual-Daten → uebersprungen")
            continue

        faktor_data = annual_map[y0]
        print(f"  Paar {y0}→{y1}:")

        for fak in FAKTOREN:
            xs = []  # Faktorwerte
            ys = []  # Renditen
            for sym in all_tickers:
                fd = faktor_data.get(sym, {})
                fv = sanitize(fd.get(fak)) if fd else None
                rv = returns[sym].get(y0)
                if fv is not None and rv is not None:
                    xs.append(fv)
                    ys.append(rv)
                    pooled[fak]["xs"].append(fv)
                    pooled[fak]["ys"].append(rv)
            ic, t, sig = spearman(xs, ys)
            results[fak][(y0, y1)] = {"ic": ic, "t": t, "sig": sig, "n": len(xs)}
            sig_str = "**" if sig else "  "
            ic_s = ("+%.4f" % ic) if ic is not None else "  n/a  "
            t_s  = ("+%.2f"  % t)  if t  is not None else " n/a  "
            print("    %-12s: IC=%-8s  t=%-7s  n=%3d  %s" % (
                fak, ic_s, t_s, len(xs), sig_str))
        print()

    # ── Gepoolte IC (alle Jahre) ──────────────────────────────
    print("=" * 70)
    print("GEPOOLTE IC (alle Zeitpaare kombiniert) + ICIR:")
    print("=" * 70)
    pooled_results = {}
    for fak in FAKTOREN:
        xs = pooled[fak]["xs"]
        ys = pooled[fak]["ys"]
        ic, t, sig = spearman(xs, ys)

        # ICIR = IC / StdDev(IC pro Jahr) — Konsistenz-Metrik
        # Hohe ICIR: Signal ist jaehrlich konsistent, nicht nur 1 gutes Jahr
        year_ics = []
        for (y0, y1) in YEAR_PAIRS:
            yr = results[fak].get((y0, y1), {})
            if yr.get("ic") is not None:
                year_ics.append(yr["ic"])
        icir = None
        if len(year_ics) >= 2:
            mean_ic = sum(year_ics) / len(year_ics)
            variance = sum((v - mean_ic) ** 2 for v in year_ics) / len(year_ics)
            std_ic = variance ** 0.5
            if std_ic > 0.0001:
                icir = round(mean_ic / std_ic, 2)

        pooled_results[fak] = {
            "ic": ic, "t": t, "sig": sig, "n": len(xs),
            "icir": icir, "year_ics": year_ics
        }

        dir_ok = FAKTOR_RICHTUNG.get(fak, True)
        if ic is not None:
            expected = (ic > 0) == dir_ok
            bewert = "erwartet" if expected else "! GEGENRICHTUNG"
        else:
            bewert = "n/a"
        ic_s   = ("+%.4f" % ic)   if ic   is not None else "  n/a  "
        t_s    = ("%+.2f"  % t)    if t    is not None else " n/a  "
        icir_s = ("%+.2f"  % icir) if icir is not None else "  n/a"
        print("  %-22s: IC=%-8s  t=%-7s  ICIR=%-6s  n=%4d  %s  %s" % (
            fak, ic_s, t_s, icir_s, len(xs),
            "**" if sig else "  ", bewert))

    # ── Gewichtungs-Empfehlung ────────────────────────────────
    print()
    print("=" * 70)
    print("GEWICHTUNGS-EMPFEHLUNG (gepoolter IC + ICIR-Konsistenz):")
    print("=" * 70)
    for fak in FAKTOREN:
        r  = pooled_results[fak]
        ic = r["ic"]; sig = r["sig"]; icir = r["icir"]
        dir_ok = FAKTOR_RICHTUNG.get(fak, True)

        if ic is None:
            empf = "-- kein Datenbasis"
        elif sig and abs(ic) >= 0.15 and (icir is None or abs(icir) >= 0.5):
            if (ic > 0) == dir_ok:
                empf = "[hoch+konsistent] SIGNIFIKANT ERHOEHEN"
            else:
                empf = "[hoch+konsistent] ! REDUZIEREN — Gegenrichtung"
        elif sig and abs(ic) >= 0.15:
            if (ic > 0) == dir_ok:
                empf = "[hoch] ERHOEHEN — aber ICIR pruefen (Jahres-Konsistenz)"
            else:
                empf = "[hoch] REDUZIEREN — Gegenrichtung (ICIR schwach)"
        elif sig and abs(ic) >= 0.05:
            empf = "[schwach] BEIBEHALTEN — schwach signifikant"
        else:
            empf = "NEUTRAL — kein signifikanter Prognosewert"
        ic_s = ("+%.4f" % ic) if ic is not None else "n/a"
        print("  %-22s  IC=%-8s  %s" % (fak, ic_s, empf))

    # ── JSON-Output ───────────────────────────────────────────
    ts_end = datetime.datetime.utcnow()
    output = {
        "meta": {
            "version":    "annual_ic_v1.2",
            "generated":  ts_end.isoformat() + "Z",
            "year_pairs": [list(p) for p in YEAR_PAIRS],
            "n_tickers":  len(all_tickers),
            "n_errors":   len(errors),
            "duration_s": round((ts_end - ts_start).total_seconds(), 1),
        },
        "pooled": {
            fak: {
                "ic":       pooled_results[fak]["ic"],
                "t":        pooled_results[fak]["t"],
                "sig":      pooled_results[fak]["sig"],
                "n":        pooled_results[fak]["n"],
                "icir":     pooled_results[fak].get("icir"),
                "year_ics": pooled_results[fak].get("year_ics", []),
                "direction_ok": (
                    (pooled_results[fak]["ic"] > 0) == FAKTOR_RICHTUNG.get(fak, True)
                ) if pooled_results[fak]["ic"] is not None else None
            }
            for fak in FAKTOREN
        },
        "by_year": {
            str(y0) + "_" + str(y1): {
                f: results[f].get((y0, y1), {})
                for f in FAKTOREN
            }
            for (y0, y1) in YEAR_PAIRS
        }
    }
    with open(OUTPUT_FILE, "w") as f:
        json.dump(output, f, indent=2, default=lambda o: None)

    print()
    print(f"Fertig in {round((ts_end-ts_start).total_seconds(),1)}s")
    print(f"Output: {OUTPUT_FILE}")
    print()
    print("Naechster Schritt:")
    print("  IC > 0.10 + sig + ICIR > 0.5 → Gewicht in fSc()/debtSc() anpassen")
    print("  shares_change_yoy sig + neg IC → in fSc() als kleines Gewicht (~5%)")
    print("  owner_earnings_yield sig + pos IC → max(fcfSc, oeYieldSc) Komplement")
    print("  fcf_debt_cover sig + pos IC → debtSc() Hybrid: D/E×0.65 + cover×0.35")

if __name__ == "__main__":
    main()
