// Evening Oct 23: buy/sell pressure (lab/flowdata/minutes.json) on top of Kalshi price at 2:00 and 4:00; sharper forms: flow-price divergence, surge.
import fs from 'fs';import {R,feeP} from './sim.mjs';import {fitLR,brainP} from './lib.mjs';
const F=JSON.parse(fs.readFileSync('lab/flowdata/minutes.json')).m;
const win=(t,n)=>{let b=0,s=0,c=0,ok=0;for(let i=1;i<=n;i++){const r=F[Math.floor(t/1000)-i*60];if(r){b+=r[0];s+=r[1];c+=r[2];ok++;}}return ok>=n-1&&b+s>0?{sh:b/(b+s)-.5,v:b+s,c}:null;};
const lg=p=>{p=Math.min(.99,Math.max(.01,p));return Math.log(p/(1-p));};
for(const s of [120,240]){const rows=[];
 for(const o of R){const a=o.at[s];if(!a||!a.f)continue;const T=o.t+s*1000;const w3=win(T,3),w5=win(T,5),w15=win(T,15),w60=win(T,60);if(!w3||!w5||!w15||!w60)continue;
  const pm=(a.ya+100-a.na)/200;const surge=w5.v/(w60.v/12)-1;
  rows.push({o,a,y:o.up,pm,x0:[lg(pm)],x1:[lg(pm),w3.sh,w5.sh,w15.sh,w5.sh*Math.sign(a.f[1]),w5.sh*Math.min(3,surge),a.f[1]-w5.sh*4]});}
 const n=rows.length,c=Math.floor(n/2),tr=rows.slice(0,c),te=rows.slice(c);
 if(n<60){console.log(s,'too few',n);continue;}
 const sc=(m,k)=>{let l=0;for(const r of te){const p=brainP(m,r[k]);l-=r.y?Math.log(p):Math.log(1-p);}return l/te.length;};
 const m0=fitLR(tr.map(r=>r.x0),tr.map(r=>r.y)),m1=fitLR(tr.map(r=>r.x1),tr.map(r=>r.y));
 let raw=0;for(const r of te){const p=Math.min(.99,Math.max(.01,r.pm));raw-=r.y?Math.log(p):Math.log(1-p);}
 console.log(`@${s/60}:00 rounds ${n} (${new Date(rows[0].o.t).toISOString().slice(0,16)}→${new Date(rows.at(-1).o.t).toISOString().slice(0,16)}) test ${te.length}: LL price ${(raw/te.length).toFixed(4)} price-LR ${sc(m0,'x0').toFixed(4)} price+flow ${sc(m1,'x1').toFixed(4)}`);
 console.log('  weights(std) price+flow',m1.w.map(v=>v.toFixed(2)).join(' '));
 // betting: favourite side if flow agrees vs disagrees, all rounds (no fit)
 for(const nm of ['agree','disagree']){const b=rows.filter(r=>{const up=r.pm>=.5,fl=win(r.o.t+s*1000,5).sh;return nm==='agree'?(fl>0)===up:(fl>0)!==up;}).map(r=>{const up=r.pm>=.5,ask=up?r.a.ya:r.a.na,won=(r.y===1)===up;return (won?100-ask:-ask)-feeP(ask);});
  const m=b.reduce((x,y)=>x+y,0)/b.length,sd=Math.sqrt(b.reduce((x,y)=>x+(y-m)**2,0)/(b.length-1));console.log(`  favourite when 5-min flow ${nm}: n ${b.length} ${m.toFixed(1)}±${(sd/Math.sqrt(b.length)).toFixed(1)} ¢/ct`);}
}
