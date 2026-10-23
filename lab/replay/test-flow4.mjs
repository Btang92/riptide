// Buy the flow side (underdog) when 5-min flow disagrees with a 50–75¢ favourite at 2:00, by half
import fs from 'fs';import {R,feeP} from './sim.mjs';
const F=JSON.parse(fs.readFileSync('lab/flowdata/minutes.json')).m;
const sh=(t,n)=>{let b=0,s=0,ok=0;for(let i=1;i<=n;i++){const r=F[Math.floor(t/1000)-i*60];if(r){b+=r[0];s+=r[1];ok++;}}return ok>=n-1&&b+s>0?b/(b+s)-.5:null;};
for(const s of [120,240]){const rows=[];for(const o of R){const a=o.at[s];if(!a)continue;const f=sh(o.t+s*1000,5);if(f==null)continue;const up=(a.ya+100-a.na)>=100,fa=up?a.ya:a.na;if(fa>75)continue;
 if((f>0)===up)continue;const dogUp=!up,ask=dogUp?a.ya:a.na,won=(o.up===1)===dogUp;rows.push((won?100-ask:-ask)-feeP(ask));}
 const c=Math.floor(rows.length/2);for(const[nm,X]of[['half1',rows.slice(0,c)],['half2',rows.slice(c)],['all',rows]]){const n=X.length,m=X.reduce((x,y)=>x+y,0)/n,sd=Math.sqrt(X.reduce((x,y)=>x+(y-m)**2,0)/(n-1));console.log(`@${s/60}:00 ${nm} n ${n} ${m.toFixed(1)}±${(sd/Math.sqrt(n)).toFixed(1)}`);}}
