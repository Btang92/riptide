// Nov 12 evening: KALSHI ACTIVITY at the 4:00 lock (new: Kalshi's own contracts traded / open interest, lab/kvol/dl.mjs).
// Features at 4:00: rV = log(volume 0:00–4:00 / median of the previous 96 rounds), acc = last-minute volume share (3:00–4:00 / 0:00–4:00),
// rOI = log(OI at 4:00 / prev-96 median), churn = OI/volume at 4:00, rVL = log(3:00–4:00 volume / prev-96 median of the same).
// Which-rounds-to-bet filters (skip low/high tercile; terciles fixed on older rounds), aimed at entry quality on the 4:00 lock.
import fs from 'fs';import {R,feeP,stat} from './sim.mjs';import {et} from './lib.mjs';const J=JSON.stringify;
const K=new Map(JSON.parse(fs.readFileSync('lab/kvol/data/btc.json')).map(x=>[x.t,x]));
const KL=[...K.values()].sort((a,b)=>a.t-b.t);const idx=new Map(KL.map((x,i)=>[x.t,i]));
const v4=r=>[60,120,180,240].reduce((s,k)=>s+(r.m?.[k]?.v||0),0),vl=r=>r.m?.[240]?.v||0,oi=r=>r.m?.[240]?.oi||0;
const med=a=>{const s=a.filter(x=>x>0).sort((x,y)=>x-y);return s.length?s[s.length>>1]:null;};
const F={};for(const o of R){const i=idx.get(o.t);if(i==null||i<96)continue;const r=KL[i],prev=KL.slice(i-96,i);const V=v4(r),mV=med(prev.map(v4)),mL=med(prev.map(vl)),mO=med(prev.map(oi));
  if(!V||!mV)continue;F[o.t]={rV:Math.log(V/mV),acc:vl(r)/V,rOI:oi(r)&&mO?Math.log(oi(r)/mO):null,churn:oi(r)/V,rVL:vl(r)&&mL?Math.log(vl(r)/mL):null};}
const n=R.length,Qs=i=>[Math.floor(n*i/4),Math.floor(n*(i+1)/4)],f=(x,d=3)=>(x>=0?'+':'')+x.toFixed(d);
const A=o=>{const a=o.at[240];return a&&a.f&&a.ya!=null&&a.na!=null&&a.pu!=null?a:null;};
const BASE={
 'live 12–24':o=>{const a=A(o);if(!a||et(o.t).h<12)return null;const c=a.pu>=.5?1:0,ask=c?a.ya:a.na;if(ask<75||ask>90||Math.max(a.pu,1-a.pu)*100<ask+feeP(ask)+3)return null;return{c,ask};},
 'live all hours':o=>{const a=A(o);if(!a)return null;const c=a.pu>=.5?1:0,ask=c?a.ya:a.na;if(ask<75||ask>90||Math.max(a.pu,1-a.pu)*100<ask+feeP(ask)+3)return null;return{c,ask};},
 'fav 75–90 all hours':o=>{const a=A(o);if(!a)return null;const c=a.ya>=a.na?1:0,ask=c?a.ya:a.na;if(ask<75||ask>90)return null;return{c,ask};}};
