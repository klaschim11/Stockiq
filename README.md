Glossar-Einträge für Beta und Debt ergänzen:​​​​​​​​​​​​​​​​

Jetzt finaler Check:​​​​​​​​​​​​​​​​

Alle Checks grün. Zusammenfassung was v5.9.16 jetzt enthält:
Basis: v5.9.15.11 — 274 Ticker, WL2, Score-Filter, momSc(), volAdj(), Hysterese-Exit, 12M-Momentum, Signal-History. Alles unverändert erhalten.
Neu in v5.9.16:



|                  |v5.9.15                                      |v5.9.16                                            |
|------------------|---------------------------------------------|---------------------------------------------------|
|Composite-Gewichte|Mom 25 / Trend **25** / Fund 35 / Risk **15**|Mom 25 / Trend **20** / Fund 35 / Risk **20**      |
|Fund-Formel       |ROCE **50%** + FCF 35% + PEG **15%**         |ROCE **35%** + FCF 30% + PEG **20%** + Debt **15%**|
|Risk-Berechnung   |statisch `s.risk`                            |60% statisch + **40% Beta-Score**                  |
|Neue Funktionen   |—                                            |`betaSc()`, `debtSc()`                             |
|Detail-View       |FCF / ROCE / MOAT                            |+ **Beta** + **Debt/EQ%**                          |
|Python-Script     |v7_3                                         |**v7_4** (beta + debtToEquity + sanitize)          |

Der NaN-Fehler wird durch sanitize() in fund_juno_v7_4.py behoben — einmalig das Script neu ausführen, dann lädt das JSON fehlerfrei.​​​​​​​​​​​​​​​​

old:
I'll retrieve and examine the Index.html file from your Stockiq repository.I've successfully retrieved the full Index.html file from the klaschim11/Stockiq repository. This is **StockIQ v5.9**, a comprehensive stock analysis dashboard with 258+ tickers.

## Key Features:

**📊 Core Functionality:**
- **Signal Synopse**: MACD zero-line + 200MA + ATR-Histogram filter + Divergence detection
- **Watchlist**: 258 tickers grouped by signal (STRONG BUY, BUY, PEG-blocked, SELL, WATCH)
- **Fundamentals Tab**: FCF Yield, ROCE/ROE, PEG scoring with AI-powered JSON loading
- **Walk-Forward Validation**: 12M training / 3M out-of-sample testing
- **Help Section**: Detailed methodology, glossary, and changelog

**✨ v5.9 Enhancements:**
- **12M-Price-Momentum** (`mom12m`): New field combining short-term MACD/RSI (50%) + 12-month price momentum (50%)
- **Momentum Normalization**: -50%..+50% → 0..100 scale
- **Backward Compatible**: Fallback to static values if JSON unavailable
- **Detail View**: 12M-Mom color-coded (green >+20%, blue 0-20%, yellow -15-0%, red <-15%)

**🎯 Scoring Weights:**
- Momentum: 30%
- Trend: 20%
- Fundamentals: 35%
- Risk: 15%

**📱 Deployment:**
- Runs locally as standalone HTML (browser + localStorage for cache/archive)
- Can be saved as iOS/Android home-screen app
- Supports JSON upload for fundamentals and walk-forward data

**Python Integration:**
- `stockiq_fund_juno_v7.py`: Generates fundamentals JSON with 12M-momentum
- `stockiq_alpha_juno.py`: Walk-forward backtesting engine

The file is fully self-contained with inline JavaScript, CSS, and hardcoded stock data for 258 tickers across US, Europe, and Asia markets.
