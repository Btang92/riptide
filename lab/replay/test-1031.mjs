// Oct 31 run. (A) forward check of proposal 2026-10-31a (latest call 4:00 vs 5:00) and the overpriced-favourite watch.
// (B) NEW: slow regime filters aimed at the post-Oct-23 slump (BTC fell with higher vol): 24-hour realized vol (absolute),
//     24h vol vs the previous 7 days, and the 24h trend signed toward the bet side (in 24h-vol units). Skip rule chosen on older 75%,
//     scored on newest 25% + quarters. Applied to the live rule (12–24 and all hours) and to the favourite 75–90¢ no-gate baseline.
import fs from 'fs';import {R,feeP,stat,paired} from './sim.mjs';import {et} from './lib.mjs';
const M=JSON.parse(fs.readFileSync('lab/data/candles.json'));const J=JSON.stringify;
const ks=Object.keys(M).map(Number).sort((a,b)=>a-b),idx=new Map(ks.map((t,i)=>[t,i]));
// prefix sums of squared 1-min log returns (only consecutive minutes)
const C=[0],CN=[0];for(let i=1;i<ks.length;i++){const ok=ks[i]-ks[i-1]===60000;const r=ok?Math.log(M[ks[i]][4]/M[ks[i-1]][4]):0;C.push(C[i-1]+(ok?r*r:0));CN.push(CN[i-1]+(ok?1:0));}
const at=t=>{let i=idx.get(t);if(i!=null)return i;for(let d=1;d<5;d++){i=idx.get(t-d*60000);if(i!=null)return i;}return null;};
function rv(iEnd,mins){let lo=null;for(let d=0;d<10&&lo==null;d++){const t=ks[iEnd]-(mins+d)*60000;lo=idx.get(t);}if(lo==null)return null;const n=CN[iEnd]-CN[lo];if(n<mins*.8)return null;return Math.sqrt((C[iEnd]-C[lo])/n);}
const FC=new Map();
function regime(o){if(FC.has(o.t))return FC.get(o.t);const i=at(o.t-60000);let r=null;
 if(i!=null){const v24=rv(i,1440),v7=rv(i,10080);let tr=null;const j=at(o.t-60000-1440*60000);if(j!=null&&v24)tr=Math.log(M[ks[i]][4]/M[ks[j]][4])/(v24*Math.sqrt(1440));
  r={v24:v24?v24*1e4:null,vr:v24&&v7?v24/v7:null,tr};}FC.set(o.t,r);return r;}
const FEAT={'24h vol (bp/min)':(o)=>regime(o)?.v24,'24h vol / 7d vol':o=>regime(o)?.vr,'24h trend with bet':(o,c)=>{const t=regime(o)?.tr;return t==null?null:t*c;}};
function go(set,{hrs,live,cut=300,key,dir,k}){const out=[];for(const o of set){if(hrs&&et(o.t).h<12)continue;
 for(const s of [120,180,240,300]){if(s>cut)break;const a=o.at[s];if(!a)continue;let c=0,ask;
  if(live){if(!a.f)continue;const pu=a.pu,cl=pu>=.5?1:-1,pr=Math.max(pu,1-pu);ask=cl>0?a.ya:a.na;if(ask==null||ask<75||ask>90)continue;if(pr*100<ask+feeP(ask)+3)continue;c=cl;}
  else{if(a.ya>=75&&a.ya<=90){c=1;ask=a.ya;}else if(a.na>=75&&a.na<=90){c=-1;ask=a.na;}if(!c)continue;}
  if(key){const v=FEAT[key](o,c);if(v!=null&&dir*v>dir*k)break;}
  const won=(o.up===1)===(c===1);out.push({t:o.t,pnl:(won?100-ask:-ask)-feeP(ask),won,ask,s});break;}}return out;}
