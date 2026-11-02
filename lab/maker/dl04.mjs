// Every Kalshi trade from 0:00 to 4:00 into each settled KXBTC15M round over the last N days (default 8). Run from an empty data folder.
import { execFileSync } from "node:child_process"; import { readFileSync, writeFileSync, existsSync } from "node:fs";
const DAYS=+(process.argv[2]||8);const K = "https://api.elections.kalshi.com/trade-api/v2", sleep = s => execFileSync("sleep", [String(s)]);
const get = u => { for (let a = 0; a < 6; a++) { try { return JSON.parse(execFileSync("curl", ["-sS", "--fail", "-m", "30", u], { maxBuffer: 256 << 20, stdio: ["ignore", "pipe", "ignore"] }).toString()); } catch (e) { sleep(1.5 * (a + 1)); } } return null; };
let R = existsSync("rounds.json") ? JSON.parse(readFileSync("rounds.json")) : null;
if (!R) { const to = Math.floor(Date.now() / 1000), from = to - DAYS * 86400; R = []; let cur = "";
  for (let p = 0; p < 20; p++) { const d = get(`${K}/markets?series_ticker=KXBTC15M&status=settled&min_close_ts=${from}&max_close_ts=${to}&limit=1000${cur ? "&cursor=" + cur : ""}`); if (!d) break;
    for (const m of d.markets || []) if (m.result === "yes" || m.result === "no") R.push({ t: m.ticker, close: Date.parse(m.close_time), strike: +m.floor_strike, up: m.result === "yes" ? 1 : 0 });
    cur = d.cursor; if (!cur || !(d.markets || []).length) break; } R.sort((a,b)=>b.close-a.close); writeFileSync("rounds.json", JSON.stringify(R)); console.log("rounds",R.length); }
const T = existsSync("trades.json") ? JSON.parse(readFileSync("trades.json")) : {}; let n = 0;
for (const r of R) { if (T[r.t]) continue; const open = r.close / 1000 - 900, lo = open, hi = open + 240; let cur = "", all = [];
  for (let p = 0; p < 60; p++) { const d = get(`${K}/markets/trades?ticker=${r.t}&min_ts=${lo}&max_ts=${hi}&limit=1000${cur ? "&cursor=" + cur : ""}`); if (!d) break;
    for (const t of d.trades || []) all.push([Date.parse(t.created_time), +t.yes_price_dollars * 100, t.taker_side === "yes" ? 1 : 0, +t.count_fp]);
    cur = d.cursor; if (!cur || !(d.trades || []).length) break; sleep(0.12); }
  T[r.t] = all; if (++n % 25 === 0) { writeFileSync("trades.json", JSON.stringify(T)); console.log(n, new Date().toISOString()); } sleep(0.12); }
writeFileSync("trades.json", JSON.stringify(T)); console.log("done", Object.keys(T).length, "rounds", Object.values(T).reduce((a, x) => a + x.length, 0), "trades");
