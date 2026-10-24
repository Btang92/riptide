// Brandon (Oct 24): use every model together, not one at a time. (A) one combined model with ALL input families
// (RIPTIDE 9 + patterns + 1-min indicators + 5/15-min indicators + structure 1/5-min), several regularisation strengths;
// (B) consensus filter: take a live bet only when most family models agree on direction. Walk-forward, 2 folds.
import fs from 'fs';import {R,brain,run,stat,paired,LIVE,feeP} from './sim.mjs';import {featsI,fitLR,brainP} from './lib.mjs';import {structureFeatures} from '../structure.mjs';
const M=JSON.parse(fs.readFileSync('lab/data/candles.json'));
const bars=(end,n,w)=>{const o=[];for(let b=n-1;b>=0;b--){let op=null,h=-1e18,l=1e18,c=null;for(let j=w-1;j>=0;j--){const x=M[end-(b*w+j)*60000];if(!x)continue;if(op==null)op=x[3];h=Math.max(h,x[2]);l=Math.min(l,x[1]);c=x[4];}if(c!=null)o.push({o:op,h,l,c});}return o;};
const T=[120,180,240,300];
for(const o of R)for(const s of T){const a=o.at[s];if(!a||!a.f)continue;const end=o.t+s*1000-60000,spot=M[end]?.[4];if(!spot)continue;
  const st=(bb,k)=>{if(bb.length<20)return null;const f=structureFeatures(bb,o.strike,k);const r=Math.max(1,(f.lastHigh??spot)-(f.lastLow??spot));return[f.trend,f.bos,f.strikeVsSwing,f.lastHigh?Math.max(-3,Math.min(3,(spot-f.lastHigh)/r)):0,f.lastLow?Math.max(-3,Math.min(3,(spot-f.lastLow)/r)):0];};
  const b5=bars(end,48,5),b15=bars(end,60,15);a.s1=st(bars(end,60,1),3);a.s5=st(b5,2);a.i5=b5.length>=45?featsI(b5.map(x=>x.c)):null;a.i15=b15.length>=45?featsI(b15.map(x=>x.c)):null;}
const FAM={riptide:a=>a.f,pattern:a=>a.fp&&[a.f[0],...a.fp],ind1:a=>a.fi&&[a.f[0],...a.fi],ind5:a=>a.i5&&[a.f[0],...a.i5],ind15:a=>a.i15&&[a.f[0],...a.i15],struct1:a=>a.s1&&[a.f[0],...a.s1],struct5:a=>a.s5&&[a.f[0],...a.s5]};
const ALL=a=>{const p=[a.f,a.fp,a.fi,a.i5,a.i15,a.s1,a.s5];return p.every(Boolean)?p.flat():null;};
const ll=(P,y)=>P.reduce((s,p,i)=>s-(y[i]?Math.log(p):Math.log(1-p)),0)/P.length;
for(const f0 of[.5,.75]){const c=Math.floor(R.length*f0),tr=R.slice(0,c),te=R.slice(c,Math.floor(R.length*(f0+.25)));
 const rows=tr.filter(o=>o.at[120]?.f&&ALL(o.at[120])),y=rows.map(o=>o.up),TE=te.filter(o=>o.at[120]?.f&&ALL(o.at[120])),yt=TE.map(o=>o.up);
 const B=brain(tr),live=run(te,B,LIVE);console.log(`\n=== fold ${f0} (test ${te.length} rounds) live ${JSON.stringify(stat(live))}`);
 console.log(`  log-loss @2:00: live raw ${ll(TE.map(o=>Math.min(.995,Math.max(.005,o.at[120].pu))),yt).toFixed(4)}, Kalshi price ${ll(TE.map(o=>{const a=o.at[120];return Math.min(.995,Math.max(.005,(a.ya+100-a.na)/200));}),yt).toFixed(4)}`);
 // (A) combined model
 for(const l2 of[2,20,100]){const m=fitLR(rows.map(o=>ALL(o.at[120])),y,l2);const P=a=>{const x=ALL(a);return x?brainP(m,x):a.pu;};
  const b=run(te,{margin:3,p:P},LIVE);console.log(`  (A) all families together, L2=${l2}: ll ${ll(TE.map(o=>P(o.at[120])),yt).toFixed(4)} live rule ${JSON.stringify(stat(b))} paired ${JSON.stringify(paired(te,b,live))}`);}
 // (B) consensus: each family model votes; take the live bet only if ≥k of 7 agree with its direction
 const fm=Object.fromEntries(Object.entries(FAM).map(([k,g])=>{const t=tr.filter(o=>o.at[120]?.f&&g(o.at[120]));return[k,fitLR(t.map(o=>g(o.at[120])),t.map(o=>o.up))];}));
 const votes=a=>{let u=0,n=0;for(const[k,g]of Object.entries(FAM)){const x=g(a);if(!x)continue;n++;if(brainP(fm[k],x)>=.5)u++;}return{u,n};};
 for(const k of[5,6,7]){const P={margin:3,p:a=>{const pu=a.pu,v=votes(a),agree=pu>=.5?v.u:v.n-v.u;return agree>=k?pu:.5;}};const b=run(te,P,LIVE);
  console.log(`  (B) live bet only if ≥${k}/7 models agree: ${JSON.stringify(stat(b))} paired ${JSON.stringify(paired(te,b,live))}`);}
 // how often do the models disagree with the live read at all?
 let dis=0,n=0;for(const o of TE){const a=o.at[120],v=votes(a),agree=a.pu>=.5?v.u:v.n-v.u;n++;if(agree<=3)dis++;}console.log(`  majority of models disagree with RIPTIDE's direction in ${(dis/n*100).toFixed(1)}% of test rounds`);}
