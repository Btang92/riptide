// Morning Oct 28:
// (1) favourite-in-band recheck (edge gate off in 75–90¢) incl. rounds since the idea; are 75–90¢ favourites overpriced lately?
// (2) volatility-state gate at entry: vol rising (15-min vs 60-min vol, f[3]) and 30-min range (f[4]) — the autopsy shows
//     "vol rising" / "wild range" calls doing better. Terciles set on the older 75%, scored on the newest 25% and by halves.
// (3) recency-weighted brain: rolling refit of RIPTIDE's base inputs with exponential recency weights (half-life 3/7/14 days)
//     vs unweighted vs raw read; log-loss at 2:00 and live-rule ¢/ct on rounds after the first 40%.
import {R,run,stat,paired,LIVE,split,feeP} from './sim.mjs';import {et,sigm,scoreSet} from './lib.mjs';
const J=JSON.stringify,live={margin:3,p:a=>a.pu},nogate={margin:-100,p:a=>a.pu},ALLH={...LIVE,hs:null,he:null};
const IDEA=1792796467832,nw=R.filter(o=>o.t>IDEA);
console.log(`rounds ${R.length}, ${new Date(R[0].t).toISOString().slice(0,10)} → ${new Date(R.at(-1).t).toISOString()}`);
const Q=i=>R.slice(Math.floor(R.length*i/4),Math.floor(R.length*(i+1)/4));
// ---------- (1)
{const L=run(nw,live,LIVE),b=run(nw,nogate,LIVE);console.log(`(1) since idea ${nw.length} rounds: no-gate ${J(stat(b))} live ${J(stat(L))} paired ${J(paired(nw,b,L))}`);
 for(let i=0;i<4;i++){const te=Q(i);const L=run(te,live,LIVE),b=run(te,nogate,LIVE);
  console.log(`   Q${i+1} ${new Date(te[0].t).toISOString().slice(5,10)}→${new Date(te.at(-1).t).toISOString().slice(5,10)} paired ${J(paired(te,b,L))} nogate ${J(stat(b))} live ${J(stat(L))}`);}
 const La=run(nw,live,ALLH),ba=run(nw,nogate,ALLH);console.log(`   since idea all hours: no-gate ${J(stat(ba))} live ${J(stat(La))}`);
 // favourites by price sub-band since idea and over all rounds (all hours, first check 2:00–5:00)
 for(const[lo,hi]of[[75,80],[80,85],[85,90]]){const r={...ALLH,lo,hi};console.log(`   fav ${lo}–${hi}¢ all hours: all ${J(stat(run(R,nogate,r)))} since idea ${J(stat(run(nw,nogate,r)))}`);}}
// ---------- (2) vol-state gate
const {tr,te}=split(.75);const halves=[R.slice(0,R.length>>1),R.slice(R.length>>1)];
function runG(set,B,rule,gate){const out=[];for(const o of set){const h=et(o.t).h;if(rule.hs!=null&&(h<rule.hs||h>=rule.he))continue;let bet=null;
  for(const s of rule.times){const a=o.at[s];if(!a||!a.f)continue;const pu=B.p(a),call=pu>=.5?'UP':'DOWN',prob=Math.max(pu,1-pu),ask=call==='UP'?a.ya:a.na;
   if(ask==null||ask<rule.lo||ask>rule.hi)continue;if(prob*100<ask+feeP(ask)+B.margin)continue;bet={call,ask,a};break;}
  if(!bet||(gate&&!gate(bet.a)))continue;const won=(o.up===1)===(bet.call==='UP');out.push({t:o.t,pnl:(won?100-bet.ask:-bet.ask)-feeP(bet.ask),won,ask:bet.ask});}return out;}
for(const[fi,fname]of[[3,'vol rising (15m/60m vol − 1)'],[4,'30-min range (vol units)']]){
 const vals=tr.map(o=>o.at[120]?.f?.[fi]).filter(v=>v!=null).sort((a,b)=>a-b),t1=vals[Math.floor(vals.length/3)],t2=vals[Math.floor(vals.length*2/3)];
 console.log(`\n(2) ${fname}: train terciles at ${t1.toFixed(3)} / ${t2.toFixed(3)}`);
 const G={low:a=>a.f[fi]<t1,mid:a=>a.f[fi]>=t1&&a.f[fi]<t2,high:a=>a.f[fi]>=t2,'skip low':a=>a.f[fi]>=t1,'skip high':a=>a.f[fi]<t2};
 for(const[rn,rule,B]of[['live 12–24',LIVE,live],['fav no-gate 12–24',LIVE,nogate],['fav no-gate all hours',ALLH,nogate]]){
  console.log(`  ${rn}: base train ${J(stat(runG(tr,B,rule)))} test ${J(stat(runG(te,B,rule)))}`);const rows=[];
  for(const[gn,g]of Object.entries(G)){const xtr=runG(tr,B,rule,g),xte=runG(te,B,rule,g);
   const r={gn,str:stat(xtr),ste:stat(xte),ptr:paired(tr,xtr,runG(tr,B,rule)),pte:paired(te,xte,runG(te,B,rule)),ph:halves.map(H=>paired(H,runG(H,B,rule,g),runG(H,B,rule)))};rows.push(r);
   console.log(`    ${gn.padEnd(10)} train ${J(r.str)} test ${J(r.ste)} | paired vs base train ${r.ptr.perRound}±${r.ptr.se} test ${r.pte.perRound}±${r.pte.se} halves ${r.ph.map(p=>p.perRound+'±'+p.se).join(' / ')}`);}
  const best=rows.filter(r=>r.gn.startsWith('skip')).sort((a,b)=>b.ptr.perRound-a.ptr.perRound)[0];
  console.log(`    train-best skip rule: ${best.gn} train ${best.ptr.perRound}±${best.ptr.se} → test ${best.pte.perRound}±${best.pte.se} (${best.ste.n} test bets)`);}}
