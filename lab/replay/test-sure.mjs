// Oct 24 (Brandon): output a call only when sure. First check from 2:00 to a cutoff where the read >= th; else no call. Held to settlement.
import {R,feeP} from './sim.mjs';
const S=[120,180,240,300,360,420,480,600];
const halves=[R.slice(0,Math.floor(R.length/2)),R.slice(Math.floor(R.length/2))];
const run=(H,th,cut)=>{const b=[];for(const o of H){for(const s of S){if(s>cut)break;const a=o.at[s];if(!a)continue;const p=Math.max(a.pu,1-a.pu);if(p<th)continue;
  const up=a.pu>=.5,ask=up?a.ya:a.na;if(ask==null||ask<=0||ask>=100)break;const w=(o.up===1)===up;b.push({w,a:ask,s,p:(w?100-ask:-ask)-feeP(ask)});break;}}return b;};
const st=(b,N)=>{const n=b.length,m=b.reduce((x,y)=>x+y.p,0)/n,sd=Math.sqrt(b.reduce((x,y)=>x+(y.p-m)**2,0)/(n-1));return`${n} calls (${(100*n/N).toFixed(0)}% of rounds, ~${(n/N*96).toFixed(0)}/day) win ${(100*b.filter(x=>x.w).length/n).toFixed(1)}% price ${(b.reduce((x,y)=>x+y.a,0)/n).toFixed(0)}¢ ${m>=0?'+':''}${m.toFixed(1)}±${(sd/Math.sqrt(n)).toFixed(1)}¢/ct`;};
for(const th of [.75,.8,.85,.9])for(const cut of [300,480,600]){
 console.log(`sure ≥${th*100}% by ${cut/60}:00`.padEnd(20),'| old',st(run(halves[0],th,cut),halves[0].length),'| new',st(run(halves[1],th,cut),halves[1].length));}
