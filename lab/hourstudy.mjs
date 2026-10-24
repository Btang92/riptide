// Flip study by position in the hour. Needs lab/data (pull.mjs) and cb1m.json (Coinbase 1-minute candles keyed by unix start) in the working directory.
import { readFileSync } from "node:fs";
const L = "/home/claude/gh-riptide/lab/data/";
const kh = JSON.parse(readFileSync(L + "khist.json")), calls = JSON.parse(readFileSync(L + "calls.json")).filter(c => c.winner), cps = JSON.parse(readFileSync(L + "checkpoints.json")), M = JSON.parse(readFileSync("cb1m.json"));
const Q = ms => new Date(ms).getUTCMinutes();       // 0, 15, 30, 45 (round start minute)
const lab = { 0: ":00–:15", 15: ":15–:30", 30: ":30–:45", 45: ":45–:00 (end of hour)" };
// rounds: merge Kalshi history (Sep 20–Oct 20) + live rounds after that (from server checkpoints)
const R = new Map();
for (const r of kh) if (r.cps && r.up != null) R.set(r.start, { start: r.start, up: r.up === 1, strike: r.strike, cps: r.cps });
const win = new Map(calls.map(c => [c.start, c.winner]));
for (const p of cps) { if (!win.has(p.start) || R.has(p.start) && R.get(p.start).src !== "live") { if (R.has(p.start) && !R.get(p.start).src) continue; } if (!win.has(p.start)) continue;
  const r = R.get(p.start) || { start: p.start, up: win.get(p.start) === "UP", strike: p.strike, cps: {}, src: "live" }; r.cps[p.s] = { ya: p.ya, na: p.na }; R.set(p.start, r); }
const rounds = [...R.values()];
console.log("rounds:", rounds.length, "(Kalshi history + live)\n");
const px = s => { const x = M[s]; return x ? x[4] : null; };      // close of 1-min candle starting at unix s
function stats(sel) {
  const o = {}; for (const q of [0, 15, 30, 45]) o[q] = { n: 0, fav2: 0, fav2n: 0, fav10: 0, fav10n: 0, strong10: 0, strong10n: 0, late: [], lastMove: [], rng: [] };
  for (const r of rounds.filter(sel)) { const q = Q(r.start), x = o[q]; x.n++;
    const f = s => { const c = r.cps[s]; if (!c || c.ya == null) return null; return c.ya >= 50; };
    const f2 = f(120), f10 = f(600);
    if (f2 != null) { x.fav2n++; if (f2 !== r.up) x.fav2++; }
    if (f10 != null) { x.fav10n++; if (f10 !== r.up) x.fav10++; const p = r.cps[600], conf = Math.max(p.ya, 100 - p.ya);
      if (conf >= 80) { x.strong10n++; if (f10 !== r.up) x.strong10++; } }
    const s0 = r.start / 1000, a = px(s0 + 540), b = px(s0 + 840); if (a && b) x.lastMove.push(Math.abs(b - a));    // close at 10:00 -> close at 15:00
    let hi = -1e9, lo = 1e9; for (let m = 600; m < 900; m += 60) { const c = M[s0 + m]; if (c) { hi = Math.max(hi, c[2]); lo = Math.min(lo, c[1]); } } if (hi > 0) x.rng.push(hi - lo);
  }
  const med = a => { const s = a.slice().sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : 0; };
  console.log("round              | rounds | favourite @2:00 lost | favourite @10:00 lost | 80¢+ favourite @10:00 lost | median BTC move last 5 min | median range last 5 min");
  for (const q of [0, 15, 30, 45]) { const x = o[q];
    console.log(`${lab[q].padEnd(22)} | ${String(x.n).padStart(5)} | ${(x.fav2 / x.fav2n * 100).toFixed(1).padStart(5)}% (${x.fav2}/${x.fav2n}) | ${(x.fav10 / x.fav10n * 100).toFixed(1).padStart(5)}% (${x.fav10}/${x.fav10n}) | ${(x.strong10 / x.strong10n * 100).toFixed(1).padStart(5)}% (${x.strong10}/${x.strong10n}) | $${med(x.lastMove).toFixed(0)} | $${med(x.rng).toFixed(0)}`); }
}
stats(() => true);
// RIPTIDE's own calls by quarter
console.log("\nRIPTIDE's calls by round:");
const byW = new Map(); for (const p of cps) { if (!byW.has(p.start)) byW.set(p.start, []); byW.get(p.start).push(p); }
for (const q of [0, 15, 30, 45]) { const c = calls.filter(x => Q(x.start) === q && x.result); const w = c.filter(x => x.result === "WIN").length;
  const late = c.filter(x => x.result === "LOSS" && (byW.get(x.start) || []).filter(p => p.s > 120).length >= 4 && (byW.get(x.start) || []).filter(p => p.s > 120).every(p => ((p.pb ?? p.pu) >= .5) === (x.call === "UP"))).length;
  console.log(`  ${lab[q].padEnd(22)} calls ${c.length}  right ${(w / c.length * 100).toFixed(0)}%  losses ${c.length - w}, of which late flips (looked right at every check to 10:00) ${late}`); }
// minute-of-hour volatility & volume (why?)
const mv = Array.from({ length: 60 }, () => ({ v: [], vol: [] }));
for (const k of Object.keys(M)) { const x = M[k], m = new Date(+k * 1000).getUTCMinutes(); mv[m].v.push(Math.abs(x[4] - x[3])); mv[m].vol.push(x[5]); }
const avg = a => a.reduce((s, x) => s + x, 0) / a.length, allV = avg(mv.flatMap(x => x.v)), allVol = avg(mv.flatMap(x => x.vol));
console.log("\nBTC 1-minute move size and volume by minute of the hour (1.00 = average):");
const show = [0, 1, 2, 13, 14, 15, 28, 29, 30, 31, 43, 44, 45, 55, 56, 57, 58, 59];
for (const m of show) console.log(`  :${String(m).padStart(2, "0")}  move ${(avg(mv[m].v) / allV).toFixed(2)}  volume ${(avg(mv[m].vol) / allVol).toFixed(2)}`);
