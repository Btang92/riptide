// Last-minute test: settlement-average math (BTC per second + the 60-second BRTI average) vs Kalshi's trades.
import { readFileSync } from "node:fs";
const R = JSON.parse(readFileSync("rounds.json")).sort((a, b) => a.close - b.close), P = JSON.parse(readFileSync("sec.json")), T = JSON.parse(readFileSync("kt.json"));
const px = s => { for (let k = 0; k < 10; k++) if (P[s - k] != null) return P[s - k]; return null; };
const erf = x => { const t = 1 / (1 + 0.3275911 * Math.abs(x)), y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x); return x >= 0 ? y : -y; };
const Phi = z => 0.5 * (1 + erf(z / Math.SQRT2)), fee = p => 0.07 * p * (100 - p) / 100;
const res = {}; for (const tau of [45, 30, 20, 10, 5]) res[tau] = { n: 0, llM: 0, llK: 0, bets: 0, w: 0, pnl: 0, sq: 0, edges: [] };
let used = 0;
for (let i = 1; i < R.length; i++) {
  const r = R[i], pr = R[i - 1], tr = T[r.t]; if (!tr || !tr.length || pr.close !== r.close - 900000) continue;
  const C = r.close / 1000, pc = pr.close / 1000;
  // USDT->BRTI offset from the previous round's settlement (known 15 minutes earlier, no peeking)
  let ps = 0, pn = 0; for (let s = pc - 60; s < pc; s++) { const v = px(s); if (v) { ps += v; pn++; } } if (pn < 50) continue;
  const off = pr.exp - ps / pn;
  // volatility per second from 150..60 s before close
  const rets = []; for (let s = C - 149; s <= C - 60; s++) { const a = px(s - 1), b = px(s); if (a && b) rets.push(Math.log(b / a)); } if (rets.length < 60) continue;
  const sig = Math.sqrt(rets.reduce((a, x) => a + x * x, 0) / rets.length);
  tr.sort((a, b) => a[0] - b[0]); used++;
  for (const tau of [45, 30, 20, 10, 5]) {
    const now = C - tau; let known = 0, kn = 0; for (let s = C - 60; s < now; s++) { const v = px(s); if (v) { known += v + off; kn++; } }
    const S = px(now); if (!S || kn < 60 - tau - 5) continue;
    const mean = (known + (60 - kn) * (S + off)) / 60, sd = (S * sig) * Math.sqrt(Math.pow(60 - kn, 3) / 3) / 60;
    const pM = Math.min(0.999, Math.max(0.001, Phi((mean - r.strike) / Math.max(sd, 0.01))));
    const lastK = tr.filter(t => t[0] <= now * 1000).at(-1); if (!lastK) continue;
    const pK = Math.min(0.99, Math.max(0.01, lastK[1] / 100)), x = res[tau]; x.n++;
    x.llM += -(r.up ? Math.log(pM) : Math.log(1 - pM)); x.llK += -(r.up ? Math.log(pK) : Math.log(1 - pK));
    // executable: first taker trade within the next 3 s on the side the math favours
    const nx = tr.filter(t => t[0] > now * 1000 && t[0] <= (now + 3) * 1000);
    const buyY = nx.find(t => t[2] === 1), buyN = nx.find(t => t[2] === 0);
    const tryBet = (side, ask) => { const p = side ? pM : 1 - pM; if (ask == null || ask >= 99.5) return; const e = p * 100 - ask - fee(ask); x.edges.push(e); if (e < 2) return;
      const win = side === (r.up === 1), v = (win ? 100 - ask : -ask) - fee(ask); x.bets++; if (win) x.w++; x.pnl += v; x.sq += v * v; };
    tryBet(true, buyY ? buyY[1] : null); tryBet(false, buyN ? 100 - buyN[1] : null);
  }
}
console.log("rounds used:", used);
console.log("sec left | rounds | math log-loss vs Kalshi last trade (lower = better) | bets with 2¢+ edge after fee | win% | ¢/contract ± noise");
for (const tau of [45, 30, 20, 10, 5]) { const x = res[tau], m = x.pnl / Math.max(1, x.bets), sd = Math.sqrt(Math.max(0, x.sq / Math.max(1, x.bets) - m * m)) / Math.sqrt(Math.max(1, x.bets));
  console.log(`  ${String(tau).padStart(3)}s   | ${String(x.n).padStart(4)} | math ${(x.llM / x.n).toFixed(3)} vs Kalshi ${(x.llK / x.n).toFixed(3)} | ${String(x.bets).padStart(4)} | ${x.bets ? (x.w / x.bets * 100).toFixed(1) : "—"}% | ${x.bets ? (m >= 0 ? "+" : "") + m.toFixed(2) + " ± " + sd.toFixed(2) : "—"}`); }
