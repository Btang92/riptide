// Nov 12 eve: Kalshi KXBTC15M per-minute volume + open interest (1-min candlesticks, 1:00–14:00) for every settled round.
// Usage: node lab/kvol/dl.mjs <days>  → lab/kvol/data/btc.json  [{tk,t,up,m:{sec:{v,oi,ya,na}}}]
import fs from 'fs';
const K='https://api.elections.kalshi.com/trade-api/v2',DAYS=+(process.argv[2]||55),D='lab/kvol/data/';fs.mkdirSync(D,{recursive:true});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function get(u){for(let a=0;a<6;a++){try{const r=await fetch(u,{headers:{'User-Agent':'riptide-lab'}});if(r.status===429){await sleep(2000*(a+1));continue;}if(!r.ok)throw new Error(r.status);return await r.json();}catch(e){await sleep(1500*(a+1));}}return null;}
const to=Math.floor(Date.now()/1000),from=to-DAYS*86400,s='KXBTC15M',c=v=>v==null?null:Math.round(+v*1000)/10;
let cur='',mk=[];for(let p=0;p<80;p++){const d=await get(`${K}/markets?series_ticker=${s}&status=settled&min_close_ts=${from}&max_close_ts=${to}&limit=1000${cur?'&cursor='+cur:''}`);if(!d)break;
  for(const m of d.markets||[])if(m.result==='yes'||m.result==='no')mk.push({tk:m.ticker,t:Date.parse(m.open_time),up:m.result==='yes'?1:0,vol:+(m.volume_fp??m.volume??0)});
  cur=d.cursor;if(!cur||!(d.markets||[]).length)break;}
mk.sort((a,b)=>a.t-b.t);console.log('markets',mk.length,new Date(mk[0]?.t).toISOString());
let bad=0;for(let i=0;i<mk.length;i+=12){const g=mk.slice(i,i+12),st=Math.floor(g[0].t/1000),en=Math.floor(g.at(-1).t/1000)+900;
  const d=await get(`${K}/markets/candlesticks?market_tickers=${g.map(x=>x.tk).join(',')}&start_ts=${st}&end_ts=${en}&period_interval=1`);
  if(!d){bad++;continue;}
  for(const m of d.markets||[]){const r=g.find(x=>x.tk===(m.market_ticker||m.ticker));if(!r)continue;r.m={};
    for(const k of m.candlesticks||[]){const s2=k.end_period_ts-r.t/1000;if(s2<60||s2>900)continue;const yb=c(k.yes_bid?.close_dollars);
      r.m[s2]={v:Math.round(+k.volume_fp||+k.volume||0),oi:Math.round(+k.open_interest_fp||+k.open_interest||0),ya:c(k.yes_ask?.close_dollars),na:yb==null?null:+(100-yb).toFixed(1)};}}
  if(i%600===0)console.log(i,'/',mk.length);await sleep(80);}
fs.writeFileSync(D+'btc.json',JSON.stringify(mk));console.log('saved',mk.length,'with candles',mk.filter(r=>r.m&&Object.keys(r.m).length).length,'failed batches',bad);