// ---------- (3) recency-weighted brain (rolling refit every 96 rounds on everything before)
function fitW(X,y,w8,l2=2,iters=300,lr=0.6){const n=X.length,d=X[0].length,W=w8.reduce((a,b)=>a+b,0),mu=Array(d).fill(0),sd=Array(d).fill(0);
 X.forEach((x,k)=>x.forEach((v,i)=>mu[i]+=w8[k]*v/W));X.forEach((x,k)=>x.forEach((v,i)=>sd[i]+=w8[k]*(v-mu[i])**2/W));for(let i=0;i<d;i++)sd[i]=Math.sqrt(sd[i])||1;
 const Z=X.map(x=>x.map((v,i)=>(v-mu[i])/sd[i])),w=Array(d+1).fill(0);
 for(let it=0;it<iters;it++){const g=Array(d+1).fill(0);for(let k=0;k<n;k++){const z=Z[k];let s=w[0];for(let i=0;i<d;i++)s+=w[i+1]*z[i];const e=(sigm(s)-y[k])*w8[k];g[0]+=e;for(let i=0;i<d;i++)g[i+1]+=e*z[i];}
  w[0]-=lr*g[0]/W;for(let i=1;i<=d;i++)w[i]-=lr*(g[i]+l2*w[i])/W;}
 return x=>{let s=w[0];for(let i=0;i<d;i++)s+=w[i+1]*(x[i]-mu[i])/sd[i];return Math.min(.99,Math.max(.01,sigm(s)));};}
{const start=Math.floor(R.length*.4),HL={none:Infinity,'14d':14,'7d':7,'3d':3},P={raw:[]},y=[],T=[];for(const k in HL)P[k]=[];
 const preds={};for(const k in HL)preds[k]=new Map();
 for(let c=start;c<R.length;c+=96){const trn=R.slice(0,c).filter(o=>o.at[120]?.f),blk=R.slice(c,c+96);const X=trn.map(o=>o.at[120].f),Y=trn.map(o=>o.up),tc=R[c].t;
  for(const[k,hl]of Object.entries(HL)){const w8=trn.map(o=>hl===Infinity?1:Math.pow(.5,(tc-o.t)/864e5/hl));const f=fitW(X,Y,w8);
   for(const o of blk){preds[k].set(o.t,f);}}}
 const tst=R.slice(start);const yv=tst.map(o=>o.up);
 console.log(`\n(3) recency-weighted brain, rolling refit every 96 rounds, ${tst.length} rounds from ${new Date(tst[0].t).toISOString().slice(0,10)}`);
 console.log(`  raw read @2:00 ${J(scoreSet(tst.map(o=>o.at[120].pu),yv))}  Kalshi mid ${J(scoreSet(tst.map(o=>(o.at[120].ya+100-o.at[120].na)/200),yv))}`);
 const base=run(tst,live,LIVE);console.log(`  live rule raw read: ${J(stat(base))}`);
 for(const k in HL){const p=a=>null;const B={margin:3,p:null};
  const Bk={margin:3,p:undefined};const pr=tst.map(o=>preds[k].get(o.t)(o.at[120].f));
  // live rule with the brain's probability at each check (brain applied to that check's features)
  const out=[];for(const o of tst){const f=preds[k].get(o.t);const h=et(o.t).h;if(h<12)continue;let bet=null;
   for(const s of LIVE.times){const a=o.at[s];if(!a||!a.f)continue;const pu=f(a.f),call=pu>=.5?'UP':'DOWN',prob=Math.max(pu,1-pu),ask=call==='UP'?a.ya:a.na;
    if(ask==null||ask<75||ask>90)continue;if(prob*100<ask+feeP(ask)+3)continue;bet={call,ask};break;}
   if(!bet)continue;const won=(o.up===1)===(bet.call==='UP');out.push({t:o.t,pnl:(won?100-bet.ask:-bet.ask)-feeP(bet.ask),won,ask:bet.ask});}
  const hh=[tst.slice(0,tst.length>>1),tst.slice(tst.length>>1)];
  console.log(`  half-life ${k.padEnd(4)} log-loss ${J(scoreSet(pr,yv))} | live rule ${J(stat(out))} paired vs raw ${J(paired(tst,out,base))} halves ${hh.map(H=>paired(H,out.filter(x=>x.t>=H[0].t&&x.t<=H.at(-1).t),base.filter(x=>x.t>=H[0].t&&x.t<=H.at(-1).t)).perRound).join(' / ')}`);}}
