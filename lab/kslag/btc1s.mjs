// Binance spot BTCUSDT 1-second closes for seconds 2:30–4:15 of every replay round (data.binance.vision daily 1s klines).
// Usage (repo root): node lab/kslag/btc1s.mjs <dir>   → <dir>/sec.json  {epochSecond: close}
import fs from 'fs';import {execFileSync,spawn} from 'node:child_process';import {createInterface} from 'node:readline';
const DIR=process.argv[2],R=JSON.parse(fs.readFileSync('lab/data/rounds.json')),want=new Set();
for(const o of R){const s0=Math.floor(o.t/1000);for(let s=s0+150;s<=s0+255;s++)want.add(s);}
const OUT=DIR+'/sec.json',P=fs.existsSync(OUT)?JSON.parse(fs.readFileSync(OUT)):{};
const days=[...new Set(R.map(o=>new Date(o.t+240000).toISOString().slice(0,10)))].sort();
for(const day of days){const zip=DIR+'/k.zip';
  try{execFileSync('curl',['-sS','--fail','-m','300','-o',zip,`https://data.binance.vision/data/spot/daily/klines/BTCUSDT/1s/BTCUSDT-1s-${day}.zip`]);}catch{console.log(day,'n/a');continue;}
  const p=spawn('unzip',['-p',zip]),rl=createInterface({input:p.stdout});let n=0;
  for await(const line of rl){const f=line.split(',');let ts=+f[0];if(!(ts>0))continue;if(ts>1e14)ts=Math.floor(ts/1000);const s=Math.floor(ts/1000);if(want.has(s)){P[s]=+f[4];n++;}}
  console.log(day,n);}
fs.writeFileSync(OUT,JSON.stringify(P));console.log(Object.keys(P).length,'seconds');
