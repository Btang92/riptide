// Nov 26 evening. Live = 2026-11-18a (brain in charge). NEW family queued as "weekly/monthly level effects":
// where BTC sits at the 4:00 lock vs the session reference levels traders watch (UTC daily open, weekly open (Mon 00 UTC),
// monthly open, prior UTC day high/low). Idea: a favourite whose side agrees with the day's/week's direction holds better,
// and a reference level lying between spot and strike acts as a cushion (support/resistance) against the late flip.
// Features (signed toward the side of the bet / favourite, in units of 60-min σ·√11 = σ over the time left):
//   dO = ln(spot/daily open), wO = ln(spot/weekly open), mO = ln(spot/month open), each ×sgn/σ; lvl = 1 if any of
//   {daily open, weekly open, prior-day high, prior-day low} lies strictly between strike and spot.
// A) Information vs Kalshi 4:00 favourite LR (train older 75%, test newest 25%). B) 18a skip gates, paired ¢/round, expanding WF.
import fs from 'node:fs';import {R,feeP,stat} from './sim.mjs';import {fitLR,brainP,scoreSet} from './lib.mjs';
const M=JSON.parse(fs.readFileSync('lab/data/candles.json'));const J=JSON.stringify,f=(v,d=3)=>(v>=0?'+':'')+v.toFixed(d);
const ms=d=>{if(!d.length)return{m:0,se:0,n:0};const m=d.reduce((s,v)=>s+v,0)/d.length;return{m,se:d.length>1?Math.sqrt(d.reduce((s,v)=>s+(v-m)**2,0)/(d.length-1)/d.length):0,n:d.length};};
const side=(a,c)=>c?a.ya:a.na,n=R.length,Qs=i=>[Math.floor(n*i/4),Math.floor(n*(i+1)/4)];
function at(o,s,m=3,lo=75,hi=90){const a=o.at[s];if(!a||!a.f||a.ya==null||a.na==null||a.pu==null)return null;const c=a.pu>=.5?1:0,ask=side(a,c);
 if(ask<lo||ask>hi)return null;if(Math.max(a.pu,1-a.pu)*100<ask+feeP(ask)+m)return null;const won=o.up===c;return{t:o.t,c,ask,won,pnl:(won?100-ask:-ask)-feeP(ask)};}
function fav(o,s,lo,hi){const a=o.at[s];if(!a||a.ya==null||a.na==null)return null;const c=a.ya>=a.na?1:0,ask=side(a,c);if(ask<lo||ask>hi)return null;
 if(a.pu!=null&&(a.pu>=.5?1:0)!==c)return null;const won=o.up===c;return{t:o.t,c,ask,won,pnl:(won?100-ask:-ask)-feeP(ask)};}
const E18=R.map(o=>at(o,240)||fav(o,240,91,93));
// candles: [tsec, low, high, open, close, vol]
const C=new Map(Object.entries(M).map(([k,v])=>[+k,v]));
const close=t=>{for(let d=1;d<=3;d++){const c=C.get(t-d*60000);if(c)return c[4];}return null;};
const openAt=t=>{for(let d=0;d<5;d++){const c=C.get(t+d*60000);if(c)return c[3];}return null;};
const DAY=86400000;
const dayHL=t0=>{let h=-1e18,l=1e18,k=0;for(let t=t0;t<t0+DAY;t+=60000){const c=C.get(t);if(c){h=Math.max(h,c[2]);l=Math.min(l,c[1]);k++;}}return k>1300?{h,l}:null;};
const HL=new Map();const getHL=t0=>{if(!HL.has(t0))HL.set(t0,dayHL(t0));return HL.get(t0);};
const sig60=t=>{const r=[];let p=close(t-60*60000);for(let i=59;i>=0;i--){const q=close(t-i*60000);if(p&&q)r.push(Math.log(q/p));p=q;}if(r.length<50)return null;
 const m=r.reduce((s,x)=>s+x,0)/r.length;return Math.sqrt(r.reduce((s,x)=>s+(x-m)**2,0)/(r.length-1));};
