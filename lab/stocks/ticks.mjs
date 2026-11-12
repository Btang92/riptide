// Resolve the entry minute with real trades (tick data) for the Stocks-in-Play ORB (study A), so tight stops are judged correctly.
// Usage: ALPACA_KEY=.. ALPACA_SECRET=.. node ticks.mjs <datadir>   (writes <datadir>/ticksA.json; resumable)
import { readFileSync, readdirSync, writeFileSync, existsSync } from "node:fs"; import { execFile } from "node:child_process";
const DIR = process.argv[2], daily = JSON.parse(readFileSync(DIR + "/daily.json")), files = readdirSync(DIR + "/min").filter(f => f.endsWith(".json"));
const OUTF = DIR + "/ticksA.json", OUT = existsSync(OUTF) ? JSON.parse(readFileSync(OUTF)) : {};
const off = d => { const t = new Date(d + "T12:00:00Z"), y = t.getUTCFullYear(), a = new Date(Date.UTC(y, 2, 8 + (7 - new Date(Date.UTC(y, 2, 8)).getUTCDay()) % 7)), b = new Date(Date.UTC(y, 10, 1 + (7 - new Date(Date.UTC(y, 10, 1)).getUTCDay()) % 7)); return t >= a && t < b ? 4 : 5; };
const H = ["-H", "APCA-API-KEY-ID: " + process.env.ALPACA_KEY, "-H", "APCA-API-SECRET-KEY: " + process.env.ALPACA_SECRET];
const curl = u => new Promise(res => execFile("curl", ["-sS", "-m", "60", ...H, u], { maxBuffer: 1 << 28 }, (e, o) => { try { res(e ? null : JSON.parse(o)); } catch (x) { res(null); } }));
const cand = {};
for (const f of files) { const [s, d] = f.replace(".json", "").split("_"), o = off(d) * 3600, raw = JSON.parse(readFileSync(DIR + "/min/" + f));
  const b = raw.map(x => [((x[0] - o) % 86400) / 60, x[1], x[2], x[3], x[4], x[5], x[0]]).filter(x => x[0] >= 570 && x[0] < 960); if (b.length < 300 || b[0][0] > 571) continue;
  const db = daily[s], k = db.findIndex(x => x[0] === d); if (k < 15) continue; const adv = db.slice(k - 14, k).reduce((a, x) => a + x[5], 0) / 14; let tr = 0; for (let j = k - 14; j < k; j++) tr += Math.max(db[j][2], db[j - 1][4]) - Math.min(db[j][3], db[j - 1][4]);
  const f5 = b.filter(x => x[0] < 575), v5 = f5.reduce((a, x) => a + x[5], 0); (cand[d] ??= []).push({ s, d, b, atr: tr / 14, adv, o5: f5[0][1], c5: f5[f5.length - 1][4], h5: Math.max(...f5.map(x => x[2])), l5: Math.min(...f5.map(x => x[3])), rv: v5 / (adv * 0.03) }); }
const jobs = [];
for (const list of Object.values(cand)) for (const x of list.filter(x => x.o5 > 5 && x.adv >= 1e6 && x.atr > 0.5 && x.rv >= 1).sort((a, b) => b.rv - a.rv).slice(0, 20)) { if (x.c5 === x.o5) continue;
  const dir = x.c5 > x.o5 ? 1 : -1, lvl = dir > 0 ? x.h5 : x.l5, i = x.b.findIndex(y => y[0] >= 575 && (dir > 0 ? y[2] >= lvl : y[3] <= lvl)); if (i < 0) continue; jobs.push({ key: x.s + "_" + x.d, s: x.s, t: x.b[i][6], dir, lvl, atr: x.atr }); }
console.log(jobs.length, "entries to resolve");
let n = 0; const todo = jobs.filter(j => !OUT[j.key]);
async function one(j) { let tk = [], tok = ""; for (let p = 0; p < 6; p++) { const u = `https://data.alpaca.markets/v2/stocks/trades?symbols=${j.s}&start=${new Date(j.t * 1000).toISOString()}&end=${new Date((j.t + 60) * 1000).toISOString()}&feed=sip&limit=10000${tok ? "&page_token=" + tok : ""}`;
    let r = null; for (let a = 0; a < 4 && !r; a++) { r = await curl(u); if (!r || r.message) { r = null; await new Promise(z => setTimeout(z, 2000 * (a + 1))); } } if (!r) return; tk.push(...((r.trades || {})[j.s] || []).map(x => x.p)); tok = r.next_page_token; if (!tok) break; }
  const fi = tk.findIndex(p => j.dir > 0 ? p >= j.lvl : p <= j.lvl); if (fi < 0) { OUT[j.key] = { none: 1 }; return; }
  const fill = tk[fi], stop10 = fill - j.dir * 0.1 * j.atr, stop25 = fill - j.dir * 0.25 * j.atr, rest = tk.slice(fi + 1);
  OUT[j.key] = { fill, hit10: rest.some(p => j.dir > 0 ? p <= stop10 : p >= stop10) ? 1 : 0, hit25: rest.some(p => j.dir > 0 ? p <= stop25 : p >= stop25) ? 1 : 0, n: tk.length }; }
const N = 4; let idx = 0; await Promise.all(Array.from({ length: N }, async () => { while (idx < todo.length) { const j = todo[idx++]; await one(j); if (++n % 200 === 0) { writeFileSync(OUTF, JSON.stringify(OUT)); console.log(n, "/", todo.length); } } }));
writeFileSync(OUTF, JSON.stringify(OUT)); console.log("done", Object.keys(OUT).length);