const cutI=Math.floor(R.length*.75),tr=R.slice(0,cutI),te=R.slice(cutI),Q=i=>R.slice(Math.floor(R.length*i/4),Math.floor(R.length*(i+1)/4));
const iso=t=>new Date(t).toISOString().slice(0,16);
console.log(`rounds ${R.length} (${iso(R[0].t)} → ${iso(R.at(-1).t)}), train ${tr.length}, test ${te.length} from ${iso(te[0].t)}`);
// ---- A) forward checks
const PROP=Date.UTC(2026,9,31,4,0),SL=Date.UTC(2026,9,23,22,0);const F=R.filter(o=>o.t>=PROP),S=R.filter(o=>o.t>=SL),Bf=R.filter(o=>o.t<SL);
console.log(`\nA) forward rounds since the 31a proposal (Oct 31 04:00 UTC): ${F.length}`);
for(const[nm,b]of[['live 12–24',{hrs:1,live:1}],['live all hours',{live:1}],['fav no-gate all hours',{}]]){
 const f5=x=>go(x,{...b,cut:300}),f4=x=>go(x,{...b,cut:240});
 for(const[lab,set]of[['forward',F],['since Oct 23 22:00',S],['all',R]]){const p=paired(set,f4(set),f5(set));console.log(`  ${nm} ${lab}: cutoff 4:00 vs 5:00 ${p.perRound}±${p.se} ¢/round (${p.total}¢), 5:00 ${J(stat(f5(set)))}, 4:00 ${J(stat(f4(set)))}`);}}
console.log('  overpriced-favourite watch (fav no-gate all hours, cutoff 5:00): before Oct 23 22:00',J(stat(go(Bf,{}))),'since',J(stat(go(S,{}))),'forward',J(stat(go(F,{}))));
// ---- B) regime filters
const vals=k=>tr.map(o=>FEAT[k](o,1)).filter(v=>v!=null).sort((a,b)=>a-b);
const qs=k=>{const v=vals(k);return [.2,.33,.5,.67,.8].map(p=>v[Math.floor(v.length*p)]);};
console.log('\nB) descriptive, fav no-gate all hours, by train-set terciles (whole history / since Oct 23 22:00):');
for(const k of Object.keys(FEAT)){const q=qs(k),t1=q[1],t2=q[3];const g=(set,lo,hi)=>{const out=[];for(const o of set){const b=go([o],{});if(!b.length)continue;const c=null;const v=FEAT[k](o,b[0].pnl!=null?(o.at[b[0].s].ya===b[0].ask&&o.at[b[0].s].ya>=75?1:-1):1);if(v==null||v<lo||v>=hi)continue;out.push(b[0]);}return out;};
 console.log(`  ${k} cuts ${t1?.toFixed(3)} / ${t2?.toFixed(3)}: low ${J(stat(g(R,-1e9,t1)))} ${J(stat(g(S,-1e9,t1)))} | mid ${J(stat(g(R,t1,t2)))} ${J(stat(g(S,t1,t2)))} | high ${J(stat(g(R,t2,1e9)))} ${J(stat(g(S,t2,1e9)))}`);}
for(const[nm,base]of[['live rule 12–24 (live)',{hrs:1,live:1}],['live rule all hours',{live:1}],['fav no-gate all hours',{}],['fav no-gate 12–24',{hrs:1}]]){
 const g=s=>go(s,base);console.log(`\nB) ${nm}: base train ${J(stat(g(tr)))} test ${J(stat(g(te)))}`);const rows=[];
 for(const key of Object.keys(FEAT))for(const k of qs(key))for(const dir of [1,-1]){const r={...base,key,dir,k},f=s=>go(s,r);
  rows.push({lab:`skip if ${key} ${dir>0?'>':'<'} ${k.toFixed(3)}`,ptr:paired(tr,f(tr),g(tr)),pte:paired(te,f(te),g(te)),ste:stat(f(te)),skip:g(te).length-f(te).length,q:[0,1,2,3].map(i=>paired(Q(i),f(Q(i)),g(Q(i))).perRound)});}
 rows.sort((a,b)=>b.ptr.perRound-a.ptr.perRound);for(const r of rows.slice(0,5))console.log(`  ${r.lab.padEnd(36)} train ${r.ptr.perRound}±${r.ptr.se} → test ${r.pte.perRound}±${r.pte.se} (skips ${r.skip}; test ${J(r.ste)}) quarters ${r.q.join(' / ')}`);}
