// per-second last price (Binance spot BTCUSDT) for the final 150 s of each round
import { spawn, execFileSync } from "node:child_process"; import { createInterface } from "node:readline"; import { readFileSync, writeFileSync, existsSync } from "node:fs";
const R = JSON.parse(readFileSync("rounds.json")), want = new Set();
for (const r of R) for (let s = r.close / 1000 - 150; s <= r.close / 1000; s++) want.add(s);
const days = [...new Set(R.map(r => new Date(r.close - 1000).toISOString().slice(0, 10)))].sort(), P = existsSync("sec.json") ? JSON.parse(readFileSync("sec.json")) : {};
for (const day of days) {
  try { execFileSync("curl", ["-sS", "--fail", "-m", "600", "-o", "a.zip", `https://data.binance.vision/data/spot/daily/aggTrades/BTCUSDT/BTCUSDT-aggTrades-${day}.zip`]); } catch { console.log(day, "n/a"); continue; }
  const p = spawn("unzip", ["-p", "a.zip"]), rl = createInterface({ input: p.stdout }); let n = 0;
  for await (const line of rl) { const f = line.split(","); let ts = +f[5]; if (!(ts > 0)) continue; if (ts > 1e14) ts = Math.floor(ts / 1000); const s = Math.floor(ts / 1000); if (want.has(s)) { P[s] = +f[1]; n++; } }
  console.log(day, n, "trades kept"); }
writeFileSync("sec.json", JSON.stringify(P)); console.log(Object.keys(P).length, "seconds");
