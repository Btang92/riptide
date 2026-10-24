// Oct 24 run: do market structure (swing HH/HL/LH/LL, break of structure, strike vs swing) or slower-timeframe
// indicators (RSI/MACD/EMA etc. on 5- and 15-minute bars, RSI 70/30 reversal flag) add information beyond
// (a) the Kalshi price and (b) RIPTIDE's own inputs? Walk-forward, 2 folds; log-loss + ¢/contract after fees.
// node lab/replay/test-struct-tf.mjs
import fs from 'fs';import {R,brain,run,stat,paired,LIVE,feeP} from './sim.mjs';import {et,featsI,fitLR,brainP,sigm} from './lib.mjs';import {structureFeatures} from '../structure.mjs';
const M=JSON.parse(fs.readFileSync('lab/data/candles.json'));
const bars=(end,n,w)=>{const o=[];for(let b=n-1;b>=0;b--){let op=null,h=-1e18,l=1e18,c=null;for(let j=w-1;j>=0;j--){const x=M[end-(b*w+j)*60000];if(!x)continue;if(op==null)op=x[3];h=Math.max(h,x[2]);l=Math.min(l,x[1]);c=x[4];}if(c!=null)o.push({o:op,h,l,c});}return o;};
const S=[120,240];let miss=0;
for(const o of R)for(const s of S){const a=o.at[s];if(!a||!a.f)continue;const end=o.t+s*1000-60000,spot=M[end]?.[4];if(!spot){miss++;continue;}
  const sg=a.f&&1;const b1=bars(end,60,1),b5=bars(end,48,5),b15=bars(end,60,15);
  const st=(bb,k)=>{if(bb.length<20)return null;const f=structureFeatures(bb,o.strike,k);const rng=Math.max(1,(f.lastHigh??spot)-(f.lastLow??spot));
    return[f.trend,f.bos,f.strikeVsSwing,f.lastHigh?Math.max(-3,Math.min(3,(spot-f.lastHigh)/rng)):0,f.lastLow?Math.max(-3,Math.min(3,(spot-f.lastLow)/rng)):0];};
  a.s1=st(b1,3);a.s5=st(b5,2);
  a.i5=b5.length>=45?featsI(b5.map(x=>x.c)):null;a.i15=b15.length>=45?featsI(b15.map(x=>x.c)):null;
  const rs=(v)=>v==null?null:[v[0]>0.4?-1:v[0]<-0.4?1:0]; // RSI >70 → lean DOWN (reversal), <30 → lean UP
  a.r1=rs(a.fi);a.r5=rs(a.i5);a.r15=rs(a.i15);}
console.log('rounds',R.length,'miss',miss);
const lg=p=>{p=Math.min(.995,Math.max(.005,p));return Math.log(p/(1-p));};
const mkt=a=>(a.ya+(100-a.na))/200;
const ll=(P,y)=>P.reduce((s,p,i)=>s-(y[i]?Math.log(p):Math.log(1-p)),0)/P.length;
const ADD={none:a=>[],struct1:a=>a.s1,struct5:a=>a.s5,ind5:a=>a.i5,ind15:a=>a.i15,rsiFlags:a=>a.r1&&a.r5&&a.r15?[...a.r1,...a.r5,...a.r15]:null};
// bets for a probability fn: side with prob, bet if prob ≥ ask+fee+margin and ask in [lo,hi]
function bets(te,s,P,lo,hi,mg,hours){const b=[];for(const o of te){const a=o.at[s];if(!a||!a.f)continue;if(hours&&(et(o.t).h<12))continue;const p=P(a);if(p==null)continue;
  const up=p>=.5,pr=up?p:1-p,ask=up?a.ya:a.na;if(!(ask>=lo&&ask<=hi&&ask>0&&ask<100))continue;if(pr*100<ask+feeP(ask)+mg)continue;
  const won=(o.up===1)===up;b.push({t:o.t,pnl:(won?100-ask:-ask)-feeP(ask),won,ask});}return b;}
