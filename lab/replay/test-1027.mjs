// Morning Oct 27: (1) favourite-in-band recheck (edge gate off in 75–90¢) incl. rounds since the idea.
// (2) "inverse gate" inside 75–90¢: bet the favourite only when RIPTIDE's read is BELOW ask+fee (+k) — i.e. is the live gate picking the wrong rounds?
//     Also gate thresholds on edge = read − ask − fee inside the band (only bet if edge ≥ k or ≤ k), k chosen on older 75%.
// (3) upper band edge: let the live rule / favourite buy up to 92/94/96¢ (live stops at 90¢).
import {R,run,stat,paired,LIVE,split,feeP} from './sim.mjs';
const J=JSON.stringify,live={margin:3,p:a=>a.pu},nogate={margin:-100,p:a=>a.pu},ALLH={...LIVE,hs:null,he:null};
const IDEA=1792796467832,nw=R.filter(o=>o.t>IDEA);
console.log(`rounds ${R.length}, ${new Date(R[0].t).toISOString().slice(0,10)} → ${new Date(R.at(-1).t).toISOString()}`);
{const L=run(nw,live,LIVE),b=run(nw,nogate,LIVE);console.log(`(1) since idea ${nw.length} rounds: no-gate ${J(stat(b))} live ${J(stat(L))} paired ${J(paired(nw,b,L))}`);
 for(let i=0;i<4;i++){const te=R.slice(Math.floor(R.length*i/4),Math.floor(R.length*(i+1)/4));const L=run(te,live,LIVE),b=run(te,nogate,LIVE);
  console.log(`   Q${i+1} ${new Date(te[0].t).toISOString().slice(5,10)}→${new Date(te.at(-1).t).toISOString().slice(5,10)} paired ${J(paired(te,b,L))} nogate ${J(stat(b))} live ${J(stat(L))}`);}
 const La=run(nw,live,ALLH),ba=run(nw,nogate,ALLH);console.log(`   since idea all hours: no-gate ${J(stat(ba))} live ${J(stat(La))}`);}
// (2) edge-window rule inside band: bet favourite/RIPTIDE side if lo<=edge<hi where edge = prob*100 − ask − fee
const askOf=(a,c)=>a?(c==='UP'?a.ya:a.na):null;
function runE(set,rule,emin,emax){const out=[];for(const o of set){const h=(new Date(o.t).getUTCHours()+20)%24;// placeholder replaced below
 }return out;}
import {et} from './lib.mjs';
function runW(set,rule,emin,emax,hi){const out=[];for(const o of set){const h=et(o.t).h;if(rule.hs!=null&&(h<rule.hs||h>=rule.he))continue;let bet=null;
 for(const s of rule.times){const a=o.at[s];if(!a||!a.f)continue;const pu=a.pu,call=pu>=.5?'UP':'DOWN',prob=Math.max(pu,1-pu),ask=askOf(a,call);
  if(ask==null||ask<rule.lo||ask>(hi??rule.hi))continue;const e=prob*100-ask-feeP(ask);if(e<emin||e>=emax)continue;bet={call,ask,s,e};break;}
 if(!bet)continue;const won=(o.up===1)===(bet.call==='UP');out.push({t:o.t,pnl:(won?100-bet.ask:-bet.ask)-feeP(bet.ask),won,ask:bet.ask,s:bet.s,e:bet.e});}return out;}
