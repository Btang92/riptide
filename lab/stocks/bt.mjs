// Backtest common day-trading setups on gap stocks (|gap| ≥ 3%, ≥ $5), trading in the gap's direction.
// Each trade risks 1R (entry − stop). Entry = next bar's open after the signal bar closes, plus slippage; exits at stop, 2R target, or the time exit.
// Costs: 0.02% slippage each side + 1¢/share. Results in R (multiples of risk) and $ for a $2,000 account risking 1% ($20) per trade, size capped at buying power.
// Usage: node bt.mjs <datadir>
import { readFileSync, readdirSync } from "node:fs";
const DIR = process.argv[2], daily = JSON.parse(readFileSync(DIR + "/daily.json")), SLIP = 0.0002, CENT = 0.01, ACCT = 2000, RISK = 20;
const files = readdirSync(DIR + "/min").filter(f => f.endsWith(".json"));
const minute = t => { const d = new Date(t * 1000), et = new Date(d.toLocaleString("en-US", { timeZone: "America/New_York" })); return et.getHours() * 60 + et.getMinutes(); };
function sim(bars, i, dir, stop, tgtR, exitMin) { // enter at bar i open
  const e0 = bars[i][1], entry = e0 * (1 + dir * SLIP) + dir * CENT, risk = Math.abs(entry - stop); if (!(risk > 0) || risk / entry < 0.001) return null;
  const tgt = entry + dir * tgtR * risk;
  for (let k = i; k < bars.length; k++) { const [t, o, h, l, c] = bars[k], m = minute(t);
    const hitS = dir > 0 ? l <= stop : h >= stop, hitT = dir > 0 ? h >= tgt : l <= tgt;
    if (hitS) { const px = (dir > 0 ? Math.min(o, stop) : Math.max(o, stop)); return fin(entry, px, dir, risk); } // stop first if both (conservative)
    if (hitT) return fin(entry, tgt, dir, risk);
    if (m >= exitMin) return fin(entry, c, dir, risk); }
  return fin(entry, bars[bars.length - 1][4], dir, risk); }
const fin = (entry, px, dir, risk) => { const out = px * (1 - dir * SLIP) - dir * CENT, R = dir * (out - entry) / risk, sh = Math.floor(Math.min(RISK / risk, ACCT / entry)); return { R, usd: sh * dir * (out - entry), sh }; };
const setups = {
  "ORB 5-min breakout": (b, dir) => orb(b, dir, 5), "ORB 15-min breakout": (b, dir) => orb(b, dir, 15),
  "VWAP pullback hold": (b, dir) => { let pv = 0, vv = 0, touched = false, lo = null; for (let i = 0; i < b.length - 1; i++) { const [t, o, h, l, c, v] = b[i], m = minute(t); pv += (h + l + c) / 3 * v; vv += v; const vw = pv / vv;
      if (m < 600) continue; if (m >= 690) return null; // 10:00–11:30 window
      if (dir > 0 ? l <= vw : h >= vw) { touched = true; lo = lo == null ? (dir > 0 ? l : h) : (dir > 0 ? Math.min(lo, l) : Math.max(lo, h)); }
      if (touched && (dir > 0 ? c > vw : c < vw) && (dir > 0 ? c > o : c < o)) return sim(b, i + 1, dir, lo - dir * 0.01, 2, 720); } return null; },
  "Gap fade (counter-trend control)": (b, dir) => { const i = b.findIndex(x => minute(x[0]) >= 575); if (i < 0) return null; const r = b.slice(0, i), hi = Math.max(...r.map(x => x[2])), lo = Math.min(...r.map(x => x[3])); return sim(b, i, -dir, dir > 0 ? hi + 0.01 : lo - 0.01, 2, 720); } };
function orb(b, dir, n) { const r = b.filter(x => minute(x[0]) < 570 + n); if (r.length < n * 0.6) return null; const hi = Math.max(...r.map(x => x[2])), lo = Math.min(...r.map(x => x[3]));
  for (let i = r.length; i < b.length - 1; i++) { const m = minute(b[i][0]); if (m >= 660) return null; const c = b[i][4]; if (dir > 0 ? c > hi : c < lo) return sim(b, i + 1, dir, dir > 0 ? lo : hi, 2, 690); } return null; }
const res = {}; const meta = [];
for (const f of files) { const [s, d] = f.replace(".json", "").split("_"), b = JSON.parse(readFileSync(DIR + "/min/" + f)); if (b.length < 60) continue;
  const db = daily[s], k = db.findIndex(x => x[0] === d); if (k < 21) continue; const gap = db[k][1] / db[k - 1][4] - 1, dir = gap > 0 ? 1 : -1;
  const avgV = db.slice(k - 20, k).reduce((a, x) => a + x[5], 0) / 20, v15 = b.filter(x => minute(x[0]) < 585).reduce((a, x) => a + x[5], 0), rvol = v15 / (avgV / 26);
  for (const [name, fn] of Object.entries(setups)) { const r = fn(b, dir); if (!r) continue; for (const key of [name, name + (rvol >= 2 ? " | rel vol ≥2" : " | rel vol <2")]) (res[key] ??= []).push({ ...r, d, s, gap }); } }
const rep = (name, v) => { const n = v.length, m = v.reduce((a, x) => a + x.R, 0) / n, sd = Math.sqrt(v.reduce((a, x) => a + (x.R - m) ** 2, 0) / n) / Math.sqrt(n), w = v.filter(x => x.R > 0).length / n;
  const half = v.slice().sort((a, b) => a.d < b.d ? -1 : 1), h1 = half.slice(0, n >> 1), h2 = half.slice(n >> 1), mm = a => (a.reduce((s, x) => s + x.R, 0) / a.length).toFixed(2);
  console.log(`${name.padEnd(46)} ${String(n).padStart(5)} trades  win ${(w * 100).toFixed(0)}%  avg ${m >= 0 ? "+" : ""}${m.toFixed(3)}R ±${sd.toFixed(3)}  older ${mm(h1)}R newer ${mm(h2)}R  $ on $2k/1% risk: ${v.reduce((a, x) => a + x.usd, 0).toFixed(0)}`); };
const days = new Set(files.map(f => f.split("_")[1].slice(0, 10)));
console.log(`${files.length} gap-stock days across ${days.size} trading days\n`);
for (const k of Object.keys(res).sort()) rep(k, res[k]);
