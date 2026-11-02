// Nov 2 morning. Live is now 2026-11-01b: every call locked at 4:00 (one check at 4:00, 75–90¢, 12–24 ET, read ≥ ask+fee+3).
//  (A) Call time under the lock: is one check at 4:00 better or worse than 2:00 / 3:00 fixed, or the old "first clear 2:00–4:00" (31a)?
//      Aimed at price paid: later checks pay more. Paired ¢/round vs the live 4:00 lock, train older 75% / test newest 25% / quarters.
//  (B) Upper band at the 4:00 lock: widen the band to 91/93/96¢, or add "buy the favourite 91–96¢ at the first 2:00–4:00 check"
//      when live does not bet (weekly recheck of the strongest watch).
//  (C) :45-round skip (in downtrends) forward check, rounds after Nov 1 23:15 UTC only.
import {R,feeP,stat,paired} from './sim.mjs';import {et} from './lib.mjs';
const J=JSON.stringify,iso=t=>new Date(t).toISOString().slice(0,16);
const cutI=Math.floor(R.length*.75),tr=R.slice(0,cutI),te=R.slice(cutI),Q=i=>R.slice(Math.floor(R.length*i/4),Math.floor(R.length*(i+1)/4));
console.log(`rounds ${R.length} (${iso(R[0].t)} → ${iso(R.at(-1).t)}), train ${tr.length}, test ${te.length} from ${iso(te[0].t)}`);
const bet=(o,c,ask,s)=>{const won=(o.up===1)===(c===1);return{t:o.t,pnl:(won?100-ask:-ask)-feeP(ask),won,ask,s};};
// generic live-style rule: checks = list of seconds; first one that clears wins
function one(o,{times=[240],lo=75,hi=90,hrs=1,margin=3}={}){if(hrs&&et(o.t).h<12)return null;
 for(const s of times){const a=o.at[s];if(!a||!a.f)continue;const pu=a.pu,c=pu>=.5?1:-1,pr=Math.max(pu,1-pu),ask=c>0?a.ya:a.na;
  if(ask==null||ask<lo||ask>hi)continue;if(pr*100<ask+feeP(ask)+margin)continue;return bet(o,c,ask,s);}return null;}
const run=(set,opt)=>set.map(o=>one(o,opt)).filter(Boolean);
const LIVE={times:[240]};
const rep=(name,opt,base=LIVE)=>{const p=k=>paired(k,run(k,opt),run(k,base));const a=p(tr),b=p(te);
 console.log(`  ${name.padEnd(30)} train ${J(stat(run(tr,opt)))} test ${J(stat(run(te,opt)))} | vs live ¢/round train ${a.perRound}±${a.se} test ${b.perRound}±${b.se} | quarters ${[0,1,2,3].map(i=>{const q=p(Q(i));return q.perRound+'±'+q.se;}).join(' / ')}`);return {name,opt,a,b};};
console.log('\nA) call time (12–24 ET, 75–90¢, margin 3):');
console.log('  live 4:00 lock               train',J(stat(run(tr,LIVE))),'test',J(stat(run(te,LIVE))),'whole',J(stat(run(R,LIVE))));
const A=[['2:00 fixed',{times:[120]}],['3:00 fixed',{times:[180]}],['5:00 fixed',{times:[300]}],['first clear 2:00–4:00 (31a)',{times:[120,180,240]}],
 ['first clear 3:00–4:00',{times:[180,240]}],['first clear 2:00–5:00 (24f)',{times:[120,180,240,300]}],['4:00 lock all hours',{times:[240],hrs:0}],['31a all hours',{times:[120,180,240],hrs:0}]].map(([n,o])=>rep(n,o));
const bestA=A.slice().sort((x,y)=>y.a.perRound-x.a.perRound)[0];console.log('  train-best:',bestA.name,'→ test',bestA.b.perRound,'±',bestA.b.se);
// since the lock went live (Nov 1 ~22:00 ET?) and since Oct 23
const LOCK=Date.UTC(2026,10,2,3,5),SL=Date.UTC(2026,9,23,22,0);
for(const [lab,set] of [['since Oct 23 22:00',R.filter(o=>o.t>=SL)],['since 11-01a commit',R.filter(o=>o.t>=LOCK)]]){
 const p=paired(set,run(set,{times:[120,180,240]}),run(set,LIVE));console.log(`  ${lab} (${set.length} rounds): 4:00 lock ${J(stat(run(set,LIVE)))}, 31a ${J(stat(run(set,{times:[120,180,240]})))}, 31a−lock ${p.perRound}±${p.se}`);}
