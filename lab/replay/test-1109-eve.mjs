// Nov 9 evening. (A) Read-path confirmation under the 4:00 lock: bet at 4:00 only if the raw read was already on the same side
// (≥T) at 3:00 and/or 2:00, if the read is rising into 4:00, or if the live rule already cleared at 3:00. Aimed at calls that turn
// against us by 3:00–5:00 (the price-based "settled favourite" filter is a separate entry; this one uses RIPTIDE's own read).
// (B) Edge margin under the lock (read ≥ ask+fee+m, live m=3): the Oct 27 gate test predates the lock.
// (C) Weekly recheck: 91–96¢ favourite (first 2:00–4:00 check priced 91–96¢, all hours).
// Filters are chosen on older rounds only (75/25 split and expanding walk-forward Q2–Q4), scored as paired ¢/round vs the live lock.
import {R,feeP,stat} from './sim.mjs';import {et} from './lib.mjs';const J=JSON.stringify;
const side=(a,c)=>c?a.ya:a.na,n=R.length,Q=i=>R.slice(Math.floor(n*i/4),Math.floor(n*(i+1)/4)),cut=Math.floor(n*.75),TR=R.slice(0,cut),TE=R.slice(cut);
const ok=a=>a&&a.ya!=null&&a.na!=null&&a.pu!=null;
function entry(o,mode,m=3){const a=o.at[240];if(!ok(a))return null;let c,ask;
  if(mode==='fav'){c=a.ya>=a.na?1:0;ask=side(a,c);if(ask<75||ask>90)return null;return{c,ask,ed:null};}
  if(mode==='live'&&et(o.t).h<12)return null;
  c=a.pu>=.5?1:0;ask=side(a,c);if(ask<75||ask>90)return null;const ed=Math.max(a.pu,1-a.pu)*100-ask-feeP(ask);if(ed<m)return null;return{c,ask,ed};}
const ps=(o,s,c)=>{const a=o.at[s];if(!ok(a))return null;return c?a.pu:1-a.pu;};
const F={none:()=>true};
for(const T of[.5,.55,.6,.65,.7]){F[`read@3:00≥${T}`]=(o,e)=>{const p=ps(o,180,e.c);return p!=null&&p>=T;};
  F[`read@2:00&3:00≥${T}`]=(o,e)=>{const p=ps(o,180,e.c),q=ps(o,120,e.c);return p!=null&&q!=null&&p>=T&&q>=T;};}
for(const d of[-.1,-.05,0,.05])F[`read rise 3→4 ≥${d}`]=(o,e)=>{const p=ps(o,180,e.c),q=ps(o,240,e.c);return p!=null&&q-p>=d;};
for(const d of[-.1,0])F[`read rise 2→4 ≥${d}`]=(o,e)=>{const p=ps(o,120,e.c),q=ps(o,240,e.c);return p!=null&&q-p>=d;};
F['rule cleared @3:00']=(o,e)=>{const a=o.at[180];if(!ok(a))return false;const p=e.c?a.pu:1-a.pu,ask=side(a,e.c);return p*100>=ask+feeP(ask)+3;};
F['spot toward side 3→4 (dist logit)']=(o,e)=>{const a=o.at[180],b=o.at[240];if(!a?.f||!b?.f)return false;return (b.f[0]-a.f[0])*(e.c?1:-1)>=0;};
function sim(S0,mode,f,m=3){const out=[];for(const o of S0){const e=entry(o,mode,m);if(!e||!f(o,e))continue;const won=(o.up===e.c);out.push({t:o.t,pnl:(won?100-e.ask:-e.ask)-feeP(e.ask),won,ask:e.ask,ed:e.ed});}return out;}
// paired per round (cents/round): candidate minus live lock, over all rounds in S0
const pr=(S0,a,b)=>{const A=new Map(a.map(x=>[x.t,x.pnl])),B=new Map(b.map(x=>[x.t,x.pnl]));const d=S0.map(o=>(A.get(o.t)||0)-(B.get(o.t)||0)),m=d.reduce((s,v)=>s+v,0)/d.length,se=Math.sqrt(d.reduce((s,v)=>s+(v-m)**2,0)/(d.length-1)/d.length);return{d:+m.toFixed(3),se:+se.toFixed(3),raw:d};};
console.log('rounds',n,'test from',new Date(TE[0].t).toISOString());
for(const mode of['live','liveAll','fav']){const base=S=>sim(S,mode,F.none);
  console.log(`\n=== (A) ${mode} base train ${J(stat(base(TR)))} test ${J(stat(base(TE)))} whole ${J(stat(base(R)))}`);
  const rows=Object.entries(F).filter(([k])=>k!=='none').map(([k,f])=>{const tr=pr(TR,sim(TR,mode,f),base(TR)),te=pr(TE,sim(TE,mode,f),base(TE)),wh=pr(R,sim(R,mode,f),base(R));
    const kept=sim(R,mode,f),drop=base(R).filter(x=>!kept.some(y=>y.t===x.t));return{k,f,tr,te,wh,kept:stat(kept),drop:stat(drop)};}).sort((a,b)=>b.tr.d-a.tr.d);
  for(const r of rows)console.log(`  ${r.k.padEnd(26)} train Δ${r.tr.d}±${r.tr.se} | test Δ${r.te.d}±${r.te.se} | whole Δ${r.wh.d}±${r.wh.se} kept ${r.kept.n} ${r.kept.c}±${r.kept.se} dropped ${r.drop.n} ${r.drop.c}±${r.drop.se}`);
  const D=[],log=[];for(let i=1;i<4;i++){const pre=R.slice(0,Math.floor(n*i/4)),te=Q(i);
    const best=Object.entries(F).map(([k,f])=>({k,f,d:k==='none'?0:pr(pre,sim(pre,mode,f),base(pre)).d})).sort((a,b)=>b.d-a.d)[0];
    const p=pr(te,sim(te,mode,best.f),base(te));D.push(...p.raw);log.push(`Q${i+1} ${best.k}: ${p.d}±${p.se}`);}
  const m=D.reduce((s,v)=>s+v,0)/D.length,se=Math.sqrt(D.reduce((s,v)=>s+(v-m)**2,0)/(D.length-1)/D.length);
  console.log(`  walk-forward: ${log.join(' | ')} | pooled Δ${m.toFixed(3)}±${se.toFixed(3)} ¢/round (${D.length} rounds)`);}
