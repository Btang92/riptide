import { readFileSync } from "node:fs";
const P = JSON.parse(readFileSync("pm5.json")), M = JSON.parse(readFileSync("../hr/cb1m.json")), fee = p => 0.07 * p * (100 - p) / 100;
const erf = x => { const t = 1 / (1 + 0.3275911 * Math.abs(x)), y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x); return x >= 0 ? y : -y; }, Phi = z => 0.5 * (1 + erf(z / Math.SQRT2));
const res = {}; for (const c of [60, 120, 180, 240]) res[c] = { n: 0, mR: 0, fav: 0, favN: 0, bets: [], all: [] };
let used = 0;
for (const [k, x] of Object.entries(P)) { if (x.none || x.up == null) continue; const ts = +k, s0c = M[ts - 60]; if (!s0c) continue; const S0 = s0c[4];
  let v = 0, n = 0; for (let s = ts - 3600; s < ts; s += 60) { const a = M[s - 60], b = M[s]; if (a && b) { v += Math.log(b[4] / a[4]) ** 2; n++; } } if (n < 40) continue; const sig = Math.sqrt(v / n / 60); used++;
  const tr = (x.tr || []).slice().sort((a, b) => a[0] - b[0]);
  for (const c of [60, 120, 180, 240]) { let sum = 0, ok = true; for (let m = 0; m < c / 60; m++) { const cd = M[ts + m * 60]; if (!cd) { ok = false; break; } sum += (cd[3] + cd[4]) / 2 * 60; } if (!ok) continue;
    const Sn = M[ts + c - 60][4], r = 300 - c, mean = (sum + r * Sn) / 300, sd = Sn * sig * Math.sqrt(r ** 3 / 3) / 300, p = Phi((mean - S0) / Math.max(sd, 1e-9));
    const R = res[c]; R.n++; const call = p >= .5; if ((call ? 1 : 0) === x.up) R.mR++;
    const hh = (x.h || []).find(t => t[0] > ts + c && t[0] <= ts + c + +(process.env.WIN || 20)); if (!hh) continue; const pmUp = hh[1] * 100; R.favN++; if ((pmUp >= 50 ? 1 : 0) === x.up) R.fav++;
    const nx = side => { const t = tr.find(t => t[0] > ts + c && t[0] <= ts + c + 10 && t[3] === 1 && t[2] === (side ? 1 : 0)); return t ? (side ? t[1] : 1 - t[1]) * 100 : null; };
    const side = call, prob = call ? p : 1 - p, ask = nx(side) ?? Math.min(99, (side ? pmUp : 100 - pmUp) + 1), win = (side ? 1 : 0) === x.up, val = (win ? 100 - ask : -ask) - fee(ask);
    R.all.push(val); if (prob * 100 >= ask + fee(ask) + 3) R.bets.push(val); } }
const st = v => { if (!v.length) return "—"; const m = v.reduce((a, b) => a + b, 0) / v.length, se = Math.sqrt(v.reduce((a, x) => a + (x - m) ** 2, 0) / v.length) / Math.sqrt(v.length); return `${v.length} bets, won ${(v.filter(x => x > 0).length / v.length * 100).toFixed(0)}%, ${(m >= 0 ? "+" : "") + m.toFixed(1)}¢/ct ±${se.toFixed(1)}`; };
const vols = Object.values(P).filter(x => !x.none).map(x => x.vol).sort((a, b) => a - b);
console.log(`Polymarket 5-min BTC: ${vols.length} rounds, median volume $${vols[vols.length >> 1]}, rounds modelled ${used}`);
for (const c of [60, 120, 180, 240]) { const R = res[c]; console.log(`\nat ${c / 60}:00 into the 5 minutes | RIPTIDE-style read right ${(R.mR / R.n * 100).toFixed(1)}% (${R.n}) | Polymarket favourite right ${R.favN ? (R.fav / R.favN * 100).toFixed(1) + "%" : "—"} (${R.favN})`);
  console.log(`   bet the read every round: ${st(R.all)}\n   bet only when read beats price+fee+3: ${st(R.bets)}`); }
