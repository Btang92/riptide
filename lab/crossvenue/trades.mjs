// Same-second comparison data: Polymarket trades (data-api) + Kalshi trades around 2:00, 5:00, 8:00 for each round.
import { execFileSync } from "node:child_process"; import { readFileSync, writeFileSync, existsSync } from "node:fs";
const calls = JSON.parse(readFileSync("../allc.json")).calls.filter(c => c.winner && c.ticker && c.start > Date.now() - 4.5 * 86400000);
const get = u => { for (let a = 0; a < 5; a++) { try { return JSON.parse(execFileSync("curl", ["-sS", "--fail", "-m", "30", u], { maxBuffer: 64 << 20, stdio: ["ignore", "pipe", "ignore"] }).toString()); } catch (e) { execFileSync("sleep", [String(a + 1)]); } } return null; };
const out = existsSync("tr.json") ? JSON.parse(readFileSync("tr.json")) : {}; let n = 0;
for (const c of calls) { const s = c.start / 1000; if (out[s]) continue;
  const ev = get(`https://gamma-api.polymarket.com/events?slug=btc-updown-15m-${s}`), m = ev && ev[0] && ev[0].markets && ev[0].markets[0]; if (!m) { out[s] = { none: 1 }; continue; }
  const [upTok] = JSON.parse(m.clobTokenIds), res = JSON.parse(m.outcomePrices || "[]"); let pm = [];
  for (let off = 0; off < 6000; off += 500) { const t = get(`https://data-api.polymarket.com/trades?market=${m.conditionId}&limit=500&offset=${off}&takerOnly=true`); if (!t || !t.length) break;
    for (const x of t) pm.push([x.timestamp, x.asset === upTok ? x.price : 1 - x.price, x.asset === upTok ? 1 : 0, x.side === "BUY" ? 1 : 0]);
    if (Math.min(...t.map(x => x.timestamp)) <= s + 60) break; }
  const ks = []; for (const cp of [120, 300, 480]) { const d = get(`https://api.elections.kalshi.com/trade-api/v2/markets/trades?ticker=${c.ticker}&min_ts=${s + cp - 30}&max_ts=${s + cp + 12}&limit=1000`);
    for (const t of (d && d.trades) || []) ks.push([Date.parse(t.created_time) / 1000, +t.yes_price_dollars * 100, t.taker_side === "yes" ? 1 : 0]); }
  out[s] = { kUp: c.winner === "UP" ? 1 : 0, pUp: res[0] === "1" ? 1 : res[1] === "1" ? 0 : null, pm: pm.filter(x => x[0] >= s + 60 && x[0] <= s + 500), k: ks };
  if (++n % 20 === 0) writeFileSync("tr.json", JSON.stringify(out)); }
writeFileSync("tr.json", JSON.stringify(out)); console.log(Object.keys(out).length, "rounds saved");
