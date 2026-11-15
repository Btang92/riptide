// Nov 15 evening, under the 4:00 lock.
// A) read<th exit (sell at bid−1 when RIPTIDE's read on our side < th at any check 5:00–10:00): expanding walk-forward Q2–Q4 choosing th
//    in {none,.3,.35,.4,.45,.5} on earlier rounds, for live 12–24, live all hours and the Kalshi 75–90 favourite set. Forward since Nov 12 12:00.
// B) in-round volatility burst at the lock: σ of the four 1-min moves 0:00–4:00 vs σ of the 60 min before the round (ratio r);
//    also round range 0:00–4:00 / σ60. Skip if r ≥ 1.5/2/2.5 or r ≤ .5/.67; aimed at calls that turn against by 5:00.
// C) trading hours forward check: 00–12 ET added bets since Nov 13 12:00 UTC.
import fs from 'fs';import {R,feeP,stat} from './sim.mjs';import {et} from './lib.mjs';
const J=JSON.stringify,f=(v,d=3)=>(v>=0?'+':'')+v.toFixed(d);
const M=JSON.parse(fs.readFileSync('lab/data/candles.json'));
const n=R.length,Qs=i=>[Math.floor(n*i/4),Math.floor(n*(i+1)/4)];
const ms=d=>{if(!d.length)return{m:0,se:0,n:0};const m=d.reduce((s,v)=>s+v,0)/d.length;return{m,se:d.length>1?Math.sqrt(d.reduce((s,v)=>s+(v-m)**2,0)/(d.length-1)/d.length):0,n:d.length};};
const side=(a,c)=>c?a.ya:a.na,EX=[300,360,420,480,600];
function entry(o,set){const a=o.at[240];if(!a||!a.f||a.ya==null||a.na==null||a.pu==null)return null;const h=et(o.t).h;let c,ask;
 if(set==='fav'){c=a.ya>=a.na?1:0;ask=side(a,c);if(ask<75||ask>90)return null;}
 else{if(set==='live'&&h<12)return null;c=a.pu>=.5?1:0;ask=side(a,c);if(ask<75||ask>90)return null;if(Math.max(a.pu,1-a.pu)*100<ask+feeP(ask)+3)return null;}
 const won=o.up===c;return{t:o.t,c,ask,won,h,hold:(won?100-ask:-ask)-feeP(ask)};}
function exitD(o,e,th){if(th==null)return 0;for(const s of EX){const a=o.at[s];if(!a||a.ya==null||a.na==null||a.pu==null)continue;const bid=100-side(a,1-e.c)-1;if(bid<1)continue;const ps=e.c?a.pu:1-a.pu;
 if(ps<th)return (bid-e.ask-feeP(e.ask)-feeP(bid))-e.hold;}return 0;}
function vol(o){const t0=o.t;const c=[];for(let i=-60;i<=4;i++){const y=M[t0+i*60000];c.push(y?y[4]:null);}if(c.some(v=>v==null))return null;
 let v=0;for(let i=1;i<=60;i++)v+=Math.log(c[i]/c[i-1])**2;const s60=Math.sqrt(v/60);let w=0;for(let i=61;i<=64;i++)w+=Math.log(c[i]/c[i-1])**2;const s4=Math.sqrt(w/4);
 let hi=-1e9,lo=1e9;for(let i=0;i<4;i++){const y=M[t0+i*60000];hi=Math.max(hi,y[2]);lo=Math.min(lo,y[3]);}
 return s60?{r:s4/s60,rg:Math.log(hi/lo)/(s60*2)}:null;}