// (B) margin under the lock
for(const mode of['live','liveAll']){console.log(`\n=== (B) margin ${mode}`);const M=[0,1,2,3,5,8,12],base=S=>sim(S,mode,F.none,3);
  for(const m of M){const s=S=>sim(S,mode,F.none,m);console.log(`  m=${m} whole ${J(stat(s(R)))} train Δ${pr(TR,s(TR),base(TR)).d} test ${J(stat(s(TE)))} Δ${pr(TE,s(TE),base(TE)).d}±${pr(TE,s(TE),base(TE)).se} | whole Δ${pr(R,s(R),base(R)).d}±${pr(R,s(R),base(R)).se}`);}
  const D=[],log=[];for(let i=1;i<4;i++){const pre=R.slice(0,Math.floor(n*i/4)),te=Q(i);const best=M.map(m=>({m,d:pr(pre,sim(pre,mode,F.none,m),base(pre)).d})).sort((a,b)=>b.d-a.d)[0];
    const p=pr(te,sim(te,mode,F.none,best.m),base(te));D.push(...p.raw);log.push(`Q${i+1} m=${best.m}: ${p.d}±${p.se}`);}
  const mm=D.reduce((s,v)=>s+v,0)/D.length,se=Math.sqrt(D.reduce((s,v)=>s+(v-mm)**2,0)/(D.length-1)/D.length);console.log(`  walk-forward: ${log.join(' | ')} | pooled Δ${mm.toFixed(3)}±${se.toFixed(3)} ¢/round`);}
// (C) 91–96¢ favourite recheck
{const hi=S0=>{const out=[];for(const o of S0){let bet=null;for(const s of[120,180,240]){const a=o.at[s];if(!ok(a))continue;const c=a.ya>=a.na?1:0,ask=side(a,c);if(ask>96)break;if(ask>=91){bet={c,ask};break;}}
  if(!bet)continue;const won=o.up===bet.c;out.push({t:o.t,pnl:(won?100-bet.ask:-bet.ask)-feeP(bet.ask),won,ask:bet.ask});}return out;};
 const since=R.filter(o=>o.t>=Date.UTC(2026,10,2,11,15));
 console.log('\n=== (C) 91–96 favourite whole',J(stat(hi(R))),'train',J(stat(hi(TR))),'test',J(stat(hi(TE))),'since Nov 2 11:15',J(stat(hi(since))));
 const wk=[];for(let t=R[0].t;t<R.at(-1).t;t+=7*864e5)wk.push(stat(hi(R.filter(o=>o.t>=t&&o.t<t+7*864e5))).c);console.log('  weeks',wk.join(' / '));}