const {tr,te}=split(.75);const halves=[R.slice(0,R.length>>1),R.slice(R.length>>1)];
for(const[rn,rule]of Object.entries({'12–24 ET':LIVE,'all hours':ALLH})){
 console.log(`\n(2) edge windows inside 75–90¢, ${rn} (edge = read − ask − fee, first check 2:00–5:00 that qualifies)`);
 const base=s=>run(s,live,rule);
 const W={'live (≥3)':[3,999],'no gate':[-999,999],'edge < 0 (inverse)':[-999,0],'edge < 3':[-999,3],'edge −10..0':[-10,0],'edge ≥ 0':[0,999],'edge 0..3':[0,3],'edge 3..8':[3,8],'edge ≥ 8':[8,999],'edge ≥ −5':[-5,999]};
 const rows=[];for(const[wn,[a,b]]of Object.entries(W)){const xtr=runW(tr,rule,a,b),xte=runW(te,rule,a,b);
  rows.push({wn,str:stat(xtr),ste:stat(xte),ptr:paired(tr,xtr,base(tr)),pte:paired(te,xte,base(te)),hv:halves.map(H=>stat(runW(H,rule,a,b))),q:[0,1,2,3].map(i=>{const S=R.slice(Math.floor(R.length*i/4),Math.floor(R.length*(i+1)/4));return stat(runW(S,rule,a,b));})});}
 for(const r of rows)console.log(`  ${r.wn.padEnd(20)} train ${J(r.str)} | test ${J(r.ste)} paired vs live ${r.pte.perRound}±${r.pte.se} | quarters ¢/ct ${r.q.map(s=>s.c+'±'+s.se+'('+s.n+')').join(' ')}`);
 const best=rows.filter(r=>r.str.n>=100&&r.wn!=='live (≥3)').sort((a,b)=>b.ptr.perRound-a.ptr.perRound)[0];
 console.log(`  train-best vs live: ${best.wn} train ${best.ptr.perRound}±${best.ptr.se} → test ${best.pte.perRound}±${best.pte.se} (${best.ste.n} test bets)`);}
// (3) upper band edge
for(const[rn,rule]of Object.entries({'12–24 ET':LIVE,'all hours':ALLH})){console.log(`\n(3) upper band, ${rn}`);
 for(const hi of [90,92,94,96]){for(const[gn,[a,b]]of Object.entries({live:[3,999],'no gate':[-999,999]})){
  const x=runW(R,rule,a,b,hi),xb=runW(R,rule,a,b,90);const extra=x.filter(z=>z.ask>90);
  const xtr=runW(tr,rule,a,b,hi),xte=runW(te,rule,a,b,hi);
  console.log(`  hi ${hi} ${gn.padEnd(8)} all ${J(stat(x))} extra >90¢ bets ${J(stat(extra))} | train paired vs hi90 ${J(paired(tr,xtr,runW(tr,rule,a,b,90)))} test ${J(paired(te,xte,runW(te,rule,a,b,90)))} halves ${halves.map(H=>paired(H,runW(H,rule,a,b,hi),runW(H,rule,a,b,90)).perRound).join(' / ')}`);}}}
// sanity: runW live == run live
console.log('\nsanity live 12–24 all rounds', J(stat(run(R,live,LIVE))), J(stat(runW(R,LIVE,3,999))));
// (3b) favourite priced 91–96¢ at the first check 2:00–5:00 that lands there (separate from the 75–90 band), per round
{const res=[];for(const o of R){for(const s of [120,180,240,300]){const a=o.at[s];if(!a)continue;let c=null,ask=null;if(a.ya>=91&&a.ya<=96){c='UP';ask=a.ya;}else if(a.na>=91&&a.na<=96){c='DOWN';ask=a.na;}if(!c)continue;
  const won=(o.up===1)===(c==='UP');res.push({t:o.t,won,ask,pnl:(won?100-ask:-ask)-feeP(ask),h:et(o.t).h});break;}}
 const bin=b=>{const n=b.length,p=b.filter(x=>x.won).length/n,a=b.reduce((s,x)=>s+x.ask,0)/n;return `n ${n} win ${(p*100).toFixed(1)}% avg ask ${a.toFixed(1)} → ${(b.reduce((s,x)=>s+x.pnl,0)/n).toFixed(2)}¢/ct ± ${(Math.sqrt(a/100*(1-a/100)/n)*100).toFixed(1)} (binomial noise at the price)`;};
 console.log('\n(3b) fav 91–96¢ first check, all hours:',bin(res));const c=Math.floor(R.length*.75),T=R[c].t;console.log('   train',bin(res.filter(x=>x.t<T)),'| test',bin(res.filter(x=>x.t>=T)));
 console.log('   12–24 ET',bin(res.filter(x=>x.h>=12)));for(let i=0;i<4;i++){const a=R[Math.floor(R.length*i/4)].t,b=i<3?R[Math.floor(R.length*(i+1)/4)].t:1e15;console.log('   Q'+(i+1),bin(res.filter(x=>x.t>=a&&x.t<b)));}}
