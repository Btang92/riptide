// Evening Oct 26: (1) favourite-in-band (edge gate off in 75–90¢) recheck incl. rounds since the idea; hours recheck.
// (2) Kalshi price drift at entry: change in the bet side's ask since the previous check (60 s) — skip fading or surging favourites
//     (aimed at calls that turn against by 3:00–5:00; changes which rounds and price paid). 2:00 entries have no previous check → kept.
// (3) Drift since 2:00 for later entries, and "fav was fading at the check before" (prev drift) as an early-warning skip.
// Filters chosen on older 75%, scored on the newest 25% and on halves; paired ¢/round vs the base rule.
import {R,run,stat,paired,LIVE,split,feeP} from './sim.mjs';import {et} from './lib.mjs';
const J=JSON.stringify,live={margin:3,p:a=>a.pu},nogate={margin:-100,p:a=>a.pu},ALLH={...LIVE,hs:null,he:null};
const IDEA=1792796467832,nw=R.filter(o=>o.t>IDEA);
console.log(`rounds ${R.length}, last ${new Date(R.at(-1).t).toISOString()}`);
{const L=run(nw,live,LIVE),b=run(nw,nogate,LIVE);console.log(`(1) since idea ${nw.length} rounds (${nw.filter(o=>o.at[120]&&o.at[120].ya!=null).length} priced): no-gate ${J(stat(b))} live ${J(stat(L))} paired ${J(paired(nw,b,L))}`);
 for(let i=0;i<4;i++){const te=R.slice(Math.floor(R.length*i/4),Math.floor(R.length*(i+1)/4));const L=run(te,live,LIVE),b=run(te,nogate,LIVE);
  console.log(`   Q${i+1} ${new Date(te[0].t).toISOString().slice(5,10)}→${new Date(te.at(-1).t).toISOString().slice(5,10)} paired ${J(paired(te,b,L))} nogate ${J(stat(b))} live ${J(stat(L))}`);}
 const La=run(nw,live,ALLH),ba=run(nw,nogate,ALLH);console.log(`   since idea all hours: no-gate ${J(stat(ba))} live ${J(stat(La))} | hours: fav all vs fav 12–24 paired ${J(paired(nw,ba,b))}`);
 for(let i=0;i<4;i++){const te=R.slice(Math.floor(R.length*i/4),Math.floor(R.length*(i+1)/4));console.log(`   hours Q${i+1}: live all vs live 12–24 ${J(paired(te,run(te,live,ALLH),run(te,live,LIVE)))} fav all vs fav 12–24 ${J(paired(te,run(te,nogate,ALLH),run(te,nogate,LIVE)))}`);}}
const askOf=(a,c)=>a?(c==='UP'?a.ya:a.na):null;
function runF(set,B,rule,keep){const out=[];for(const o of set){const h=et(o.t).h;if(rule.hs!=null&&(h<rule.hs||h>=rule.he))continue;let bet=null;
  for(const s of rule.times){const a=o.at[s];if(!a||!a.f)continue;const pu=B.p(a),call=pu>=.5?'UP':'DOWN',prob=Math.max(pu,1-pu),ask=askOf(a,call);
    if(ask==null||ask<rule.lo||ask>rule.hi)continue;if(prob*100<ask+feeP(ask)+B.margin)continue;if(keep&&!keep(o,call,ask,s))continue;bet={call,ask,s};break;}
  if(!bet)continue;const won=(o.up===1)===(bet.call==='UP');out.push({t:o.t,pnl:(won?100-bet.ask:-bet.ask)-feeP(bet.ask),won,ask:bet.ask,call:bet.call,s:bet.s,o});}return out;}
const d1=(o,c,ask,s)=>{if(s===120)return null;const p=askOf(o.at[s-60],c);return p==null?null:ask-p;};
const d0=(o,c,ask,s)=>{if(s===120)return null;const p=askOf(o.at[120],c);return p==null?null:ask-p;};
const dp=(o,c,ask,s)=>{if(s<240)return null;const p=askOf(o.at[s-60],c),q=askOf(o.at[s-120],c);return p==null||q==null?null:p-q;};
const K=(f,t)=>(o,c,a,s)=>{const x=f(o,c,a,s);return x==null||t(x);};
const filters={
 'skip if fading (Δ60s<0)':K(d1,x=>x>=0),'skip if Δ60s ≤ −3':K(d1,x=>x>-3),'skip if Δ60s ≤ −6':K(d1,x=>x>-6),
 'skip if surging (Δ60s>0)':K(d1,x=>x<=0),'skip if Δ60s ≥ +5':K(d1,x=>x<5),'skip if Δ60s ≥ +10':K(d1,x=>x<10),
 'skip if fell since 2:00':K(d0,x=>x>=0),'skip if Δ since 2:00 ≤ −5':K(d0,x=>x>-5),'skip if rose since 2:00 ≥ +10':K(d0,x=>x<10),
 'skip if fading at prev check':K(dp,x=>x>=0),
 '2:00 entries only':(o,c,a,s)=>s===120,'3:00+ entries only':(o,c,a,s)=>s>120,
};
const {tr,te}=split(.75);const halves=[R.slice(0,R.length>>1),R.slice(R.length>>1)];
for(const[bn,[B,rule]]of Object.entries({'fav no-gate 12–24':[nogate,LIVE],'fav no-gate all hours':[nogate,ALLH],'live 12–24':[live,LIVE],'live all hours':[live,ALLH]})){
  const b0tr=runF(tr,B,rule),b0te=runF(te,B,rule);
  console.log(`\n== base ${bn}: train ${J(stat(b0tr))} test ${J(stat(b0te))} halves ${halves.map(H=>J(stat(runF(H,B,rule)))).join(' ')}`);
  // descriptive: bets entered at 3:00+ by drift bucket (whole set)
  const all=runF(R,B,rule).filter(x=>x.s>120);const bk={};for(const x of all){const d=d1(x.o,x.call,x.ask,x.s);const k=d==null?'na':d<=-6?'≤−6':d<0?'−5..−1':d===0?'0':d<5?'+1..+4':d<10?'+5..+9':'≥+10';(bk[k]=bk[k]||[]).push(x);}
  console.log('   3:00+ entries by Δ60s: '+Object.entries(bk).map(([k,v])=>`${k} ${J(stat(v))}`).join(' | '));
  const rows=[];for(const[fn,f]of Object.entries(filters)){const xtr=runF(tr,B,rule,f),xte=runF(te,B,rule,f);
    rows.push({fn,ptr:paired(tr,xtr,b0tr),str:stat(xtr),ste:stat(xte),pte:paired(te,xte,b0te),hv:halves.map(H=>paired(H,runF(H,B,rule,f),runF(H,B,rule)))});}
  for(const r of rows)console.log(`  ${r.fn.padEnd(30)} train ${J(r.str)} p ${r.ptr.perRound}±${r.ptr.se} | test ${J(r.ste)} p ${r.pte.perRound}±${r.pte.se} | halves ${r.hv.map(p=>p.perRound+'±'+p.se).join(' ')}`);
  const best=rows.filter(r=>r.str.n>=100).sort((a,b)=>b.ptr.perRound-a.ptr.perRound)[0];
  console.log(`  train-best: ${best.fn} (train ${best.ptr.perRound}±${best.ptr.se}) → test paired ${best.pte.perRound}±${best.pte.se}, ${best.ste.n} test bets ${J(best.ste)}`);}
