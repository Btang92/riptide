// Loss autopsy: what separates losing calls from winning ones. Usage: node lab/autopsy.mjs lab/data
import { readFileSync } from "node:fs";
const D = p => JSON.parse(readFileSync(process.argv[2] + "/" + p));
const calls = D("calls.json").filter(x => x.result && x.f), cps = D("checkpoints.json");
const W = calls.filter(c => c.result === "WIN").length, N = calls.length, base = W / N;
const hr = ms => +new Date(ms).toLocaleString("en-US", { timeZone: "America/New_York", hour: "numeric", hour12: false }) % 24;
const fee = p => 0.07 * p * (100 - p) / 100;
const pnl = c => c.ask == null ? null : (c.result === "WIN" ? 100 - c.ask : -c.ask) - fee(c.ask);
console.log(`ALL: ${N} calls, ${W}-${N - W} (${(base * 100).toFixed(1)}%)\n`);
function table(title, keyFn, order) {
  const g = new Map(); for (const c of calls) { const k = keyFn(c); if (k == null) continue; const x = g.get(k) || { n: 0, w: 0, p: 0, pn: 0 }; x.n++; if (c.result === "WIN") x.w++; const v = pnl(c); if (v != null) { x.p += v; x.pn++; } g.set(k, x); }
  console.log(title); const keys = [...g.keys()].sort(order || ((a, b) => (a > b ? 1 : -1)));
  for (const k of keys) { const x = g.get(k), wr = x.w / x.n, se = Math.sqrt(base * (1 - base) / x.n), z = (wr - base) / se;
    console.log(`  ${String(k).padEnd(26)} n=${String(x.n).padStart(3)}  win ${(wr * 100).toFixed(0).padStart(3)}%  ${x.pn ? ((x.p / x.pn >= 0 ? "+" : "") + (x.p / x.pn).toFixed(1) + "¢/ct").padStart(9) : "".padStart(9)}  ${Math.abs(z) >= 2 ? (z > 0 ? "◀ better" : "◀ WORSE") : ""}`); }
  console.log("");
}
const bucket = (v, edges, lab) => { for (let i = 0; i < edges.length; i++) if (v < edges[i]) return lab[i]; return lab[edges.length]; };
table("Confidence at call", c => bucket(c.prob * 100, [60, 70, 80, 90], ["50–60%", "60–70%", "70–80%", "80–90%", "90%+"]));
table("Price paid for the called side", c => c.ask == null ? null : bucket(c.ask, [40, 55, 65, 75, 85], ["<40¢", "40–55¢", "55–65¢", "65–75¢", "75–85¢", "85¢+"]));
table("RIPTIDE vs Kalshi favourite", c => { const a = c.call === "UP" ? c.ya : c.na; return a == null ? null : a >= 50 ? "with the market favourite" : "against the market (underdog)"; });
table("Edge (RIPTIDE % − price)", c => c.ask == null ? null : bucket(c.prob * 100 - c.ask, [-10, -3, 3, 10], ["< −10 (overpriced)", "−10 to −3", "−3 to +3", "+3 to +10", "> +10 (value)"]));
table("Hour (ET)", c => { const h = hr(c.ts); return bucket(h, [4, 8, 12, 16, 20], ["00–04", "04–08", "08–12", "12–16", "16–20", "20–24"]); });
table("Distance from strike at call", c => bucket(Math.abs(c.f[0]), [0.5, 1, 2], ["very close", "close", "moderate", "far"]));
table("Last 5 min momentum vs call", c => { const m = c.f[1]; if (Math.abs(m) < 0.3) return "flat"; return (m > 0) === (c.call === "UP") ? "with the call" : "against the call"; });
table("30-min range (volatility)", c => bucket(c.f[4], [-0.5, 0.5], ["quiet", "normal", "wild"]));
table("Volatility rising?", c => c.f[3] > 0.3 ? "rising" : c.f[3] < -0.3 ? "falling" : "steady");
table("Market regime", c => c.regime || null);
table("Learning flipped the raw call", c => c.flipped ? "flipped" : "not flipped");
// flips: did the lean change after the call? use server checkpoints for that window
const byW = new Map(); for (const p of cps) { if (!byW.has(p.start)) byW.set(p.start, []); byW.get(p.start).push(p); }
const flip = c => { const l = (byW.get(c.start) || []).filter(p => p.at > c.ts).sort((a, b) => a.s - b.s); if (!l.length) return null; const side = c.call === "UP";
  const away = l.find(p => ((p.pm ?? p.pb ?? p.pu) >= .5) !== side); return away ? `turned against by ${Math.floor(away.s / 60)}:00` : "held through 10:00 checks"; };
table("After the call (checkpoint reads)", flip);
// late-flip losses: losses where every checkpoint after the call still agreed
const late = calls.filter(c => c.result === "LOSS" && flip(c) === "held through 10:00 checks").length, lossN = N - W;
console.log(`Losses that still looked right at every check up to 10:00 (flipped in the last 5 minutes): ${late} of ${lossN} losses with checkpoint data: ${calls.filter(c=>c.result==="LOSS"&&flip(c)).length}`);

// Missed chances: rounds RIPTIDE skipped where a later check (up to 8:00) showed value on the side that went on to win.
const fee2 = p => 0.07 * p * (100 - p) / 100;
const skipped = calls.filter(c => c.skip || c.traded === false);
let missed = 0, traps = 0, rows = [], mp = 0;
for (const c of skipped) {
  const l = (byW.get(c.start) || []).filter(p => p.s >= 180 && p.s <= 480).sort((a, b) => a.s - b.s);
  for (const p of l) { const q = p.pm ?? p.pb ?? p.pu, side = q >= .5 ? "UP" : "DOWN", prob = Math.max(q, 1 - q), ask = side === "UP" ? p.ya : p.na;
    if (ask == null || prob * 100 < ask + fee2(ask) + 3) continue;
    mp += (side === c.winner ? 100 - ask : -ask) - fee2(ask);
    if (side === c.winner) { missed++; rows.push(`${new Date(c.start).toLocaleString("en-US", { timeZone: "America/New_York", hour: "numeric", minute: "2-digit" })} · ${side} at ${p.s / 60}:00 for ${ask}¢ (read ${(prob * 100).toFixed(0)}%)`); } else traps++;
    break; }
}
console.log(`\nMissed chances (skipped at the call, value appeared by 8:00): ${missed} would have won, ${traps} would have lost, ${(mp / Math.max(1, missed + traps) >= 0 ? "+" : "") + (mp / Math.max(1, missed + traps)).toFixed(1)}¢/contract after fees.`);
for (const r of rows.slice(-8)) console.log("  " + r);
