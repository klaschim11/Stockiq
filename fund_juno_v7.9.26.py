# ============================================================
# stockiq_fund_juno_v7_9_24.py
# StockIQ Fundamentals-Fetcher — Version 7.9.24
# Neu in v7.9.24: get_bond_regime() — TNX 5d-Veraenderung in bps -> bond_factor
#   Datenquelle: yf.Ticker("^TNX").history(period="10d")
#   Schwellen: <15bps=1.00 | 15-25bps=0.80 | >25bps=0.50
# Neu in v7.9.23: shares_change_yoy (Buyback-Signal, O'Shaughnessy Shareholder Yield)
#   YoY-Veraenderung der Aktienanzahl via quarterly_balance_sheet
#   Negativ = Aktienrueckkauf (bullish), Positiv = Verwaesserung (bearish)
# Neu in v7.9.22: fcf_debt_cover + ev_ebit
#   fcf_debt_cover : FCF / Total Debt — O'Shaughnessy QVM Quality Gate
#   ev_ebit        : EV / EBIT — Buffett 2024 (ehrlicher als EV/EBITDA)
# Neu in v7.9.17: +Defense EU +Halbleiter +Kanada (Ticker-Liste)
# Neu in v7.9.12: EUR-Normierung + Preis-Fetching
# Neu in v7.9.11: Depot-Tab Zeitreihen-Infrastruktur
# Neu in v7.9.10: Sektor-ETF 12M-Return (Sektor-Ranking im Report)
# Neu in v7.9.8:  Makro-Daten VIX + V2X + Bond-Vol
# Neu in v7.9.7:  owner_earnings_yield (Buffett Owner Earnings)
# Neu in v7.9.6:  Jahres-Snapshot (stockiq_annual.json)
#   Auto-detect: 1. Mai ±7 Tage -> schreibt Jahres-Eintrag
#   Format: [{year, date, version, tickers:{roce,fcf,mom_skip,...}}]
# Neu in v7.9.4:  mom_skip + mom12m_ret (Skip-Month Momentum)
# Neu in v7.9.3:  sector + industry
# Fix in v7.9.2:  ROCE — Bilanz-Direktzugriff
# ============================================================
# NEUE FELDER v7.9.24:
#   tnx_5d_change_bps : float | None — TNX 5d-Veraenderung in Basispunkten
#                       Basis: yf.Ticker("^TNX").history(period="10d")
#                       sanitize() gesetzt — yfinance kann NaN liefern
#   bond_factor       : float — Makro-Faktor aus TNX-Regime
#                       1.00 (<15bps) | 0.80 (15-25bps) | 0.50 (>25bps)
#                       Eintrag: __macro__-Block (kein per-Ticker-Feld)
# NEUE FELDER v7.9.23:
#   shares_change_yoy : float | None — YoY Aktienanzahl in %
#                       Negativ = Rueckkauf | Positiv = Verwaesserung
#                       Basis: quarterly_balance_sheet (ShareIssued)
#                       Akademisch: O'Shaughnessy (2012) Shareholder Yield
#                       Sanity: Cap bei ±50%, nur wenn 2 Quartale vorhanden
# NEUE FELDER v7.9.22:
#   fcf_debt_cover : float | None — FCF / Total Debt (0..10+)
#                   Buffett-Proxy: >0.20 = Schulden tilgbar in <5 Jahren
#                   Cap bei 10.0 (schuldenfreie Unternehmen)
#   ev_ebit        : float | None — EV / EBIT (0..60)
#                   Sanity: 0 < ev_ebit <= 60; Greenblatt Magic Formula
# NEUE FELDER v7.9.4:
#   mom_skip    : float | None — 11M-Return in % (Monat-12 bis Monat-1)
#                 Akademischer Standard: Jegadeesh/Titman 1993, Fama/French
#                 Ausschluss des letzten Monats verhindert Short-Term-Reversal
#                 Quelle: tk.history(period="13mo", interval="1mo")
#                 Sanity: Cap bei ±300% (verhindert Split-Artefakte)
#   mom12m_ret  : float | None — echter 12M-Return in % (Monat-12 bis heute)
#                 Referenzwert (nicht im Score, nur zur Anzeige)
#   mom12m      : float | None — VERALTET (52W-Position 0-100), bleibt fuer
#                 Rueckwaerts-kompatibilitaet; Dashboard nutzt ab v5.9.33 mom_skip

import yfinance as yf
import json
import math
import datetime
import time

# -- Konfiguration --------------------------------------------------------------
OUTPUT_FILE   = "stockiq_fundamentals.json"
SNAPSHOT_FILE = "stockiq_snapshots.json"
ANNUAL_FILE   = "stockiq_annual.json"      # NEU v7.9.6: Jahres-Snapshot
VERSION       = "7.9.26"  # NEU: SECTOR_OVERRIDES (DQ-Fix ROG.SW/BAES.L) + Sprint-4 Ticker (n=298)
BATCH_SIZE    = 10   # Ticker pro Batch (iOS: klein halten)
SLEEP_SEC     = 1.0  # Pause zwischen Batches (Rate-Limit)
SAVE_INTERVAL = 50   # Zwischenspeichern alle N Ticker (iOS-Sicherheit)

# -- Jahres-Snapshot-Fenster: 1. Mai ± ANNUAL_WINDOW_DAYS ----------------------
ANNUAL_MONTH       = 5   # Mai
ANNUAL_DAY         = 1   # 1. Mai
ANNUAL_WINDOW_DAYS = 7   # ±7 Tage Toleranz (26.Apr – 8.Mai)

# -- Ticker-Liste (v7.9.17: +Defense EU +Halbleiter +Kanada — exakt aus Dashboard STOCKS-Array)
TICKERS = [
    "META", "AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "TSLA", "AVGO", "MU", "AMAT",
    "QCOM", "CDNS", "SNPS", "FICO", "NOW", "LLY", "JNJ", "SYK",
    "NVO", "BRK-B", "PGR", "BKNG", "PYPL", "MCD", "SBUX", "YUM",
    "COST", "TT", "ODFL", "CWST", "NESN.SW", "ROG.SW", "LISP.SW", "SRT3.DE",
    "EVD.DE", "NEM.DE", "ASML", "BTI", "RIO", "SHEL.L", "RMS.PA", "8058.T",
    "8001.T", "8031.T", "8002.T", "8053.T", "8015.T", "V", "MA", "UNH",
    "HD", "ADBE", "CRM", "ACN", "TMO", "ISRG", "REGN", "PANW",
    "AMAT", "LRCX", "KLAC", "MELI", "ADP", "CTAS", "FAST", "ROL",
    "WST", "MTD", "IDXX", "WSO", "EFX", "MCO", "SPGI", "ICE",
    "CME", "BRO", "RJF", "SAP.DE", "SIE.DE", "ALV.DE", "MRK.DE", "DTE.DE",
    "BAS.DE", "MC.PA", "AI.PA", "SAN.PA", "BNP.PA", "OR.PA", "DSY.PA", "NOVN.SW",
    "ABBN.SW", "GEBN.SW", "SREN.SW", "LONN.SW", "AZN", "GSK.L", "ULVR.L", "DGE.L",
    "ENEL.MI", "6758.T", "6861.T", "7974.T", "4519.T", "4523.T", "6367.T", "6902.T",
    "7203.T", "8316.T", "8411.T", "8306.T", "9432.T", "4543.T", "6146.T", "4661.T",
    "9433.T", "8035.T", "6954.T", "9984.T", "BLK", "GS", "MS", "JPM", "CNR", "RY", "SHOP",
    "CAT", "DE", "HON", "ITW", "PH", "GWW", "CARR", "ABT",
    "MDT", "BSX", "EW", "DXCM", "HCA", "NKE", "LULU", "MNST",
    "HSY", "XOM", "CVX", "COP", "FCX", "AMT", "EQIX", "PLD",
    "MSCI", "VRSK", "NFLX", "WDAY", "ZS", "CPRT", "CSGP", "POOL",
    "ROP", "TRMB", "AXON", "DECK", "BURL", "FERG", "BMW.DE", "MBG.DE",
    "VOW3.DE", "RWE.DE", "MUV2.DE", "HEN3.DE", "BEI.DE", "FRE.DE", "ADS.DE", "IFX.DE",
    "SIX2.DE", "PGHN.SW", "BP.L", "HSBA.L", "BA.L",
    "REL.L", "LSEG.L", "CPG.L", "BATS.L", "VOD.L", "PHIA.AS", "WKL.AS", "ASRNL.AS",
    "VOLV-B.ST", "ASSA-B.ST", "EQT.ST", "INVE-B.ST", "IBE.MC", "SAN.MC", "BBVA.MC", "ISP.MI",
    "4901.T", "6501.T", "6702.T", "6503.T", "7267.T", "4502.T", "4507.T", "2914.T",
    "3382.T", "8267.T", "9020.T", "5401.T", "4063.T", "6594.T", "6723.T", "4568.T",
    "9983.T", "6098.T", "BABA", "PDD", "JD", "BIDU", "NTES", "TCOM",
    "YUMC", "BILI", "TME", "LI", "XPEV", "NIO", "BEKE", "ZTO",
    "005930.KS",

    # -- Wiederhergestellt nach Bereinigung (v7.8.1) --
    "0700.HK", "1211.HK", "3750.HK", "7751.T", "AIR.PA", "ATCO-A.ST", "AXP", "BAC",
    "BKW.SW", "CAP.PA", "CB", "CFR.SW", "DBK.DE", "EN.PA", "ERG.MI", "EXPN.L",
    "FTNT", "G.MI", "HDB", "HEIA.AS", "HOLN.SW", "INGA.AS", "INTU", "ITX.MC",
    "KER.PA", "KNIN.SW", "LDO.MI", "RHM.DE", "SAF.PA", "HO.PA", "RR.L", "BAES.L", "LR.PA", "NOVO-B.CO", "ORCL", "RACE.MI", "SAND.ST",
    "SLHN.SW", "STLAM.MI", "SU.PA", "TSM", "UCG.MI", "ZURN.SW",

    # -- Sprint 4: Utilities n=20 (v7.9.26) --
    "NEE", "CEG", "WEC", "DUK", "SO", "SSE.L", "NG.L", "EDP.LS", "ENGI.PA", "NTGY.MC",
    "EOAN.DE", "FORTUM.HE", "CNA.L", "VER.VI",
    # -- Sprint 4: Energy n=20 (v7.9.26) --
    "TTE.PA", "ENI.MI", "SLB", "EOG", "EQNR.OL", "CNQ", "FANG", "PSX",
    "OXY", "WMB", "ENB", "SHEL", "MPC", "VLO",
]

