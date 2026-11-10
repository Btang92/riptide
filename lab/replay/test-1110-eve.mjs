// Nov 10 evening. (A) Round-number levels at the 4:00 lock: does a round BTC level ($100/$250/$500/$1000) lying between spot and
// the strike (the price must cross it for the call to flip) make the favourite hold more often, i.e. fewer late flips? Also: strike
// sitting within $D of a round level, and spot pinned within $D of a level. (B) Hour blocks inside the live 12–24 ET window under the
// lock (autopsy keeps flagging 16–20 ET), and the 00:00 UTC daily-close / funding round (19:00 ET).
// Filters are chosen on older rounds only (75/25 split and expanding walk-forward Q2–Q4), scored as paired ¢/round vs the base rule.
import fs from 'fs';import {R,feeP,stat} from './sim.mjs';import {et} from './lib.mjs';const J=JSON.stringify;
const C=JSON.parse(fs.readFileSync('lab/data/candles.json'));
const side=(a,c)=>c?a.ya:a.na,n=R.length,Q=i=>R.slice(Math.floor(n*i/4),Math.floor(n*(i+1)/4)),cut=Math.floor(n*.75),TR=R.slice(0,cut),TE=R.slice(cut);
const ok=a=>a&&a.ya!=null&&a.na!=null&&a.pu!=null;
// spot at 4:00 = close of the 1-min candle starting at t+3:00
const spot=o=>{const k=C[o.t+180000];return k?k[4]:null;};
let chk=0,chkn=0;for(const o of R){const k=C[o.t];if(k&&o.strike){chk+=Math.abs(k[3]-o.strike);chkn++;}}
console.log('rounds',n,'test from',new Date(TE[0].t).toISOString(),'| mean |Coinbase open − strike| $'+(chk/chkn).toFixed(1),'on',chkn);
function entry(o,mode){const a=o.at[240];if(!ok(a))return null;let c,ask;
  if(mode==='fav'){c=a.ya>=a.na?1:0;ask=side(a,c);if(ask<75||ask>90)return null;return{c,ask};}
  if(mode==='live'&&et(o.t).h<12)return null;
  c=a.pu>=.5?1:0;ask=side(a,c);if(ask<75||ask>90)return null;const ed=Math.max(a.pu,1-a.pu)*100-ask-feeP(ask);if(ed<3)return null;return{c,ask};}
const between=(x,y,L)=>{const lo=Math.min(x,y),hi=Math.max(x,y);return Math.floor(hi/L)*L>lo;}; // a multiple of L strictly inside (lo,hi]
const dist=(x,L)=>{const r=x%L;return Math.min(r,L-r);};
const F={none:()=>true};
for(const L of[100,250,500,1000]){
  F[`barrier$${L}`]=o=>{const s=spot(o);return s!=null&&between(s,o.strike,L);};
  F[`no barrier$${L}`]=o=>{const s=spot(o);return s!=null&&!between(s,o.strike,L);};}
for(const[L,D]of[[100,10],[250,20],[500,25],[1000,50]]){
  F[`strike≠near$${L}(±${D})`]=o=>dist(o.strike,L)>D;
  F[`strike near$${L}(±${D})`]=o=>dist(o.strike,L)<=D;
  F[`spot≠near$${L}(±${D})`]=o=>{const s=spot(o);return s!=null&&dist(s,L)>D;};}
