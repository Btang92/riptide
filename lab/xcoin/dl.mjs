// Download Kalshi 15-min rounds (strike, result, YES ask / NO ask each minute 1:00–14:00, volume) for BTC/ETH/XRP
// plus Coinbase 1-min candles for each coin. Usage: node lab/xcoin/dl.mjs <days>
import fs from 'fs';
const K='https://api.elections.kalshi.com/trade-api/v2',DAYS=+(process.argv[2]||21),D='lab/xcoin/data/';fs.mkdirSync(D,{recursive:true});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function get(u){for(let a=0;a<6;a++){try{const r=await fetch(u,{headers:{'User-Agent':'riptide-lab'}});if(r.status===429){await sleep(2000*(a+1));continue;}if(!r.ok)throw new Error(r.status);return await r.json();}catch(e){await sleep(1500*(a+1));}}return null;}
const to=Math.floor(Date.now()/1000),from=to-DAYS*86400;
const COINS={BTC:{s:'KXBTC15M',cb:'BTC-USD'},ETH:{s:'KXETH15M',cb:'ETH-USD'},XRP:{s:'KXXRP15M',cb:'XRP-USD'}};
const c=v=>v==null?null:Math.round(+v*1000)/10; // dollars → cents (0.1¢)
for(const[coin,{s,cb}]of Object.entries(COINS)){
  let cur='',mk=[];for(let p=0;p<50;p++){const d=await get(`${K}/markets?series_ticker=${s}&status=settled&min_close_ts=${from}&max_close_ts=${to}&limit=1000${cur?'&cursor='+cur:''}`);if(!d)break;
    for(const m of d.markets||[])if(m.result==='yes'||m.result==='no')mk.push({tk:m.ticker,t:Date.parse(m.open_time),strike:+m.floor_strike,up:m.result==='yes'?1:0,exp:m.expiration_value!=null?+m.expiration_value:null});
    cur=d.cursor;if(!cur||!(d.markets||[]).length)break;}
  mk.sort((a,b)=>a.t-b.t);console.log(coin,'markets',mk.length);
  for(let i=0;i<mk.length;i+=12){const g=mk.slice(i,i+12),st=Math.floor(g[0].t/1000),en=Math.floor(g.at(-1).t/1000)+900;
    const d=await get(`${K}/markets/candlesticks?market_tickers=${g.map(x=>x.tk).join(',')}&start_ts=${st}&end_ts=${en}&period_interval=1`);
    if(!d){console.log('candles fail',i);continue;}
    for(const m of d.markets||[]){const r=g.find(x=>x.tk===(m.market_ticker||m.ticker));if(!r)continue;r.at={};
      for(const k of m.candlesticks||[]){const s2=k.end_period_ts-r.t/1000;if(s2<60||s2>840)continue;const ya=c(k.yes_ask?.close_dollars),yb=c(k.yes_bid?.close_dollars);
        r.at[s2]={ya,na:yb==null?null:+(100-yb).toFixed(1),v:+(+k.volume_fp||0).toFixed(0)};}}
    // fallback if batch response lacks tickers: per-market
    for(const r of g)if(!r.at){const dd=await get(`${K}/series/${s}/markets/${r.tk}/candlesticks?start_ts=${r.t/1000}&end_ts=${r.t/1000+900}&period_interval=1`);r.at={};
      for(const k of dd?.candlesticks||[]){const s2=k.end_period_ts-r.t/1000;if(s2<60||s2>840)continue;const ya=c(k.yes_ask?.close_dollars),yb=c(k.yes_bid?.close_dollars);r.at[s2]={ya,na:yb==null?null:+(100-yb).toFixed(1),v:+(+k.volume_fp||0).toFixed(0)};}}
    await sleep(60);}
  fs.writeFileSync(D+coin+'-rounds.json',JSON.stringify(mk));
  // Coinbase candles
  const M={},step=300*60000,f0=(from-7200)*1000;for(let t=f0;t<to*1000;t+=step){const d=await get(`https://api.exchange.coinbase.com/products/${cb}/candles?granularity=60&start=${new Date(t).toISOString()}&end=${new Date(Math.min(t+step,to*1000)).toISOString()}`);for(const x of d||[])M[x[0]*1000]=x;await sleep(60);}
  fs.writeFileSync(D+coin+'-candles.json',JSON.stringify(M));console.log(coin,'rounds with prices',mk.filter(r=>r.at&&Object.keys(r.at).length).length,'candles',Object.keys(M).length);}
