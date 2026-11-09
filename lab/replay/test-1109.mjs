// Nov 9 morning. (A) Exits under the 4:00 lock: stop-loss, read-turned, market-pays-more-than-read and take-profit, sold at bid −1¢ with exit fee.
// Aimed at the autopsy's biggest loss group (calls that turned against us by 5:00–10:00). The Oct 22 exit tests predate the lock.
// (B) Weekly rechecks: 2:00 fixed vs 4:00 lock; edge-sized stake (double when edge ≥ median of earlier bets).
// Rules chosen on older rounds only (75/25 split and expanding walk-forward folds Q2–Q4).
import {R,feeP,stat,paired} from './sim.mjs';import {et} from './lib.mjs';const J=JSON.stringify;
const EX=[300,360,420,480,600],side=(a,c)=>c?a.ya:a.na,SLIP=1;
const n=R.length,Q=i=>R.slice(Math.floor(n*i/4),Math.floor(n*(i+1)/4)),cut=Math.floor(n*.75),TR=R.slice(0,cut),TE=R.slice(cut);
function entry(o,mode,S=240){const a=o.at[S];if(!a||a.ya==null||a.na==null||a.pu==null||!a.f)return null;let c,ask;
  if(mode==='fav'){c=a.ya>=a.na?1:0;ask=side(a,c);if(ask<75||ask>90)return null;return{c,ask,ed:null};}
  if(mode==='live'&&et(o.t).h<12)return null;
  c=a.pu>=.5?1:0;ask=side(a,c);if(ask<75||ask>90)return null;const ed=Math.max(a.pu,1-a.pu)*100-ask-feeP(ask);if(ed<3)return null;return{c,ask,ed};}
const RULES={hold:null};
for(const x of[8,12,16,20,30])RULES['stop bid≤entry−'+x]=(e,a,bid,s)=>bid<=e.ask-x;
for(const[lbl,t,mx]of[['read<.5 by 6:00',.5,360],['read<.5 by 8:00',.5,480],['read<.5 any',.5,600],['read<.4 any',.4,600],['read<.3 any',.3,600]])
  RULES[lbl]=(e,a,bid,s,ps)=>s<=mx&&ps<t;
for(const v of[0,3,6])RULES['bid−fee>read+'+v]=(e,a,bid,s,ps)=>bid-feeP(bid)>ps*100+v;
for(const[lbl,t,mn]of[['tp bid≥95',95,300],['tp bid≥97',97,300],['tp bid≥95 from 8:00',95,480]])RULES[lbl]=(e,a,bid,s)=>s>=mn&&bid>=t;
RULES['stop −16 + tp 97']=(e,a,bid,s)=>bid<=e.ask-16||bid>=97;
function sim(S0,mode,rule){const out=[];for(const o of S0){const e=entry(o,mode);if(!e)continue;const won=(o.up===e.c);let pnl=(won?100-e.ask:-e.ask)-feeP(e.ask),exited=null;
  if(rule)for(const s of EX){const a=o.at[s];if(!a||a.ya==null||a.na==null||a.pu==null)continue;const bid=100-side(a,1-e.c)-SLIP;if(bid<1)continue;const ps=e.c?a.pu:1-a.pu;
    if(rule(e,a,bid,s,ps)){pnl=bid-e.ask-feeP(e.ask)-feeP(bid);exited={s,bid};break;}}
  out.push({t:o.t,pnl,won,ask:e.ask,ed:e.ed,exited});}return out;}
