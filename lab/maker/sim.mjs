// Maker simulation on real Kalshi trades. Each minute from 2:00 to 8:00 we (re)post resting bids:
//   YES bid = fair − k   and   NO bid = (100 − fair) − k,  fair = last traded YES price at that moment.
// A bid fills if, before the next minute, a taker trades against it (taker sells YES at ≤ our YES bid, i.e. a "no"-taker trade at yes price ≤ bid;
// mirror for NO). STRICT: needs a trade strictly through our price (we were not first in line at that price).
// Each filled contract is held to settlement. Maker fee 0.0175·p(1−p) (Kalshi's maker rate, unverified); taker trades seen are other people's.
import { readFileSync } from "node:fs";
const R = JSON.parse(readFileSync("rounds.json")), T = JSON.parse(readFileSync("trades.json")), mfee = p => 0.0175 * p * (100 - p) / 100;
const run = (k, strict, maxSide) => { let fills = 0, pnl = 0, sq = 0, rounds = 0, wins = 0;
  for (const r of R) { const tr = T[r.t]; if (!tr || tr.length < 20) continue; tr.sort((a, b) => a[0] - b[0]); rounds++; const open = r.close - 900000; let held = { y: 0, n: 0 };
    for (let m = 2; m < 8; m++) { const t0 = open + m * 60000, t1 = t0 + 60000, last = tr.filter(x => x[0] <= t0).at(-1); if (!last) continue;
      const fair = last[1], by = Math.round(fair - k), bn = Math.round(100 - fair - k), win = tr.filter(x => x[0] > t0 && x[0] <= t1);
      // YES bid hit by a seller of YES (taker_side "no") trading at yes price <= by
      if (by >= 2 && held.y < maxSide && win.some(x => x[2] === 0 && (strict ? x[1] < by : x[1] <= by))) { held.y++; fills++; const v = (r.up ? 100 - by : -by) - mfee(by); pnl += v; sq += v * v; if (r.up) wins++; }
      if (bn >= 2 && held.n < maxSide && win.some(x => x[2] === 1 && (strict ? (100 - x[1]) < bn : (100 - x[1]) <= bn))) { held.n++; fills++; const v = (!r.up ? 100 - bn : -bn) - mfee(bn); pnl += v; sq += v * v; if (!r.up) wins++; } } }
  const m = pnl / Math.max(1, fills), sd = Math.sqrt(Math.max(0, sq / Math.max(1, fills) - m * m)) / Math.sqrt(Math.max(1, fills));
  return `rounds ${rounds} | fills ${fills} (${(fills / rounds).toFixed(1)}/round) | filled bets won ${(wins / Math.max(1, fills) * 100).toFixed(0)}% | ${(m >= 0 ? "+" : "") + m.toFixed(2)}¢ per filled contract ±${sd.toFixed(2)} | ${(pnl / rounds >= 0 ? "+" : "") + (pnl / rounds).toFixed(1)}¢ per round`; };
for (const strict of [true, false]) { console.log(strict ? "\nSTRICT fills (price traded through our bid):" : "\nOPTIMISTIC fills (any trade at our bid):");
  for (const k of [1, 2, 3, 5, 8]) for (const mx of [1, 6]) console.log(`  bid ${k}¢ under last trade, max ${mx}/side/round: ${run(k, strict, mx)}`); }