const F=R.map(o=>{const t=o.t+240000,spot=close(t),sg=sig60(t);if(!spot||!sg||!o.strike)return{};
 const d0=Math.floor(t/DAY)*DAY,dow=new Date(d0).getUTCDay(),w0=d0-((dow+6)%7)*DAY,dt=new Date(d0),m0=Date.UTC(dt.getUTCFullYear(),dt.getUTCMonth(),1);
 const dOp=openAt(d0),wOp=openAt(w0),mOp=openAt(m0),pd=getHL(d0-DAY);if(!dOp||!wOp)return{};
 const S=sg*Math.sqrt(11);const x={dO:Math.log(spot/dOp)/S,wO:Math.log(spot/wOp)/S,mO:mOp?Math.log(spot/mOp)/S:null};
 const lo=Math.min(spot,o.strike),hi=Math.max(spot,o.strike);const L=[dOp,wOp];if(pd)L.push(pd.h,pd.l);x.lvl=L.some(v=>v>lo&&v<hi)?1:0;return x;});
// sign toward a side c (1=UP): continuous features flip sign for DOWN; lvl is side-free
const sF=(x,k,c)=>x[k]==null?null:k==='lvl'?x[k]:(c?1:-1)*x[k];
const FK=['dO','wO','mO','lvl'];
console.log(`${n} rounds → ${new Date(R[n-1].t).toISOString().slice(0,16)}; 18a ${J(stat(E18.filter(Boolean)))}; features known ${FK.map(k=>k+' '+F.filter(x=>x[k]!=null).length).join(', ')}`);
// A
{const cl=p=>Math.min(.99,Math.max(.01,p)),lg=p=>Math.log(p/(1-p));const rows=[];
 R.forEach((o,i)=>{const a=o.at[240];if(!a||a.ya==null||a.na==null)return;const c=a.ya>=a.na?1:0,mid=cl(((c?a.ya:a.na)+100-(c?a.na:a.ya))/200);if(FK.some(k=>F[i][k]==null))return;
  rows.push({i,L:lg(mid),y:o.up===c?1:0,G:Object.fromEntries(FK.map(k=>[k,sF(F[i],k,c)]))});});
 const cut=Math.floor(rows.length*.75),tr=rows.slice(0,cut),te=rows.slice(cut);
 const z={};for(const k of FK){const v=tr.map(r=>r.G[k]);const m=v.reduce((s,x)=>s+x,0)/v.length,sd=Math.sqrt(v.reduce((s,x)=>s+(x-m)**2,0)/v.length)||1;z[k]=x=>Math.max(-4,Math.min(4,(x-m)/sd));}
 const sc=fx=>{const m=fitLR(tr.map(fx),tr.map(r=>r.y));const p=te.map(r=>brainP(m,fx(r)));const s=scoreSet(p,te.map(r=>r.y));
  return{s,ll:te.map((r,j)=>-(r.y?Math.log(cl(p[j])):Math.log(1-cl(p[j]))))};};
 const base=sc(r=>[r.L]);console.log(`\nA) favourite-wins at 4:00, ${rows.length} rounds (test ${te.length}): Kalshi-only LR log-loss ${base.s.ll.toFixed(4)}`);
 for(const k of FK){const v=sc(r=>[r.L,z[k](r.G[k]),z[k](r.G[k])*r.L]);const d=ms(v.ll.map((x,j)=>base.ll[j]-x));console.log(`   + ${k.padEnd(4)} log-loss ${v.s.ll.toFixed(4)} (gain ${f(d.m,4)}±${d.se.toFixed(4)})`);}
 const all=sc(r=>[r.L,...FK.flatMap(k=>[z[k](r.G[k]),z[k](r.G[k])*r.L])]);const d=ms(all.ll.map((x,j)=>base.ll[j]-x));console.log(`   + all  log-loss ${all.s.ll.toFixed(4)} (gain ${f(d.m,4)}±${d.se.toFixed(4)})`);
 // favourites 75–93 by tercile of each feature (all rounds), ¢/ct buying the favourite
 for(const k of FK){const B={};const v=rows.map(r=>r.G[k]).sort((a,b)=>a-b),t1=v[Math.floor(v.length/3)],t2=v[Math.floor(v.length*2/3)];
  rows.forEach(r=>{const a=R[r.i].at[240],c=a.ya>=a.na?1:0,ask=side(a,c);if(ask<75||ask>93)return;const g=k==='lvl'?(r.G[k]?'yes':'no'):r.G[k]<t1?'low':r.G[k]<t2?'mid':'high';
   (B[g]??=[]).push({pnl:(r.y?100-ask:-ask)-feeP(ask),won:!!r.y,ask});});
  console.log(`   75–93 favourites by ${k}: `+Object.keys(B).sort().map(g=>`${g} ${J(stat(B[g]))}`).join(' | '));}}
