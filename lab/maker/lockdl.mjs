// Every Kalshi trade from 4:00 to 5:45 of each round where the favourite was 75–90¢ at the 4:00 check (superset of the live-rule bets).
// Usage: node lab/maker/lockdl.mjs <output.json>
import fs from 'fs';import {et} from '../replay/lib.mjs';
const OUT=process.argv[2],R=JSON.parse(fs.readFileSync('lab/data/rounds.json'));const K='https://api.elections.kalshi.com/trade-api/v2',sleep=ms=>new Promise(r=>setTimeout(r,ms));
const MO=['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'],pad=n=>String(n).padStart(2,'0');
const ticker=t=>{const p=et(t+900000);return `KXBTC15M-${pad(p.y%100)}${MO[p.mo-1]}${pad(p.d)}${pad(p.h)}${pad(p.mi)}-${pad(p.mi)}`;};
const T=fs.existsSync(OUT)?JSON.parse(fs.readFileSync(OUT)):{};
const get=async u=>{for(let a=0;a<6;a++){try{const r=await fetch(u);if(!r.ok)throw new Error(r.status);return await r.json();}catch(e){await sleep(1000*(a+1));}}return null;};
const list=R.filter(o=>{const a=o.at[240];if(!a||a.ya==null||a.na==null)return false;const ask=Math.max(a.ya,a.na);return ask>=75&&ask<=90&&!T[o.t];});
console.log('rounds to fetch',list.length);let n=0,fail=0;
for(const o of list){const tk=ticker(o.t),lo=Math.floor(o.t/1000)+240,hi=lo+105;let cur='',all=[],ok=true;
  for(let p=0;p<30;p++){const d=await get(`${K}/markets/trades?ticker=${tk}&min_ts=${lo}&max_ts=${hi}&limit=1000${cur?'&cursor='+cur:''}`);if(!d){ok=false;break;}
    for(const t of d.trades||[])all.push([Date.parse(t.created_time),+t.yes_price_dollars*100,t.taker_side==='yes'?1:0,+t.count_fp]);
    cur=d.cursor;if(!cur||!(d.trades||[]).length)break;await sleep(120);}
  if(ok)T[o.t]=all;else fail++;if(++n%50===0){fs.writeFileSync(OUT,JSON.stringify(T));console.log(n,fail,new Date().toISOString());}await sleep(120);}
fs.writeFileSync(OUT,JSON.stringify(T));console.log('done',Object.keys(T).length,'fail',fail,'trades',Object.values(T).reduce((a,x)=>a+x.length,0));
