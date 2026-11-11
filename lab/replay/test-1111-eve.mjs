// Nov 11 evening: PRICE BAND under the 4:00 lock (the 75–90¢ band was last tested Oct 22/28, before the lock).
// Live rule = raw read at 4:00, read ≥ ask+fee+m. Grid: floor lo ∈ {60,65,70,72,75,78,80}, cap hi ∈ {85,88,90,92,95}, m ∈ {3,5}.
// Paired ¢/round vs live (75–90, m=3), whole / quarters / since Nov 1, and expanding walk-forward choice over Q2–Q4.
import {R,feeP,stat} from './sim.mjs';import {et} from './lib.mjs';const J=JSON.stringify;
const n=R.length,Q=i=>R.slice(Math.floor(n*i/4),Math.floor(n*(i+1)/4));const NOV1=Date.UTC(2026,10,1,17,0);
const HRS={'12–24':h=>h>=12,'all':h=>true};
const pnlOf=(o,lo,hi,m,hf)=>{const a=o.at[240];if(!a||!a.f||a.ya==null||a.na==null||a.pu==null)return null;if(!hf(et(o.t).h))return null;const c=a.pu>=.5?1:0,ask=c?a.ya:a.na;if(ask<lo||ask>hi)return null;
 if(Math.max(a.pu,1-a.pu)*100<ask+feeP(ask)+m)return null;const won=o.up===c;return{t:o.t,pnl:(won?100-ask:-ask)-feeP(ask),won,ask};};
const G=[];for(const lo of[60,65,70,72,75,78,80])for(const hi of[85,88,90,92,95])for(const m of[3,5])G.push({lo,hi,m,k:`${lo}–${hi} m${m}`});
const f=(x,d=2)=>(x>=0?'+':'')+x.toFixed(d);
const pr=(S,g,b,hf)=>{const d=S.map(o=>(pnlOf(o,g.lo,g.hi,g.m,hf)?.pnl||0)-(pnlOf(o,b.lo,b.hi,b.m,hf)?.pnl||0));const mm=d.reduce((s,v)=>s+v,0)/d.length;return{m:mm,se:Math.sqrt(d.reduce((s,v)=>s+(v-mm)**2,0)/(d.length-1)/d.length),d};};
const bets=(S,g,hf)=>S.map(o=>pnlOf(o,g.lo,g.hi,g.m,hf)).filter(Boolean);
const LIVE={lo:75,hi:90,m:3,k:'75–90 m3'};
console.log(`${n} rounds ${new Date(R[0].t).toISOString().slice(0,16)} → ${new Date(R[n-1].t).toISOString().slice(0,16)}`);
for(const [hn,hf] of Object.entries(HRS)){
 console.log(`\n=== hours ${hn} === live ${J(stat(bets(R,LIVE,hf)))}  since Nov1 ${J(stat(bets(R.filter(o=>o.t>=NOV1),LIVE,hf)))}`);
 // price-slice view: what the band edges add (live rule m3)
 for(const [a,b] of [[60,65],[65,70],[70,72],[72,75],[75,78],[78,80],[80,85],[85,88],[88,90],[90,92],[92,95]]){const s=bets(R,{lo:a,hi:b-(b<95?0.001:0),m:3},hf);const q=[0,1,2,3].map(i=>stat(bets(Q(i),{lo:a,hi:b-(b<95?0.001:0),m:3},hf)));console.log(`  slice ${a}–${b}¢: ${J(stat(s))}  quarters ${q.map(x=>x.n?`${x.c}(${x.n})`:'-').join(' / ')}`);}
 const rows=G.map(g=>{const w=pr(R,g,LIVE,hf),q=[0,1,2,3].map(i=>pr(Q(i),g,LIVE,hf).m),nv=pr(R.filter(o=>o.t>=NOV1),g,LIVE,hf);return{g,w,q,nv,b:stat(bets(R,g,hf))};}).sort((a,b)=>b.w.m-a.w.m);
 console.log('  top 10 by whole paired Δ ¢/round:');for(const r of rows.slice(0,10))console.log(`   ${r.g.k.padEnd(11)} ${J(r.b)} Δ ${f(r.w.m,3)}±${r.w.se.toFixed(3)} (${(r.w.m/r.w.se).toFixed(1)} SE) q ${r.q.map(x=>f(x)).join('/')} Nov1+ ${f(r.nv.m)}±${r.nv.se.toFixed(2)}`);
 for(const k of['70–90 m3','72–90 m3','70–92 m3','75–92 m3','75–95 m3','65–90 m5','70–90 m5','78–90 m3','80–90 m3','75–88 m3']){const r=rows.find(x=>x.g.k===k);console.log(`   pre-set ${k.padEnd(10)} ${J(r.b)} Δ ${f(r.w.m,3)}±${r.w.se.toFixed(3)} q ${r.q.map(x=>f(x)).join('/')}`);}
 // walk-forward
 const D=[],T=[],TL=[];for(let i=1;i<4;i++){const tr=R.slice(0,Math.floor(n*i/4)),te=Q(i);let best=null,bv=-1e9;for(const g of G){const v=pr(tr,g,LIVE,hf).m;if(v>bv){bv=v;best=g;}}
  const p=pr(te,best,LIVE,hf);D.push(...p.d);T.push(...bets(te,best,hf));TL.push(...bets(te,LIVE,hf));console.log(`  WF Q${i+1} pick ${best.k} (train ${f(bv,3)}) → test Δ ${f(p.m,3)}±${p.se.toFixed(3)} ${J(stat(bets(te,best,hf)))}`);}
 const mm=D.reduce((s,v)=>s+v,0)/D.length,se=Math.sqrt(D.reduce((s,v)=>s+(v-mm)**2,0)/(D.length-1)/D.length);
 console.log(`  WF pooled Δ ${f(mm,3)}±${se.toFixed(3)} ¢/round; chosen ${J(stat(T))} vs live ${J(stat(TL))}`);
}
