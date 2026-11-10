// Kalshi 15-minute index markets (default KXINX15M = S&P 500): settled rounds with 1-minute bid/ask candles. Resumable.
// Usage: node lab/spx/dl.mjs out.json [series=KXINX15M] [days=30]
import { execFileSync } from "node:child_process"; import { readFileSync, writeFileSync, existsSync } from "node:fs";
const OUT = process.argv[2], SER = process.argv[3] || "KXINX15M", DAYS = +(process.argv[4] || 30), B = "https://api.elections.kalshi.com/trade-api/v2";
const sleep = ms => execFileSync("sleep", [String(ms / 1000)]);
const get = u => { for (let a = 0; a < 6; a++) { try { const o = JSON.parse(execFileSync("curl", ["-sS", "-m", "30", u], { maxBuffer: 64 << 20 }).toString()); if (o.error) throw 0; sleep(250); return o; } catch (e) { sleep(1500 * (a + 1)); } } return null; };
const out = existsSync(OUT) ? JSON.parse(readFileSync(OUT)) : {}, since = Date.now() / 1000 - DAYS * 86400;
let cur = "", list = [];
for (let p = 0; p < 50; p++) { const j = get(`${B}/markets?series_ticker=${SER}&status=settled&limit=1000&min_close_ts=${Math.floor(since)}${cur ? "&cursor=" + cur : ""}`); if (!j) break; list.push(...j.markets); cur = j.cursor; if (!cur || !j.markets.length) break; }
console.log(list.length, "settled markets");
let n = 0;
for (const m of list) { if (out[m.ticker]) continue; const o = Date.parse(m.open_time) / 1000, c = Date.parse(m.close_time) / 1000;
  const k = get(`${B}/series/${SER}/markets/${m.ticker}/candlesticks?start_ts=${o}&end_ts=${c}&period_interval=1`);
  out[m.ticker] = { open: o, close: c, strike: m.floor_strike, value: +m.expiration_value, yes: m.result === "yes" ? 1 : m.result === "no" ? 0 : null, vol: +(m.volume_fp || m.volume || 0),
    c: k ? k.candlesticks.map(x => [x.end_period_ts, x.yes_bid && +(x.yes_bid.close_dollars ?? x.yes_bid.close / 100), x.yes_ask && +(x.yes_ask.close_dollars ?? x.yes_ask.close / 100), +(x.volume_fp ?? x.volume ?? 0)]) : null };
  if (++n % 50 === 0) { writeFileSync(OUT, JSON.stringify(out)); console.log(n); } }
writeFileSync(OUT, JSON.stringify(out)); console.log("done", Object.keys(out).length);