const H={none:()=>true};
for(const[a,b]of[[12,14],[14,16],[16,18],[18,20],[20,22],[22,24],[16,20],[12,16],[20,24]])H[`skip ${a}–${b} ET`]=o=>{const h=et(o.t).h;return h<a||h>=b;};
H['skip 00 UTC round']=o=>new Date(o.t).getUTCHours()!==0||new Date(o.t).getUTCMinutes()>=15;
H['skip 23:45–00:15 UTC']=o=>{const d=new Date(o.t),m=d.getUTCHours()*60+d.getUTCMinutes();return !(m>=23*60+45||m<15);};
function sim(S0,mode,f){const out=[];for(const o of S0){const e=entry(o,mode);if(!e||!f(o,e))continue;const won=(o.up===e.c);out.push({t:o.t,pnl:(won?100-e.ask:-e.ask)-feeP(e.ask),won,ask:e.ask});}return out;}
const pr=(S0,a,b)=>{const A=new Map(a.map(x=>[x.t,x.pnl])),B=new Map(b.map(x=>[x.t,x.pnl]));const d=S0.map(o=>(A.get(o.t)||0)-(B.get(o.t)||0)),m=d.reduce((s,v)=>s+v,0)/d.length,se=Math.sqrt(d.reduce((s,v)=>s+(v-m)**2,0)/(d.length-1)/d.length);return{d:+m.toFixed(3),se:+se.toFixed(3),raw:d};};
function block(title,FF,modes){for(const mode of modes){const base=S=>sim(S,mode,FF.none);
  console.log(`\n=== ${title} ${mode} base train ${J(stat(base(TR)))} test ${J(stat(base(TE)))} whole ${J(stat(base(R)))}`);
  const rows=Object.entries(FF).filter(([k])=>k!=='none').map(([k,f])=>{const tr=pr(TR,sim(TR,mode,f),base(TR)),te=pr(TE,sim(TE,mode,f),base(TE)),wh=pr(R,sim(R,mode,f),base(R));
    const kept=sim(R,mode,f),ks=new Set(kept.map(x=>x.t)),drop=base(R).filter(x=>!ks.has(x.t));return{k,tr,te,wh,kept:stat(kept),drop:stat(drop)};}).sort((a,b)=>b.tr.d-a.tr.d);
  for(const r of rows)console.log(`  ${r.k.padEnd(24)} train Δ${r.tr.d}±${r.tr.se} | test Δ${r.te.d}±${r.te.se} | whole Δ${r.wh.d}±${r.wh.se} kept ${r.kept.n} ${r.kept.c}±${r.kept.se} (${r.kept.win}%) dropped ${r.drop.n} ${r.drop.c}±${r.drop.se} (${r.drop.win}%)`);
  const D=[],log=[];for(let i=1;i<4;i++){const pre=R.slice(0,Math.floor(n*i/4)),te=Q(i);
    const best=Object.entries(FF).map(([k,f])=>({k,f,d:k==='none'?0:pr(pre,sim(pre,mode,f),base(pre)).d})).sort((a,b)=>b.d-a.d)[0];
    const p=pr(te,sim(te,mode,best.f),base(te));D.push(...p.raw);log.push(`Q${i+1} ${best.k}: ${p.d}±${p.se}`);}
  const m=D.reduce((s,v)=>s+v,0)/D.length,se=Math.sqrt(D.reduce((s,v)=>s+(v-m)**2,0)/(D.length-1)/D.length);
  console.log(`  walk-forward: ${log.join(' | ')} | pooled Δ${m.toFixed(3)}±${se.toFixed(3)} ¢/round (${D.length} rounds)`);}}
block('(A) round levels',F,['live','liveAll','fav']);
block('(B) hour blocks',H,['live','fav']);
// (C) late-flip rate by barrier (75–90 fav at 4:00 that still led at 10:00 but lost)
{const rows=R.map(o=>{const e=entry(o,'fav');if(!e)return null;const s=spot(o);if(s==null)return null;const b=o.at[600];const lead10=ok(b)?((e.c?b.ya:b.na)>=50):null;return{e,o,bar:between(s,o.strike,100),lead10};}).filter(Boolean);
 for(const bar of[true,false]){const g=rows.filter(r=>r.bar===bar&&r.lead10===true);const lf=g.filter(r=>r.o.up!==r.e.c).length;console.log(`(C) $100 barrier=${bar}: led at 10:00 ${g.length}, late flips ${lf} (${(lf/g.length*100).toFixed(1)}%)`);}}
