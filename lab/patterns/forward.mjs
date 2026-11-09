// Forward check on newer rounds (RIPTIDE's own call log, Oct 20 → now): patterns at the call time vs the Kalshi price RIPTIDE saw, and vs RIPTIDE's call.
// Usage: node lab/patterns/forward.mjs <cb1m.json>
import { readFileSync } from "node:fs"; import { createRequire } from "node:module";
const { PAT, namedPattern } = createRequire(import.meta.url)("./detect.js");
const M = JSON.parse(readFileSync(process.argv[2])), CALLS = JSON.parse(readFileSync("lab/data/calls.json")).filter(c => (c.result === "WIN" || c.result === "LOSS") && c.ya && c.na && c.winner);
const K = JSON.parse(readFileSync("lab/data/khist.json")), kh = (Array.isArray(K) ? K : Object.values(K)).filter(r => r.up != null && r.cps);
const fee = p => 0.07 * p * (100 - p) / 100, REV = new Set(["Bullish Harami", "Bearish Harami", "Hammer", "Hanging Man", "Inverted Hammer", "Shooting Star", "Piercing Line", "Dark Cloud Cover", "Tweezer Bottom", "Tweezer Top", "Dragonfly Doji", "Gravestone Doji", "Morning Star", "Evening Star"]);
function pat(T) { const end = Math.floor(T / 60) * 60, B = []; for (let b = end - 720; b < end; b += 60) { const x = M[b]; if (!x) return null; B.push(x); }
  const O = B.map(x => x[3]), H = B.map(x => x[2]), L = B.map(x => x[1]), C = B.map(x => x[4]); for (let k = 0; k < 3; k++) { const n = namedPattern(O, H, L, C, B.length - 1 - k); if (n && n !== "Doji") return n; } return null; }
const st = v => { if (!v.length) return "—"; const m = v.reduce((a, b) => a + b, 0) / v.length, s = Math.sqrt(v.reduce((a, x) => a + (x - m) ** 2, 0) / v.length / v.length); return `${v.length} bets, ${(m >= 0 ? "+" : "") + m.toFixed(1)}¢ ±${s.toFixed(1)}`; };
const bet = (up, ya, na, won) => { const a = up ? ya : na; return a >= 99 || a <= 1 ? null : (won ? 100 - a : -a) - fee(a); };
// rule A: fade reversal patterns; rule B: follow engulfing
const run = rows => { const A = [], B = []; for (const r of rows) { const n = pat(r.T); if (!n || !PAT[n]) continue; const d = PAT[n] > 0;
    if (REV.has(n)) { const v = bet(!d, r.ya, r.na, r.up === !d); if (v != null) A.push(v); } if (/Engulfing/.test(n)) { const v = bet(d, r.ya, r.na, r.up === d); if (v != null) B.push(v); } } return [A, B]; };
const old = kh.flatMap(r => [120, 240].map(at => r.cps[at] && { T: r.start / 1000 + at, ya: r.cps[at].ya, na: r.cps[at].na, up: r.up === 1 }).filter(Boolean));
const nu = CALLS.map(c => ({ T: c.ts / 1000, ya: c.ya, na: c.na, up: c.winner === "UP", c }));
for (const [name, rows] of [["Sep 20–Oct 20 (where the leads came from)", old], ["Oct 20–Nov 7 (new rounds, never looked at)", nu]]) { const [A, B] = run(rows); console.log(name, "\n   fade reversal patterns:", st(A), "\n   follow engulfing:      ", st(B)); }
const g = { agree: [], disagree: [], none: [] }; for (const r of nu) { const n = pat(r.T), d = n && PAT[n]; const k = !d ? "none" : (d > 0) === (r.c.call === "UP") ? "agree" : "disagree"; g[k].push(r.c.result === "WIN" ? 1 : 0); }
console.log("\nRIPTIDE's call right when the newest pattern agrees / disagrees / no pattern:"); for (const k in g) console.log("  ", k.padEnd(9), (g[k].reduce((a, b) => a + b, 0) / g[k].length * 100).toFixed(1) + "%", `(${g[k].length} calls)`);
// RIPTIDE's call at its own price, split by pattern agreement
const h = { agree: [], disagree: [], none: [] }; for (const r of nu) { const n = pat(r.T), d = n && PAT[n], up = r.c.call === "UP"; const k = !d ? "none" : (d > 0) === up ? "agree" : "disagree"; const v = bet(up, r.ya, r.na, r.c.result === "WIN"); if (v != null) h[k].push([v, (up ? r.ya : r.na)]); }
console.log("\nRIPTIDE's call bought at its price:"); for (const k in h) console.log("  ", k.padEnd(9), st(h[k].map(x => x[0])), "avg price", (h[k].reduce((a, x) => a + x[1], 0) / h[k].length).toFixed(1) + "¢");
const cut = Date.parse("2026-10-30T23:45:00Z");
for (const [nm, f] of [["Oct 20–30 (2:00-ish calls)", r => r.c.start < cut], ["Oct 30–Nov 7 (4:00 calls)", r => r.c.start >= cut]]) { const q = { agree: [], disagree: [] };
  for (const r of nu.filter(f)) { const n = pat(r.T), d = n && PAT[n], up = r.c.call === "UP"; if (!d) continue; const v = bet(up, r.ya, r.na, r.c.result === "WIN"); if (v != null) q[(d > 0) === up ? "agree" : "disagree"].push(v); }
  console.log(nm, "| agree", st(q.agree), "| disagree", st(q.disagree)); }
