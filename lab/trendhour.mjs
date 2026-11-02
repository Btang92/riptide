// End-of-hour × trend study at the 4:00 read. Needs lab/data (pull.mjs) and cb1m.json (Coinbase 1-min candles by unix start) in the working directory.
import { readFileSync } from "node:fs";
const L = "/home/claude/gh-riptide/lab/data/", M = JSON.parse(readFileSync("cb1m.json"));
const kh = JSON.parse(readFileSync(L + "khist.json")).filter(r => r.cps && r.up != null), calls = JSON.parse(readFileSync(L + "calls.json")).filter(c => c.winner), cps = JSON.parse(readFileSync(L + "checkpoints.json"));
const fee = p => 0.07 * p * (100 - p) / 100, px = s => { for (let k = 0; k < 3; k++) { const x = M[s - k * 60]; if (x) return x[4]; } return null; };
const R = new Map();
for (const r of kh) R.set(r.start, { start: r.start, up: r.up === 1, c: { 240: r.cps[240], 600: r.cps[600] } });
const win = new Map(calls.map(c => [c.start, c.winner === "UP"]));
for (const p of cps) { if (!win.has(p.start) || ![240, 600].includes(p.s)) continue; const r = R.get(p.start) || { start: p.start, up: win.get(p.start), c: {}, live: true }; if (!r.live && R.has(p.start)) continue;
  r.c[p.s] = { ya: p.ya, na: p.na }; if (p.s === 240) { const q = p.pm ?? p.pb ?? p.pu; r.rip = q >= .5; } R.set(p.start, r); }
const rows = [];
for (const r of R.values()) { const c4 = r.c[240]; if (!c4 || c4.ya == null || c4.na == null) continue; const t = Math.floor(r.start / 1000) + 240 - 60;   // last closed candle before 4:00
  const now = px(t), ago = px(t - 3600); if (!now || !ago) continue; let v = 0, n = 0; for (let s = t - 3600 + 60; s <= t; s += 60) { const a = px(s - 60), b = px(s); if (a && b) { v += Math.log(b / a) ** 2; n++; } } if (n < 40) continue;
  const z = Math.log(now / ago) / Math.sqrt(v / n * 60), trend = z > 1 ? "UP" : z < -1 ? "DOWN" : "FLAT";
  const favUp = c4.ya >= 50, ask = favUp ? c4.ya : c4.na, c10 = r.c[600], fav10 = c10 && c10.ya != null ? c10.ya >= 50 : null;
  rows.push({ q: new Date(r.start).getUTCMinutes(), trend, z, up: r.up, favUp, ask, favRight: favUp === r.up, late: fav10 == null ? null : fav10 !== r.up, rip: r.rip, live: !!r.live }); }
const pct = (a, f) => a.length ? (a.filter(f).length / a.length * 100).toFixed(1) + "%" : "—";
const cpc = a => { if (!a.length) return "—"; const v = a.map(x => (x.favRight ? 100 - x.ask : -x.ask) - fee(x.ask)), m = v.reduce((s, y) => s + y, 0) / v.length, se = Math.sqrt(v.reduce((s, y) => s + (y - m) ** 2, 0) / v.length) / Math.sqrt(v.length); return `${(m >= 0 ? "+" : "") + m.toFixed(1)}±${se.toFixed(1)}`; };
const line = (name, a) => console.log(`${name.padEnd(34)} n=${String(a.length).padStart(4)} | favourite right ${pct(a, x => x.favRight).padStart(6)} | buy favourite ${cpc(a).padStart(9)}¢ | late flip ${pct(a.filter(x => x.late != null), x => x.late).padStart(6)} | RIPTIDE right ${pct(a.filter(x => x.rip != null), x => x.rip === x.up).padStart(6)} (n=${a.filter(x => x.rip != null).length})`);
console.log(`${rows.length} rounds (Sep 20 – Nov 1), read at 4:00. Trend = BTC's last-60-min move vs its normal 60-min swing (UP/DOWN = more than 1 normal swing).\n`);
line("ALL", rows);
console.log("\n— by trend —"); for (const t of ["UP", "DOWN", "FLAT"]) line(`trend ${t}`, rows.filter(x => x.trend === t));
console.log("\n— end of hour vs the rest —"); for (const q of [0, 15, 30, 45]) line(`round :${String(q).padStart(2, "0")}${q === 45 ? " (end of hour)" : ""}`, rows.filter(x => x.q === q));
console.log("\n— end of hour × trend —"); for (const t of ["UP", "DOWN", "FLAT"]) { line(`:45 round, trend ${t}`, rows.filter(x => x.q === 45 && x.trend === t)); line(`other rounds, trend ${t}`, rows.filter(x => x.q !== 45 && x.trend === t)); }
console.log("\n— favourite WITH vs AGAINST the trend —");
for (const t of ["UP", "DOWN"]) { line(`trend ${t}: favourite with trend`, rows.filter(x => x.trend === t && x.favUp === (t === "UP"))); line(`trend ${t}: favourite against trend`, rows.filter(x => x.trend === t && x.favUp !== (t === "UP"))); }
console.log("\n— strong trends (more than 2 normal swings) —"); for (const [n, f] of [["strong UP", x => x.z > 2], ["strong DOWN", x => x.z < -2]]) { line(n + ", favourite with trend", rows.filter(x => f(x) && x.favUp === (x.z > 0))); line(n + ", favourite against trend", rows.filter(x => f(x) && x.favUp !== (x.z > 0))); }
console.log("\n— does the round continue the trend? (BTC finished in the trend's direction) —");
for (const t of ["UP", "DOWN"]) { const a = rows.filter(x => x.trend === t); console.log(`  trend ${t}: round finished ${t} ${pct(a, x => x.up === (t === "UP"))}  (n=${a.length})`); }
