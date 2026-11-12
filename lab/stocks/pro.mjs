// Pro-trader rules tested on our gap-day data.
//  A) Zarattini, Barbon & Aziz (2024) "A Profitable Day Trading Strategy for the U.S. Equity Market": 5-min ORB on Stocks in Play.
//     Filters: open > $5, 14-day avg volume ≥ 1M, 14-day ATR > $0.50, top 20 per day by relative volume of the first 5 minutes (≥ 1x).
//     Direction = first 5-min candle colour; stop order at its high (green) / low (red); stop 10% of ATR from fill; exit at the close.
//     NOTE: our data only holds gap days (|gap| ≥ 3%), S&P 500 + ~50 names, so this is a subset of their universe.
//  B) Kullamägi-style episodic pivot, intraday: gap up ≥ 10% (and ≥ 5%), long only, buy the break of the 5-min (or 1-min) opening-range high, stop = low of day, exit at the close.
//  C) Our gap-reversal lead for comparison (5-min ORB against the gap + VWAP side, stop VWAP, 2R / 11:30).
// Fills: entry stop orders fill at the level or the bar open if it gapped through; stops the same. Costs: "paper" = $0.0035/share each side only;
// "real" = paper + 0.02% slippage each side + 1¢/share each side.
// Usage: node pro.mjs <datadir>
import { readFileSync, readdirSync } from "node:fs";
const DIR = process.argv[2], daily = JSON.parse(readFileSync(DIR + "/daily.json")), files = readdirSync(DIR + "/min").filter(f => f.endsWith(".json"));
const off = d => { const t = new Date(d + "T12:00:00Z"), y = t.getUTCFullYear(), a = new Date(Date.UTC(y, 2, 8 + (7 - new Date(Date.UTC(y, 2, 8)).getUTCDay()) % 7)), b = new Date(Date.UTC(y, 10, 1 + (7 - new Date(Date.UTC(y, 10, 1)).getUTCDay()) % 7)); return t >= a && t < b ? 4 : 5; };
const COST = { paper: { s: 0, c: 0.0035 }, real: { s: 0.0002, c: 0.0135 } };
function trade(b, i, dir, level, stopFn, exitMin, tgtR, cost) { // b: [m,o,h,l,c,v]; enter on bar i when price touches level
  const o = b[i][1], fill0 = dir > 0 ? Math.max(o, level) : Math.min(o, level), entry = fill0 * (1 + dir * cost.s) + dir * cost.c, stop = stopFn(fill0), risk = dir * (entry - stop); if (!(risk > 0)) return null;
  const tgt = tgtR ? entry + dir * tgtR * risk : null;
  for (let k = i; k < b.length; k++) { const [m, O, H, L, C] = b[k];
    // entry bar: its low/high may have printed before we got in, so only count the stop if the bar CLOSES through it
    if (k === i) { if (dir > 0 ? C <= stop : C >= stop) return out(entry, stop, dir, risk, cost); }
    else if (dir > 0 ? L <= stop : H >= stop) return out(entry, dir > 0 ? Math.min(O, stop) : Math.max(O, stop), dir, risk, cost);
    if (tgt && k > i && (dir > 0 ? H >= tgt : L <= tgt)) return out(entry, tgt, dir, risk, cost);
    if (m >= exitMin) return out(entry, C, dir, risk, cost); }
  return out(entry, b[b.length - 1][4], dir, risk, cost); }
const out = (entry, px, dir, risk, cost) => { const x = px * (1 - dir * cost.s) - dir * cost.c; return dir * (x - entry) / risk; };
const TK = (() => { try { return JSON.parse(readFileSync(DIR + "/ticksA2.json")); } catch (e) { return null; } })();
// tick-resolved version of study A: real fill price from trades; stop judged on the trades after the fill inside the entry minute, then on later 1-min bars
function tradeTick(x, dir, i, t, stopFrac, cost) { const fill0 = t.fill, entry = fill0 * (1 + dir * cost.s) + dir * cost.c, stop = fill0 - dir * stopFrac * x.atr, risk = dir * (entry - stop); if (!(risk > 0)) return null;
  if (stopFrac === 0.1 ? t.hit10 : t.hit25) return out(entry, stop, dir, risk, cost);
  for (let k = i + 1; k < x.b.length; k++) { const [m, O, H, L, C] = x.b[k]; if (dir > 0 ? L <= stop : H >= stop) return out(entry, dir > 0 ? Math.min(O, stop) : Math.max(O, stop), dir, risk, cost); if (m >= 959) return out(entry, C, dir, risk, cost); }
  return out(entry, x.b[x.b.length - 1][4], dir, risk, cost); }