const out={};
for(const f0 of[.5,.75]){const c=Math.floor(R.length*f0),tr=R.slice(0,c),te=R.slice(c,Math.floor(R.length*(f0+.25)));
 console.log(`\n=== fold train<${f0}: train ${tr.length} test ${te.length} (${new Date(te[0].t).toISOString().slice(0,10)}→${new Date(te.at(-1).t).toISOString().slice(0,10)})`);
 for(const s of S){console.log(` -- checkpoint ${s/60}:00`);
  const ok=o=>{const a=o.at[s];return a&&a.f&&a.ya>0&&a.na>0&&Object.values(ADD).every(g=>g(a));};
  const TR=tr.filter(ok),TE=te.filter(ok),y=TE.map(o=>o.up);
  for(const[name,g]of Object.entries(ADD)){
   // (a) on top of the Kalshi price (+ RIPTIDE raw read)
   const Xa=a=>[lg(mkt(a)),a.f[0],...g(a)];const ma=fitLR(TR.map(o=>Xa(o.at[s])),TR.map(o=>o.up));const Pa=a=>brainP(ma,Xa(a));
   // (b) on top of RIPTIDE's own 9 inputs (no price)
   const Xb=a=>[...a.f,...g(a)];const mb=fitLR(TR.map(o=>Xb(o.at[s])),TR.map(o=>o.up));const Pb=a=>brainP(mb,Xb(a));
   const llA=ll(TE.map(o=>Pa(o.at[s])),y),llB=ll(TE.map(o=>Pb(o.at[s])),y);
   const ba=stat(bets(TE,s,Pa,1,99,2,false)),bb=stat(bets(TE,s,Pb,75,90,3,true)),bb2=stat(bets(TE,s,Pb,1,99,3,false));
   (out[`${f0}/${s}`]??={})[name]={llA,llB,ba,bb,bb2};
   console.log(`  ${name.padEnd(9)} price+:ll ${llA.toFixed(4)} bets ${JSON.stringify(ba)} | riptide+: ll ${llB.toFixed(4)} liveband ${JSON.stringify(bb)} anyprice ${JSON.stringify(bb2)}`);}
  console.log(`  (n test ${TE.length}; Kalshi price alone ll ${ll(TE.map(o=>Math.min(.995,Math.max(.005,mkt(o.at[s])))),y).toFixed(4)})`);}}
// paired live-rule test: live brain vs live brain with each family added to RIPTIDE's inputs (refit LR on 9+extra)
console.log('\n=== live rule (75–90¢, 12–24 ET, checks 2:00–5:00) with family added to the inputs, paired vs live');
for(const f0 of[.5,.75]){const c=Math.floor(R.length*f0),tr=R.slice(0,c),te=R.slice(c,Math.floor(R.length*(f0+.25)));const B=brain(tr),live=run(te,B,LIVE);
 console.log(` fold ${f0}: live ${JSON.stringify(stat(live))} brain=${B.kind}`);
 for(const[name,g]of Object.entries(ADD)){if(name==='none')continue;const t2=tr.filter(o=>o.at[120]?.f&&g(o.at[120]));const m=fitLR(t2.map(o=>[...o.at[120].f,...g(o.at[120])]),t2.map(o=>o.up));
  const B2={margin:3,p:a=>{const x=g(a);return x&&a.f?brainP(m,[...a.f,...x]):a.pu;}};const b=run(te,B2,{...LIVE,times:[120,240]});const lv=run(te,B,{...LIVE,times:[120,240]});
  console.log(`  +${name.padEnd(9)} ${JSON.stringify(stat(b))} paired ${JSON.stringify(paired(te,b,lv))} (live@2:00/4:00 ${JSON.stringify(stat(lv))})`);}}
fs.writeFileSync('/tmp/claude-0/-home-claude-riptide/48752fb5-dafc-5a1f-934d-749d3c280644/scratchpad/struct.json',JSON.stringify(out));