# -- DQ-Fix: Sektor-Overrides fuer Ticker mit fehlendem/falschem yfinance-Sektor --
SECTOR_OVERRIDES = {
    "ROG.SW": "Healthcare",
    "BAES.L": "Industrials",
}

# -- Hilfsfunktionen ------------------------------------------------------------
def sanitize(v):
    """NaN / Inf / None -> None (verhindert JSON-Fehler)"""
    if v is None:
        return None
    try:
        f = float(v)
        if math.isnan(f) or math.isinf(f):
            return None
        return f
    except (TypeError, ValueError):
        return None

def safe_bool(v):
    """Gibt True/False/None zurueck"""
    if v is None:
        return None
    if isinstance(v, bool):
        return v
    return bool(v)

def pct(v):
    """Wert * 100, gerundet auf 2 Stellen, oder None"""
    s = sanitize(v)
    return round(s * 100, 2) if s is not None else None

def safe_div(a, b, scale=100):
    """a / b * scale — gibt None wenn b == 0 oder None"""
    a = sanitize(a); b = sanitize(b)
    if a is None or b is None or b == 0:
        return None
    return round(a / b * scale, 2)

# -- Piotroski-Felder berechnen (NEU v7.7) -------------------------------------
def calc_accruals_ok(info, financials, cashflow):
    """
    Piotroski Kriterium 4: Accruals OK = operatingCashflow > netIncome
    Qualitaet: Cash Earnings > Buch-Earnings = positives Signal
    """
    try:
        # operatingCashflow aus cashflow-Statement
        cfo = None
        if cashflow is not None and not cashflow.empty:
            for key in ['Operating Cash Flow', 'Total Cash From Operating Activities',
                        'Cash From Operations']:
                if key in cashflow.index:
                    v = cashflow.loc[key].iloc[0]
                    cfo = sanitize(v)
                    if cfo is not None:
                        break

        # netIncome aus financials
        ni = None
        if financials is not None and not financials.empty:
            for key in ['Net Income', 'Net Income Common Stockholders', 'Net Income From Continuing Operations']:
                if key in financials.index:
                    v = financials.loc[key].iloc[0]
                    ni = sanitize(v)
                    if ni is not None:
                        break

        if cfo is None or ni is None:
            return None
        return bool(cfo > ni)
    except Exception:
        return None

def calc_gross_margin_ok(financials):
    """
    Piotroski Kriterium 8: Delta Gross Margin positiv
    gross_margin_t0 > gross_margin_t-1 = Effizienz-Verbesserung
    Benoetigt mind. 2 Jahres-Spalten in financials
    """
    try:
        if financials is None or financials.empty:
            return None
        cols = financials.columns
        if len(cols) < 2:
            return None

        # Gross Profit und Revenue fuer t0 und t-1
        gp_key = None
        rev_key = None
        for key in ['Gross Profit', 'Total Revenue']:
            if key in financials.index:
                if 'Gross' in key:
                    gp_key = key
                else:
                    rev_key = key

        if gp_key is None or rev_key is None:
            return None

        gp0  = sanitize(financials.loc[gp_key,  cols[0]])
        rev0 = sanitize(financials.loc[rev_key, cols[0]])
        gp1  = sanitize(financials.loc[gp_key,  cols[1]])
        rev1 = sanitize(financials.loc[rev_key, cols[1]])

        if any(v is None for v in [gp0, rev0, gp1, rev1]):
            return None
        if rev0 == 0 or rev1 == 0:
            return None

        gm0 = gp0 / rev0
        gm1 = gp1 / rev1
        return bool(gm0 > gm1)
    except Exception:
        return None

# -- NEU v7.9: EVAR — Earnings Variability Score -------------------------------
def calc_evar_score(tk, info):
    """
    EVAR Score (0-100): Stabilitaet der Quartalsergebnisse.
    100 = maximal stabil | 0 = maximal volatil
    MSCI Quality Descriptor: niedrige Earnings Variability = Qualitaets-Signal.

    Algorithmus:
      Stufe 1: quarterly_financials -> Net Income 4-8 Quartale
               -> YoY-Wachstumsraten (Q0/Q4 - 1 etc.) -> Std-Abweichung
               -> Score = max(5, min(95, round(95 - std * 90)))
      Stufe 2: earningsQuarterlyGrowth (Einzelwert) -> Proxy-Score
      Stufe 3: None (kein Signal verfuegbar)

    Normierung der Std-Abweichung:
      std = 0.00 (perfekt stabil)  -> Score = 95
      std = 0.25 (25% Variation)   -> Score = 73
      std = 0.50 (50% Variation)   -> Score = 50
      std = 1.00 (100% Variation)  -> Score = 5
    """
    try:
        # -- Stufe 1: Quarterly Net Income aus quarterly_financials --
        eps_list = []
        try:
            qf = tk.quarterly_financials
            if qf is not None and not qf.empty:
                for key in ['Net Income', 'Net Income Common Stockholders',
                            'Net Income From Continuing Operations']:
                    if key in qf.index:
                        vals = [sanitize(v) for v in qf.loc[key].values]
                        eps_list = [v for v in vals if v is not None]
                        break
        except Exception:
            pass

        if len(eps_list) >= 4:
            growths = []
            if len(eps_list) >= 8:
                # YoY: Q_t vs Q_t-4 (saisonbereinigt, bevorzugt)
                for i in range(4):
                    base = eps_list[i + 4]
                    curr = eps_list[i]
                    if base != 0:
                        growths.append((curr - base) / abs(base))
            else:
                # QoQ: sequenzielle Wachstumsraten
                for i in range(len(eps_list) - 1):
                    base = eps_list[i + 1]
                    curr = eps_list[i]
                    if base != 0:
                        growths.append((curr - base) / abs(base))

            if len(growths) >= 2:
                mean_g = sum(growths) / len(growths)
                variance = sum((g - mean_g) ** 2 for g in growths) / len(growths)
                std = variance ** 0.5
                # Normierung: std=0 -> 95, std=1 -> 5
                score = max(5, min(95, round(95 - std * 90)))
                return score

        # -- Stufe 2: earningsQuarterlyGrowth Proxy -----------------
        eqg = sanitize(info.get("earningsQuarterlyGrowth"))
        if eqg is not None:
            # Moderates Wachstum = stabiler als extremes Wachstum/Verlust
            abs_g = abs(eqg)
            if abs_g < 0.20:
                return 72   # Sehr stabil
            elif abs_g < 0.50:
                return 58   # Moderat stabil
            elif abs_g < 1.00:
                return 42   # Hoehere Volatilitaet
            else:
                return 28   # Stark volatil

        # -- Stufe 3: kein Signal ------------------------------------
        return None

    except Exception:
        return None

