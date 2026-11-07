// Week test: how RIPTIDE-style 5-minute calls would have done on Polymarket. Entry = first real taker buy of our side within 15 s after the decision (fallback: price history within 20 s + 1¢). Fee 0.07·P·(1−P).
// Usage: node an7.mjs pm5w.json cb1m.json
import { readFileSync } from "node:fs";
const P = JSON.parse(readFileSync(process.argv[2])), M = JSON.parse(readFileSync(process.argv[3])), fee = p => 0.07 * p * (100 - p) / 100;
const erf = x => { const t = 1 / (1 + 0.3275911 * Math.abs(x)), y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x); return x >= 0 ? y : -y; }, Phi = z => 0.5 * (1 + erf(z / Math.SQRT2));
const C = [60, 120, 180, 240], rules = ["every", "value", "fav85", "live", "follow"];
const R = {}; for (const c of C) { R[c] = { n: 0, right: 0, favN: 0, fav: 0 }; for (const r of rules) R[c][r] = []; }
const days = {};
for (const [k, x] of Object.entries(P)) { if (x.none || x.up == null) continue; const ts = +k, s0 = M[ts - 60]; if (!s0) continue; const S0 = s0[4];
  let v = 0, n = 0; for (let s = ts - 3600; s < ts; s += 60) { const a = M[s - 60], b = M[s]; if (a && b) { v += Math.log(b[4] / a[4]) ** 2; n++; } } if (n < 40) continue; const sig = Math.sqrt(v / n / 60);
  const tr = (x.tr || []).slice().sort((a, b) => a[0] - b[0]), day = new Date((ts - 5 * 3600) * 1000).toISOString().slice(0, 10);
  for (const c of C) { let sum = 0, ok = true; for (let m = 0; m < c / 60; m++) { const cd = M[ts + m * 60]; if (!cd) { ok = false; break; } sum += (cd[3] + cd[4]) / 2 * 60; } if (!ok) continue;
    const Sn = M[ts + c - 60][4], r = 300 - c, mean = (sum + r * Sn) / 300, sd = Sn * sig * Math.sqrt(r ** 3 / 3) / 300, p = Phi((mean - S0) / Math.max(sd, 1e-9));
    const Q = R[c]; Q.n++; const call = p >= .5, prob = call ? p : 1 - p; if ((call ? 1 : 0) === x.up) Q.right++;
    const hh = (x.h || []).find(t => t[0] > ts + c && t[0] <= ts + c + 20), pmUp = hh ? hh[1] * 100 : null;
    const ask = side => { const t = tr.find(t => t[0] > ts + c && t[0] <= ts + c + 15 && t[3] === 1 && t[2] === (side ? 1 : 0)); if (t) return (side ? t[1] : 1 - t[1]) * 100; return pmUp == null ? null : Math.min(99, (side ? pmUp : 100 - pmUp) + 1); };
    const val = (side, a) => (((side ? 1 : 0) === x.up) ? 100 - a : -a) - fee(a);
    const aR = ask(call), favSide = pmUp == null ? null : pmUp >= 50; if (favSide != null) { Q.favN++; if ((favSide ? 1 : 0) === x.up) Q.fav++; }
    if (aR != null && aR < 99) { const w = val(call, aR); Q.every.push(w); if (prob * 100 >= aR + fee(aR) + 3) Q.value.push(w); if (aR >= 75 && aR <= 90 && prob >= .71) { Q.live.push(w); if (c === 240) (days[day] ??= []).push(w); } }
    if (favSide != null) { const aF = ask(favSide); if (aF != null && aF < 99) { const w = val(favSide, aF); Q.follow.push(w); if (aF >= 85 && aF <= 96) Q.fav85.push(w); } } } }
const st = v => { if (!v.length) return "no bets"; const m = v.reduce((a, b) => a + b, 0) / v.length, se = Math.sqrt(v.reduce((a, x) => a + (x - m) ** 2, 0) / v.length) / Math.sqrt(v.length); return `${v.length} bets, won ${(v.filter(x => x > 0).length / v.length * 100).toFixed(1)}%, ${(m >= 0 ? "+" : "") + m.toFixed(1)}¢/ct ±${se.toFixed(1)}, total ${(v.reduce((a, b) => a + b, 0) / 100).toFixed(2)} $/1ct`; };
const vols = Object.values(P).filter(x => !x.none && x.up != null).map(x => x.vol).sort((a, b) => a - b), ks = Object.keys(P).filter(k => !P[k].none).map(Number);
console.log(`Polymarket 5-min BTC: ${vols.length} settled rounds, ${new Date(Math.min(...ks) * 1000).toISOString().slice(0, 16)} → ${new Date(Math.max(...ks) * 1000).toISOString().slice(0, 16)}, median volume $${vols[vols.length >> 1]}`);
const names = { every: "bet RIPTIDE's read every round", value: "only when read beats price+fee+3¢", live: "RIPTIDE's 15-min bet rule (75–90¢, ≥71%)", fav85: "buy the 85–96¢ favourite", follow: "always buy the crowd favourite" };
for (const c of C) { const Q = R[c]; console.log(`\n== call at ${c / 60}:00 | RIPTIDE read right ${(Q.right / Q.n * 100).toFixed(1)}% of ${Q.n} | crowd favourite right ${(Q.fav / Q.favN * 100).toFixed(1)}%`); for (const r of rules) console.log(`   ${names[r].padEnd(44)} ${st(Q[r])}`); }
console.log("\nRIPTIDE's 15-min rule at 4:00, by day:"); for (const d of Object.keys(days).sort()) console.log("  ", d, st(days[d]));
