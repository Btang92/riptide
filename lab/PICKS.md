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
- End with a 3-line summary: games covered, picks collected, notable sources.