# -- NEU v7.9.24: Bond-Regime --------------------------------------------------
def get_bond_regime():
    """
    TNX 5-Tage-Veraenderung in Basispunkten -> bond_factor.
    Schwellen: <15bps=1.00 | 15-25bps=0.80 | >25bps=0.50
    Quelle: yf.Ticker("^TNX").history(period="10d")
    Fallback: (None, None, 1.00) bei yfinance-Fehler oder zu wenig Daten.
    """
    try:
        hist = yf.Ticker("^TNX").history(period="10d")
        if hist is None or len(hist) < 2:
            return None, None, 1.00
        closes = [sanitize(v) for v in hist["Close"].values]
        closes = [v for v in closes if v is not None]
        if len(closes) < 2:
            return None, None, 1.00
        tnx_current = closes[-1]
        lookback = min(5, len(closes) - 1)
        # TNX in % — 1bps = 0.01pp => Differenz * 100 = bps
        tnx_5d_change_bps = sanitize(round((closes[-1] - closes[-1 - lookback]) * 100, 1))
        abs_chg = abs(tnx_5d_change_bps) if tnx_5d_change_bps is not None else 0
        if abs_chg < 15:
            bond_factor = 1.00
        elif abs_chg <= 25:
            bond_factor = 0.80
        else:
            bond_factor = 0.50
        return tnx_current, tnx_5d_change_bps, bond_factor
    except Exception:
        return None, None, 1.00

