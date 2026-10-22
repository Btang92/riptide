import fs from 'fs';
const from=1789938900000-3660000*2, to=Date.now(); const step=300*60000; const M={};
const iso=t=>new Date(t).toISOString();
let k=0;
for(let t=from;t<to;t+=step){
  for(let tr=0;tr<5;tr++){try{
    const r=await fetch(`https://api.exchange.coinbase.com/products/BTC-USD/candles?granularity=60&start=${iso(t)}&end=${iso(Math.min(t+step,to))}`,{headers:{'User-Agent':'riptide-lab'}});
    if(!r.ok)throw new Error(r.status);const d=await r.json();for(const x of d)M[x[0]*1000]=x;break;}catch(e){await new Promise(s=>setTimeout(s,1500));if(tr==4)console.log('fail',iso(t),e.message);}}
  k++;await new Promise(s=>setTimeout(s,130));
}
fs.writeFileSync('lab/data/candles.json',JSON.stringify(M));console.log(k,Object.keys(M).length);
