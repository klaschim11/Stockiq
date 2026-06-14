# -*- coding: utf-8 -*-
# test_score.py -- AR-T1 pytest Gate-Matrix v1.0
# python -m pytest test_score.py -v
# Laeuft OHNE Internet, OHNE fund_juno
import pytest
from stockiq_score import compute_signal

MACRO = {}

def s_macd(above200=True, sw=False, macd_cross="below_zero",
           macd_hist=1.0, atr=10.0, price_vs_50ma_pct=5.0,
           peg=1.5, rsi_val=60.0, div="none"):
    return {
        "above200": above200, "sw": sw, "macd_cross": macd_cross,
        "macd_hist": macd_hist, "atr": atr,
        "price_vs_50ma_pct": price_vs_50ma_pct,
        "peg": peg, "rsi_val": rsi_val, "div": div,
    }

def s_fallback(price_vs_50ma_pct=5.0):
    return {
        "above200": None, "sw": None, "macd_cross": None,
        "macd_hist": None, "atr": None,
        "price_vs_50ma_pct": price_vs_50ma_pct,
        "peg": 1.5, "rsi_val": 60.0, "div": "none",
    }

@pytest.mark.parametrize("desc,s_data,score,expected", [
    # --- MACD-Pfad: ok=True, BUY-Ast ---
    ("T01 BUY happy path",
     s_macd(), 75, "buy"),
    ("T02 HOLD: 50MA-Gate (price_vs_50ma_pct negativ)",
     s_macd(price_vs_50ma_pct=-1.0), 75, "hold"),
    ("T03 PB: peg=3.0 blockiert",
     s_macd(peg=3.0), 75, "pb"),
    ("T04 PB: peg=None blockiert (peg_block=True bei None)",
     s_macd(peg=None), 75, "pb"),
    ("T05 BUY: peg=2.999 nicht blockiert (Grenzwert)",
     s_macd(peg=2.999), 75, "buy"),
    ("T06 STRONG: bull_hidden + peg ok + rsi 60",
     s_macd(div="bull_hidden", peg=1.5, rsi_val=60.0), 75, "strong"),
    ("T07 STRONG: bull_regular + peg ok + rsi 60",
     s_macd(div="bull_regular", peg=1.5, rsi_val=60.0), 75, "strong"),
    ("T08 BUY: bull_hidden + rsi=79 downgrade (>78)",
     s_macd(div="bull_hidden", peg=1.5, rsi_val=79.0), 75, "buy"),
    ("T09 BUY_RSI_WARN: bear_regular + rsi=76",
     s_macd(div="bear_regular", rsi_val=76.0), 75, "buy_rsi_warn"),
    ("T10 WATCH_RSI: bear_regular + rsi=81",
     s_macd(div="bear_regular", rsi_val=81.0), 75, "watch_rsi"),
    ("T11 BUY: rsi=81 ohne bear_div -> kein Block",
     s_macd(div="none", rsi_val=81.0), 75, "buy"),
    # --- MACD-Pfad: ok=False ---
    ("T12 WATCH: sw=True, kein Exit aktiv",
     s_macd(sw=True), 75, "watch"),
    ("T13 SELL_ZL: above_zero + hist_neg + above200",
     s_macd(above200=True, macd_cross="above_zero", macd_hist=-0.5), 75, "sell_zl"),
    ("T14 SELL_MA: under200 + hist positiv",
     s_macd(above200=False, macd_cross="above_zero", macd_hist=0.5), 75, "sell_ma"),
    ("T15 SELL: above_zero + hist_neg + under200",
     s_macd(above200=False, macd_cross="above_zero", macd_hist=-0.5), 75, "sell"),
    ("T16 SELL_HIST: hist_neg + below_zero + above200",
     s_macd(above200=True, macd_cross="below_zero", macd_hist=-0.5), 75, "sell_hist"),
    # --- hist_ok Grenzwerte ---
    ("T17 WATCH: hist=0.5 == atr*0.05 (nicht strikt groesser)",
     s_macd(macd_hist=0.5, atr=10.0), 75, "watch"),
    ("T18 BUY: hist=0.501 > atr*0.05=0.5 (knapp ueber Grenze)",
     s_macd(macd_hist=0.501, atr=10.0), 75, "buy"),
    # --- Fallback Score-Pfad ---
    ("T19 Fallback BUY: score=75 + above_50ma",
     s_fallback(price_vs_50ma_pct=5.0), 75, "buy"),
    ("T20 Fallback HOLD: score=75 + unter 50MA",
     s_fallback(price_vs_50ma_pct=-1.0), 75, "hold"),
    ("T21 Fallback HOLD: score=60",
     s_fallback(), 60, "hold"),
    ("T22 Fallback WATCH: score=45",
     s_fallback(), 45, "watch"),
    ("T23 Fallback SELL: score=35",
     s_fallback(), 35, "sell"),
])
def test_compute_signal(desc, s_data, score, expected):
    signal, _ = compute_signal(s_data, MACRO, score)
    assert signal == expected, (
        f"{desc}\n  Erwartet: {expected!r}  Erhalten: {signal!r}"
    )