# -- Haupt-Fetch-Funktion -------------------------------------------------------
def fetch_ticker(symbol):
    """
    Laed alle Fundamentaldaten fuer einen Ticker.
    Gibt dict mit allen Feldern zurueck, fehlende = None.
    """
    result = {
        "ticker": symbol,
        "fcf": None, "roce": None, "roe": None, "peg": None,
        "moat": "none", "mr": "",
        "beta": None, "debt": None,
        "div_yield": None, "shareholder_return": None,
        "mom12m": None,
        # v7.7:
        "accruals_ok": None, "gross_margin_ok": None,
        # v7.8:
        "trend": None, "rsi_val": None,
        # v7.9.0:
        "evar": None,
        # v7.9.1:
        "ev_ebitda": None,
        # v7.9.3:
        "sector": None, "industry": None,
        # v7.9.4:
        "mom_skip": None, "mom12m_ret": None,
        # v7.9.7:
        "owner_earnings_yield": None,
        # v7.9.11:
        "current_price": None,
        # v7.9.12:
        "current_price_eur": None,
        "price_currency": None,
        # v7.9.22:
        "fcf_debt_cover": None,   # FCF / Total Debt (O'Shaughnessy QVM Quality Gate)
        "ev_ebit": None,          # EV / EBIT (Buffett 2024: ehrlicher als EV/EBITDA)
        # v7.9.23:
        "shares_change_yoy": None, # YoY Aktienanzahl-Veraenderung in % (negativ=Rueckkauf)
    }

    try:
        tk = yf.Ticker(symbol)
        info = tk.info or {}

        # -- Current Price + EUR-Normierung (v7.9.12) -----------------
        raw_price = sanitize(
            info.get("currentPrice") or
            info.get("regularMarketPrice") or
            info.get("previousClose")
        )
        result["current_price"] = raw_price
        # Waehrung des Tickers
        price_currency = (info.get("currency") or "USD").upper()
        result["price_currency"] = price_currency
        # EUR-Umrechnung
        if raw_price is not None:
            if price_currency == "EUR":
                result["current_price_eur"] = raw_price
            elif price_currency == "USD":
                # EURUSD bereits im macro-Block — Fallback: direkt fetchen
                try:
                    fx = yf.Ticker("EURUSD=X").info or {}
                    eurusd = sanitize(fx.get("regularMarketPrice") or fx.get("previousClose"))
                    if eurusd and eurusd > 0:
                        result["current_price_eur"] = round(raw_price / eurusd, 4)
                except Exception:
                    result["current_price_eur"] = None
            elif price_currency in ("GBX", "GBp", "GBP"):
                # GBX/GBp = Pence (immer /100)
                # GBP + .L-Ticker + Preis > 100 -> yfinance-Bug: eigentlich Pence
                # Heuristik: .L-Ticker mit Preis > 100 = Pence (GBP-Kurs > 100 GBP/Aktie selten)
                is_pence = (price_currency in ("GBX", "GBp")) or                            (price_currency == "GBP" and symbol.endswith(".L") and raw_price > 100)
                try:
                    fx2 = yf.Ticker("EURGBP=X").info or {}
                    eurgbp = sanitize(fx2.get("regularMarketPrice") or fx2.get("previousClose"))
                    if eurgbp and eurgbp > 0:
                        gbp_price = raw_price / 100 if is_pence else raw_price
                        result["current_price_eur"] = round(gbp_price / eurgbp, 4)
                        # Waehrungsfeld korrigieren fuer Transparenz
                        if is_pence and price_currency == "GBP":
                            result["price_currency"] = "GBp"
                except Exception:
                    result["current_price_eur"] = None
            elif price_currency == "JPY":
                try:
                    fx4 = yf.Ticker("EURJPY=X").info or {}
                    eurjpy = sanitize(fx4.get("regularMarketPrice") or fx4.get("previousClose"))
                    if eurjpy and eurjpy > 0:
                        result["current_price_eur"] = round(raw_price / eurjpy, 4)
                except Exception:
                    result["current_price_eur"] = None
            elif price_currency == "HKD":
                try:
                    fx5 = yf.Ticker("EURHKD=X").info or {}
                    eurhkd = sanitize(fx5.get("regularMarketPrice") or fx5.get("previousClose"))
                    if eurhkd and eurhkd > 0:
                        result["current_price_eur"] = round(raw_price / eurhkd, 4)
                except Exception:
                    result["current_price_eur"] = None
            elif price_currency == "CHF":
                try:
                    fx6 = yf.Ticker("EURCHF=X").info or {}
                    eurchf = sanitize(fx6.get("regularMarketPrice") or fx6.get("previousClose"))
                    if eurchf and eurchf > 0:
                        result["current_price_eur"] = round(raw_price / eurchf, 4)
                except Exception:
                    result["current_price_eur"] = None
            elif price_currency in ("SEK", "NOK", "DKK"):
                try:
                    pair = "EUR" + price_currency + "=X"
                    fx7 = yf.Ticker(pair).info or {}
                    eurXX = sanitize(fx7.get("regularMarketPrice") or fx7.get("previousClose"))
                    if eurXX and eurXX > 0:
                        result["current_price_eur"] = round(raw_price / eurXX, 4)
                except Exception:
                    result["current_price_eur"] = None
            elif price_currency == "CAD":
                try:
                    fx8 = yf.Ticker("EURCAD=X").info or {}
                    eurcad = sanitize(fx8.get("regularMarketPrice") or fx8.get("previousClose"))
                    if eurcad and eurcad > 0:
                        result["current_price_eur"] = round(raw_price / eurcad, 4)
                except Exception:
                    result["current_price_eur"] = None
            elif price_currency == "AUD":
                try:
                    fx9 = yf.Ticker("EURAUD=X").info or {}
                    euraud = sanitize(fx9.get("regularMarketPrice") or fx9.get("previousClose"))
                    if euraud and euraud > 0:
                        result["current_price_eur"] = round(raw_price / euraud, 4)
                except Exception:
                    result["current_price_eur"] = None
            else:
                result["current_price_eur"] = None  # unbekannte Waehrung

        # -- FCF Yield --------------------------------------------
        try:
            fcf = sanitize(info.get("freeCashflow"))
            mc  = sanitize(info.get("marketCap"))
            if fcf is not None and mc is not None and mc > 0:
                result["fcf"] = round(fcf / mc * 100, 2)
        except Exception:
            pass

        # -- ROCE = EBIT / Capital Employed (v7.9.2: Bilanz-Fix) -----
        # Capital Employed = Eigenkapital + LT-Schulden
        # Problem v7.9.1: info.bookValue * shares nicht mehr zuverlaessig
        # Neue Kette: balance_sheet -> info.bookValue -> None
        try:
            # EBIT: info.ebit -> income_stmt EBIT/Operating Income
            ebit = sanitize(info.get("ebit"))
            if ebit is None:
                try:
                    ist = tk.income_stmt
                    if ist is not None and not ist.empty:
                        for ebit_key in ["EBIT", "Operating Income",
                                         "Pretax Income"]:
                            if ebit_key in ist.index:
                                ebit = sanitize(ist.loc[ebit_key].iloc[0])
                                if ebit is not None:
                                    break
                except Exception:
                    pass

            # Eigenkapital: balance_sheet -> info.bookValue * shares
            eq_total = None
            try:
                bs = tk.balance_sheet
                if bs is not None and not bs.empty:
                    for eq_key in ["Stockholders Equity",
                                   "Total Stockholder Equity",
                                   "Common Stock Equity",
                                   "Total Equity Gross Minority Interest"]:
                        if eq_key in bs.index:
                            v = sanitize(bs.loc[eq_key].iloc[0])
                            if v is not None and v > 0:
                                eq_total = v
                                break
            except Exception:
                pass

            # Fallback: info.bookValue (per share) * sharesOutstanding
            if eq_total is None:
                bv    = sanitize(info.get("bookValue"))
                shr   = sanitize(info.get("sharesOutstanding"))
                if bv is not None and shr is not None and bv > 0:
                    eq_total = bv * shr

            # LT-Schulden: balance_sheet -> info.longTermDebt
            ltd = None
            try:
                bs2 = tk.balance_sheet if 'bs' not in dir() else bs
                if bs2 is not None and not bs2.empty:
                    for ltd_key in ["Long Term Debt",
                                    "Long Term Debt And Capital Lease Obligation"]:
                        if ltd_key in bs2.index:
                            v2 = sanitize(bs2.loc[ltd_key].iloc[0])
                            if v2 is not None:
                                ltd = v2
                                break
            except Exception:
                pass
            if ltd is None:
                ltd = sanitize(info.get("longTermDebt")) or 0

            # ROCE berechnen
            if ebit is not None and eq_total is not None:
                ce = eq_total + (ltd or 0)
                if ce > 0:
                    roce_val = round(ebit / ce * 100, 2)
                    # Sanity: ROCE > 200% oder < -100% = Datenfehler
                    if -100 <= roce_val <= 200:
                        result["roce"] = roce_val
        except Exception:
            pass

        # -- ROE (Fallback) ---------------------------------------
        try:
            result["roe"] = pct(info.get("returnOnEquity"))
        except Exception:
            pass

        # -- PEG -------------------------------------------------
        try:
            result["peg"] = sanitize(info.get("pegRatio") or info.get("trailingPegRatio"))
            # Sanity v7.9.19: PEG < 0.1 = yfinance-Fehler (liefert KGV statt Ratio)
            # Bekannte Faelle: BP.L (0.05), 6501.T (0.13) — realer PEG > 0.5
            # PEG > 100 = negatives/minimales Wachstum macht Ratio sinnlos
            if result["peg"] is not None:
                if result["peg"] < 0.1 or result["peg"] > 100:
                    print(f"  PEG Sanity: {symbol} PEG={result['peg']:.2f} -> None")
                    result["peg"] = None
        except Exception:
            pass

        # -- Beta -------------------------------------------------
        try:
            result["beta"] = sanitize(info.get("beta"))
        except Exception:
            pass

        # -- Debt/Equity ------------------------------------------
        try:
            dte = sanitize(info.get("debtToEquity"))
            result["debt"] = dte  # yfinance liefert bereits in %
        except Exception:
            pass

        # -- Dividende --------------------------------------------
        try:
            dy_raw = pct(info.get("dividendYield"))
            # Sanity-Check: Yield > 25% = Datenfehler (z.B. Absolutbetrag statt %)
            if dy_raw is not None and dy_raw > 25.0:
                dy_raw = None
            result["div_yield"] = dy_raw
        except Exception:
            pass

        # -- Shareholder Return (Div + Buyback) -------------------
        try:
            dy  = sanitize(info.get("dividendYield")) or 0
            mc2 = sanitize(info.get("marketCap"))
            rb  = sanitize(info.get("repurchaseOfStock") or info.get("buyBackYield"))
            sr = dy
            if rb is not None and mc2 is not None and mc2 > 0:
                sr += abs(rb) / mc2
            sr_pct = round(sr * 100, 2) if sr else None
            # Sanity-Check: Shareholder Return > 30% = Datenfehler
            if sr_pct is not None and sr_pct > 30.0:
                sr_pct = None
            result["shareholder_return"] = sr_pct
        except Exception:
            pass

        # -- Moat (einfache Heuristik) ----------------------------
        try:
            roe_v  = result.get("roe")  or 0
            roce_v = result.get("roce") or 0
            fcf_v  = result.get("fcf")  or 0
            if (roe_v > 25 or roce_v > 25) and fcf_v > 4:
                result["moat"] = "wide"
            elif (roe_v > 15 or roce_v > 15) and fcf_v > 2:
                result["moat"] = "narrow"
            else:
                result["moat"] = "none"
            result["mr"] = info.get("shortName", symbol)
        except Exception:
            result["mr"] = symbol

        # -- 12M Momentum -----------------------------------------
        try:
            hi52 = sanitize(info.get("fiftyTwoWeekHigh"))
            lo52 = sanitize(info.get("fiftyTwoWeekLow"))
            pr   = sanitize(info.get("currentPrice") or info.get("regularMarketPrice"))
            if hi52 and lo52 and pr and (hi52 - lo52) > 0:
                result["mom12m"] = round((pr - lo52) / (hi52 - lo52) * 100, 1)
        except Exception:
            pass

        # -- NEU v7.7: Piotroski P3 + P4 -------------------------
        try:
            financials = tk.financials
            cashflow   = tk.cashflow
            result["accruals_ok"]     = calc_accruals_ok(info, financials, cashflow)
            result["gross_margin_ok"] = calc_gross_margin_ok(financials)
        except Exception:
            pass  # Felder bleiben None

        # -- NEU v7.8: Trend (SMA200-Abstand) + RSI ---------------
        try:
            pr    = sanitize(info.get("currentPrice") or info.get("regularMarketPrice"))
            sma200= sanitize(info.get("twoHundredDayAverage"))
            if pr is not None and sma200 is not None and sma200 > 0:
                dist_pct = (pr - sma200) / sma200 * 100
                # Mapping: +10% -> trend≈70, 0% -> 50, -10% -> trend≈30
                # Clamp auf 5-95 (nie 0 oder 100 = extreme Ausreisser)
                trend_val = max(5, min(95, round(50 + dist_pct * 2)))
                result["trend"] = trend_val
        except Exception:
            pass

        try:
            # RSI-14 via yfinance info (verfuegbar als relativeStrengthIndex14 in einigen Versionen)
            rsi_raw = sanitize(info.get("relativeStrengthIndex14"))
            if rsi_raw is None:
                # Fallback: RSI-Proxy aus 52W-Position (grobe Naeherung)
                hi52 = sanitize(info.get("fiftyTwoWeekHigh"))
                lo52 = sanitize(info.get("fiftyTwoWeekLow"))
                pr2  = sanitize(info.get("currentPrice") or info.get("regularMarketPrice"))
                if hi52 and lo52 and pr2 and (hi52 - lo52) > 0:
                    pos52 = (pr2 - lo52) / (hi52 - lo52) * 100
                    # 52W-Position -> RSI-Proxy: 0%=20, 50%=50, 100%=80
                    rsi_raw = round(20 + pos52 * 0.6)
            if rsi_raw is not None:
                # Sanity: RSI muss zwischen 0-100 liegen
                rsi_raw = max(1, min(99, round(rsi_raw)))
                result["rsi_val"] = rsi_raw
        except Exception:
            pass

        # -- NEU v7.9.0: EVAR Score ------------------------------
        try:
            result["evar"] = calc_evar_score(tk, info)
        except Exception:
            pass  # Feld bleibt None

        # -- NEU v7.9.1: EV / EBITDA -----------------------------
        try:
            # Primär: enterpriseToEbitda (yfinance liefert direkt das Multiple)
            ev_eb = sanitize(info.get("enterpriseToEbitda"))
            if ev_eb is None:
                # Fallback: manuell aus enterpriseValue / ebitda berechnen
                ev_raw  = sanitize(info.get("enterpriseValue"))
                ebi_raw = sanitize(info.get("ebitda"))
                if ev_raw is not None and ebi_raw is not None and ebi_raw > 0:
                    ev_eb = round(ev_raw / ebi_raw, 1)
            # Sanity: negatives EBITDA oder Extremwerte -> None
            # Cutoff 50x (v7.9.5): High-Growth-Titel wie PANW (~93x) haben
            # kein valides EBITDA-Multiple — eher Datenfehler als echter Wert.
            # Grenze 50x deckt legitime Wachstumswerte (ASML ~30x, MSCI ~40x).
            if ev_eb is not None:
                if ev_eb <= 0 or ev_eb > 50:
                    ev_eb = None
                else:
                    ev_eb = round(ev_eb, 1)
            result["ev_ebitda"] = ev_eb
        except Exception:
            pass  # Feld bleibt None

        # -- NEU v7.9.3: Sektor + Industry ------------------------
        # Benoetigt fuer sektor-relatives EVAR im Dashboard.
        # Sektor-Werte (yfinance): "Technology", "Healthcare",
        # "Financial Services", "Energy", "Consumer Cyclical",
        # "Consumer Defensive", "Industrials", "Basic Materials",
        # "Real Estate", "Communication Services", "Utilities"
        try:
            sec = SECTOR_OVERRIDES.get(symbol) or info.get("sector")
            ind = info.get("industry")
            result["sector"]   = str(sec).strip() if sec else None
            result["industry"] = str(ind).strip() if ind else None
        except Exception:
            pass

        # -- NEU v7.9.4: Skip-Month Momentum ---------------------
        # Akademisch: Jegadeesh/Titman 1993 — 12M-1M-Return
        # = Return von Monat -12 bis Monat -1 (letzten Monat ausschliessen)
        # Verhindert Short-Term-Reversal (Bid-Ask-Bounce, Microstructure)
        # Quelle: monatliche Schlusskurse via tk.history (sehr leichtgewichtig)
        try:
            hist_m = tk.history(period="13mo", interval="1mo",
                                auto_adjust=True)
            if hist_m is not None and len(hist_m) >= 6:
                closes = list(hist_m["Close"])
                # mom12m_ret: aktueller Preis vs. aeltester Monat
                pr_now = sanitize(info.get("currentPrice") or
                                  info.get("regularMarketPrice"))
                c_12m  = closes[0]   # aeltester Monat (~12M zurueck)
                c_1m   = closes[-2] if len(closes) >= 2 else closes[-1]
                # Skip-Month Return: Monat-12 -> Monat-1 (ohne letzten Monat)
                if c_12m and c_12m > 0 and c_1m:
                    skip = round((c_1m - c_12m) / c_12m * 100, 1)
                    # Sanity: ±300% Cap (verhindert Split-Artefakte)
                    if -300 <= skip <= 300:
                        result["mom_skip"] = skip
                # Echter 12M-Return (aktuell vs. vor 12M)
                if pr_now and c_12m and c_12m > 0:
                    ret12 = round((pr_now - c_12m) / c_12m * 100, 1)
                    if -300 <= ret12 <= 300:
                        result["mom12m_ret"] = ret12
        except Exception:
            pass  # Felder bleiben None — Fallback: mom12m (52W-Position)

        # -- NEU v7.9.7: Owner Earnings Yield ---------------------
        # Buffett (1986): NI + D&A - CapEx / MarketCap
        # Vorteil vs. FCF: kein Working-Capital-Rauschen
        # Besonders relevant: Pharma, Industrie, Energie
        try:
            mc_oe = sanitize(info.get("marketCap"))
            if mc_oe and mc_oe > 0:
                ni_oe = None
                try:
                    fin_oe = tk.financials
                    if fin_oe is not None and not fin_oe.empty:
                        for k in ["Net Income","Net Income Common Stockholders",
                                  "Net Income From Continuing Operations"]:
                            if k in fin_oe.index:
                                ni_oe = sanitize(fin_oe.loc[k].iloc[0])
                                if ni_oe is not None: break
                except Exception:
                    pass
                da_oe = None
                try:
                    cf_oe = tk.cashflow
                    if cf_oe is not None and not cf_oe.empty:
                        for k in ["Depreciation And Amortization","Depreciation",
                                  "Depreciation Amortization Depletion"]:
                            if k in cf_oe.index:
                                v = sanitize(cf_oe.loc[k].iloc[0])
                                if v is not None:
                                    da_oe = abs(v); break
                except Exception:
                    pass
                capex_oe = None
                try:
                    if cf_oe is not None and not cf_oe.empty:
                        for k in ["Capital Expenditure","Capital Expenditures",
                                  "Purchase Of Property Plant And Equipment"]:
                            if k in cf_oe.index:
                                v = sanitize(cf_oe.loc[k].iloc[0])
                                if v is not None:
                                    capex_oe = abs(v); break
                except Exception:
                    pass
                if ni_oe is not None:
                    oe = ni_oe + (da_oe or 0) - (capex_oe or 0)
                    oe_yield = round(oe / mc_oe * 100, 2)
                    if -50 <= oe_yield <= 50:
                        result["owner_earnings_yield"] = oe_yield
        except Exception:
            pass

        # -- NEU v7.9.22: FCF / Total Debt Coverage Ratio -------------
        # O'Shaughnessy QVM (What Works on Wall Street, 2011):
        # FCF / Total Debt = wie viele Jahre braucht die Firma, Schulden
        # aus freiem Cash zu tilgen. < 0 = negatives FCF = kritisch.
        # Gut: > 0.20 (tilgbar in < 5 Jahren). Sehr gut: > 0.50.
        # Sanity: > 10 = schuldenfreie Firma (Wert auf 10 gekappt).
        try:
            fcf_raw = sanitize(info.get("freeCashflow"))
            # Total Debt: totalDebt bevorzugt, Fallback longTermDebt
            td_raw  = sanitize(info.get("totalDebt"))
            if td_raw is None:
                td_raw = sanitize(info.get("longTermDebt"))
            if fcf_raw is not None and td_raw is not None and td_raw > 0:
                cover = round(fcf_raw / td_raw, 3)
                # Cap: > 10 = praktisch schuldenfrei -> 10; < -5 = Extremfall -> -5
                cover = max(-5.0, min(10.0, cover))
                result["fcf_debt_cover"] = cover
            elif fcf_raw is not None and (td_raw is None or td_raw == 0):
                # Keine Schulden -> maximaler Coverage-Wert
                result["fcf_debt_cover"] = 10.0
        except Exception:
            pass

        # -- NEU v7.9.22: EV / EBIT -----------------------------------
        # Buffett (Annual Letter 2024): D&A ist realer Kostenfaktor.
        # EV/EBIT ist ehrlicher als EV/EBITDA fuer kapitalintensive Sektoren.
        # Damodaran: bevorzugtes Multiple fuer Vergleiche ueber Sektorgrenzen.
        # Quellen: enterpriseValue + ebit aus info; Fallback: income_stmt.
        # Sanity: negatives EBIT -> None; > 60x -> kein Signal (neutral via None).
        try:
            ev_raw   = sanitize(info.get("enterpriseValue"))
            ebit_raw = sanitize(info.get("ebit"))
            # Fallback EBIT aus income_stmt falls info-Feld fehlt
            if ebit_raw is None:
                try:
                    ist_ev = tk.income_stmt
                    if ist_ev is not None and not ist_ev.empty:
                        for k in ["EBIT", "Operating Income",
                                  "Pretax Income"]:
                            if k in ist_ev.index:
                                v = sanitize(ist_ev.loc[k].iloc[0])
                                if v is not None:
                                    ebit_raw = v
                                    break
                except Exception:
                    pass
            if ev_raw is not None and ebit_raw is not None and ebit_raw > 0:
                ev_ebit_val = round(ev_raw / ebit_raw, 1)
                # Sanity: > 60x = kein valides Signal (extrem teuer / EBIT nahe 0)
                if 0 < ev_ebit_val <= 60:
                    result["ev_ebit"] = ev_ebit_val
        except Exception:
            pass

        # -- NEU v7.9.23: Shares Change YoY (Buyback-Signal) ----------
        # Shareholder Yield: Morningstar/Ibbotson 2024 — Total Payout
        # erklaert 97% der Langzeit-Aktienrenditen.
        # Accelerate Research: Net Buyback Yield outperformed Dividend Yield.
        # Negativ = Aktienrueckkauf = positiv; Positiv = Verwaesserung = negativ.
        # Kein Score-Einfluss — IC-Test pending (Snapshot 30+).
        try:
            bs_q = tk.quarterly_balance_sheet
            if bs_q is not None and not bs_q.empty:
                for key in ["Ordinary Shares Number", "Share Issued",
                            "Common Stock"]:
                    if key in bs_q.index:
                        row_vals = bs_q.loc[key].dropna()
                        if len(row_vals) >= 5:
                            s_now  = sanitize(row_vals.iloc[0])
                            s_prev = sanitize(row_vals.iloc[4])
                            if s_now is not None and s_prev is not None and s_prev > 0:
                                chg = round((s_now / s_prev - 1) * 100, 2)
                                # Sanity: Cap bei +-50% (Split/Merger-Artefakte)
                                if -50 <= chg <= 50:
                                    result["shares_change_yoy"] = chg
                        break
        except Exception:
            pass

    except Exception as e:
        result["mr"] = "FEHLER: " + str(e)[:60]

    return result

