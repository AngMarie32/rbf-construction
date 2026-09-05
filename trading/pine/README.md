# Institutional Order Flow Strategy — Stocks (Pine Script v6)

`InstitutionalOrderFlow_Strategy.pine` — a TradingView **strategy** (backtestable, alert-ready)
built around how institutional size actually enters a stock: at a structural level, on
above-average participation, in the direction of the higher-timeframe regime, in names that
are outperforming the index.

---

## The six-filter stack

A trade only fires when all enabled conditions agree. Each one removes a different class of
bad trade.

| # | Filter | What it does | Why it matters |
|---|--------|--------------|----------------|
| 1 | **Regime** | Daily 21/50 EMA alignment + price vs. 50 EMA (200 SMA plotted as context) | Keeps you on the side of the trend that funds are accumulating into |
| 2 | **Structure** | Confirmed swing pivot → Break of Structure (BOS) | An objective, non-repainting definition of "trend changed" |
| 3 | **Location** | Retest of the order block that produced the break, or a tag-and-reclaim of the 1σ session-VWAP band | You enter where their orders rested, not 3 ATRs into the move |
| 4 | **Participation** | RVOL ≥ threshold on the trigger bar; volume z-score on the BOS bar | Real institutional prints show up as volume expansion |
| 5 | **Flow** | Cumulative signed-volume delta proxy over N bars | Confirms buyers/sellers are actually absorbing, not just drifting |
| 6 | **Relative strength** | Stock vs. SPY over N bars | Money rotates into leaders; laggards mean-revert against you |

**Order block definition.** When price breaks a confirmed swing high, the script walks back
through the impulse leg and marks the last down-close candle — the origin of the move. That
candle's open-to-low range is the demand zone. Its low becomes the structural stop reference.

---

## Risk model

Risk is fully defined before the order goes in:

- **Stop**: below the order block low, minus an ATR buffer, and never tighter than `minStopAtr × ATR`.
- **Size**: `qty = (equity × risk% ) / (entry − stop)`, capped at `maxPosPct` of equity notional.
  Change your risk %, not your share count.
- **Scale-out**: default 50% off at 1R.
- **Breakeven**: stop moves to entry + small ATR offset once the scale-out fills.
- **Runner**: final target at 3R, with an ATR chandelier trail behind it.
- **Guard rails**: max entries per day, no entries in the first 15 minutes or after 15:00 ET,
  flatten at the close on intraday charts, and a hard `max_intraday_loss` at 3% of equity.

Brackets are submitted on the signal bar, so a position is never carried unprotected.

---

## Install

1. TradingView → **Pine Editor** → **Open** → *New blank strategy*.
2. Paste the entire contents of `InstitutionalOrderFlow_Strategy.pine`.
3. **Save**, then **Add to chart**.
4. Open **Strategy Tester** → gear icon to tune inputs per symbol.

## Suggested starting settings

| Chart | Regime TF | Pivot strength | RVOL min | Max bars BOS→entry | Trades/day |
|-------|-----------|----------------|----------|--------------------|------------|
| 5 min | Daily (D) | 5 | 1.5 | 12 | 3 |
| 15 min | Daily (D) | 5 | 1.4 | 10 | 2 |
| 1 hour | Weekly (W) | 4 | 1.3 | 8 | 2 |
| Daily | Weekly (W) | 6 | 1.2 | 15 | 1 |

On the Daily chart, session/time filters are bypassed automatically and VWAP anchors weekly.

Longs are on by default and shorts are off — US equities carry a structural long drift, and
short setups need higher-beta names or a genuine bear regime to pay. Turn `Trade Shorts` on
deliberately, per symbol.

## Alerts

The script calls `alert()` on every entry with symbol, entry, stop and target. In TradingView:
**Alerts → Condition: this strategy → Order fills and alert() function calls**. Use
`{{strategy.order.alert_message}}` in the message body if you route to a webhook.

## Backtest hygiene

- `process_orders_on_close = true`, `lookahead_off` on every `request.security` — no repainting
  of historical signals, and no future data leaking into the regime filter.
- Commission is set to $0.005/share and slippage to 1 tick. Raise both before you trust results
  on illiquid names.
- Intrabar sequencing on the entry bar is an estimate: TradingView cannot know whether the stop
  or the target was touched first inside a single bar. Verify any promising configuration on a
  lower timeframe before sizing up.
- Backtested edge is a hypothesis, not a forecast. Forward-test on paper before risking capital.

## Input reference

Inputs are grouped in the settings dialog in the order the logic evaluates them:
① Direction & Regime · ② Market Structure · ③ Institutional Participation ·
④ Location / VWAP · ⑤ Session & Time Filters · ⑥ Risk, Sizing & Exits · ⑦ Visuals & Dashboard.

The on-chart dashboard shows live state for all six filters plus current position, open R, and
net P&L, so you can see exactly which condition is blocking a setup.
