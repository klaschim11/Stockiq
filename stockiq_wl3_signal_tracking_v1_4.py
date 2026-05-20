# ============================================================
# stockiq_wl3_signal_tracking_v1_4.py
# StockIQ — WL3 Signal-Level Outcome-Validation
# ============================================================
# NEU v1.4: Variabler Horizont + Konfidenz-Indikator
#   - Kein Warten auf 30/90/180d-Frist
#   - Jeder Snapshot liefert seinen verfuegbaren Return
#     (Snapshot-Datum bis heute)
#   - Konfidenz-Indikator: hoch/mittel/niedrig/n.a.
#     basierend auf n + Fisher-z-Konfidenzintervall (95%)
#   - Horizont-Bucket-Analyse: 7-14d / 14-21d / 21-30d / 30-60d
#   - Deduplizierung: pro Ticker x Datum nur letzter Eintrag
#   - Score-Proxy: Percentile-Rang (0-100) je Snapshot
# INPUT:  stockiq_snapshots.json
# OUTPUT: stockiq_wl3_results.json
# ============================================================

import json, math, datetime, time
import yfinance as yf

VERSION       = "1.4"
SNAPSHOT_FILE = "stockiq_snapshots.json"
OUTPUT_FILE   = "stockiq_wl3_results.json"
MIN_HORIZON_DAYS = 7
SLEEP_SEC = 0.3

HORIZON_BUCKETS = [
    (7,  14, "7-14d"),
    (14, 21, "14-21d"),
    (21, 30, "21-30d"),
    (30, 60, "30-60d"),
    (60, 90, "60-90d"),
    (90, 999,"90d+"),
]

CONF_HIGH   = 400
CONF_MEDIUM = 150
CONF_LOW    = 30
MIN_PAIRS   = 5

SIG_BUY  = {"strong", "buy"}
SIG_WATCH= {"watch", "pb", "watch_rsi", "buy_rsi_warn", "rsi_block"}
SIG_HOLD = {"hold_sf", "hold_sf_div", "hold_sf_both", "hold_dvg", "weak"}
SIG_SELL = {"sell", "sell_ma", "sell_rsi", "sell_macd", "sell_div",
            "sell_score", "sell_gap"}

def sanitize(v):
    if v is None: return None
    try:
        f = float(v)
        return None if (math.isnan(f) or math.isinf(f)) else f
    except Exception:
        return None

def parse_ts(ts_ms):
    try:
        return datetime.datetime.utcfromtimestamp(ts_ms/1000.0).date()
    except Exception:
        return None

def parse_date(s):
    if not s: return None
    for fmt in ("%d.%m.%Y %H:%M", "%d.%m.%Y", "%Y-%m-%d", "%Y-%m-%dT%H:%M:%S"):
        try:
            return datetime.datetime.strptime(s[:len(fmt)], fmt).date()
        except Exception:
            pass
    return None

def spearman(xs, ys):
    n = len(xs)
    if n < MIN_PAIRS: return None, None, None
    def ranks(lst):
        s = sorted(range(n), key=lambda i: lst[i])
        r = [0]*n
        for rk, idx in enumerate(s): r[idx] = rk+1
        return r
    rx = ranks(xs); ry = ranks(ys)
    d2 = sum((rx[i]-ry[i])**2 for i in range(n))
    ic = 1 - 6*d2/(n*(n*n-1))
    ic = max(-1.0, min(1.0, ic))
    t_val = ic * math.sqrt((n-2)/max(1e-9, 1-ic*ic))
    return round(ic,4), round(t_val,2), abs(t_val)>1.96

def confidence_indicator(ic, n):
    """Konfidenz-Indikator mit 95%-CI via Fisher-z."""
    if ic is None or n < CONF_LOW:
        return {"label":"n.a.", "ci_lo":None, "ci_hi":None, "t":None, "sig":False, "n":n}
    z   = math.atanh(max(-0.9999, min(0.9999, ic)))
    se  = 1.0/math.sqrt(max(1, n-3))
    ci_lo = math.tanh(z - 1.96*se)
    ci_hi = math.tanh(z + 1.96*se)
    t_val = ic * math.sqrt((n-2)/max(1e-9, 1-ic*ic))
    if n >= CONF_HIGH:   label = "hoch"
    elif n >= CONF_MEDIUM: label = "mittel"
    else:                  label = "niedrig"
    return {
        "label": label,
        "ci_lo": round(ci_lo,4), "ci_hi": round(ci_hi,4),
        "t": round(t_val,2), "sig": abs(t_val)>1.96, "n": n
    }

