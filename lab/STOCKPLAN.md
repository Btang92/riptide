# Morning stock game plan (picks/stocks.json)

RIPTIDE's Day Trade desk builds "🔥 Fire trades of the day" from live movers at 9:30. This research run adds the human judgment pros use: which movers have real, tradeable news, and which to avoid. Run on market days around 8:40 AM ET.

## Steps
1. Find today's pre-market movers (US stocks, price ≥ $10, up or down ≥ 3%) from free public sources: pre-market mover lists and news (e.g. Benzinga/Yahoo/MarketWatch/CNBC/Investing.com pre-market movers pages, company press releases). Read the actual articles. Never invent a mover, price or headline. Skip paywalls.
2. For each candidate, decide the catalyst and its quality, the way professional day traders do:
   - **Strong (trade it):** earnings beat + raised guidance, big contract/partnership, FDA approval, major analyst upgrade on a big name, acquisition target (gap up); for gap DOWNS, news that hurts sentiment but not the business's survival (CEO change, guidance trim, sector sell-off, analyst downgrade) — these can reverse.
   - **Avoid:** stock offerings/dilution, reverse splits, going-concern or bankruptcy, fraud/accounting/SEC probes, failed trials, delisting, buyout at a fixed price (no movement left), leveraged/inverse ETFs, stocks under $10, very thin trading.
3. Pick at most 5 "picks" (best first) and list notable "avoid" names.
4. Write `picks/stocks.json` (and a copy at `picks/stocks/YYYY-MM-DD.json`):
```
{ "at": "<ISO time>", "date": "YYYY-MM-DD (ET)",
  "picks": [ { "sym": "NVDA", "gap": -13.2, "price": 151.0, "catalyst": "CEO change", "why": "<one plain sentence a beginner understands: what happened and why it can move today>", "quality": "strong|ok", "sources": [ { "name": "<outlet>", "url": "<article>" } ] } ],
  "avoid": [ { "sym": "XYZ", "why": "<short reason, e.g. stock offering>" } ] }
```
   `gap` and `price` are the pre-market % change and price at the time you looked. `date` must be today's date in New York or the desk ignores the file.
5. Validate the JSON parses; commit and push only `picks/`.
6. Grading (Fridays): for each pick this week, note in `picks/stocks-scorecard.json` whether the desk's setup triggered and the result if known (from the user's journal is not available — use the day's price action: did it break the trigger level, and did it reach 2R or the stop first). Keep it honest; this tells us whether the morning research adds anything.