const res = {}; const add = (k, d, R) => { if (R != null) (res[k] ??= []).push({ d, R }); };
const cand = {}; // day -> list for top-20 ranking
for (const f of files) { const [s, d] = f.replace(".json", "").split("_"), o = off(d) * 3600; const raw = JSON.parse(readFileSync(DIR + "/min/" + f));
  const b = raw.map(x => [((x[0] - o) % 86400) / 60, x[1], x[2], x[3], x[4], x[5]]).filter(x => x[0] >= 570 && x[0] < 960); if (b.length < 300 || b[0][0] > 571) continue;
  const db = daily[s], k = db.findIndex(x => x[0] === d); if (k < 15) continue;
  const prev = db.slice(k - 14, k), adv = prev.reduce((a, x) => a + x[5], 0) / 14; let tr = 0; for (let j = k - 14; j < k; j++) tr += Math.max(db[j][2], db[j - 1][4]) - Math.min(db[j][3], db[j - 1][4]); const atr = tr / 14;
  const gap = db[k][1] / db[k - 1][4] - 1, f5 = b.filter(x => x[0] < 575), v5 = f5.reduce((a, x) => a + x[5], 0), o5 = f5[0][1], c5 = f5[f5.length - 1][4], h5 = Math.max(...f5.map(x => x[2])), l5 = Math.min(...f5.map(x => x[3]));
  (cand[d] ??= []).push({ s, d, b, atr, adv, gap, v5, o5, c5, h5, l5, rv: v5 / (adv * 0.03) }); }
for (const [d, list] of Object.entries(cand)) {
  const elig = list.filter(x => x.o5 > 5 && x.adv >= 1e6 && x.atr > 0.5 && x.rv >= 1).sort((a, b) => b.rv - a.rv);
  for (const [lab, set] of [["A) ORB-5 Stocks in Play, top 20 (paper rules)", elig.slice(0, 20)], ["A) ORB-5 all eligible gap stocks", elig]]) for (const x of set) { if (x.c5 === x.o5) continue; const dir = x.c5 > x.o5 ? 1 : -1, lvl = dir > 0 ? x.h5 : x.l5;
      const i = x.b.findIndex(y => y[0] >= 575 && (dir > 0 ? y[2] >= lvl : y[3] <= lvl)); if (i < 0) continue;
      for (const c of ["paper", "real"]) { add(`${lab} | ${c} costs`, d, trade(x.b, i, dir, lvl, f0 => f0 - dir * 0.1 * x.atr, 959, null, COST[c])); }
      add(`${lab} | real costs, stop 25% ATR`, d, trade(x.b, i, dir, lvl, f0 => f0 - dir * 0.25 * x.atr, 959, null, COST.real));
      const t = TK && TK[x.s + "_" + x.d]; if (t && !t.none && lab.includes("top 20")) { for (const c of ["paper", "real"]) add(`A*) TICK-CHECKED top 20, stop 10% ATR | ${c} costs`, d, tradeTick(x, dir, i, t, 0.1, COST[c])); add(`A*) TICK-CHECKED top 20, stop 25% ATR | real costs`, d, tradeTick(x, dir, i, t, 0.25, COST.real)); } }
  for (const x of list) { if (x.gap < 0.05 || x.o5 < 5) continue; const big = x.gap >= 0.10 ? "gap ≥10%" : "gap 5–10%";
    for (const n of [1, 5]) { const r = x.b.filter(y => y[0] < 570 + n), hi = Math.max(...r.map(y => y[2])); const i = x.b.findIndex(y => y[0] >= 570 + n && y[0] < 690 && y[2] > hi); if (i < 0) continue;
      const lod = Math.min(...x.b.slice(0, i).map(y => y[3]));
      for (const c of ["paper", "real"]) add(`B) EP long, ${n}-min ORH break, stop low of day, exit close | ${big} | ${c} costs`, d, trade(x.b, i, 1, hi + 0.01, () => lod - 0.01, 959, null, COST[c])); } } }
const st = v => { const n = v.length, m = v.reduce((a, x) => a + x.R, 0) / n, se = Math.sqrt(v.reduce((a, x) => a + (x.R - m) ** 2, 0) / n / n), s = v.slice().sort((a, b) => a.d < b.d ? -1 : 1), h = n >> 1, mm = a => (a.reduce((t, x) => t + x.R, 0) / a.length).toFixed(3);
  return `${String(n).padStart(5)} trades  win ${(v.filter(x => x.R > 0).length / n * 100).toFixed(0)}%  avg ${m >= 0 ? "+" : ""}${m.toFixed(3)}R ±${se.toFixed(3)}  older ${mm(s.slice(0, h))} newer ${mm(s.slice(h))}`; };
console.log(Object.keys(cand).length, "trading days\n"); for (const k of Object.keys(res).sort()) console.log(k.padEnd(82), st(res[k]));
