// Does Binance futures order flow before a checkpoint predict the round beyond the Kalshi price? Usage: node lab/bigflowtest.mjs
import { readFileSync, readdirSync } from "node:fs";
const D = new URL("./flowdata/binance/", import.meta.url), F = {};
for (const f of readdirSync(D)) Object.assign(F, JSON.parse(readFileSync(new URL(f, D))));
const kh = JSON.parse(readFileSync(new URL("./data/khist.json", import.meta.url))), calls = JSON.parse(readFileSync(new URL("./data/calls.json", import.meta.url))).filter(c => c.winner), cps = JSON.parse(readFileSync(new URL("./data/checkpoints.json", import.meta.url)));
const R = new Map(); for (const r of kh) if (r.cps && r.up != null) R.set(r.start, { up: r.up === 1, cps: r.cps });
const win = new Map(calls.map(c => [c.start, c.winner === "UP"]));
for (const p of cps) { if (!win.has(p.start)) continue; if (R.has(p.start) && !R.get(p.start).live) continue; const r = R.get(p.start) || { up: win.get(p.start), cps: {}, live: true }; r.cps[p.s] = { ya: p.ya, na: p.na }; R.set(p.start, r); }
const fee = p => 0.07 * p * (100 - p) / 100;
const flow = (t, mins) => { let b = 0, s = 0, bb = 0, bs = 0, ok = 0; for (let m = 1; m <= mins; m++) { const r = F[t - m * 60]; if (r) { ok++; b += r[0]; s += r[1]; bb += r[2]; bs += r[3]; } } return ok ? { imb: (b - s) / (b + s), big: (bb - bs) / Math.max(1, bb + bs), bigUSD: bb + bs } : null; };
for (const cp of [120, 300, 600]) {
  console.log(`\n=== at ${cp / 60}:00 into the round ===`);
  for (const [name, mins, key, thr] of [["all flow, last 3 min", 3, "imb", 0.05], ["all flow, last 10 min", 10, "imb", 0.05], ["big orders ($100K+), last 3 min", 3, "big", 0.3], ["big orders ($100K+), last 10 min", 10, "big", 0.3]]) {
    let n = 0, right = 0, dis = 0, disR = 0, pn = 0, pnN = 0;
    for (const [start, r] of R) { const c = r.cps[cp]; if (!c || c.ya == null || c.na == null) continue; const f = flow(start / 1000 + cp, mins); if (!f || Math.abs(f[key]) < thr) continue;
      const fUp = f[key] > 0, favUp = c.ya >= 50; n++; if (fUp === r.up) right++;
      if (fUp !== favUp) { dis++; if (fUp === r.up) disR++; const a = fUp ? c.ya : c.na; pn += (fUp === r.up ? 100 - a : -a) - fee(a); pnN++; } }
    console.log(`  ${name.padEnd(34)} strong-signal rounds ${String(n).padStart(4)} | flow side won ${(right / n * 100).toFixed(1)}% | when flow DISAGREED with Kalshi's favourite: ${dis} rounds, flow won ${(disR / dis * 100).toFixed(1)}%, betting the flow side ${(pn / pnN >= 0 ? "+" : "") + (pn / pnN).toFixed(1)}¢/ct`);
  }
  let n = 0, w = 0; for (const [start, r] of R) { const c = r.cps[cp]; if (!c || c.ya == null || !flow(start / 1000 + cp, 3)) continue; n++; if ((c.ya >= 50) === r.up) w++; }
  console.log(`  baseline: Kalshi favourite won ${(w / n * 100).toFixed(1)}% of ${n} rounds`);
}
