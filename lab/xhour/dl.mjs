// :45 BTC 15-min rounds vs Kalshi's hourly BTC ladder (KXBTCD) that settles on the SAME 60-s BRTI average at the top of the hour.
// Downloads KXBTC15M rounds (strike, result, YES/NO ask each minute 1:00–14:00) and, for :45 rounds, the KXBTCD strikes within
// ±$1,000 of the 15-min strike with their 1-min YES bid/ask. Usage: node lab/xhour/dl.mjs <days>  → lab/xhour/data/rounds.json
import fs from 'fs';
const K='https://api.elections.kalshi.com/trade-api/v2',DAYS=+(process.argv[2]||34),D='lab/xhour/data/';fs.mkdirSync(D,{recursive:true});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function get(u){for(let a=0;a<7;a++){try{const r=await fetch(u,{headers:{'User-Agent':'riptide-lab'}});if(r.status===429){await sleep(2000*(a+1));continue;}if(!r.ok)throw new Error(r.status);return await r.json();}catch(e){await sleep(1500*(a+1));}}return null;}
const to=Math.floor(Date.now()/1000),from=to-DAYS*86400;
const c=v=>v==null?null:Math.round(+v*1000)/10;
async function list(series){let cur='',out=[];for(let p=0;p<200;p++){const d=await get(`${K}/markets?series_ticker=${series}&status=settled&min_close_ts=${from}&max_close_ts=${to}&limit=1000${cur?'&cursor='+cur:''}`);if(!d)break;out.push(...(d.markets||[]));cur=d.cursor;if(!cur||!(d.markets||[]).length)break;await sleep(100);}return out;}
async function candles(tks,st,en){const d=await get(`${K}/markets/candlesticks?market_tickers=${tks.join(',')}&start_ts=${st}&end_ts=${en}&period_interval=1`);const o={};
  for(const m of d?.markets||[]){const at={};for(const k of m.candlesticks||[]){const ya=c(k.yes_ask?.close_dollars),yb=c(k.yes_bid?.close_dollars);at[k.end_period_ts]={ya,yb,v:+(+k.volume_fp||0).toFixed(0)};}o[m.market_ticker||m.ticker]=at;}return o;}
const m15=(await list('KXBTC15M')).filter(m=>m.result==='yes'||m.result==='no').map(m=>({tk:m.ticker,t:Date.parse(m.open_time),close:Date.parse(m.close_time),strike:+m.floor_strike,up:m.result==='yes'?1:0}));
m15.sort((a,b)=>a.t-b.t);console.log('15m rounds',m15.length);
const hr=await list('KXBTCD');const byClose={};for(const m of hr){if(m.result!=='yes'&&m.result!=='no')continue;const k=Date.parse(m.close_time);(byClose[k]=byClose[k]||[]).push({tk:m.ticker,K:+m.floor_strike,up:m.result==='yes'?1:0});}
console.log('hourly markets',hr.length,'events',Object.keys(byClose).length);
let n=0;
for(let i=0;i<m15.length;i+=12){const g=m15.slice(i,i+12),st=Math.floor(g[0].t/1000),en=Math.floor(g.at(-1).t/1000)+900;
  const cc=await candles(g.map(x=>x.tk),st,en);
  for(const r of g){r.at={};for(const[ts,v]of Object.entries(cc[r.tk]||{})){const s2=+ts-r.t/1000;if(s2<60||s2>840)continue;r.at[s2]={ya:v.ya,na:v.yb==null?null:+(100-v.yb).toFixed(1),v:v.v};}}
  await sleep(60);}
for(const r of m15){if(new Date(r.t).getUTCMinutes()!==45)continue;const L=byClose[r.close];if(!L)continue;
  const near=L.filter(x=>Math.abs(x.K-r.strike)<=1000).sort((a,b)=>a.K-b.K);if(!near.length)continue;
  const cc=await candles(near.map(x=>x.tk),r.t/1000,r.t/1000+900);r.hr=near.map(x=>{const at={};for(const[ts,v]of Object.entries(cc[x.tk]||{})){const s2=+ts-r.t/1000;if(s2<60||s2>840)continue;at[s2]=v;}return{K:x.K,up:x.up,at};});
  if(++n%100===0)console.log('hourly done',n);await sleep(60);}
fs.writeFileSync(D+'rounds.json',JSON.stringify(m15));console.log('saved',m15.length,':45 with ladder',n);
