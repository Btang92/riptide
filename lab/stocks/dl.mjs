// Day-trading backtest data from Alpaca (free plan: historical SIP bars, all US exchanges).
// Keys come from env only (never commit): ALPACA_KEY, ALPACA_SECRET.
// Usage: node dl.mjs <outdir> [months=12]
// Writes <outdir>/daily.json (split-adjusted daily bars for the universe) and <outdir>/min/<SYM>_<YYYY-MM-DD>.json (1-min bars, 9:30–16:00 ET) for every gap day (|gap| ≥ 3%, price ≥ $5).
import { execFileSync } from "node:child_process"; import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
const OUT = process.argv[2], MONTHS = +(process.argv[3] || 12), H = ["-H", "APCA-API-KEY-ID: " + process.env.ALPACA_KEY, "-H", "APCA-API-SECRET-KEY: " + process.env.ALPACA_SECRET];
const D = "https://data.alpaca.markets/v2/stocks", sleep = s => execFileSync("sleep", [String(s)]);
const get = u => { for (let a = 0; a < 6; a++) { try { const j = JSON.parse(execFileSync("curl", ["-sS", "-m", "60", ...H, u], { maxBuffer: 256 << 20 }).toString()); if (j.message) throw new Error(j.message); sleep(0.35); return j; } catch (e) { if (a === 5) throw e; if (/forbidden|unauthorized/i.test(e.message)) throw e; sleep(3 * (a + 1)); } } };
mkdirSync(OUT + "/min", { recursive: true });
const sp = readFileSync(new URL("universe.txt", import.meta.url), "utf8").split(/\s+/).filter(Boolean);
const end = new Date(Date.now() - 2 * 86400e3).toISOString().slice(0, 10) + "T00:00:00Z", start = new Date(Date.now() - (MONTHS * 31 + 40) * 86400e3).toISOString().slice(0, 10);
let daily = existsSync(OUT + "/daily.json") ? JSON.parse(readFileSync(OUT + "/daily.json")) : null;
if (!daily) { daily = {};
  for (let i = 0; i < sp.length; i += 100) { const syms = sp.slice(i, i + 100).join(","); let tok = "";
    do { const j = get(`${D}/bars?symbols=${syms}&timeframe=1Day&start=${start}&end=${end}&adjustment=split&feed=sip&limit=10000${tok ? "&page_token=" + tok : ""}`);
      for (const [s, bars] of Object.entries(j.bars || {})) (daily[s] ??= []).push(...bars.map(b => [b.t.slice(0, 10), b.o, b.h, b.l, b.c, b.v]));
      tok = j.next_page_token; } while (tok);
    console.log("daily", Math.min(i + 100, sp.length), "/", sp.length); }
  writeFileSync(OUT + "/daily.json", JSON.stringify(daily)); }
const days = []; for (const [s, b] of Object.entries(daily)) for (let k = 21; k < b.length; k++) { const g = b[k][1] / b[k - 1][4] - 1; if (Math.abs(g) >= 0.03 && b[k][1] >= 5) days.push([s, b[k][0]]); }
console.log(days.length, "gap days");
const etOff = d => { const t = new Date(d + "T12:00:00Z"), y = t.getUTCFullYear(), dst0 = new Date(Date.UTC(y, 2, 8 + (7 - new Date(Date.UTC(y, 2, 8)).getUTCDay()) % 7)), dst1 = new Date(Date.UTC(y, 10, 1 + (7 - new Date(Date.UTC(y, 10, 1)).getUTCDay()) % 7)); return t >= dst0 && t < dst1 ? 4 : 5; };
let n = 0; for (const [s, d] of days) { const f = `${OUT}/min/${s}_${d}.json`; if (existsSync(f)) continue; const o = etOff(d), a = new Date(Date.parse(d + "T09:30:00Z") + o * 3600e3).toISOString(), z = new Date(Date.parse(d + "T16:00:00Z") + o * 3600e3).toISOString();
  let bars = [], tok = ""; do { const j = get(`${D}/${s}/bars?timeframe=1Min&start=${a}&end=${z}&adjustment=split&feed=sip&limit=10000${tok ? "&page_token=" + tok : ""}`); bars.push(...(j.bars || []).map(b => [Date.parse(b.t) / 1000, b.o, b.h, b.l, b.c, b.v])); tok = j.next_page_token; } while (tok);
  writeFileSync(f, JSON.stringify(bars)); if (++n % 100 === 0) console.log("minute files", n); }
console.log("done");
