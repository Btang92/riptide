// Every Kalshi trade from 1:30 to 9:30 into each round, last 3 days of settled KXBTC15M rounds.
import { execFileSync } from "node:child_process"; import { readFileSync, writeFileSync, existsSync } from "node:fs";
const K = "https://api.elections.kalshi.com/trade-api/v2", sleep = s => execFileSync("sleep", [String(s)]);
const get = u => { for (let a = 0; a < 6; a++) { try { return JSON.parse(execFileSync("curl", ["-sS", "--fail", "-m", "30", u], { maxBuffer: 256 << 20, stdio: ["ignore", "pipe", "ignore"] }).toString()); } catch (e) { sleep(1.5 * (a + 1)); } } return null; };
let R = existsSync("rounds.json") ? JSON.parse(readFileSync("rounds.json")) : null;
if (!R) { const to = Math.floor(Date.now() / 1000), from = to - 3 * 86400; R = []; let cur = "";
  for (let p = 0; p < 10; p++) { const d = get(`${K}/markets?series_ticker=KXBTC15M&status=settled&min_close_ts=${from}&max_close_ts=${to}&limit=1000${cur ? "&cursor=" + cur : ""}`); if (!d) break;
    for (const m of d.markets || []) if (m.result === "yes" || m.result === "no") R.push({ t: m.ticker, close: Date.parse(m.close_time), strike: +m.floor_strike, up: m.result === "yes" ? 1 : 0 });
    cur = d.cursor; if (!cur || !(d.markets || []).length) break; } writeFileSync("rounds.json", JSON.stringify(R)); }
const T = existsSync("trades.json") ? JSON.parse(readFileSync("trades.json")) : {}; let n = 0;
for (const r of R) { if (T[r.t]) continue; const open = r.close / 1000 - 900, lo = open + 90, hi = open + 570; let cur = "", all = [];
  for (let p = 0; p < 40; p++) { const d = get(`${K}/markets/trades?ticker=${r.t}&min_ts=${lo}&max_ts=${hi}&limit=1000${cur ? "&cursor=" + cur : ""}`); if (!d) break;
    for (const t of d.trades || []) all.push([Date.parse(t.created_time), +t.yes_price_dollars * 100, t.taker_side === "yes" ? 1 : 0, +t.count_fp]);
    cur = d.cursor; if (!cur || !(d.trades || []).length) break; sleep(0.12); }
  T[r.t] = all; if (++n % 20 === 0) { writeFileSync("trades.json", JSON.stringify(T)); console.log(n); } sleep(0.12); }
writeFileSync("trades.json", JSON.stringify(T)); console.log("done", Object.keys(T).length, "rounds", Object.values(T).reduce((a, x) => a + x.length, 0), "trades");