// 18a bets by feature
for(const k of FK){const B={};const v=F.map((x,i)=>E18[i]?sF(x,k,E18[i].c):null).filter(x=>x!=null).sort((a,b)=>a-b),t1=v[Math.floor(v.length/3)],t2=v[Math.floor(v.length*2/3)];
 E18.forEach((e,i)=>{if(!e)return;const x=sF(F[i],k,e.c);if(x==null)return;const g=k==='lvl'?(x?'yes':'no'):x<t1?'low':x<t2?'mid':'high';(B[g]??=[]).push(e);});
 console.log(`   18a bets by ${k}: `+Object.keys(B).sort().map(g=>`${g} ${J(stat(B[g]))}`).join(' | '));}
// B
const DD=(A,B,a,b)=>{const X=[];for(let i=a;i<b;i++)X.push((A[i]?A[i].pnl:0)-(B[i]?B[i].pnl:0));return X;};
const CK=['dO','wO','mO'];
const terc=(k,end)=>{const v=[];for(let i=0;i<end;i++){const e=E18[i];if(!e)continue;const x=sF(F[i],k,e.c);if(x!=null)v.push(x);}v.sort((a,b)=>a-b);return[v[Math.floor(v.length/3)],v[Math.floor(v.length*2/3)]];};
const RULES=['none','lvl skip no','lvl skip yes'];for(const k of CK)RULES.push(k+' skip low',k+' skip high',k+' skip neg',k+' skip pos');
function variant(rule,thr){if(rule==='none')return E18;const[k,,w]=rule.split(' ');
 return E18.map((e,i)=>{if(!e)return e;const x=sF(F[i],k,e.c);if(x==null)return e;if(k==='lvl')return(w==='no'?!x:!!x)?null:e;const[t1,t2]=thr[k];
  if(w==='low'&&x<t1)return null;if(w==='high'&&x>=t2)return null;if(w==='neg'&&x<0)return null;if(w==='pos'&&x>0)return null;return e;});}
const thrAll={};for(const k of CK)thrAll[k]=terc(k,Math.floor(n*.25));
console.log(`\nB) skip gates vs 18a (terciles of 18a bets in oldest 25%): Δ ¢/round whole | quarters; removed bets`);
for(const r of RULES.slice(1)){const A=variant(r,thrAll),d=ms(DD(A,E18,0,n));const q=[0,1,2,3].map(i=>{const[a,b]=Qs(i);return f(ms(DD(A,E18,a,b)).m,2);}).join('/');
 console.log(`   ${r.padEnd(14)} ${f(d.m)}±${d.se.toFixed(3)} (${(d.m/(d.se||1)).toFixed(1)} SE) | ${q}; removed ${J(stat(E18.filter((e,i)=>e&&!A[i])))}`);}
{const pooled=[],picks=[];let tb=0;for(let qq=1;qq<4;qq++){const[a,b]=Qs(qq);const thr={};for(const k of CK)thr[k]=terc(k,a);let best='none',bv=0;
  for(const r of RULES){const v=ms(DD(variant(r,thr),E18,0,a)).m;if(v>bv){bv=v;best=r;}}
  picks.push(`Q${qq+1} ${best}`);const A=variant(best,thr);pooled.push(...DD(A,E18,a,b));tb+=A.slice(a,b).filter(Boolean).length;}
 const p=ms(pooled);console.log(`   WF: ${picks.join(', ')} → ${f(p.m)}±${p.se.toFixed(3)} (${(p.m/(p.se||1)).toFixed(1)} SE; ${tb} test bets)`);}
{const[a,b]=Qs(3);const thr={};for(const k of CK)thr[k]=terc(k,a);console.log('   newest 25% only: '+RULES.slice(1).map(r=>{const d=ms(DD(variant(r,thr),E18,a,b));return`${r} ${f(d.m,2)}±${d.se.toFixed(2)}`;}).join('; '));}
