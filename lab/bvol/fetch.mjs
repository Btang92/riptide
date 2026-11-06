// Binance BTC options volatility index (BTCBVOLUSDT, 30-day implied vol, per second) from data.binance.vision.
// Usage: node lab/bvol/fetch.mjs 2026-09-18 2026-11-05  -> lab/bvol/minutes.json {t(min ms): last value}
import { execSync } from 'node:child_process';
import fs from 'node:fs';
const [a, b] = process.argv.slice(2);
const out = 'lab/bvol/minutes.json';
const have = fs.existsSync(out) ? JSON.parse(fs.readFileSync(out)) : {};
const tmp = 'lab/bvol/raw'; fs.mkdirSync(tmp, { recursive: true });
for (let d = new Date(a + 'T00:00:00Z'); d <= new Date(b + 'T00:00:00Z'); d = new Date(+d + 864e5)) {
  const ds = d.toISOString().slice(0, 10);
  if (have['day:' + ds]) continue;
  const f = `BTCBVOLUSDT-BVOLIndex-${ds}`;
  try {
    execSync(`curl -sS -f -m 60 -o ${tmp}/${f}.zip https://data.binance.vision/data/option/daily/BVOLIndex/BTCBVOLUSDT/${f}.zip && unzip -o -q ${tmp}/${f}.zip -d ${tmp}`);
  } catch (e) { console.log('miss', ds); continue; }
  const lines = fs.readFileSync(`${tmp}/${f}.csv`, 'utf8').split('\n');
  let n = 0;
  for (const L of lines) { const p = L.split(','); const t = +p[0]; if (!t) continue; const m = Math.floor(t / 6e4) * 6e4; have[m] = +p[4]; n++; }
  have['day:' + ds] = n;
  fs.unlinkSync(`${tmp}/${f}.zip`); fs.unlinkSync(`${tmp}/${f}.csv`);
  console.log(ds, n);
}
fs.writeFileSync(out, JSON.stringify(have));
