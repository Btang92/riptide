// Do RIPTIDE's named candle patterns predict 15-min rounds beyond Kalshi's price?
// Usage: node lab/patterns/study.mjs <cb1m.json>   (run from repo root after lab/pull.mjs)
import { readFileSync } from "node:fs"; import { createRequire } from "node:module";
const { PAT, namedPattern } = createRequire(import.meta.url)("./detect.js");
const M = JSON.parse(readFileSync(process.argv[2])), K = JSON.parse(readFileSync("lab/data/khist.json")), CALLS = JSON.parse(readFileSync("lab/data/calls.json"));
const kh = (Array.isArray(K) ? K : Object.values(K)).filter(r => r.up != null && r.cps);
const callBy = new Map(CALLS.filter(c => c.result === "WIN" || c.result === "LOSS").map(c => [c.start, c]));
const fee = p => 0.07 * p * (100 - p) / 100;
function bars(T, g) { const out = []; // closed bars of g minutes ending at/before T (seconds)
  const end = Math.floor(T / (60 * g)) * 60 * g; for (let b = end - 12 * 60 * g; b < end; b += 60 * g) { let o, h = -1e9, l = 1e9, c, ok = true;
    for (let m = 0; m < g; m++) { const x = M[b + m * 60]; if (!x) { ok = false; break; } if (m === 0) o = x[3]; h = Math.max(h, x[2]); l = Math.min(l, x[1]); c = x[4]; } if (!ok) return null; out.push([o, h, l, c]); } return out; }
function pat(T, g) { const B = bars(T, g); if (!B) return null; const O = B.map(x => x[0]), H = B.map(x => x[1]), L = B.map(x => x[2]), C = B.map(x => x[3]);
  for (let back = 0; back < (g === 1 ? 3 : 1); back++) { const n = namedPattern(O, H, L, C, B.length - 1 - back); if (n && n !== "Doji") return n; } return null; }
const se = v => { const m = v.reduce((a, b) => a + b, 0) / v.length; return [m, Math.sqrt(v.reduce((a, x) => a + (x - m) ** 2, 0) / v.length / v.length)]; };
for (const g of [1, 5]) for (const at of [120, 240]) {
  const by = {}, all = { n: 0, hit: 0, exp: 0, pl: [] }, ag = { n: 0, w: 0 }, dis = { n: 0, w: 0 }, nop = { n: 0, w: 0 };
  for (const r of kh) { const cp = r.cps[at]; if (!cp || !cp.ya || !cp.na) continue; const T = r.start / 1000 + at, n = pat(T, g), c = callBy.get(r.start);
    if (c && Math.abs((c.ts - c.start) / 1000 - 240) < 30 && at === 240) { const w = c.result === "WIN"; if (!n || !PAT[n]) { nop.n++; nop.w += w; } else if ((PAT[n] > 0) === (c.call === "UP")) { ag.n++; ag.w += w; } else { dis.n++; dis.w += w; } }
    if (!n || !PAT[n]) continue; const d = PAT[n], ask = d > 0 ? cp.ya : cp.na; if (ask >= 99 || ask <= 1) continue;
    const win = (d > 0) === (r.up === 1), pl = (win ? 100 - ask : -ask) - fee(ask);
    const x = by[n] ??= { n: 0, hit: 0, exp: 0, pl: [] }; for (const y of [x, all]) { y.n++; y.hit += win; y.exp += ask / 100; y.pl.push(pl); } }
  console.log(`\n=== ${g}-minute candles, pattern seen by ${at / 60}:00 into the round (${kh.length} Kalshi rounds) ===`);
  console.log("pattern".padEnd(22), "seen", " went its way", " Kalshi price implied", " P/L buying that side");
  for (const [n, x] of [...Object.entries(by).sort((a, b) => b[1].n - a[1].n), ["ALL PATTERNS", all]]) { const [m, s] = se(x.pl); console.log(n.padEnd(22), String(x.n).padStart(4), (x.hit / x.n * 100).toFixed(1).padStart(10) + "%", (x.exp / x.n * 100).toFixed(1).padStart(14) + "%", ((m >= 0 ? "+" : "") + m.toFixed(1)).padStart(12) + "¢ ±" + s.toFixed(1)); }
  if (at === 240) console.log(`RIPTIDE 4:00 call right: pattern agrees ${(ag.w / ag.n * 100).toFixed(1)}% (${ag.n}) | pattern disagrees ${(dis.w / dis.n * 100).toFixed(1)}% (${dis.n}) | no pattern ${(nop.w / nop.n * 100).toFixed(1)}% (${nop.n})`); }