const bet=(o,b)=>{const e=b(o);if(!e)return null;const won=o.up===e.c;return{t:o.t,pnl:(won?100-e.ask:-e.ask)-feeP(e.ask),won,ask:e.ask};};
const ms=d=>{const m=d.reduce((s,v)=>s+v,0)/d.length;return{m,se:Math.sqrt(d.reduce((s,v)=>s+(v-m)**2,0)/(d.length-1)/d.length)};};
const FEATS=['rV','acc','rOI','churn','rVL'];
const terc=(S,k)=>{const v=S.map(o=>F[o.t]?.[k]).filter(x=>x!=null).sort((a,b)=>a-b);return[v[Math.floor(v.length/3)],v[Math.floor(2*v.length/3)]];};
const FILT=[];for(const k of FEATS)for(const m of['skip low','skip high','only low','only high','skip mid'])FILT.push({k,m,id:`${k} ${m}`});
const keep=(o,fl,T)=>{const x=F[o.t]?.[fl.k];if(x==null)return true;const g=x<T[0]?0:x<T[1]?1:2;return fl.m==='skip low'?g!==0:fl.m==='skip high'?g!==2:fl.m==='only low'?g===0:fl.m==='only high'?g===2:g!==1;};
const dl=(S,b,fl,T)=>S.map(o=>{const x=bet(o,b);return x?(keep(o,fl,T)?0:-x.pnl):0;});
console.log(`${n} rounds, features for ${Object.keys(F).length}`);
for(const [bn,b] of Object.entries(BASE)){
 const all=R.map(o=>bet(o,b)).filter(Boolean);console.log(`\n=== ${bn}: whole ${J(stat(all))}`);
 const [c]=Qs(3),tr=R.slice(0,c),te=R.slice(c);
 for(const k of FEATS){const T=terc(tr,k);const g=[[],[],[]];const gt=[[],[],[]];for(const o of R){const x=bet(o,b),v=F[o.t]?.[k];if(!x||v==null)continue;const gi=v<T[0]?0:v<T[1]?1:2;g[gi].push(x);if(o.t>=te[0].t)gt[gi].push(x);}
  console.log(`  ${k.padEnd(5)} cuts ${T.map(x=>x.toFixed(2))} whole low/mid/high ${g.map(x=>{const s=stat(x);return `${s.c}±${s.se} (${s.n}, ${s.win}%)`;}).join(' | ')}  test ${gt.map(x=>{const s=stat(x);return `${s.c}±${s.se}(${s.n})`;}).join(' ')}`);}
 const rows=FILT.map(fl=>{const T=terc(tr,fl.k);return{fl,tr:ms(dl(tr,b,fl,T)),te:ms(dl(te,b,fl,T)),kept:te.map(o=>bet(o,b)).filter(Boolean).filter(x=>keep(R.find(o=>o.t===x.t),fl,T))};}).sort((a,b)=>b.tr.m-a.tr.m);
 console.log('  train-best filters → newest 25% (paired ¢/round vs no filter):');
 for(const r of rows.slice(0,5))console.log(`   ${r.fl.id.padEnd(16)} train ${f(r.tr.m)}±${r.tr.se.toFixed(3)} → test ${f(r.te.m)}±${r.te.se.toFixed(3)} kept ${J(stat(r.kept))}`);
 console.log(`   base test ${J(stat(te.map(o=>bet(o,b)).filter(Boolean)))}`);
 const D=[],KB=[],log=[];for(let i=1;i<4;i++){const[a,e]=Qs(i),old=R.slice(0,a),q=R.slice(a,e);let best=null,bv=0;
  for(const fl of FILT){const m=ms(dl(old,b,fl,terc(old,fl.k))).m;if(m>bv){bv=m;best=fl;}}
  if(!best){D.push(...q.map(()=>0));log.push(`Q${i+1} none`);KB.push(...q.map(o=>bet(o,b)).filter(Boolean));continue;}
  const T=terc(old,best.k),d=dl(q,b,best,T);D.push(...d);KB.push(...q.map(o=>bet(o,b)).filter(Boolean).filter(x=>keep(R.find(o=>o.t===x.t),best,T)));log.push(`Q${i+1} ${best.id} (train ${f(bv)}) → ${f(ms(d).m)}±${ms(d).se.toFixed(3)}`);}
 const p=ms(D);console.log(`  WF: ${log.join(' | ')}\n  WF pooled ${f(p.m)}±${p.se.toFixed(3)} ¢/round (${(p.m/p.se).toFixed(1)} SE); kept bets ${J(stat(KB))}`);
}