def mean(lst):
    return round(sum(lst)/len(lst),2) if lst else None

def win_rate(lst):
    return round(100.0*sum(1 for x in lst if x>0)/len(lst),1) if lst else None

def sig_bucket(sig):
    if sig in SIG_BUY:  return "BUY"
    if sig in SIG_WATCH:return "WATCH"
    if sig in SIG_HOLD: return "HOLD"
    if sig in SIG_SELL: return "SELL"
    return "OTHER"

def base_price(closes, snap_date):
    """Letzter Handelstag <= snap_date (rueckwaerts bis 10 Tage)."""
    for offset in range(11):
        d = snap_date - datetime.timedelta(days=offset)
        p = closes.get(d)
        if p and p > 0: return sanitize(p)
    return None

def fwd_price(closes, target_date):
    """Erster Handelstag >= target_date (vorwaerts bis 10 Tage)."""
    for offset in range(11):
        d = target_date + datetime.timedelta(days=offset)
        p = closes.get(d)
        if p and p > 0: return sanitize(p)
    return None

def load_snapshots(filepath):
    try:
        with open(filepath, "r", encoding="utf-8") as f:
            raw = json.load(f)
    except Exception as e:
        print("FEHLER: {}".format(e)); return []
    if isinstance(raw, list):
        snaps = raw
    elif isinstance(raw, dict):
        snaps = None
        for k in ("snapshots","data","entries"):
            if isinstance(raw.get(k), list): snaps = raw[k]; break
        if snaps is None:
            print("FEHLER Format. Keys: {}".format(list(raw.keys())[:8])); return []
    else:
        return []
    if snaps:
        s0 = snaps[0]
        print("DEBUG Snapshot[0] Keys: {}".format(list(s0.keys())))
        e0 = s0.get("entries",[])
        if e0:
            print("DEBUG Entry[0] Keys: {}".format(list(e0[0].keys())))
    return snaps

def detect_and_normalize(snaps):
    if not snaps: return [], "unknown"
    s0 = snaps[0]
    if "entries" in s0 and "ts" in s0:
        print("Format: Dashboard-Archiv"); return snaps, "dashboard"
    if "tickers" in s0 and "timestamp" in s0:
        print("Format: fund_juno — Percentile-Rang Score-Proxy")
        normalized = []
        for snap in snaps:
            ts_str = snap.get("timestamp","")
            try:
                snap_date = datetime.datetime.strptime(ts_str[:10],"%Y-%m-%d").date()
            except Exception:
                continue
            ticker_raws = []
            ticker_fds  = {}
            for ticker, fd in snap.get("tickers",{}).items():
                if not isinstance(fd,dict): continue
                vals = []
                for v in [fd.get("fcf"), fd.get("roce")]:
                    sv = sanitize(v)
                    if sv is not None: vals.append(sv)
                if vals:
                    ticker_raws.append((ticker, sum(vals)/len(vals)))
                    ticker_fds[ticker] = fd
            ticker_raws.sort(key=lambda x: x[1])
            n_t = len(ticker_raws)
            entries = []
            for rank, (ticker, _) in enumerate(ticker_raws):
                pct = round(100.0*rank/max(1,n_t-1),1) if n_t>1 else 50.0
                fd  = ticker_fds[ticker]
                entries.append({
                    "t": ticker, "sig": "watch", "sc": pct, "p": None,
                    "fcf": fd.get("fcf"), "roce": fd.get("roce"),
                    "peg": fd.get("peg"), "beta": fd.get("beta"),
                })
            if entries:
                ts_ms = int(datetime.datetime.strptime(
                    ts_str[:19],"%Y-%m-%dT%H:%M:%S").timestamp()*1000)
                normalized.append({
                    "ts": ts_ms,
                    "date": snap_date.strftime("%d.%m.%Y 00:00"),
                    "entries": entries,
                })
        print("Normalisiert: {} Snapshots".format(len(normalized)))
        return normalized, "fund_juno"
    print("WARNUNG: Unbekanntes Format"); return snaps, "unknown"

