// Binance SPOT BTCUSDT 1-min klines (data.binance.vision daily zips) → lab/data/bspot.json {ms: close}
// Used for the Coinbase premium test (Coinbase BTC-USD vs Binance BTCUSDT spot). Usage: node lab/xasset/fetchspot.mjs
import fs from 'fs';import {execFileSync} from 'child_process';
const from=1789938900000-3660000*2,to=Date.now(),iso=t=>new Date(t).toISOString();
const F={},tmp=fs.mkdtempSync('/tmp/bs');for(let d=from;d<to;d+=864e5){const day=iso(d).slice(0,10),f=`${tmp}/${day}.zip`;
 try{const r=await fetch(`https://data.binance.vision/data/spot/daily/klines/BTCUSDT/1m/BTCUSDT-1m-${day}.zip`);if(!r.ok){console.log('miss',day,r.status);continue;}fs.writeFileSync(f,Buffer.from(await r.arrayBuffer()));
  const csv=execFileSync('unzip',['-p',f]).toString();for(const l of csv.split('\n')){const c=l.split(',');if(!/^\d/.test(c[0]))continue;let t=+c[0];if(t>1e14)t=Math.floor(t/1000);F[t]=+c[4];}}catch(e){console.log('skip',day,e.message);}}
fs.writeFileSync('lab/data/bspot.json',JSON.stringify(F));console.log('spot minutes',Object.keys(F).length);
