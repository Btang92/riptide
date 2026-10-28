// Rebuild RIPTIDE's raw read (distance to strike, time left, last-hour volatility) for every past Kalshi round,
// then check rounds where it disagrees with Kalshi's favourite.
import { readFileSync } from "node:fs";
const kh = JSON.parse(readFileSync("/home/claude/gh-riptide/lab/data/khist.json")).filter(r => r.cps && r.up != null), M = JSON.parse(readFileSync("cb1m.json"));
const erf = x => { const t = 1 / (1 + 0.3275911 * Math.abs(x)), y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x); return x >= 0 ? y : -y; };
const pUp = (spot, strike, secs, sig) => 0.5 * (1 + erf(Math.log(spot / strike) / (sig * Math.sqrt(secs)) / Math.SQRT2)), fee = p => 0.07 * p * (100 - p) / 100;
const rows = [];
for (const r of kh) { for (const cp of [120, 300]) { const c = r.cps[cp]; if (!c || c.ya == null || c.na == null) continue; const s0 = r.start / 1000, now = s0 + cp;
  const cl = []; for (let m = 61; m >= 1; m--) { const x = M[now - m * 60]; if (x) cl.push(x[4]); } if (cl.length < 45) continue;
  let v = 0; for (let i = 1; i < cl.length; i++) v += Math.log(cl[i] / cl[i - 1]) ** 2; const sig = Math.sqrt(v / (cl.length - 1) / 60);
  const p = pUp(cl.at(-1), r.strike, 900 - cp, sig); rows.push({ t: r.start, cp, p, ya: c.ya, na: c.na, up: r.up }); } }
const st = (name, a) => { if (!a.length) return console.log(name, "none"); const v = a.map(x => (x.win ? 100 - x.px : -x.px) - fee(x.px)), m = v.reduce((s, y) => s + y, 0) / v.length, sd = Math.sqrt(v.reduce((s, y) => s + (y - m) ** 2, 0) / v.length) / Math.sqrt(v.length);
  console.log(`  ${name.padEnd(46)} n=${String(a.length).padStart(4)}  won ${(a.filter(x => x.win).length / a.length * 100).toFixed(1)}%  avg price ${(a.reduce((s, x) => s + x.px, 0) / a.length).toFixed(1)}¢  ${(m >= 0 ? "+" : "") + m.toFixed(1)}¢/ct ±${sd.toFixed(1)}`); };
for (const cp of [120, 300]) { const R = rows.filter(x => x.cp === cp); console.log(`\n=== read at ${cp / 60}:00, ${R.length} rounds (Sep 20 – Oct 20) ===`);
  const pick = (x, edge) => { const side = x.p >= .5, px = side ? x.ya : x.na, prob = side ? x.p : 1 - x.p; return { side, px, prob, win: side === (x.up === 1), e: prob * 100 - px }; };
  st("RIPTIDE side, every round", R.map(x => pick(x)));
  st("RIPTIDE side priced under 50¢ (disagrees)", R.map(x => pick(x)).filter(y => y.px < 50));
  st("  …and RIPTIDE 55%+ on it", R.map(x => pick(x)).filter(y => y.px < 50 && y.prob >= .55));
  st("  …and edge ≥ 5 pts after fee", R.map(x => pick(x)).filter(y => y.px < 50 && y.e - fee(y.px) >= 5));
  st("RIPTIDE side 50–54¢", R.map(x => pick(x)).filter(y => y.px >= 50 && y.px < 55));
  const half = R.filter(x => x.t < Date.UTC(2026, 9, 5)), half2 = R.filter(x => x.t >= Date.UTC(2026, 9, 5));
  st("disagrees — first half (to Oct 5)", half.map(x => pick(x)).filter(y => y.px < 50));
  st("disagrees — second half (Oct 5 on)", half2.map(x => pick(x)).filter(y => y.px < 50)); }