def main():
    ts_start = datetime.datetime.utcnow()
    today    = datetime.date.today()
    print("="*65)
    print("StockIQ WL3 v{} — variabler Horizont + Konfidenz-Indikator".format(VERSION))
    print("Heute: {} | Mindest-Horizont: {}d".format(today, MIN_HORIZON_DAYS))
    print("="*65)

    snaps = load_snapshots(SNAPSHOT_FILE)
    if not snaps: print("Keine Snapshots."); return
    print("Geladen: {}".format(len(snaps)))
    snaps, snap_format = detect_and_normalize(snaps)
    if not snaps: print("Normalisierung fehlgeschlagen."); return
    print()

    # Eintraege parsen + deduplizieren
    ticker_data = {}  # ticker -> {date -> (sig, sc, p)}
    snap_dates  = set()

    for snap in snaps:
        snap_date = None
        if snap.get("ts"):
            snap_date = parse_ts(snap["ts"])
        if snap_date is None and snap.get("date"):
            snap_date = parse_date(snap["date"])
        if snap_date is None: continue
        snap_dates.add(snap_date)
        for entry in snap.get("entries",[]):
            t   = entry.get("t")
            sig = entry.get("sig")
            sc  = sanitize(entry.get("sc"))
            p   = sanitize(entry.get("p"))
            if not t or not sig or sc is None: continue
            if t not in ticker_data: ticker_data[t] = {}
            ticker_data[t][snap_date] = (sig, sc, p)  # letzter gewinnt

    total_tickers = len(ticker_data)
    total_entries = sum(len(v) for v in ticker_data.values())
    snap_date_min = min(snap_dates) if snap_dates else None
    snap_date_max = max(snap_dates) if snap_dates else None

    print("Ticker: {}  |  Eintraege (dedup): {}".format(total_tickers, total_entries))
    print("Zeitraum: {} bis {}".format(
        snap_date_min.isoformat() if snap_date_min else "?",
        snap_date_max.isoformat() if snap_date_max else "?"))
    print()

    print("Verfuegbare Horizonte:")
    for lo, hi, label in HORIZON_BUCKETS:
        cnt = sum(1 for sd in snap_dates if lo <= (today-sd).days < hi)
        print("  {}: {} Snapshot-Tage".format(label, cnt))
    print()

    # Kurshistorie laden
    all_tickers = sorted(ticker_data.keys())
    fetch_start = (snap_date_min - datetime.timedelta(days=3)) if snap_date_min else today
    print("Lade Kurshistorie ({} Ticker) ...".format(len(all_tickers)))
    hist_map = {}; errors = []

    for idx, sym in enumerate(all_tickers):
        if (idx+1) % 20 == 0:
            print("  [{}/{}] ...".format(idx+1, len(all_tickers)))
        try:
            tk   = yf.Ticker(sym)
            hist = tk.history(
                start=fetch_start.isoformat(),
                end=(today+datetime.timedelta(days=1)).isoformat(),
                interval="1d", auto_adjust=True)
            closes = {}
            if hist is not None and not hist.empty:
                for idx2, row in hist.iterrows():
                    try:
                        d = idx2.to_pydatetime().date() if hasattr(idx2,'to_pydatetime') else idx2.date()
                        c = sanitize(row["Close"])
                        if c: closes[d] = c
                    except Exception:
                        pass
            hist_map[sym] = closes
            if (idx+1) % 10 == 0: time.sleep(SLEEP_SEC)
        except Exception:
            errors.append(sym); hist_map[sym] = {}

    print("Kurshistorie geladen. Fehler: {}\n".format(len(errors)))

    # Variabler Return berechnen
    records = []
    for sym, date_map in ticker_data.items():
        closes = hist_map.get(sym, {})
        for snap_date, (sig, sc, p_snap) in date_map.items():
            days_avail = (today - snap_date).days
            if days_avail < MIN_HORIZON_DAYS: continue

            p_b = base_price(closes, snap_date) or p_snap
            p_c = fwd_price(closes, today)

            ret = None
            if p_b and p_b > 0 and p_c:
                r = (p_c - p_b) / p_b * 100
                ret = round(r, 2) if -200 <= r <= 200 else None

            hbucket = "other"
            for lo, hi, label in HORIZON_BUCKETS:
                if lo <= days_avail < hi: hbucket = label; break

            records.append({
                "ticker":     sym,
                "date":       snap_date.isoformat(),
                "days_avail": days_avail,
                "hbucket":    hbucket,
                "signal":     sig,
                "bucket":     sig_bucket(sig),
                "score":      sc,
                "ret":        ret,
            })

    valid_n = sum(1 for r in records if r["ret"] is not None)
    print("Records: {}  |  mit Return: {}\n".format(len(records), valid_n))

    # IC berechnen (gesamt + je Horizont-Bucket)
    def calc_ic(recs):
        xs = [r["score"] for r in recs if r["ret"] is not None]
        ys = [r["ret"]   for r in recs if r["ret"] is not None]
        ic, t, sig = spearman(xs, ys)
        conf = confidence_indicator(ic, len(xs))
        return {"ic":ic, "t":t, "sig":sig, "n":len(xs), "conf":conf}

    ic_overall   = calc_ic(records)
    ic_by_bucket = {lbl: calc_ic([r for r in records if r["hbucket"]==lbl])
                    for _,_,lbl in HORIZON_BUCKETS}

    # Score-Buckets
    def sc_lbl(sc):
        if sc>=80: return "80+"
        if sc>=70: return "70-79"
        if sc>=60: return "60-69"
        return "<60"
    score_results = {}
    for sb in ["80+","70-79","60-69","<60"]:
        vals = [r["ret"] for r in records if sc_lbl(r["score"])==sb and r["ret"] is not None]
        score_results[sb] = {"n":len(vals),"avg_ret":mean(vals),"win_rate":win_rate(vals)}

    # Signal-Buckets
    bucket_results = {}
    for bkt in ["BUY","WATCH","HOLD","SELL"]:
        vals = [r["ret"] for r in records if r["bucket"]==bkt and r["ret"] is not None]
        bucket_results[bkt] = {"n":len(vals),"avg_ret":mean(vals),"win_rate":win_rate(vals)}

    # Ausgabe
    print("="*65)
    r  = ic_overall
    c  = r["conf"]
    ic_s = "{:+.4f}".format(r["ic"]) if r["ic"] is not None else "  n/a "
    ci_s = "[{:+.3f},{:+.3f}]".format(c["ci_lo"],c["ci_hi"]) if c.get("ci_lo") is not None else "n/a"
    sig_s = "**" if r["sig"] else "  "
    print("IC GESAMT: {} t={} n={} {} | Konfidenz: {} | 95%CI: {}".format(
        ic_s, r["t"], r["n"], sig_s, c["label"].upper(), ci_s))

    print("\nIC JE HORIZONT-BUCKET:")
    for lbl, r in ic_by_bucket.items():
        if r["n"] < CONF_LOW:
            print("  {:10s}: n={} (n.a.)".format(lbl, r["n"])); continue
        c = r["conf"]
        ic_s = "{:+.4f}".format(r["ic"]) if r["ic"] is not None else "  n/a "
        ci_s = "[{:+.3f},{:+.3f}]".format(c["ci_lo"],c["ci_hi"]) if c.get("ci_lo") is not None else "n/a"
        sig_s = "**" if r["sig"] else "  "
        print("  {:10s}: IC={} n={:4d} {} Konf.{:7s} CI={}".format(
            lbl, ic_s, r["n"], sig_s, c["label"].upper(), ci_s))

    print("\nSCORE-BUCKET:")
    for sb, r in score_results.items():
        ar = "{:+.1f}%".format(r["avg_ret"]) if r["avg_ret"] is not None else "n/a"
        wr = "{}%".format(r["win_rate"])      if r["win_rate"] is not None else "n/a"
        print("  {:6s}: n={:4d}  AvgRet={}  WR={}".format(sb, r["n"], ar, wr))

    # JSON-Output
    ts_end = datetime.datetime.utcnow()
    output = {
        "meta": {
            "version":VERSION, "generated":ts_end.isoformat()+"Z",
            "duration_s":round((ts_end-ts_start).total_seconds(),1),
            "snap_format":snap_format, "n_snapshots":len(snaps),
            "n_tickers":total_tickers, "n_records":len(records),
            "n_valid_returns":valid_n,
            "snap_date_min":snap_date_min.isoformat() if snap_date_min else None,
            "snap_date_max":snap_date_max.isoformat() if snap_date_max else None,
            "today":today.isoformat(), "min_horizon_days":MIN_HORIZON_DAYS,
            "n_errors":len(errors),
        },
        "ic_overall":    ic_overall,
        "ic_by_horizon": ic_by_bucket,
        "score_bucket":  score_results,
        "signal_bucket": bucket_results,
        "records":       records,
    }
    with open(OUTPUT_FILE,"w") as f:
        json.dump(output, f, indent=2, default=lambda o: None)

    print("\n"+"="*65)
    print("Fertig in {}s | {}".format(
        round((ts_end-ts_start).total_seconds(),1), OUTPUT_FILE))
    print()
    print("Lese-Hilfe Konfidenz-Indikator:")
    print("  HOCH   (n>=400): IC=0.10 statistisch signifikant nachweisbar")
    print("  MITTEL (n>=150): IC>=0.15 nachweisbar")
    print("  NIEDRIG(n>=30 ): IC>=0.25 nachweisbar, Vorsicht bei Interpretation")
    print("  95%CI komplett > 0 -> Effekt robust, nicht nur zufaellig")

if __name__ == "__main__":
    main()
