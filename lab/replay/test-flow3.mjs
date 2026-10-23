// Flow-agreement filter on favourite bets: by half, by band, and as a filter on the no-gate-in-band rule
import fs from 'fs';import {R,feeP} from './sim.mjs';import {et} from './lib.mjs';
const F=JSON.parse(fs.readFileSync('lab/flowdata/minutes.json')).m;
const sh=(t,n)=>{let b=0,s=0,ok=0;for(let i=1;i<=n;i++){const r=F[Math.floor(t/1000)-i*60];if(r){b+=r[0];s+=r[1];ok++;}}return ok>=n-1&&b+s>0?b/(b+s)-.5:null;};
const st=a=>{const n=a.length;if(!n)return'n 0';const m=a.reduce((x,y)=>x+y,0)/n,sd=Math.sqrt(a.reduce((x,y)=>x+(y-m)**2,0)/Math.max(1,n-1));return`n ${n} ${m.toFixed(1)}±${(sd/Math.sqrt(n)).toFixed(1)}`;};
for(const[s,W]of[[120,5],[120,3],[120,15],[240,5]]){const rows=[];
 for(const o of R){const a=o.at[s];if(!a)continue;const f=sh(o.t+s*1000,W);if(f==null)continue;const up=(a.ya+100-a.na)>=100,ask=up?a.ya:a.na,won=(o.up===1)===up;rows.push({t:o.t,ask,ag:(f>0)===up,p:(won?100-ask:-ask)-feeP(ask),h:et(o.t).h});}
 const c=Math.floor(rows.length/2);const out=[];
 for(const[nm,X]of[['half1',rows.slice(0,c)],['half2',rows.slice(c)],['band75-90',rows.filter(r=>r.ask>=75&&r.ask<=90)],['band75-90 12-24ET',rows.filter(r=>r.ask>=75&&r.ask<=90&&r.h>=12)],['ask<75',rows.filter(r=>r.ask<75)]])
  out.push(`${nm}: agree ${st(X.filter(r=>r.ag).map(r=>r.p))} | disagree ${st(X.filter(r=>!r.ag).map(r=>r.p))}`);
 console.log(`@${s/60}:00 flow ${W}m\n  `+out.join('\n  '));}
