// Polymarket 5-minute BTC up/down, last DAYS days: result, volume, price history, and taker trades up to 4:40 (v2 data API). Resumable.
// Usage: node dl7.mjs out.json [days=7]
import { execFile } from "node:child_process"; import { writeFileSync, readFileSync, existsSync } from "node:fs";
const OUT = process.argv[2], DAYS = +(process.argv[3] || 7);
const curl = u => new Promise(res => execFile("curl", ["-sS", "--fail", "-m", "30", u], { maxBuffer: 64 << 20 }, (e, o) => res(e ? null : o)));
const get = async u => { for (let a = 0; a < 4; a++) { const o = await curl(u); if (o) try { return JSON.parse(o); } catch (e) {} await new Promise(r => setTimeout(r, 1000 * (a + 1))); } return null; };
const out = existsSync(OUT) ? JSON.parse(readFileSync(OUT)) : {}, end = Math.floor(Date.now() / 1000 / 300) * 300 - 900, start = end - DAYS * 86400;
const todo = []; for (let ts = start; ts <= end; ts += 300) if (!out[ts]) todo.push(ts);
let done = 0;
async function one(ts) {
  const ev = await get(`https://gamma-api.polymarket.com/events?slug=btc-updown-5m-${ts}`), m = ev && ev[0] && ev[0].markets && ev[0].markets[0];
  if (!m) { out[ts] = { none: 1 }; return; }
  const [upTok] = JSON.parse(m.clobTokenIds), r = JSON.parse(m.outcomePrices || "[]"), tr = [];
  let cur = "", pages = 0;
  while (pages++ < 12) { const j = await get(`https://data-api.polymarket.com/v2/trades?condition=${m.conditionId}&limit=500&taker_only=true${cur ? "&cursor=" + cur : ""}`); if (!j || !j.data || !j.data.length) break;
    for (const x of j.data) if (x.timestamp <= ts + 280) tr.push([x.timestamp, x.token_id === upTok ? x.price : 1 - x.price, x.token_id === upTok ? 1 : 0, x.side === "BUY" ? 1 : 0, x.size]);
    if (Math.min(...j.data.map(x => x.timestamp)) <= ts || !j.pagination || !j.pagination.has_more) break; cur = j.pagination.next_cursor; }
  const h = await get(`https://clob.polymarket.com/prices-history?market=${upTok}&startTs=${ts}&endTs=${ts + 300}&fidelity=1`);
  out[ts] = { up: r[0] === "1" ? 1 : r[1] === "1" ? 0 : null, vol: Math.round(m.volumeNum || 0), tr, h: h ? h.history.map(y => [y.t, y.p]) : [], pages };
}
const N = 8; let i = 0;
await Promise.all(Array.from({ length: N }, async () => { while (i < todo.length) { const ts = todo[i++]; await one(ts); if (++done % 100 === 0) { writeFileSync(OUT, JSON.stringify(out)); console.log(done, "/", todo.length); } } }));
writeFileSync(OUT, JSON.stringify(out)); const v = Object.values(out).filter(x => !x.none);
console.log(v.length, "markets; median volume $", v.map(x => x.vol).sort((a, b) => a - b)[v.length >> 1], "; with early trades:", v.filter(x => x.tr && x.tr.length).length);
