// Nov 11: trading-hours window UNDER THE 4:00 LOCK (last window test was Oct 31, before the lock).
// Same live rule (raw read at 4:00, 75–90¢, read ≥ ask+fee+3); only the ET hours change.
// Whole history paired ¢/round vs live 12–24, by quarter, and expanding walk-forward choice of window (Q2–Q4).
import {R,feeP,stat} from './sim.mjs';import {et} from './lib.mjs';const J=JSON.stringify;
const n=R.length,Q=i=>R.slice(Math.floor(n*i/4),Math.floor(n*(i+1)/4));const NOV1=Date.UTC(2026,10,1,17,0);
const H=(a,b)=>{const s=new Set();const k=((b-a)%24+24)%24||24;for(let i=0;i<k;i++)s.add((a+i)%24);return s;};
const U=(...ss)=>new Set(ss.flatMap(s=>[...s]));
const W={'live 12–24':H(12,24),'all hours':H(0,24),'04–24':H(4,24),'08–24':H(8,24),'04–08 + 12–24':U(H(4,8),H(12,24)),'00–08 + 12–24':U(H(0,8),H(12,24)),
 '12–16 + 20–24':U(H(12,16),H(20,24)),'all but 16–20':U(H(20,16)),'04–08 only':H(4,8),'00–12 only':H(0,12)};
const bets=S=>{const out=new Map();for(const o of S){const a=o.at[240];if(!a||!a.f||a.ya==null||a.na==null||a.pu==null)continue;const c=a.pu>=.5?1:0,ask=c?a.ya:a.na;if(ask<75||ask>90)continue;if(Math.max(a.pu,1-a.pu)*100<ask+feeP(ask)+3)continue;const won=o.up===c;out.set(o.t,{t:o.t,h:et(o.t).h,pnl:(won?100-ask:-ask)-feeP(ask),won,ask});}return out;};
const B=bets(R);
const sel=(S,w)=>S.map(o=>B.get(o.t)).filter(x=>x&&W[w].has(x.h));
const pr=(S,w,base='live 12–24')=>{const d=S.map(o=>{const x=B.get(o.t);if(!x)return 0;return (W[w].has(x.h)?x.pnl:0)-(W[base].has(x.h)?x.pnl:0);});const m=d.reduce((s,v)=>s+v,0)/d.length,se=Math.sqrt(d.reduce((s,v)=>s+(v-m)**2,0)/(d.length-1)/d.length);return{m,se};};
const f=(x,d=2)=>(x>=0?'+':'')+x.toFixed(d);
console.log(`${n} rounds ${new Date(R[0].t).toISOString().slice(0,10)} → ${new Date(R[n-1].t).toISOString().slice(0,16)}; all-hours live-rule bets ${B.size}`);
console.log('\nPer-hour-block live rule (whole):');for(const[a,b]of[[0,4],[4,8],[8,12],[12,16],[16,20],[20,24]]){const s=[...B.values()].filter(x=>x.h>=a&&x.h<b);console.log(`  ${a}–${b} ET ${J(stat(s))}  since Nov 1 ${J(stat(s.filter(x=>x.t>=NOV1)))}`);}
console.log('\nWindows (bets ¢/ct whole | paired ¢/round vs live 12–24: whole, Q1..Q4, since Nov 1):');
for(const w of Object.keys(W)){const q=[0,1,2,3].map(i=>pr(Q(i),w)),wh=pr(R,w),nv=pr(R.filter(o=>o.t>=NOV1),w);
 console.log(`  ${w.padEnd(16)} ${J(stat(sel(R,w)))} | Δ ${f(wh.m,3)}±${wh.se.toFixed(3)} | ${q.map(x=>f(x.m)).join(' / ')} | Nov1+ ${f(nv.m)}±${nv.se.toFixed(2)}`);}
// expanding walk-forward: pick the window with best train ¢/round, score next quarter
const D=[],T=[];let lines=[];for(let i=1;i<4;i++){const tr=R.slice(0,Math.floor(n*i/4)),te=Q(i);let best=null,bv=-1e9;for(const w of Object.keys(W)){const v=pr(tr,w,'live 12–24').m;if(v>bv){bv=v;best=w;}}
 const d=te.map(o=>{const x=B.get(o.t);if(!x)return 0;return (W[best].has(x.h)?x.pnl:0)-(W['live 12–24'].has(x.h)?x.pnl:0);});D.push(...d);const tb=sel(te,best);T.push(...tb);const p=pr(te,best);lines.push(`Q${i+1} pick "${best}" (train ${f(bv,3)}) → test Δ${f(p.m,3)}±${p.se.toFixed(3)}, ${tb.length} bets ${J(stat(tb))}`);}
const m=D.reduce((s,v)=>s+v,0)/D.length,se=Math.sqrt(D.reduce((s,v)=>s+(v-m)**2,0)/(D.length-1)/D.length);
console.log('\nWalk-forward choice of window:');lines.forEach(l=>console.log('  '+l));console.log(`  pooled Δ ${f(m,3)}±${se.toFixed(3)} ¢/round over ${D.length} rounds; chosen-window test bets ${J(stat(T))}; live 12–24 same quarters ${J(stat([1,2,3].flatMap(i=>sel(Q(i),'live 12–24'))))}`);
// fixed all-hours on newest 25% alone
const te=Q(3);console.log(`\nNewest 25% (from ${new Date(te[0].t).toISOString().slice(0,16)}): live ${J(stat(sel(te,'live 12–24')))} | all hours ${J(stat(sel(te,'all hours')))} | 04–08+12–24 ${J(stat(sel(te,'04–08 + 12–24')))}`);
// added bets only (hours outside 12–24), per quarter
console.log('Added bets only (outside 12–24) by quarter: '+[0,1,2,3].map(i=>{const s=Q(i).map(o=>B.get(o.t)).filter(x=>x&&x.h<12);return `Q${i+1} ${J(stat(s))}`;}).join(' | '));
// pre-specified candidate (Oct 31 alternative): all hours, pooled over Q2–Q4 (the walk-forward test span)
{const S=[1,2,3].flatMap(i=>Q(i));for(const w of['all hours','04–24','all but 16–20']){const p=pr(S,w);console.log(`Fixed "${w}" over Q2–Q4: Δ ${f(p.m,3)}±${p.se.toFixed(3)} ¢/round (${(p.m/p.se).toFixed(1)} SE), bets ${J(stat(sel(S,w)))}`);}}