const SETS={'live 12–24':'live','live all hours':'all','fav 75–90 all hours':'fav'};const out={A:{},B:{},C:{}};
console.log(`${n} rounds ${new Date(R[0].t).toISOString().slice(0,10)} → ${new Date(R[n-1].t).toISOString().slice(0,16)}`);
// ---- A
const THS=[null,.3,.35,.4,.45,.5];const FW=Date.UTC(2026,10,12,12);
for(const [sn,set] of Object.entries(SETS)){const E=R.map(o=>{const e=entry(o,set);return e?{o,e}:null;});
 const D=(th,lo,hi)=>{const X=[];for(let i=lo;i<hi;i++){const x=E[i];X.push(x?exitD(x.o,x.e,th):0);}return X;};
 const whole=THS.slice(1).map(th=>{const d=ms(D(th,0,n));return`<${th} ${f(d.m,2)}±${d.se.toFixed(2)}`;});
 const pooled=[],picks=[];let tb=0;for(let i=1;i<4;i++){const[a,b]=Qs(i);let best=null,bv=0;for(const th of THS.slice(1)){const v=ms(D(th,0,a)).m;if(v>bv){bv=v;best=th;}}
  picks.push(`Q${i+1} ${best??'hold'}`);pooled.push(...D(best,a,b));tb+=E.slice(a,b).filter(Boolean).length;}
 const p=ms(pooled);const fi=R.findIndex(o=>o.t>=FW);const fw=ms(D(.4,fi,n)),fwb=E.slice(fi).filter(Boolean).length;
 const nb=E.filter(Boolean).length;const exits=E.filter(x=>x&&exitD(x.o,x.e,.4)!==0);
 out.A[sn]={bets:nb,whole,WF:{m:+p.m.toFixed(3),se:+p.se.toFixed(3),picks,testBets:tb},fwd:{m:+fw.m.toFixed(3),se:+fw.se.toFixed(3),bets:fwb},exits04:exits.length,exitsWon:exits.filter(x=>x.e.won).length};
 console.log(`A ${sn}: ${nb} bets; whole Δ¢/round ${whole.join(' | ')}; WF ${picks.join(', ')} → ${f(p.m)}±${p.se.toFixed(3)} (${tb} test bets); fwd since Nov12 <.4 ${f(fw.m)}±${fw.se.toFixed(3)} (${fwb} bets); <.4 exits ${exits.length}, would have won ${exits.filter(x=>x.e.won).length}`);}
// ---- B
const V=new Map(R.map(o=>[o.t,vol(o)]));
const RULES={};for(const th of[1.5,2,2.5])RULES[`skip r≥${th}`]=v=>v&&v.r>=th;for(const th of[.5,.67])RULES[`skip r≤${th}`]=v=>v&&v.r<=th;
for(const th of[1.5,2,3])RULES[`skip range≥${th}`]=v=>v&&v.rg>=th;RULES['skip range≤0.75']=v=>v&&v.rg<=.75;
for(const [sn,set] of Object.entries(SETS)){const E=R.map(o=>entry(o,set));const B=E.filter(Boolean).map(e=>({...e,pnl:e.hold}));
 const buck={};for(const e of B){const v=V.get(e.t);if(!v)continue;const k=v.r<.67?'<.67':v.r<1?'.67–1':v.r<1.5?'1–1.5':'≥1.5';(buck[k]??=[]).push(e);}
 const bs=Object.fromEntries(['<.67','.67–1','1–1.5','≥1.5'].map(k=>[k,stat(buck[k]||[])]));
 const D=(k,lo,hi)=>{const X=[];for(let i=lo;i<hi;i++){const e=E[i];X.push(e&&RULES[k](V.get(e.t))?-e.hold:0);}return X;};
 const rows={};for(const k of Object.keys(RULES)){const d=ms(D(k,0,n));const q=[0,1,2,3].map(i=>{const[a,b]=Qs(i);return +ms(D(k,a,b)).m.toFixed(3);});rows[k]={m:+d.m.toFixed(3),se:+d.se.toFixed(3),q,dropped:stat(B.filter(e=>RULES[k](V.get(e.t))))};}
 const pooled=[],picks=[];let tb=0;for(let i=1;i<4;i++){const[a,b]=Qs(i);let best=null,bv=0;for(const k of Object.keys(RULES)){const v=ms(D(k,0,a)).m;if(v>bv){bv=v;best=k;}}
  picks.push(`Q${i+1} ${best||'live'}`);pooled.push(...(best?D(best,a,b):Array(b-a).fill(0)));tb+=E.slice(a,b).filter(Boolean).length;}
 const p=ms(pooled);out.B[sn]={base:stat(B),buckets:bs,rules:rows,WF:{m:+p.m.toFixed(3),se:+p.se.toFixed(3),picks,testBets:tb}};
 console.log(`\nB ${sn}: ${J(stat(B))}\n  r buckets ${J(bs)}`);for(const[k,v]of Object.entries(rows))console.log(`  ${k.padEnd(16)} Δ ${f(v.m)}±${v.se} Q ${v.q.join('/')} dropped ${J(v.dropped)}`);
 console.log(`  WF ${picks.join(', ')} → ${f(p.m)}±${p.se.toFixed(3)} (${tb} test bets)`);}
// ---- C
const C0=Date.UTC(2026,10,13,12);const add=R.filter(o=>o.t>=C0).map(o=>{const e=entry(o,'all');return e&&e.h<12?{...e,pnl:e.hold}:null;}).filter(Boolean);
const addAll=R.map(o=>{const e=entry(o,'all');return e&&e.h<12?{...e,pnl:e.hold}:null;}).filter(Boolean);
out.C={since:stat(add),whole:stat(addAll)};console.log(`\nC 00–12 ET added bets since Nov 13 12:00: ${J(stat(add))}; whole ${J(stat(addAll))}`);
fs.writeFileSync('/tmp/claude-0/t1115e.json',J(out));
