# Daily research run: guide

Goal: find changes that make RIPTIDE more profitable after Kalshi fees, prove them on rounds the model has not seen, and propose them. Never make a change live; Brandon approves in the app.

## Each run
1. `node lab/pull.mjs` (env: RIPTIDE_SERVER, RIPTIDE_KEY). Read `lab/data/research.json` → `notebook` (what earlier runs tried and learned) and `ver` (the live version; if it is null, the live version is the bundled one, which matches the oldest folder in `v/`).
2. Pick 1–3 ideas not yet settled in the notebook. Prefer ideas that change *price paid* or *which rounds to bet*, since entry price drives most of the profit.
   Backlog: limit (maker) entries a few cents under the ask; Kalshi-lag (BTC moved, Kalshi price hasn't yet); previous round's result; edge-size buckets; price-band limits; hour/weekday effects; waiting rules; new candle/indicator features; recency weighting; risk limits (daily loss cap, streak pause).
3. Test walk-forward: fit on older rounds, score on the newest ~25%. Use the same bet rule as live (prob ≥ ask + fee + margin; fee = 0.07·P·(1−P) per contract). Report ¢/contract after fees, bets, win rate, and the noise (±1 standard error). An idea "wins" only if it beats the live model by more than its noise and has 150+ test bets.
4. If an idea wins: copy `v/<live>/index.html` to `v/<new id>/index.html` (id = YYYY-MM-DD plus a letter), make the smallest change that implements it, set `const APP_VER` to the new id, check the script parses (`node -e` with `new Function`), commit and push to `main`. Do not touch other versions.
   If the change needs new server code (riptide-server.gs), say so in the proposal (`needsServer: true`); do not try to change the server.
5. File the report with `node lab/post.mjs report.json notebook.json` (use `-` in place of report.json to save only the notebook). The lab scripts retry on their own; Google's server is slow or flaky now and then, and a full download can take a few minutes.
   Do not file a report whose proposal points at a version you didn't push today; the latest report replaces any earlier proposal in the app.
   - report: `{ at, title, summary (one line), text (plain-language paragraph), tests: [{ name, result, win }], proposal: { ver, title, detail, needsServer } | null }`
   - notebook: `{ at, entries: [...] }`. Keep everything still useful from the previous notebook, add today's results, and keep it under ~40 KB.
6. Keep the report plain and honest. If nothing beat the live model, say so; no proposal that day is a normal result.

## Rules
- The research key can only file reports and notebooks. It cannot change settings, the live version, or the password, so don't attempt it.
- No real-money actions, no Kalshi keys, nothing outside this repository and the server.
- Never mention other bots or where RIPTIDE's original model came from.
