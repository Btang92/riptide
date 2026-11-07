// Binance USDT-M futures BTCUSDT "metrics" (5-min open interest, top-trader and all-account long/short ratios, taker buy/sell volume ratio)
// from data.binance.vision daily zips -> lab/oi/metrics.json {ms: [oi, oiValue, topAcctLS, topPosLS, acctLS, takerLS]}. Usage: node lab/oi/fetch.mjs [fromISO] [toISO]
import fs from 'fs';import {execSync} from 'child_process';import os from 'os';import path from 'path';
const from=new Date(process.argv[2]||'2026-09-18'),to=new Date(process.argv[3]||new Date(Date.now()-86400000).toISOString().slice(0,10));
const F='lab/oi/metrics.json';const M=fs.existsSync(F)?JSON.parse(fs.readFileSync(F)):{};const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'oi-'));
for(let d=new Date(from);d<=to;d=new Date(+d+86400000)){const day=d.toISOString().slice(0,10);
  const url=`https://data.binance.vision/data/futures/um/daily/metrics/BTCUSDT/BTCUSDT-metrics-${day}.zip`;let ok=false;
  for(let tr=0;tr<4&&!ok;tr++){try{const r=await fetch(url);if(r.status===404){console.log('missing',day);break;}if(!r.ok)throw new Error(r.status);
    const zf=path.join(tmp,day+'.zip');fs.writeFileSync(zf,Buffer.from(await r.arrayBuffer()));const csv=execSync(`unzip -p ${zf}`).toString();
    for(const line of csv.split('\n').slice(1)){const p=line.split(',');if(p.length<8)continue;const ms=Date.parse(p[0].replace(' ','T')+'Z');M[ms]=p.slice(2,8).map(Number);}ok=true;}
    catch(e){await new Promise(s=>setTimeout(s,1500));}}}
fs.writeFileSync(F,JSON.stringify(M));console.log('rows',Object.keys(M).length);
