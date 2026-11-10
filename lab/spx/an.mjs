// How beatable is a Kalshi 15-minute market from its own prices? Favourite accuracy, spread, volume, simple rules after fees.
// Usage: node lab/spx/an.mjs data.json
import { readFileSync } from "node:fs";
const o = Object.values(JSON.parse(readFileSync(process.argv[2]))).filter(x => x.c && x.yes != null), fee = p => 0.07 * p * (100 - p) / 100;
const st = v => { if (!v.length) return "no bets"; const m = v.reduce((a, b) => a + b, 0) / v.length, s = Math.sqrt(v.reduce((a, x) => a + (x - m) ** 2, 0) / v.length / v.length); return `${(m >= 0 ? "+" : "") + m.toFixed(1)}¢ ±${s.toFixed(1)} (${v.length})`; };
const vols = o.map(x => x.vol).sort((a, b) => a - b), ts = o.map(x => x.open);
console.log(`${o.length} rounds ${new Date(Math.min(...ts) * 1000).toISOString().slice(0, 10)} → ${new Date(Math.max(...ts) * 1000).toISOString().slice(0, 10)}, median volume ${Math.round(vols[vols.length >> 1])} contracts, up ${(o.filter(x => x.yes).length / o.length * 100).toFixed(0)}%`);
for (const at of [120, 240, 600]) { const sp = [], all = [], b85 = [], b75 = [], cheap = []; let fav = 0, n = 0;
  for (const x of o) { const k = x.c.filter(c => c[0] <= x.open + at && c[1] > 0 && c[2] > 0).pop(); if (!k) continue; const bid = k[1] * 100, ask = k[2] * 100, up = (bid + ask) / 2 >= 50; sp.push(ask - bid); n++; if ((up ? 1 : 0) === x.yes) fav++;
    const a = up ? ask : 100 - bid, w = (up ? 1 : 0) === x.yes, v = (w ? 100 - a : -a) - fee(a); if (a >= 99) continue; all.push(v); if (a >= 85 && a <= 96) b85.push(v); if (a >= 75 && a < 90) b75.push(v);
    const a2 = up ? 100 - bid : ask; if (a2 <= 25 && a2 >= 3) cheap.push((!w ? 100 - a2 : -a2) - fee(a2)); }
  sp.sort((a, b) => a - b); console.log(` at ${at / 60}:00 favourite right ${(fav / n * 100).toFixed(1)}%, median spread ${sp[sp.length >> 1].toFixed(0)}¢ | buy favourite ${st(all)} | 75–90¢ ${st(b75)} | 85–96¢ ${st(b85)} | underdog ≤25¢ ${st(cheap)}`); }