# -- Snapshot-Archiv aktualisieren (unveraendert aus v7.6) ---------------------
def update_snapshot(data_dict, filepath=SNAPSHOT_FILE):
    """Haengt den aktuellen Stand an stockiq_snapshots.json an."""
    try:
        try:
            with open(filepath, "r") as f:
                archive = json.load(f)
        except (FileNotFoundError, json.JSONDecodeError):
            archive = []

        ts = datetime.datetime.utcnow().isoformat() + "Z"
        archive.append({
            "timestamp": ts,
            "version": VERSION,
            "tickers": data_dict
        })
        with open(filepath, "w") as f:
            json.dump(archive, f, separators=(",", ":"))
        print(f"[Snapshot] +1 Eintrag ({len(archive)} gesamt) -> {filepath}")
    except Exception as e:
        print(f"[Snapshot FEHLER] {e}")


def is_annual_window():
    """
    Prueft ob heute im Jahres-Snapshot-Fenster liegt (1. Mai ± ANNUAL_WINDOW_DAYS).
    Gibt (True, year) oder (False, None) zurueck.
    """
    today = datetime.date.today()
    target = datetime.date(today.year, ANNUAL_MONTH, ANNUAL_DAY)
    delta = abs((today - target).days)
    return delta <= ANNUAL_WINDOW_DAYS, today.year


