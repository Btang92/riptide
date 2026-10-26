import { execFileSync } from "node:child_process"; import { readFileSync, writeFileSync, existsSync } from "node:fs";
const K = "https://api.elections.kalshi.com/trade-api/v2", R = JSON.parse(readFileSync("rounds.json")), T = existsSync("kt.json") ? JSON.parse(readFileSync("kt.json")) : {};
const sleep = ms => execFileSync("sleep", [String(ms / 1000)]);
const get = u => { for (let a = 0; a < 6; a++) { try { return JSON.parse(execFileSync("curl", ["-sS", "--fail", "-m", "30", u], { maxBuffer: 64 << 20, stdio: ["ignore", "pipe", "ignore"] }).toString()); } catch (e) { sleep(1500 * (a + 1)); } } return null; };
let done = 0;
for (const r of R) { if (T[r.t]) continue; const lo = Math.floor(r.close / 1000) - 150, hi = Math.floor(r.close / 1000); let cur = "", all = [];
  for (let p = 0; p < 10; p++) { const d = get(`${K}/markets/trades?ticker=${r.t}&min_ts=${lo}&max_ts=${hi}&limit=1000${cur ? "&cursor=" + cur : ""}`); if (!d) break;
    for (const t of d.trades || []) all.push([Date.parse(t.created_time), +t.yes_price_dollars * 100, t.taker_side === "yes" ? 1 : 0, +t.count_fp]);
    cur = d.cursor; if (!cur || !(d.trades || []).length) break; sleep(120); }
  T[r.t] = all; done++; if (done % 25 === 0) { writeFileSync("kt.json", JSON.stringify(T)); console.log(done); } sleep(120); }
writeFileSync("kt.json", JSON.stringify(T)); console.log("rounds with trades:", Object.values(T).filter(x => x.length).length, "total trades", Object.values(T).reduce((a, x) => a + x.length, 0));
