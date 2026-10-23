// Order-flow test: does Coinbase taker buy/sell flow add information beyond RIPTIDE's model and Kalshi's price?
import fs from 'fs';import {R,brain,run,stat,paired,LIVE,feeP} from './sim.mjs';import {fitLR,brainP,scoreSet,clamp} from './lib.mjs';
const FL=JSON.parse(fs.readFileSync('lab/data/flow.json'));
const lg=p=>{p=Math.min(.99,Math.max(.01,p));return Math.log(p/(1-p));};
const mkt=a=>Math.min(.97,Math.max(.03,(a.ya+(100-a.na))/200));
function flowF(t,s){const B=FL[t];if(!B||B.length<20)return null;const w=(lo)=>{let b=0,se=0,bb=0,bs=0,c=0;for(const r of B)if(r[0]>=s-lo&&r[0]<s){b+=r[1];se+=r[2];bb+=r[3];bs+=r[4];c+=r[5];}return{b,se,bb,bs,c};};
  const a5=w(300),a1=w(60),a2=w(120);const T5=a5.b+a5.se||1e-9,T1=a1.b+a1.se||1e-9,T2=a2.b+a2.se||1e-9;
  return[(a5.b-a5.se)/T5,(a1.b-a1.se)/T1,(a2.b-a2.se)/T2,(a5.bb-a5.bs)/T5,clamp(a1.c/(a5.c/5||1)-1),clamp(Math.log(T5)-1)];}
const S=[120,180,240,300];
const FX={base:(o,s,a)=>a.f,baseFlow:(o,s,a)=>{const g=flowF(o.t,s);return g?a.f.concat(g):null;},
  blend:(o,s,a)=>[a.f[0],lg(mkt(a))],blendFlow:(o,s,a)=>{const g=flowF(o.t,s);return g?[a.f[0],lg(mkt(a))].concat(g):null;},
  mktFlow:(o,s,a)=>{const g=flowF(o.t,s);return g?[lg(mkt(a))].concat(g):null;},mkt:(o,s,a)=>[lg(mkt(a))]};
const fit=(tr,fx)=>{const X=[],y=[];for(const o of tr)for(const s of S){const a=o.at[s];if(!a||!a.f)continue;const x=fx(o,s,a);if(!x)continue;X.push(x);y.push(o.up);}return fitLR(X,y);};
const has=R.filter(o=>FL[o.t]&&FL[o.t].length>=20);console.log('rounds with flow',has.length,'of',R.length);
for(const f0 of[.5,.75]){const c=Math.floor(has.length*f0),tr=has.slice(0,c),te=has.slice(c,Math.floor(has.length*(f0+.25)));const B=brain(tr);const live=run(te,B,LIVE),liveW=run(te,B,{...LIVE,lo:1,hi:99,hs:null});
  console.log(`\n=== fold ${f0} test ${te.length}; live`,JSON.stringify(stat(live)),'any-price all-hours',JSON.stringify(stat(liveW)));
  const M={};for(const k of Object.keys(FX))M[k]=fit(tr,FX[k]);
  console.log('  flow weights (blendFlow, standardised): mkt',M.blendFlow.w[2].toFixed(3),'imb5',M.blendFlow.w[3].toFixed(3),'imb1',M.blendFlow.w[4].toFixed(3),'imb2',M.blendFlow.w[5].toFixed(3),'big',M.blendFlow.w[6].toFixed(3));
  for(const s of[120,240]){const line=[`  log-loss @${s}`];for(const k of Object.keys(FX)){const P=[],Y=[];for(const o of te){const a=o.at[s];if(!a)continue;const x=FX[k](o,s,a);if(!x)continue;P.push(brainP(M[k],x));Y.push(o.up);}line.push(`${k} ${scoreSet(P,Y).ll.toFixed(4)}`);}console.log(line.join(' | '));}
  for(const k of['baseFlow','blendFlow','mktFlow']){const P={margin:3,p:null};
    for(const[rn,rule]of[['live rule',LIVE],['any price allH',{...LIVE,lo:1,hi:99,hs:null}],['75-90 allH',{...LIVE,hs:null}]]){
      const b=[];for(const o of te){b.push(...run([o],{margin:3,p:a=>{const s=+Object.keys(o.at).find(q=>o.at[q]===a);const x=FX[k](o,s,a);return x?brainP(M[k],x):a.pu;}},rule));}
      const ref=rn==='live rule'?live:run(te,B,rule);console.log(`  ${k.padEnd(10)} ${rn.padEnd(15)}`,JSON.stringify(stat(b)),'Δ vs live model same rule',JSON.stringify(paired(te,b,ref)));}}
  // flow as a filter on the live model's bets: skip if 5-min taker flow leans against the call
  for(const thr of[0,.1,.2]){const kept=[];for(const x of live){const o=te.find(q=>q.t===x.t),g=flowF(o.t,x.s);if(!g){kept.push(x);continue;}const sgn=(o.at[x.s].pu>=.5)?1:-1;if(g[0]*sgn<-thr)continue;kept.push(x);}
    console.log(`  live + skip if flow against >${thr}`,JSON.stringify(stat(kept)),JSON.stringify(paired(te,kept,live)));}}
