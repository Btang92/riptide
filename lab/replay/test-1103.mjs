// Nov 3: second-chance entry under the 4:00 lock. Live (11-01b) checks once at 4:00; if that check does not clear the bet rule,
// the round is skipped. Variant: keep checking at later checkpoints (5:00 / 6:00 / 7:00 / 8:00) with the same live rule
// (75–90¢, raw read ≥ ask + fee + 3, 12–24 ET) and bet the first one that clears. Aimed at "missed chances" in the autopsy
// (skipped rounds where value appeared later). Also: late-only replacement (move the lock to a later time).
import {R,feeP,stat,paired} from './sim.mjs';import {et} from './lib.mjs';const J=JSON.stringify;
const side=(a,c)=>a?(c?a.ya:a.na):null;
const mk=(times,allH,lo=75,hi=90,m=3)=>o=>{if(!allH&&et(o.t).h<12)return null;
 for(const s of times){const a=o.at[s];if(!a||!a.f||a.ya==null||a.na==null)continue;const pu=a.pu,c=pu>=.5?1:0,ask=side(a,c);
  if(ask==null||ask<lo||ask>hi||Math.max(pu,1-pu)*100<ask+feeP(ask)+m)continue;const w=o.up===c;return{t:o.t,pnl:(w?100-ask:-ask)-feeP(ask),won:w,ask,s};}
 return null;};
const go=(s,f)=>s.map(f).filter(Boolean);
const cut=Math.floor(R.length*.75),TR=R.slice(0,cut),TE=R.slice(cut),Q=i=>R.slice(Math.floor(R.length*i/4),Math.floor(R.length*(i+1)/4));
console.log('rounds',R.length,'test from',new Date(TE[0].t).toISOString());
const V={'lock+5:00':[240,300],'lock+6:00':[240,360],'lock+5–6':[240,300,360],'lock+5–8':[240,300,360,420,480],'lock+8:00':[240,480],
 'lock+6–8':[240,360,420,480],'5:00 only':[300],'6:00 only':[360],'8:00 only':[480]};
for(const allH of [false,true])for(const[lo,hi]of[[75,90],[75,96]]){const base=mk([240],false);
 console.log(`\n== variants ${allH?'all hours':'12–24 ET'} ${lo}–${hi}  vs live lock (4:00, 12–24, 75–90)`);
 console.log(' live lock: train',J(stat(go(TR,base))),'test',J(stat(go(TE,base))),'whole',J(stat(go(R,base))));
 const res=Object.entries(V).map(([k,T])=>{const f=mk(T,allH,lo,hi);return{k,f,tr:stat(go(TR,f)),te:stat(go(TE,f)),ptr:paired(TR,go(TR,f),go(TR,base)),pte:paired(TE,go(TE,f),go(TE,base)),pw:paired(R,go(R,f),go(R,base))};});
 res.sort((a,b)=>b.ptr.perRound-a.ptr.perRound);
 for(const r of res){const extra=go(R,r.f).filter(x=>x.s!==240);
  console.log(` ${r.k.padEnd(10)} train ${J(r.tr)} Δ${r.ptr.perRound}±${r.ptr.se} | test ${J(r.te)} Δ${r.pte.perRound}±${r.pte.se} | whole Δ${r.pw.perRound}±${r.pw.se} | later-entry bets ${J(stat(extra))}`);}
 const b=res[0];console.log(`  train-best ${b.k} quarters Δ¢/round`,[0,1,2,3].map(i=>{const p=paired(Q(i),go(Q(i),b.f),go(Q(i),base));return `${p.perRound}±${p.se}`;}).join(' / '));}
// Kalshi favourite (no read gate), all hours, 75–90: does a second chance after 4:00 add anything as a standalone bet stream?
const fav=(times,lo=75,hi=90)=>o=>{for(const s of times){const a=o.at[s];if(!a||a.ya==null||a.na==null)continue;const c=a.ya>=a.na?1:0,ask=side(a,c);if(ask<lo||ask>hi)continue;const w=o.up===c;return{t:o.t,pnl:(w?100-ask:-ask)-feeP(ask),won:w,ask,s};}return null;};
console.log('\n== Kalshi favourite 75–90 all hours, bets added by later checks (4:00 not in band)');
for(const T of [[300],[360],[480],[300,360,420,480]]){const f=o=>{if(fav([240])(o))return null;return fav(T)(o);};
 console.log(` after-4:00 at ${T.map(s=>s/60+':00').join('/')}: train ${J(stat(go(TR,f)))} test ${J(stat(go(TE,f)))} whole ${J(stat(go(R,f)))}`);}
