import { execFileSync } from "node:child_process"; import { writeFileSync } from "node:fs";
const K = "https://api.elections.kalshi.com/trade-api/v2", get = u => { for (let a = 0; a < 5; a++) { try { return JSON.parse(execFileSync("curl", ["-sS", "--fail", "-m", "30", u], { maxBuffer: 256 * 1024 * 1024 }).toString()); } catch (e) { execFileSync("sleep", ["2"]); } } return null; };
const to = Math.floor(Date.now() / 1000), from = to - 8 * 86400; let cur = "", out = [];
for (let p = 0; p < 20; p++) { const d = get(`${K}/markets?series_ticker=KXBTC15M&status=settled&min_close_ts=${from}&max_close_ts=${to}&limit=1000${cur ? "&cursor=" + cur : ""}`); if (!d) break;
  for (const m of d.markets || []) if (m.result === "yes" || m.result === "no") out.push({ t: m.ticker, close: Date.parse(m.close_time), strike: +m.floor_strike, up: m.result === "yes" ? 1 : 0, exp: m.expiration_value != null ? +m.expiration_value : null });
  cur = d.cursor; if (!cur || !(d.markets || []).length) break; }
writeFileSync("rounds.json", JSON.stringify(out)); console.log(out.length, "rounds", out.filter(x => x.exp != null).length, "with expiration value");
