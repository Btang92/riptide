// Last ~2 days of Polymarket 5-minute BTC up/down markets: result, volume, and trades (first 4 minutes)
import { execFileSync } from "node:child_process"; import { writeFileSync, readFileSync, existsSync } from "node:fs";
const get = u => { for (let a = 0; a < 4; a++) { try { return JSON.parse(execFileSync("curl", ["-sS", "--fail", "-m", "30", u], { maxBuffer: 64 << 20, stdio: ["ignore", "pipe", "ignore"] }).toString()); } catch (e) { execFileSync("sleep", ["1"]); } } return null; };
const out = existsSync("pm5.json") ? JSON.parse(readFileSync("pm5.json")) : {}, now = Math.floor(Date.now() / 1000), end = Math.floor(now / 300) * 300 - 600, start = end - 2 * 86400;
let n = 0;
for (let ts = start; ts <= end; ts += 300) { if (out[ts]) continue; const ev = get(`https://gamma-api.polymarket.com/events?slug=btc-updown-5m-${ts}`), m = ev && ev[0] && ev[0].markets && ev[0].markets[0];
  if (!m) { out[ts] = { none: 1 }; continue; } const [upTok] = JSON.parse(m.clobTokenIds), res = JSON.parse(m.outcomePrices || "[]"); const tr = [];
  for (let off = 0; off < 3000; off += 500) { const t = get(`https://data-api.polymarket.com/trades?market=${m.conditionId}&limit=500&offset=${off}&takerOnly=true`); if (!t || !t.length) break;
    for (const x of t) if (x.timestamp <= ts + 270) tr.push([x.timestamp, x.asset === upTok ? x.price : 1 - x.price, x.asset === upTok ? 1 : 0, x.side === "BUY" ? 1 : 0, x.size]);
    if (Math.min(...t.map(x => x.timestamp)) <= ts) break; }
  out[ts] = { up: res[0] === "1" ? 1 : res[1] === "1" ? 0 : null, vol: Math.round(m.volumeNum || 0), tr };
  if (++n % 50 === 0) { writeFileSync("pm5.json", JSON.stringify(out)); console.log(n); } }
writeFileSync("pm5.json", JSON.stringify(out)); const v = Object.values(out).filter(x => !x.none);
console.log(v.length, "markets; median volume $", v.map(x => x.vol).sort((a, b) => a - b)[v.length >> 1], "; with trades in first 4 min:", v.filter(x => x.tr.length).length);
