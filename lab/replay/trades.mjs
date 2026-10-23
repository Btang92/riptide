// Coinbase public trades → per-round order-flow buckets (10-s) from 3:00 before the round to 5:00 in.
// node lab/replay/trades.mjs   → lab/data/flow.json  {start: [[tSecFromStart, takerBuyVol, takerSellVol, bigBuy, bigSell, count], ...]}
// Note: in Coinbase's trades feed `side` is the MAKER side, so side=sell means the taker bought.
import fs from 'fs';
const R=JSON.parse(fs.readFileSync('lab/data/rounds.json'));
const OUT='lab/data/flow.json';const flow=fs.existsSync(OUT)?JSON.parse(fs.readFileSync(OUT)):{};
const anchors=[[1089999999,Date.parse('2026-09-07T23:13:16Z')],[1099999999,Date.parse('2026-09-29T13:56:10Z')],[1109736010,Date.parse('2026-10-23T10:40:48Z')]];
const addA=(id,t)=>{anchors.push([id,t]);anchors.sort((a,b)=>a[0]-b[0]);};
function guess(t){let lo=anchors[0],hi=anchors.at(-1);for(const a of anchors){if(a[1]<=t&&a[1]>=lo[1])lo=a;if(a[1]>=t&&a[1]<=hi[1])hi=a;}
  if(hi[1]===lo[1])return lo[0];return Math.round(lo[0]+(t-lo[1])*(hi[0]-lo[0])/(hi[1]-lo[1]));}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function page(after){for(let k=0;k<8;k++){try{const r=await fetch(`https://api.exchange.coinbase.com/products/BTC-USD/trades?limit=1000&after=${after}`,{headers:{'User-Agent':'riptide-lab'}});
  if(r.status===429){await sleep(1000*(k+1));continue;}if(!r.ok)throw new Error(r.status);const d=await r.json();return d.map(x=>({id:x.trade_id,t:Date.parse(x.time),sz:+x.size,tb:x.side==='sell'}));}catch(e){await sleep(800*(k+1));}}throw new Error('page fail '+after);}
async function one(o){const T1=o.t+300000,T0=o.t-180000;let g=guess(T1)+300,p,tries=0;
  for(;;){p=await page(g);if(!p.length)throw new Error('empty');addA(p[0].id,p[0].t);addA(p.at(-1).id,p.at(-1).t);
    if(p[0].t<T1&&tries<15){g=guess(T1)+300;tries++;if(g<=p[0].id+1)g=p[0].id+800;continue;}   // page starts before T1 → move later
    if(p.at(-1).t>T1&&tries<15){g=guess(T1)+300;tries++;continue;}                              // page entirely after T1 → move earlier
    break;}
  const B={};let done=false,n=0;
  while(!done){for(const x of p){if(x.t>=T1)continue;if(x.t<T0){done=true;break;}const b=Math.floor((x.t-o.t)/10000)*10;const r=B[b]??=[b,0,0,0,0,0];
      if(x.tb){r[1]+=x.sz;if(x.sz>=1)r[3]+=x.sz;}else{r[2]+=x.sz;if(x.sz>=1)r[4]+=x.sz;}r[5]++;}
    if(done)break;p=await page(p.at(-1).id);if(!p.length)break;if(++n>12)break;}
  return Object.values(B).sort((a,b)=>a[0]-b[0]).map(r=>r.map((v,i)=>i===0||i===5?v:+v.toFixed(4)));}
const todo=R.filter(o=>!flow[o.t]||flow[o.t].length<20).reverse().slice(0,+process.env.LIM||1e9);console.log('todo',todo.length);let i=0,done=0,fail=0;
async function worker(){while(i<todo.length){const o=todo[i++];try{flow[o.t]=await one(o);done++;}catch(e){fail++;}
  if(done%200===0){fs.writeFileSync(OUT,JSON.stringify(flow));console.log(new Date().toISOString().slice(11,19),'done',done,'fail',fail);}await sleep(150);}}
await Promise.all([worker(),worker(),worker(),worker()]);
fs.writeFileSync(OUT,JSON.stringify(flow));console.log('finished',done,'fail',fail);
