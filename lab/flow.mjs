// Buy/sell pressure: rebuilds per-minute aggressive buy vs sell volume from Coinbase's public BTC-USD trade history,
// and keeps it in lab/flowdata/minutes.json (committed, so each run only fetches what's new plus a little more history).
// Usage: node lab/flow.mjs [daysOfHistory=10] [maxMinutes=20]
// Note: Coinbase's "side" is the MAKER's side, so side "sell" = an aggressive BUY (taker bought), "buy" = aggressive SELL.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { getJSON } from "./http.mjs";
const DAYS = +(process.argv[2] || 10), BUDGET = +(process.argv[3] || 20) * 60000, t0 = Date.now();
const F = new URL("./flowdata/minutes.json", import.meta.url);
const st = existsSync(F) ? JSON.parse(readFileSync(F)) : { newestId: 0, oldestId: 0, oldestTs: 0, m: {} };
const add = t => { const ms = Date.parse(t.time), k = Math.floor(ms / 60000) * 60, row = st.m[k] || (st.m[k] = [0, 0, 0]), sz = +t.size;
  if (t.side === "sell") row[0] += sz; else row[1] += sz; row[2]++; return ms; };
const page = async after => getJSON(`https://api.exchange.coinbase.com/products/BTC-USD/trades?limit=1000${after ? "&after=" + after : ""}`);
const sleep = ms => new Promise(r => setTimeout(r, ms));
let req = 0;
// 1) new trades since last run (newest first, stop when we reach what we already have)
{ let after = 0, top = 0;
  for (;;) { const p = await page(after); req++; if (!p.length) break; if (!top) top = p[0].trade_id;
    let stop = false; for (const t of p) { if (t.trade_id <= st.newestId) { stop = true; break; } add(t); }
    after = p[p.length - 1].trade_id; if (!st.oldestId) { st.oldestId = after; st.oldestTs = Date.parse(p[p.length - 1].time); }
    if (stop || !st.newestId || Date.now() - t0 > BUDGET / 2) break; await sleep(130); }
  if (top) st.newestId = Math.max(st.newestId, top); }
// 2) extend further back until DAYS of history (within the time budget)
const goal = Date.now() - DAYS * 86400000;
while (st.oldestTs > goal && Date.now() - t0 < BUDGET) { const p = await page(st.oldestId); req++; if (!p.length) break;
  for (const t of p) add(t); st.oldestId = p[p.length - 1].trade_id; st.oldestTs = Date.parse(p[p.length - 1].time); await sleep(130); }
// keep 30 days, round sizes
const cut = Math.floor((Date.now() - 30 * 86400000) / 1000); for (const k of Object.keys(st.m)) { if (+k < cut) delete st.m[k]; else st.m[k] = st.m[k].map(x => +(+x).toFixed(4)); }
writeFileSync(F, JSON.stringify(st));
const ks = Object.keys(st.m).map(Number).sort((a, b) => a - b);
console.log(JSON.stringify({ requests: req, minutes: ks.length, from: new Date(ks[0] * 1000).toISOString(), to: new Date(ks.at(-1) * 1000).toISOString(), reachedGoal: st.oldestTs <= goal }));
