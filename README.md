Glossar-Einträge für Beta und Debt ergänzen:​​​​​​​​​​​​​​​​

Jetzt finaler Check:​​​​​​​​​​​​​​​​

Alle Checks grün. Zusammenfassung was v5.9.16 jetzt enthält:
Basis: v5.9.15.11 — 274 Ticker, WL2, Score-Filter, momSc(), volAdj(), Hysterese-Exit, 12M-Momentum, Signal-History. Alles unverändert erhalten.
Neu in v5.9.16:




**📱 Deployment:**
- Runs locally as standalone HTML (browser + localStorage for cache/archive)
- Can be saved as iOS/Android home-screen app
- Supports JSON upload for fundamentals and walk-forward data

**Python Integration:**
- `stockiq_fund_juno_v7.py`: Generates fundamentals JSON with 12M-momentum
- `stockiq_alpha_juno.py`: Walk-forward backtesting engine

The file is fully self-contained with inline JavaScript, CSS, and hardcoded stock data for 258 tickers across US, Europe, and Asia markets.