def update_annual_snapshot(data_dict, year, filepath=ANNUAL_FILE):
    """
    Schreibt/aktualisiert den Jahres-Eintrag in stockiq_annual.json.
    Format: Liste von Jahres-Snapshots, ein Eintrag pro Jahr.
    Jeder Eintrag enthaelt nur die fuer Konsistenz-Analyse relevanten Felder:
    roce, fcf, roe, mom_skip, mom12m_ret, evar, ev_ebitda, sector, peg, beta.

    Sicherheit: Existierender Eintrag fuer dasselbe Jahr wird UEBERSCHRIEBEN
    (idempotent — mehrere Runs im Mai-Fenster erzeugen keinen Datenmuell).
    """
    ANNUAL_FIELDS = [
        "roce", "fcf", "roe", "peg", "beta", "debt",
        "ev_ebit", "fcf_debt_cover",              # v7.9.22
        "shares_change_yoy",                      # v7.9.23
        "mom_skip", "mom12m_ret", "evar", "ev_ebitda",
        "sector", "industry", "moat", "accruals_ok", "gross_margin_ok"
    ]
    try:
        # Bestehendes Annual-Archiv laden
        try:
            with open(filepath, "r") as f:
                annual = json.load(f)
        except (FileNotFoundError, json.JSONDecodeError):
            annual = []

        # Nur relevante Felder speichern (kompakt)
        slim = {}
        for t, v in data_dict.items():
            if not isinstance(v, dict) or t == "__macro__":
                continue
            slim[t] = {k: v.get(k) for k in ANNUAL_FIELDS}

        today_str = datetime.date.today().isoformat()

        # Bestehenden Eintrag fuer dieses Jahr ersetzen (idempotent)
        annual = [e for e in annual if e.get("year") != year]
        annual.append({
            "year":    year,
            "date":    today_str,
            "version": VERSION,
            "n_tickers": len(slim),
            "tickers": slim
        })
        # Chronologisch sortieren
        annual.sort(key=lambda e: e.get("year", 0))

        with open(filepath, "w") as f:
            json.dump(annual, f, separators=(",", ":"), default=lambda o: None)

        years_stored = [e["year"] for e in annual]
        print(f"[Annual] Jahr {year} gespeichert -> {filepath}")
        print(f"         Gespeicherte Jahre: {years_stored}")
        print(f"         Ticker: {len(slim)} | Felder: {len(ANNUAL_FIELDS)}")
        return True
    except Exception as e:
        print(f"[Annual FEHLER] {e}")
        return False

