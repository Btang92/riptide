// Gap test on actual trades, same second: last trade on each venue at the checkpoint (both no older than AGE s),
// execution = next taker buy on the chosen side within 10 s (Kalshi) / next Polymarket buy of that outcome within 10 s.
import { readFileSync } from "node:fs";
const T = JSON.parse(readFileSync("tr.json")), AGE = +(process.env.AGE || 15), fee = p => 0.07 * p * (100 - p) / 100;
const st = v => { if (!v.length) return "—"; const m = v.reduce((a, b) => a + b, 0) / v.length, sd = Math.sqrt(v.reduce((a, x) => a + (x - m) ** 2, 0) / v.length) / Math.sqrt(v.length); return `${(m >= 0 ? "+" : "") + m.toFixed(1)}¢/ct ±${sd.toFixed(1)} n=${v.length} won ${(v.filter(x => x > 0).length / v.length * 100).toFixed(0)}%`; };
let same = 0, both = 0; for (const x of Object.values(T)) if (!x.none && x.pUp != null) { both++; if (x.pUp === x.kUp) same++; }
console.log(`rounds ${both}; settled the same way on both venues: ${(same / both * 100).toFixed(1)}%  (fresh = both last trades ≤ ${AGE}s old)`);
for (const cp of [120, 300, 480]) { const rows = [];
  for (const [s0, x] of Object.entries(T)) { if (x.none || x.pUp == null) continue; const t = +s0 + cp;
    const k = x.k.filter(r => r[0] <= t).sort((a, b) => a[0] - b[0]).at(-1), p = x.pm.filter(r => r[0] <= t).sort((a, b) => a[0] - b[0]).at(-1);
    if (!k || !p || t - k[0] > AGE || t - p[0] > AGE) continue;
    const kNext = side => { const r = x.k.filter(z => z[0] > t && z[0] <= t + 10 && z[2] === side).sort((a, b) => a[0] - b[0])[0]; return r ? (side ? r[1] : 100 - r[1]) : null; };
    const pNext = up => { const r = x.pm.filter(z => z[0] > t && z[0] <= t + 10 && z[3] === 1 && z[2] === (up ? 1 : 0)).sort((a, b) => a[0] - b[0])[0]; return r ? (up ? r[1] * 100 : 100 - r[1] * 100) : null; };
    rows.push({ kY: k[1], pU: p[1] * 100, kUp: x.kUp, pUp: x.pUp, kNext, pNext }); }
  console.log(`\n=== ${cp / 60}:00 — ${rows.length} rounds with fresh trades on both | avg |gap| ${(rows.reduce((a, r) => a + Math.abs(r.kY - r.pU), 0) / rows.length).toFixed(1)}¢`);
  for (const G of [5, 8, 12]) { const sel = rows.filter(r => Math.abs(r.kY - r.pU) >= G), vK = [], vP = [];
    for (const r of sel) { const pmUpHigher = r.pU > r.kY;
      const a = r.kNext(pmUpHigher ? 1 : 0); if (a != null) { const win = (pmUpHigher ? 1 : 0) === r.kUp; vK.push((win ? 100 - a : -a) - fee(a)); }
      const b = r.pNext(!pmUpHigher); if (b != null) { const win = (!pmUpHigher ? 1 : 0) === r.pUp; vP.push((win ? 100 - b : -b) - fee(b)); } }
    console.log(`  gap ≥ ${String(G).padStart(2)}¢: ${String(sel.length).padStart(3)} | buy on Kalshi what Polymarket favours ${st(vK)} | buy on Polymarket what Kalshi favours ${st(vP)}`); } }