// price paid at each time for the same rounds: rounds where both 2:00 and 4:00 bet
{const b2=new Map(run(R,{times:[120]}).map(x=>[x.t,x])),b4=run(R,LIVE);const both=b4.filter(x=>b2.has(x.t));
 console.log(`  rounds where 2:00 and 4:00 both bet: ${both.length}, avg ask 2:00 ${(both.reduce((s,x)=>s+b2.get(x.t).ask,0)/both.length).toFixed(1)} vs 4:00 ${(both.reduce((s,x)=>s+x.ask,0)/both.length).toFixed(1)}; ¢/ct 2:00 ${stat(both.map(x=>b2.get(x.t))).c} vs 4:00 ${stat(both).c}`);}
// ---- B
console.log('\nB) upper band at the 4:00 lock:');
const B=[['band 75–91',{times:[240],hi:91}],['band 75–93',{times:[240],hi:93}],['band 75–96',{times:[240],hi:96}],['band 75–96 all hours',{times:[240],hi:96,hrs:0}]].map(([n,o])=>rep(n,o));
// add-on: favourite (91,96] at first 2:00–4:00 check, all hours, no read gate, when live doesn't bet
function hiOne(o,{lo=90,hi=96,cut=240}={}){for(const s of [120,180,240]){if(s>cut)break;const a=o.at[s];if(!a||a.ya==null||a.na==null)continue;
  if(a.ya>hi||a.na>hi)return null;let c=0,ask;if(a.ya>lo&&a.ya<=hi){c=1;ask=a.ya;}else if(a.na>lo&&a.na<=hi){c=-1;ask=a.na;}if(!c)continue;return bet(o,c,ask,s);}return null;}
const combo=set=>set.map(o=>one(o,LIVE)||hiOne(o)).filter(Boolean),hiAll=set=>set.map(o=>hiOne(o)).filter(Boolean);
{const a=paired(tr,combo(tr),run(tr,LIVE)),b=paired(te,combo(te),run(te,LIVE));
 console.log(`  add-on fav (90,96] 2:00–4:00 all hrs: alone train ${J(stat(hiAll(tr)))} test ${J(stat(hiAll(te)))} whole ${J(stat(hiAll(R)))} | combo vs live train ${a.perRound}±${a.se} test ${b.perRound}±${b.se}`);
 const NEW=R.filter(o=>o.t>Date.UTC(2026,10,1,23,15));console.log(`  new rounds since Nov 1 eve run (${NEW.length}):`,hiAll(NEW).map(x=>`${iso(x.t)} ${x.ask}¢ ${x.won?'W':'L'}`).join(', ')||'none');
 const t0=R[0].t,W=Math.ceil((R.at(-1).t-t0)/(7*864e5));console.log('  weeks alone:',Array.from({length:W},(_,w)=>{const s=stat(hiAll(R.filter(o=>Math.floor((o.t-t0)/(7*864e5))===w)));return s.n?`${s.c}±${s.se} (${s.n})`:'-';}).join(' / '));}
// ---- C
console.log('\nC) :45 rounds at 4:00 (favourite), forward only (after Nov 1 23:15 UTC):');
{const NEW=R.filter(o=>o.t>Date.UTC(2026,10,1,23,15));const fav=o=>{const a=o.at[240];if(!a||a.ya==null)return null;const c=a.ya>=a.na?1:-1,ask=c>0?a.ya:a.na;if(ask<50||ask>=100)return null;return bet(o,c,ask,240);};
 const g=k=>NEW.filter(o=>(new Date(o.t).getUTCMinutes()===45)===k).map(fav).filter(Boolean);
 console.log('  :45 favourite',J(stat(g(true))),' other rounds',J(stat(g(false))));}
