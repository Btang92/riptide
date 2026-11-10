// RIPTIDE-style read on Kalshi gold 15-min (settles on a single 1-min close): chance = Phi((price − strike)/(σ·√minutes left)), σ from the last 60 one-minute moves.
// Entry = Kalshi ask at the decision minute (LAG=1 uses the next minute's ask, to rule out stale-price artifacts). Fee 0.07·P·(1−P).
// Usage: node goldread.mjs gold.json xau1m.json
import { readFileSync } from "node:fs";
const G = Object.values(JSON.parse(readFileSync(process.argv[2]))).filter(x => x.c && x.yes != null).sort((a, b) => a.open - b.open), M = JSON.parse(readFileSync(process.argv[3]));
const LAG = +(process.env.LAG || 0) * 60, fee = p => 0.07 * p * (100 - p) / 100;
const erf = x => { const t = 1 / (1 + 0.3275911 * Math.abs(x)), y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x); return x >= 0 ? y : -y; }, Phi = z => 0.5 * (1 + erf(z / Math.SQRT2));
const st = v => { if (!v.length) return "no bets".padEnd(30); const m = v.reduce((a, b) => a + b, 0) / v.length, s = Math.sqrt(v.reduce((a, x) => a + (x - m) ** 2, 0) / v.length / v.length); return `${(m >= 0 ? "+" : "") + m.toFixed(1)}¢ ±${s.toFixed(1)} (${v.length})`.padEnd(22); };
for (const at of [120, 240, 360, 600]) { const R = { every: [], value: [], live: [], fav85: [], fav85agree: [], fav85dis: [] }; let right = 0, fr = 0, n = 0;
  for (const g of G) { const T = g.open + at, b = M[T - 60]; if (!b) continue; let v = 0, k = 0; for (let s = T - 3600; s < T; s += 60) { const x = M[s - 60], y = M[s]; if (x && y) { v += Math.log(y[3] / x[3]) ** 2; k++; } } if (k < 30) continue;
    const sig = Math.sqrt(v / k), left = (g.close - T) / 60, p = Phi(Math.log(b[3] / g.strike) / Math.max(sig * Math.sqrt(left), 1e-9));
    const kc = g.c.filter(c => c[0] <= T + LAG && c[1] > 0 && c[2] > 0).pop(); if (!kc) continue; const bid = kc[1] * 100, ask = kc[2] * 100, mid = (bid + ask) / 2;
    n++; const call = p >= .5, prob = call ? p : 1 - p; if ((call ? 1 : 0) === g.yes) right++; if (((mid >= 50) ? 1 : 0) === g.yes) fr++;
    const pay = (side, a) => ((side ? 1 : 0) === g.yes ? 100 - a : -a) - fee(a), aC = call ? ask : 100 - bid;
    if (aC < 99) { const w = pay(call, aC); R.every.push(w); if (prob * 100 >= aC + fee(aC) + 3) R.value.push(w); if (aC >= 75 && aC <= 90 && prob >= .71) R.live.push(w); }
    const fav = mid >= 50, aF = fav ? ask : 100 - bid; if (aF >= 85 && aF <= 96) { const w = pay(fav, aF); R.fav85.push(w); (fav === call && prob * 100 >= aF ? R.fav85agree : R.fav85dis).push(w); } }
  console.log(`\n== ${at / 60}:00 | read right ${(right / n * 100).toFixed(1)}% | Kalshi favourite right ${(fr / n * 100).toFixed(1)}% | ${n} rounds`);
  console.log(`   bet read every round ${st(R.every)} value-only ${st(R.value)} RIPTIDE rule 75–90¢ ${st(R.live)}`);
  console.log(`   85–96¢ favourite ${st(R.fav85)} …when read agrees & ≥ price ${st(R.fav85agree)} …otherwise ${st(R.fav85dis)}`); }
