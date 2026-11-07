# Daily expert-picks run: guide

Goal: collect published expert betting picks for games in the next ~36 hours, in a structured file RIPTIDE's sportsbook can match to Kalshi bets. RIPTIDE shows them as 📣 badges and tracks them against the closing line; it never treats them as proof of value.

## Steps
1. Find the slate: leagues RIPTIDE covers (NFL, NCAAF, NBA, NCAAB, NHL, MLB, WNBA, EPL, MLS, UFC). Use web search to find today's/tomorrow's games (ESPN schedules are fine).
2. Search the web for expert picks on those games: e.g. "NBA picks today", "<Team A> vs <Team B> prediction pick", "NFL week N expert picks against the spread", "best player props today". Prefer named, publicly published picks from established outlets (ESPN, CBS Sports, Covers, Action Network, The Athletic previews, Sports Illustrated, Yahoo, Pickswise, OddsShark, VSiN). Skip paywalled content, tout sites selling picks, and anonymous social posts. Read the page (WebFetch) to get the actual pick; don't infer it from a headline.
3. Record each pick:
   `{ "league": "NBA", "away": "Boston Celtics", "home": "New York Knicks", "start": "<ISO game time>", "type": "ML"|"SPREAD"|"TOTAL"|"PROP", "team": "<team for ML/SPREAD>", "line": <spread for that team, e.g. -4.5 or 4.5; total line; prop line>, "side": "over"|"under" (TOTAL/PROP), "player": "<PROP>", "stat": "<PROP: points, rebounds, passing yards…>", "source": "<outlet / author>", "url": "<page>", "note": "<one short line of their reasoning>" }`
   Spread `line` is from the picked team's side (laying points is negative). One entry per pick per source; the same pick from two outlets = two entries.
4. Write `picks/latest.json` as `{ "at": "<now ISO>", "picks": [...] }` and a copy at `picks/archive/YYYY-MM-DD.json`. Aim for quality over volume (roughly 20–80 picks). Validate the JSON parses.
5. Commit and push to main (only the picks/ folder).
6. Every few days, grade older archive files: look up results (ESPN) and add `result: "win"|"loss"|"push"` per pick, and add a short per-source tally to `picks/scorecard.json` (`{source: {w, l, p}}`). Sources with a long losing record can be dropped from future runs; say so in your summary.

## Rules
- Facts only from pages you actually read; no invented picks, lines or quotes.
- No real-money actions, no logins, no paid sites.
- End with a 3-line summary: games covered, picks collected, notable sources, and today's Bet of the Day single and ladder length.

## 🔥 Bet of the Day (after the expert picks are written)
RIPTIDE's sportsbook shows a researched ladder: the N-leg bet is the first N legs whose game hasn't started (Single, 2 legs … up to the ladder length).
1. Pull today's priced Kalshi legs: `NODE_USE_ENV_PROXY=1 node lab/sports/dump.mjs /tmp/legs.json 36` (reads picks/latest.json, so run it after step 5). Each leg has `id` (Kalshi ticker:side), ask, cost (with fee), fair (de-vigged DraftKings/Polymarket/Pinnacle), edge, nSrc, `sharp` (open dollars of Polymarket's top sports traders for/against), and matched expert `picks`.
2. Shortlist legs priced 30–85¢ with edge ≥ about −2.5 (Kalshi's fee makes nearly everything slightly negative; avoid anything worse), no flags, and no other leg from the same game.
3. Research the strongest ~15: read real previews/expert picks and injury news (step 2 sources). Keep a leg only if at least two of these agree and none disagrees: (a) top-trader money clearly on its side (and not heavy against), (b) a published expert pick or model on its side, (c) concrete news/matchup reasoning. Drop conflicts (experts one way, top traders the other).
4. Order the ladder strongest first, 8–12 legs from different games, spread across today and tomorrow so later legs fill in when early games start. Prefer near coin-flip prices (40–60¢) early in the ladder and short favourites later.
5. Write `picks/botd.json` and `picks/botd/YYYY-MM-DD.json`:
   `{ "at", "date", "method": "<one paragraph: how legs were chosen, and which conflicts were dropped today>", "honest": "<one line: every leg costs slightly more than fair, so expected return is slightly negative and worsens with more legs>", "ladder": [ { "id", "league", "game", "start", "mk", "label", "ask", "cost", "fair", "sharp", "why": "<1–3 plain sentences with the actual facts>", "sources": [ { "name": "<outlet (their pick)>", "url" } ] } ] }`
   Copy id/label/ask/cost/fair/start/sharp exactly from the dump. Never invent a source or stat.
6. Grade yesterday's botd file when results are in (add `result` per leg) and keep a tally in `picks/scorecard.json` under `"Bet of the Day"` by ladder length (`{"1":{w,l},"2":…}`).
