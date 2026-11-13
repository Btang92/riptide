// Kalshi trades 3:00–4:05 of every replay round (Nov 13 eve, 3:15/3:30/3:45 entry test). Usage from repo root: node lab/kslag/ktrades330.mjs out.json
// (fetch was split in two runs: 4:00 favourite 70–92¢, then the rest) (parallel workers). rows [ms, yes¢, takerYes, count]
import fs from 'fs';import {et} from '../replay/lib.mjs';
const OUT=process.argv[2],R=JSON.parse(fs.readFileSync('lab/data/rounds.json'));const K='https://api.elections.kalshi.com/trade-api/v2',sleep=ms=>new Promise(r=>setTimeout(r,ms));
const MO=['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'],pad=n=>String(n).padStart(2,'0');
const ticker=t=>{const p=et(t+900000);return `KXBTC15M-${pad(p.y%100)}${MO[p.mo-1]}${pad(p.d)}${pad(p.h)}${pad(p.mi)}-${pad(p.mi)}`;};
const T=fs.existsSync(OUT)?JSON.parse(fs.readFileSync(OUT)):{};
const get=async u=>{for(let a=0;a<6;a++){try{const r=await fetch(u);if(r.status===429){await sleep(2000*(a+1));continue;}if(!r.ok)throw new Error(r.status);return await r.json();}catch(e){await sleep(1000*(a+1));}}return null;};
const list=R.filter(o=>{const a=o.at[240];if(!a||a.ya==null||a.na==null)return false;const ask=Math.max(a.ya,a.na);return !T[o.t];}).reverse().slice(0,+process.env.LIM||1e9);
console.log('rounds to fetch',list.length);let n=0,fail=0,i=0;
async function one(o){const tk=ticker(o.t),lo=Math.floor(o.t/1000)+180,hi=Math.floor(o.t/1000)+245;let cur='',all=[];
  for(let p=0;p<30;p++){const d=await get(`${K}/markets/trades?ticker=${tk}&min_ts=${lo}&max_ts=${hi}&limit=1000${cur?'&cursor='+cur:''}`);if(!d)return null;
    for(const t of d.trades||[])all.push([Date.parse(t.created_time),Math.round(+t.yes_price_dollars*1000)/10,t.taker_side==='yes'?1:0,+t.count_fp]);
    cur=d.cursor;if(!cur||!(d.trades||[]).length)break;}
  return all;}
async function w(){while(i<list.length){const o=list[i++];const r=await one(o);if(r)T[o.t]=r;else fail++;if(++n%200===0){fs.writeFileSync(OUT,JSON.stringify(T));console.log(n,fail,new Date().toISOString());}await sleep(60);}}
await Promise.all([w(),w(),w(),w()]);
fs.writeFileSync(OUT,JSON.stringify(T));console.log('done',Object.keys(T).length,'fail',fail,'trades',Object.values(T).reduce((a,x)=>a+x.length,0));
