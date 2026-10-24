// Oct 24 (Brandon): no skips, hold every round to settlement. Which lock time / side gives the best hold-to-end record and ¢/ct?
import {R,feeP} from './sim.mjs';
const st=a=>{const n=a.length,m=a.reduce((x,y)=>x+y.p,0)/n,sd=Math.sqrt(a.reduce((x,y)=>x+(y.p-m)**2,0)/(n-1));return`n ${n} win ${(100*a.filter(x=>x.w).length/n).toFixed(1)}% ask ${(a.reduce((x,y)=>x+y.a,0)/n).toFixed(0)}¢ ${m>=0?'+':''}${m.toFixed(1)}±${(sd/Math.sqrt(n)).toFixed(1)}¢/ct`;};
const bet=(o,s,up)=>{const a=o.at[s];const ask=up?a.ya:a.na;if(ask==null||ask<=0||ask>=100)return null;const w=(o.up===1)===up;return{w,a:ask,p:(w?100-ask:-ask)-feeP(ask)};};
const halves=[R.slice(0,Math.floor(R.length/2)),R.slice(Math.floor(R.length/2))];
const show=(nm,f)=>{const r=halves.map(H=>H.map(f).filter(Boolean));console.log(nm.padEnd(40),'| old half',st(r[0]),'| new half',st(r[1]));};
for(const s of [120,180,240,300,360,480,600]){
  show(`model side, lock at ${s/60}:00`,o=>o.at[s]?bet(o,s,o.at[s].pu>=.5):null);
  show(`Kalshi favourite, lock at ${s/60}:00`,o=>o.at[s]?bet(o,s,o.at[s].ya>=o.at[s].na):null);}
// confident-early: lock at first check 2:00–5:00 where model prob ≥ th, else at 5:00
for(const th of [.7,.8,.9]){show(`model, first check ≥${th*100}% else 5:00`,o=>{for(const s of [120,180,240,300]){const a=o.at[s];if(!a)continue;const p=Math.max(a.pu,1-a.pu);if(p>=th||s===300)return bet(o,s,a.pu>=.5);}return null;});}
// model and favourite agree at 5:00 else favourite
