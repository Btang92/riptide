// Binance USDT-M futures (BTCUSDT) order flow per minute from data.binance.vision daily aggTrades files.
// Stores lab/flowdata/binance/YYYY-MM-DD.json: { "<unix minute>": [buyUSD, sellUSD, bigBuyUSD, bigSellUSD, bigCount] } (big = one aggressive order >= $100K).
// Usage: node lab/bigflow.mjs [days=30]   (skips days already stored; files appear ~1 day late)
import { spawn, execFileSync } from "node:child_process"; import { createInterface } from "node:readline";
import { existsSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
const DAYS = +(process.argv[2] || 30), BIG = 100000, dir = new URL("./flowdata/binance/", import.meta.url); mkdirSync(dir, { recursive: true });
const tmp = new URL("./data/agg.zip", import.meta.url); mkdirSync(new URL("./data/", import.meta.url), { recursive: true });
for (let d = 1; d <= DAYS + 1; d++) {
  const day = new Date(Date.now() - d * 86400000).toISOString().slice(0, 10), out = new URL(day + ".json", dir);
  if (existsSync(out)) continue;
  try { execFileSync("curl", ["-sS", "--fail", "-m", "300", "-o", tmp.pathname, `https://data.binance.vision/data/futures/um/daily/aggTrades/BTCUSDT/BTCUSDT-aggTrades-${day}.zip`]); }
  catch { console.log(day, "not available yet"); continue; }
  const M = {}, p = spawn("unzip", ["-p", tmp.pathname]), rl = createInterface({ input: p.stdout });
  for await (const line of rl) { const f = line.split(","); if (f.length < 7 || f[0] === "agg_trade_id") continue;
    const usd = +f[1] * +f[2], k = Math.floor(+f[5] / 60000) * 60, r = M[k] || (M[k] = [0, 0, 0, 0, 0]), sell = f[6] === "true";
    if (sell) r[1] += usd; else r[0] += usd; if (usd >= BIG) { if (sell) r[3] += usd; else r[2] += usd; r[4]++; } }
  for (const k in M) M[k] = M[k].map(x => Math.round(x));
  writeFileSync(out, JSON.stringify(M)); console.log(day, Object.keys(M).length, "minutes");
}
rmSync(tmp, { force: true });