# -- Hauptprogramm -------------------------------------------------------------
def main():
    print(f"StockIQ fund_juno v{VERSION} — {len(TICKERS)} Ticker")
    print(f"NEU  v7.9.24: get_bond_regime() (TNX 5d-bps -> bond_factor)")
    print(f"NEU  v7.9.7: owner_earnings_yield (NI + D&A - CapEx / MC)")
    print(f"NEU  v7.9.6: Jahres-Snapshot | v7.9.4: mom_skip | v7.9.3: sector")
    print("=" * 60)

    results = {}
    errors  = []
    ts_start = datetime.datetime.utcnow()

    for idx, sym in enumerate(TICKERS):
        try:
            print(f"[{idx+1:3d}/{len(TICKERS)}] {sym:<20}", end="")
            data = fetch_ticker(sym)
            results[sym] = data

            # Kurzausgabe
            fcf_s  = f"FCF={data['fcf']:.1f}%" if data['fcf'] is not None else "FCF=--"
            roce_s = f"ROCE={data['roce']:.1f}%" if data['roce'] is not None else "ROCE=--"
            skip_s = (f"skip={data['mom_skip']:+.0f}%" if data['mom_skip'] is not None
                      else f"pos={data['mom12m']:.0f}" if data['mom12m'] is not None else "mom=--")
            sec_s  = (data['sector'] or "?")[:10]
            print(f" {fcf_s}  {roce_s}  {skip_s}  [{sec_s}]")

        except Exception as e:
            print(f" FEHLER: {e}")
            errors.append(sym)
            results[sym] = {"ticker": sym, "error": str(e)}

        # Zwischenspeichern alle SAVE_INTERVAL Ticker
        if (idx + 1) % SAVE_INTERVAL == 0:
            interim_out = {
                "meta": {
                    "version": VERSION,
                    "generated": datetime.datetime.utcnow().isoformat() + "Z",
                    "n_tickers": len(results),
                    "status": "interim",
                },
                "data": results
            }
            with open(OUTPUT_FILE, "w") as f:
                json.dump(interim_out, f, separators=(",", ":"), default=lambda o: None)
            print(f"  [Zwischenspeicher] {len(results)} Ticker gesichert -> {OUTPUT_FILE}")

        # Pause alle BATCH_SIZE Ticker (iOS Rate-Limit-Schutz)
        if (idx + 1) % BATCH_SIZE == 0 and idx + 1 < len(TICKERS):
            print(f"  ... Pause {SLEEP_SEC}s ...")
            time.sleep(SLEEP_SEC)

    # -- Makro-Daten fetchen: VIX + V2X + Bond-Vol (v7.9.8) ----------
    # V2X = VSTOXX (Europa-Volatilitaet, ^V2TX) — fuer europaeische Ticker
    # vix_bond_div = VIX/VXTLT-Divergenz: wenn VIX tief aber Bond-Vol hoch
    #                -> "Fake Low VIX" / Late-Stage-Signal (Market Ear 04.05.2026)
    def fetch_price(symbol):
        """Holt regularMarketPrice via info oder fast_info. Gibt None bei Fehler."""
        try:
            tk = yf.Ticker(symbol)
            info = tk.info or {}
            val = sanitize(info.get("regularMarketPrice") or info.get("previousClose"))
            if val is None:
                fi = tk.fast_info
                val = sanitize(getattr(fi, 'last_price', None))
            return val
        except Exception:
            return None

    macro_date = datetime.datetime.utcnow().strftime("%Y-%m-%d")
    macro_date_end = datetime.datetime.utcnow().date()  # v7.9.25: date-Objekt fuer SPY-Reihe

    # VIX (US)
    print("[MACRO] Fetching ^VIX ...", end="")
    vix_val = fetch_price("^VIX")
    print(" VIX={}".format(round(vix_val, 2) if vix_val else "n/a"))

    # V2X (Europa VSTOXX)
    print("[MACRO] Fetching ^V2TX ...", end="")
    v2x_val = fetch_price("^V2TX")
    print(" V2X={}".format(round(v2x_val, 2) if v2x_val else "n/a"))

    # VXTLT (Bond-Volatilitaet 20yr Treasury)
    print("[MACRO] Fetching ^VXTLT ...", end="")
    vxtlt_val = fetch_price("^VXTLT")
    print(" VXTLT={}".format(round(vxtlt_val, 2) if vxtlt_val else "n/a"))

    # -- Edelmetalle: Gold + Silber (USD -> EUR) -------------------
    print("[MACRO] Fetching EUR/USD ...", end="")
    eurusd = fetch_price("EURUSD=X")
    print(" EURUSD={}".format(round(eurusd, 4) if eurusd else "n/a"))

    print("[MACRO] Fetching Gold GC=F ...", end="")
    gold_usd = fetch_price("GC=F")
    print(" Gold={}".format(round(gold_usd, 1) if gold_usd else "n/a"))

    print("[MACRO] Fetching Silver SI=F ...", end="")
    silver_usd = fetch_price("SI=F")
    print(" Silver={}".format(round(silver_usd, 2) if silver_usd else "n/a"))

    # USD -> EUR umrechnen
    gold_eur   = None
    silver_eur = None
    if gold_usd and eurusd and eurusd > 0:
        gold_eur = round(gold_usd / eurusd, 1)
    if silver_usd and eurusd and eurusd > 0:
        silver_eur = round(silver_usd / eurusd, 3)
    print("[MACRO] Gold EUR={} | Silver EUR={}".format(gold_eur, silver_eur))

    # -- Zinskurve: US Treasury als proxy (zuverlaessig via yfinance) -
    # ^TNX = US 10yr Yield (%)  /  ^IRX = 13-Week T-Bill (annualisiert, %)
    # Fuer Bund: kein stabiler yfinance-Ticker -> US-Spread als Formproxy
    print("[MACRO] Fetching ^TNX (10yr) ...", end="")
    us10y = fetch_price("^TNX")
    print(" US10Y={}".format(round(us10y, 2) if us10y else "n/a"))

    print("[MACRO] Fetching ^IRX (3m) ...", end="")
    us3m  = fetch_price("^IRX")
    print(" US3M={}".format(round(us3m, 2) if us3m is not None else "n/a"))

    print("[MACRO] Fetching ^TNX Bond Regime ...", end="")
    tnx_current, tnx_5d_change_bps, bond_factor = get_bond_regime()
    print(" TNX={} | 5d_bps={} | factor={}".format(
        round(tnx_current, 2) if tnx_current is not None else "n/a",
        tnx_5d_change_bps if tnx_5d_change_bps is not None else "n/a",
        bond_factor
    ))

    # Zinskurven-Form aus Spread (10J minus 3M)
    yield_curve  = None
    curve_spread = None
    if us10y is not None and us3m is not None:
        curve_spread = round(us10y - us3m, 2)
        if curve_spread < -0.25:
            yield_curve = "inverted"
        elif curve_spread < 0.25:
            yield_curve = "flat"
        elif curve_spread > 1.0:
            yield_curve = "steepening"
        else:
            yield_curve = "normal"
    print("[MACRO] Curve spread={}pp -> {}".format(curve_spread, yield_curve))

    # VIX/Bond-Divergenz: VIX < 20 aber VXTLT > 20 -> Divergenz aktiv
    # Klassifikation: "none" | "mild" | "strong"
    vix_bond_div = "none"
    if vix_val is not None and vxtlt_val is not None:
        if vix_val < 20 and vxtlt_val > 25:
            vix_bond_div = "strong"   # Late-Stage-Warnsignal
        elif vix_val < 20 and vxtlt_val > 20:
            vix_bond_div = "mild"

    # -- Sektor-ETFs: 12M-Return fuer Sektor-Ranking im Report (v7.9.10) --
    SECTOR_ETFS = {
        "XLV": "Healthcare",
        "XLK": "Technology",
        "XLF": "Financials",
        "XLE": "Energy",
        "XLP": "Consumer Staples",
        "XLY": "Consumer Cyclical",
        "XLI": "Industrials",
        "XLB": "Materials",
        "XLRE": "Real Estate",
        "XLU": "Utilities",
        "XLC": "Communication Services",
    }
    sector_etfs = {}
    print("[MACRO] Sektor-ETFs fetching...")
    for etf_sym, etf_sec in SECTOR_ETFS.items():
        try:
            etf_tk = yf.Ticker(etf_sym)
            # 12M Return: Close vor 1 Jahr vs heute
            import datetime as _dt
            end_d   = _dt.date.today()
            start_d = end_d - _dt.timedelta(days=380)
            hist_e  = etf_tk.history(
                start=start_d.isoformat(),
                end=(end_d + _dt.timedelta(days=3)).isoformat(),
                interval="1mo", auto_adjust=True
            )
            etf_mom = None
            if hist_e is not None and len(hist_e) >= 12:
                closes_e = list(hist_e["Close"])
                p0e = sanitize(closes_e[-13]) if len(closes_e) >= 13 else sanitize(closes_e[0])
                p1e = sanitize(closes_e[-1])
                if p0e and p1e and p0e > 0:
                    etf_mom = round((p1e - p0e) / p0e * 100, 1)
            etf_price = fetch_price(etf_sym)
            # v7.9.25: Tages-Close-Historie (~180 Handelstage) fuer RSS / 3M-Skip / Dispersion (Tab 8)
            closes_daily = []
            try:
                start_dd = end_d - _dt.timedelta(days=260)
                hist_d = etf_tk.history(
                    start=start_dd.isoformat(),
                    end=(end_d + _dt.timedelta(days=3)).isoformat(),
                    interval="1d", auto_adjust=True
                )
                if hist_d is not None and len(hist_d) > 0:
                    for c in list(hist_d["Close"]):
                        cs = sanitize(c)
                        if cs is not None:
                            closes_daily.append(round(cs, 2))
                closes_daily = closes_daily[-180:]
            except Exception:
                closes_daily = []
            sector_etfs[etf_sym] = {
                "sector":  etf_sec,
                "mom12m":  etf_mom,
                "price_usd": etf_price,
                "closes_daily": closes_daily,
            }
            print("  {} ({}) mom12m={}".format(etf_sym, etf_sec, etf_mom))
            time.sleep(0.3)
        except Exception as ex:
            sector_etfs[etf_sym] = {"sector": etf_sec, "mom12m": None, "price_usd": None}
            print("  {} FEHLER: {}".format(etf_sym, str(ex)[:50]))

    # -- Region-ETFs als Benchmark-Returns (v7.9.17) -----------------------
    REGION_ETFS = {
        "EWC":  "Kanada",
        "EWA":  "Australien",
        "EWJ":  "Japan",
        "EWG":  "Deutschland",
        "EWU":  "UK",
        "INDA": "Indien",
        "EEM":  "Emerging Markets",
        "EUAD": "Europa Defense",
        "DFEN": "US Defense",
    }
    region_etfs = {}
    import datetime as _dt2
    for etf_sym2, etf_reg in REGION_ETFS.items():
        try:
            etf_tk2 = yf.Ticker(etf_sym2)
            end_d2   = _dt2.date.today()
            start_d2 = end_d2 - _dt2.timedelta(days=400)
            hist_r = etf_tk2.history(
                start=start_d2.isoformat(),
                end=(end_d2 + _dt2.timedelta(days=3)).isoformat(),
                interval="1mo", auto_adjust=True
            )
            etf_mom2 = None
            if hist_r is not None and len(hist_r) >= 12:
                cl2 = list(hist_r["Close"])
                p0r = sanitize(cl2[-13]) if len(cl2) >= 13 else sanitize(cl2[0])
                p1r = sanitize(cl2[-1])
                if p0r and p1r and p0r > 0:
                    etf_mom2 = round((p1r - p0r) / p0r * 100, 1)
            region_etfs[etf_sym2] = {"region": etf_reg, "mom12m": etf_mom2}
            time.sleep(0.2)
        except Exception as ex2:
            region_etfs[etf_sym2] = {"region": etf_reg, "mom12m": None}

    print("[MACRO] vix_bond_div={}".format(vix_bond_div))

    # v7.9.25: SPY-Tagesreihe als RSS-Nenner fuer Tab 8 (Fallback ^GSPC)
    spy_daily = []
    for spy_sym in ("SPY", "^GSPC"):
        try:
            spy_tk = yf.Ticker(spy_sym)
            spy_start = macro_date_end - datetime.timedelta(days=260)
            spy_hist = spy_tk.history(
                start=spy_start.isoformat(),
                end=(macro_date_end + datetime.timedelta(days=3)).isoformat(),
                interval="1d", auto_adjust=True
            )
            tmp = []
            if spy_hist is not None and len(spy_hist) > 0:
                for c in list(spy_hist["Close"]):
                    cs = sanitize(c)
                    if cs is not None:
                        tmp.append(round(cs, 2))
            tmp = tmp[-180:]
            if len(tmp) > 0:
                spy_daily = tmp
                print("[MACRO] SPY-Reihe via {} ({} Tage)".format(spy_sym, len(spy_daily)))
                break
        except Exception:
            continue
    if len(spy_daily) == 0:
        print("[MACRO] WARNUNG: SPY-Reihe leer (RSS in Tab 8 nicht moeglich)")

    results["__macro__"] = {
        "ticker":        "__macro__",
        # Volatilitaet
        "vix":           vix_val,
        "v2x":           v2x_val,
        "vxtlt":         vxtlt_val,
        "vix_bond_div":  vix_bond_div,
        # Edelmetalle
        "eurusd":        eurusd,
        "gold_usd":      gold_usd,
        "silver_usd":    silver_usd,
        "gold_eur":      gold_eur,
        "silver_eur":    silver_eur,
        # Zinskurve
        "us10y":         us10y,
        "us3m":          us3m,
        "curve_spread":  curve_spread,
        "yield_curve":   yield_curve,   # none|inverted|flat|normal|steepening
        # Bond-Regime (v7.9.24)
        "tnx_5d_change_bps": sanitize(tnx_5d_change_bps),
        "bond_factor":       bond_factor,
        # Meta
        "vix_date":      macro_date,
        "sector_etfs":   sector_etfs,
        "region_etfs":   region_etfs,
        "spy_daily":     spy_daily,
    }

    # -- Output aufbauen -------------------------------------------
    ts_end = datetime.datetime.utcnow()
    output = {
        "meta": {
            "version":    VERSION,
            "generated":  ts_end.isoformat() + "Z",
            "duration_s": round((ts_end - ts_start).total_seconds(), 1),
            "n_tickers":  len(results),
            "n_errors":   len(errors),
            "new_fields": ["accruals_ok", "gross_margin_ok", "trend", "rsi_val",
                           "evar", "ev_ebitda", "roce_fix_v792",
                           "sector", "industry", "mom_skip", "mom12m_ret",
                           "owner_earnings_yield"],
        },
        "data": results
    }

    # -- JSON schreiben --------------------------------------------
    with open(OUTPUT_FILE, "w") as f:
        json.dump(output, f, separators=(",", ":"), default=lambda o: None)
    print(f"\n[OK] {OUTPUT_FILE} geschrieben ({len(results)} Ticker)")

    # -- Snapshot anhaengen ----------------------------------------
    update_snapshot(results, SNAPSHOT_FILE)

    # -- NEU v7.9.6: Jahres-Snapshot (1. Mai ±7 Tage) -------------
    in_window, ann_year = is_annual_window()
    if in_window:
        print(f"\n[Annual] Im Jahres-Fenster (1.Mai ±{ANNUAL_WINDOW_DAYS}d) — schreibe Jahres-Snapshot...")
        update_annual_snapshot(results, ann_year, ANNUAL_FILE)
    else:
        today = datetime.date.today()
        target = datetime.date(today.year, ANNUAL_MONTH, ANNUAL_DAY)
        days_to = (target - today).days
        if days_to < 0:
            target = datetime.date(today.year + 1, ANNUAL_MONTH, ANNUAL_DAY)
            days_to = (target - today).days
        print(f"\n[Annual] Kein Jahres-Fenster — naechster Snapshot in {days_to} Tagen ({target})")

    # -- Zusammenfassung -------------------------------------------
    roce_vals = [v.get("roce") for v in results.values()
                 if isinstance(v, dict) and v.get("roce") is not None]
    roce_ok = len(roce_vals)
    roce_avg = round(sum(roce_vals) / roce_ok, 1) if roce_ok > 0 else None

    pio3_ok  = sum(1 for v in results.values() if isinstance(v, dict) and v.get("accruals_ok") is True)
    pio3_no  = sum(1 for v in results.values() if isinstance(v, dict) and v.get("accruals_ok") is False)
    pio3_na  = sum(1 for v in results.values() if isinstance(v, dict) and v.get("accruals_ok") is None)
    pio4_ok  = sum(1 for v in results.values() if isinstance(v, dict) and v.get("gross_margin_ok") is True)
    pio4_no  = sum(1 for v in results.values() if isinstance(v, dict) and v.get("gross_margin_ok") is False)
    pio4_na  = sum(1 for v in results.values() if isinstance(v, dict) and v.get("gross_margin_ok") is None)

    evar_vals = [v.get("evar") for v in results.values()
                 if isinstance(v, dict) and v.get("evar") is not None]
    evar_ok  = len(evar_vals)
    evar_na  = len(results) - evar_ok
    evar_avg = round(sum(evar_vals) / evar_ok, 1) if evar_ok > 0 else None
    evar_hi  = sum(1 for e in evar_vals if e >= 70)  # stabil
    evar_lo  = sum(1 for e in evar_vals if e < 40)   # volatil

    eveb_vals = [v.get("ev_ebitda") for v in results.values()
                 if isinstance(v, dict) and v.get("ev_ebitda") is not None]
    eveb_ok   = len(eveb_vals)
    eveb_na   = len(results) - eveb_ok
    eveb_avg  = round(sum(eveb_vals) / eveb_ok, 1) if eveb_ok > 0 else None
    eveb_cheap = sum(1 for e in eveb_vals if e < 12)   # guenstig
    eveb_exp   = sum(1 for e in eveb_vals if e > 25)   # teuer

    print(f"\n-- ROCE v7.9.2 Fix Summary -----------------------------")
    print(f"  roce verfuegbar   : {roce_ok} / {len(results)} Ticker ({round(roce_ok/len(results)*100) if results else 0}%)")
    print(f"  roce Durchschnitt : {roce_avg}%")
    if roce_ok == 0:
        print(f"  !! ROCE = 0 — balance_sheet-Schluessel pruefen !!")
    print(f"\n-- Piotroski v7.7 Summary ------------------------------")
    print(f"  accruals_ok   (P3): {pio3_ok} OK / {pio3_no} NO / {pio3_na} n/a")
    print(f"  gross_margin_ok(P4): {pio4_ok} OK / {pio4_no} NO / {pio4_na} n/a")
    print(f"\n-- EVAR v7.9.0 Summary ---------------------------------")
    print(f"  evar verfuegbar   : {evar_ok} / {len(results)} Ticker")
    print(f"  evar n/a          : {evar_na}")
    print(f"  evar Durchschnitt : {evar_avg}")
    print(f"  stabil (>=70)     : {evar_hi}  |  volatil (<40): {evar_lo}")
    print(f"\n-- EV/EBITDA v7.9.1 Summary ----------------------------")
    print(f"  ev_ebitda verfuegbar : {eveb_ok} / {len(results)} Ticker")
    print(f"  ev_ebitda n/a        : {eveb_na}")
    print(f"  ev_ebitda Durchschn. : {eveb_avg}x")
    print(f"  guenstig (<12x)      : {eveb_cheap}  |  teuer (>25x): {eveb_exp}")
    if errors:
        print(f"  Fehler ({len(errors)}): {', '.join(errors[:10])}")
    print(f"  Laufzeit: {round((ts_end - ts_start).total_seconds(), 1)}s")

    # -- Skip-Month Momentum Summary ----------------------------
    skip_vals = [v.get("mom_skip") for v in results.values()
                 if isinstance(v, dict) and v.get("mom_skip") is not None]
    skip_ok  = len(skip_vals)
    skip_avg = round(sum(skip_vals) / skip_ok, 1) if skip_ok > 0 else None
    skip_pos = sum(1 for s in skip_vals if s > 0)
    skip_str = sum(1 for s in skip_vals if s > 20)   # >+20% stark
    skip_neg = sum(1 for s in skip_vals if s < -10)  # <-10% schwach

    print(f"\n-- mom_skip v7.9.4 Summary -----------------------------")
    print(f"  mom_skip verfuegbar : {skip_ok} / {len(results)} Ticker")
    print(f"  Durchschnitt        : {skip_avg}%")
    print(f"  positiv (>0%)       : {skip_pos}  |  stark (>+20%): {skip_str}")
    print(f"  schwach (<-10%)     : {skip_neg}")
    from collections import Counter
    oe_vals = [v.get("owner_earnings_yield") for v in results.values()
               if isinstance(v, dict) and v.get("owner_earnings_yield") is not None]
    oe_ok  = len(oe_vals)
    oe_avg = round(sum(oe_vals)/oe_ok, 1) if oe_ok > 0 else None
    oe_pos = sum(1 for o in oe_vals if o > 0)
    print(f"\n-- Owner Earnings v7.9.7 Summary ----------------------")
    print(f"  oe_yield verfuegbar : {oe_ok} / {len(results)} Ticker")
    print(f"  Durchschnitt        : {oe_avg}%")
    print(f"  positiv (>0%)       : {oe_pos}")

    sektoren = [v.get("sector") for v in results.values()
                if isinstance(v, dict) and v.get("sector")]
    sec_cnt = Counter(sektoren)
    sec_ok  = len(sektoren)
    print(f"\n-- Sektor v7.9.3 Summary -------------------------------")
    print(f"  sector verfuegbar : {sec_ok} / {len(results)} Ticker")
    for sec, cnt in sec_cnt.most_common():
        # EVAR-Median pro Sektor
        evar_s = sorted([v.get("evar") for v in results.values()
                         if isinstance(v, dict) and v.get("sector") == sec
                         and v.get("evar") is not None])
        med = evar_s[len(evar_s)//2] if evar_s else None
        print(f"  {sec:30s}: {cnt:3d} Ticker | EVAR-Median={med}")
    print("=" * 60)
    print(f"Fertig. Datei laden: stockiq_fundamentals.json -> Dashboard Fundamentals-Tab.")

if __name__ == "__main__":
    main()
