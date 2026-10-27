// Cross-asset minute data for lead-lag tests.
// (a) Coinbase ETH-USD 1-min candles → lab/data/eth.json  {ms:[t,lo,hi,open,close,vol]}
// (b) Binance USDT-M BTCUSDT 1-min klines (data.binance.vision daily zips) → lab/data/bfut.json {ms: close}
// Usage: node lab/xasset/fetch.mjs   (same span as lab/replay/candles.mjs)
import fs from 'fs';import {execFileSync} from 'child_process';
const from=1789938900000-3660000*2,to=Date.now(),step=300*60000,iso=t=>new Date(t).toISOString();
const E={};for(let t=from;t<to;t+=step){for(let k=0;k<5;k++){try{const r=await fetch(`https://api.exchange.coinbase.com/products/ETH-USD/candles?granularity=60&start=${iso(t)}&end=${iso(Math.min(t+step,to))}`,{headers:{'User-Agent':'riptide-lab'}});
 if(!r.ok)throw new Error(r.status);for(const x of await r.json())E[x[0]*1000]=x;break;}catch(e){await new Promise(s=>setTimeout(s,1500));}}await new Promise(s=>setTimeout(s,130));}
fs.writeFileSync('lab/data/eth.json',JSON.stringify(E));console.log('eth minutes',Object.keys(E).length);
const F={},tmp=fs.mkdtempSync('/tmp/bf');for(let d=from;d<to;d+=864e5){const day=iso(d).slice(0,10),f=`${tmp}/${day}.zip`;
 try{const r=await fetch(`https://data.binance.vision/data/futures/um/daily/klines/BTCUSDT/1m/BTCUSDT-1m-${day}.zip`);if(!r.ok)continue;fs.writeFileSync(f,Buffer.from(await r.arrayBuffer()));
  const csv=execFileSync('unzip',['-p',f]).toString();for(const l of csv.split('\n')){const c=l.split(',');if(!/^\d/.test(c[0]))continue;F[+c[0]]=+c[4];}}catch(e){console.log('skip',day,e.message);}}
fs.writeFileSync('lab/data/bfut.json',JSON.stringify(F));console.log('futures minutes',Object.keys(F).length);