const pb=(a,b)=>{const B=new Map(b.map(x=>[x.t,x.pnl]));const d=a.map(x=>x.pnl-B.get(x.t)),m=d.reduce((s,v)=>s+v,0)/d.length,se=Math.sqrt(d.reduce((s,v)=>s+(v-m)**2,0)/Math.max(1,d.length-1)/d.length);return{d:+m.toFixed(2),se:+se.toFixed(2),n:d.length,raw:d};};
console.log('rounds',n,'test from',new Date(TE[0].t).toISOString());
for(const mode of['live','liveAll','fav']){const hold=x=>sim(x,mode,null);
  console.log(`\n=== ${mode} base train ${J(stat(hold(TR)))} test ${J(stat(hold(TE)))} whole ${J(stat(hold(R)))}`);
  const rows=Object.entries(RULES).filter(([k])=>k!=='hold').map(([k,f])=>{const tr=pb(sim(TR,mode,f),hold(TR)),te=pb(sim(TE,mode,f),hold(TE)),wh=pb(sim(R,mode,f),hold(R));return{k,f,tr,te,wh,ex:sim(R,mode,f).filter(x=>x.exited).length};}).sort((a,b)=>b.tr.d-a.tr.d);
  for(const r of rows)console.log(`  ${r.k.padEnd(22)} train Δ${r.tr.d}±${r.tr.se} | test Δ${r.te.d}±${r.te.se} (${r.te.n}) | whole Δ${r.wh.d}±${r.wh.se} exits ${r.ex}`);
  // expanding walk-forward: pick best on everything before each quarter, score that quarter, pool
  const D=[],log=[];for(let i=1;i<4;i++){const pre=R.slice(0,Math.floor(n*i/4)),te=Q(i);const best=Object.entries(RULES).filter(([k])=>k!=='hold').map(([k,f])=>({k,f,d:pb(sim(pre,mode,f),hold(pre)).d})).sort((a,b)=>b.d-a.d)[0];const p=pb(sim(te,mode,best.f),hold(te));D.push(...p.raw);log.push(`Q${i+1} ${best.k}: ${p.d}±${p.se} (${p.n})`);}
  const m=D.reduce((s,v)=>s+v,0)/D.length,se=Math.sqrt(D.reduce((s,v)=>s+(v-m)**2,0)/(D.length-1)/D.length);console.log(`  walk-forward: ${log.join(' | ')} | pooled Δ${m.toFixed(2)}±${se.toFixed(2)} ¢/bet (${D.length})`);
}
// (B1) call time recheck: fixed 2:00 / 3:00 / 5:00 vs 4:00 lock, live 12–24
{const at=S=>te=>{const out=[];for(const o of te){const e=entry(o,'live',S);if(!e)continue;const w=o.up===e.c;out.push({t:o.t,pnl:(w?100-e.ask:-e.ask)-feeP(e.ask),won:w,ask:e.ask});}return out;};
 console.log('\n(B1) call time, live rule 12–24, ¢/round vs 4:00 lock');
 for(const S of[120,180,300]){const f=at(S),g=at(240);console.log(`  ${S/60}:00 fixed whole ${J(stat(f(R)))} Δ${J(paired(R,f(R),g(R)))} | train Δ${J(paired(TR,f(TR),g(TR)))} | test ${J(stat(f(TE)))} Δ${J(paired(TE,f(TE),g(TE)))}`);}
 console.log('  4:00 lock whole',J(stat(at(240)(R))),'test',J(stat(at(240)(TE))));}
// (B2) edge-sized stake update
{const med=a=>{const s=[...a].sort((x,y)=>x-y);return s[s.length>>1];};
 for(const mode of['live','liveAll']){const D=[],row=[];for(let i=1;i<4;i++){const tr=sim(R.slice(0,Math.floor(n*i/4)),mode,null),te=sim(Q(i),mode,null),m=med(tr.map(x=>x.ed)),w=te.map(x=>x.ed>=m?2:1),sc=te.length/w.reduce((s,v)=>s+v,0),d=te.map((x,j)=>x.pnl*(w[j]*sc-1));D.push(...d);const mm=d.reduce((s,v)=>s+v,0)/d.length;row.push(`Q${i+1} ${mm.toFixed(2)}(${d.length})`);}
  const m=D.reduce((s,v)=>s+v,0)/D.length,se=Math.sqrt(D.reduce((s,v)=>s+(v-m)**2,0)/(D.length-1)/D.length);console.log(`\n(B2) edge stake ${mode}: ${row.join(' ')} pooled Δ${m.toFixed(2)}±${se.toFixed(2)} ¢/bet (${D.length})`);}}
