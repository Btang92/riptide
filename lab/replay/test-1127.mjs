// Nov 27 morning. Live = 2026-11-18a (brain in charge). Two untested ideas:
// (1) NEW family: VWAP position at the 4:00 lock. Traders watch VWAP as fair value; a favourite whose spot sits on the right side
//     of the round's own VWAP (0:00–4:00, Coinbase 1-min typical price × volume) or the last 60-min VWAP may hold better, and the
//     round VWAP lying between strike and spot may act as a cushion. Features signed toward our side, in σ60·√11 units:
//     rV = ln(spot/VWAP round 0–4), hV = ln(spot/VWAP 60 min), dV = rV−hV (in-round flow vs hour), vc = round VWAP between strike and spot.
// (2) EDGE CAP (entry price): real fills showed the checkpoint ask is stale when the read's edge is big (slippage +3.3¢ at edge ≥12).
//     Skip 18a 75–90 bets whose raw edge (read − ask − fee) exceeds 6/8/10/12/15 pts; also with a slippage-adjusted P&L
//     (+0.9/+1.3/+1.3/+3.3¢ by edge 3–5/5–8/8–12/≥12, from the Nov 21 real-fill study; 91–93 adds 0).
// A) Information vs Kalshi 4:00 favourite LR (train older 75%, test newest 25%). B) 18a skip gates, paired ¢/round, quarters, expanding WF Q2–Q4.
import fs from 'node:fs';import {R,feeP,stat} from './sim.mjs';import {fitLR,brainP,scoreSet} from './lib.mjs';
const M=JSON.parse(fs.readFileSync('lab/data/candles.json'));const J=JSON.stringify,f=(v,d=3)=>(v>=0?'+':'')+v.toFixed(d);
const ms=d=>{if(!d.length)return{m:0,se:0,n:0};const m=d.reduce((s,v)=>s+v,0)/d.length;return{m,se:d.length>1?Math.sqrt(d.reduce((s,v)=>s+(v-m)**2,0)/(d.length-1)/d.length):0,n:d.length};};
const side=(a,c)=>c?a.ya:a.na,n=R.length,Qs=i=>[Math.floor(n*i/4),Math.floor(n*(i+1)/4)];
function at(o,s,m=3,lo=75,hi=90){const a=o.at[s];if(!a||!a.f||a.ya==null||a.na==null||a.pu==null)return null;const c=a.pu>=.5?1:0,ask=side(a,c);
 if(ask<lo||ask>hi)return null;const edge=Math.max(a.pu,1-a.pu)*100-ask-feeP(ask);if(edge<m)return null;const won=o.up===c;return{t:o.t,c,ask,won,edge,kind:'band',pnl:(won?100-ask:-ask)-feeP(ask)};}
function fav(o,s,lo,hi){const a=o.at[s];if(!a||a.ya==null||a.na==null)return null;const c=a.ya>=a.na?1:0,ask=side(a,c);if(ask<lo||ask>hi)return null;
 if(a.pu!=null&&(a.pu>=.5?1:0)!==c)return null;const won=o.up===c;return{t:o.t,c,ask,won,edge:null,kind:'add',pnl:(won?100-ask:-ask)-feeP(ask)};}
const E18=R.map(o=>at(o,240)||fav(o,240,91,93));
const C=new Map(Object.entries(M).map(([k,v])=>[+k,v]));
const close=t=>{for(let d=1;d<=3;d++){const c=C.get(t-d*60000);if(c)return c[4];}return null;};
const vwap=(a,b)=>{let pv=0,v=0;for(let t=a;t<b;t+=60000){const c=C.get(t);if(c&&c[5]>0){pv+=(c[1]+c[2]+c[4])/3*c[5];v+=c[5];}}return v>0?pv/v:null;};
const sig60=t=>{const r=[];let p=close(t-60*60000);for(let i=59;i>=0;i--){const q=close(t-i*60000);if(p&&q)r.push(Math.log(q/p));p=q;}if(r.length<50)return null;
 const m=r.reduce((s,x)=>s+x,0)/r.length;return Math.sqrt(r.reduce((s,x)=>s+(x-m)**2,0)/(r.length-1));};
const F=R.map(o=>{const t=o.t+240000,spot=close(t),sg=sig60(t);if(!spot||!sg||!o.strike)return{};const rv=vwap(o.t,t),hv=vwap(t-3600000,t);if(!rv||!hv)return{};
 const S=sg*Math.sqrt(11),x={rV:Math.log(spot/rv)/S,hV:Math.log(spot/hv)/S};x.dV=x.rV-x.hV;const lo=Math.min(spot,o.strike),hi=Math.max(spot,o.strike);x.vc=rv>lo&&rv<hi?1:0;return x;});
const sF=(x,k,c)=>x[k]==null?null:k==='vc'?x[k]:(c?1:-1)*x[k];
const FK=['rV','hV','dV','vc'];
console.log(`${n} rounds → ${new Date(R[n-1].t).toISOString().slice(0,16)}; 18a ${J(stat(E18.filter(Boolean)))} (band ${E18.filter(e=>e&&e.kind==='band').length}, add ${E18.filter(e=>e&&e.kind==='add').length}); features known ${F.filter(x=>x.rV!=null).length}`);
// A) information
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
 for(const k of FK){const B={};const v=rows.map(r=>r.G[k]).sort((a,b)=>a-b),t1=v[Math.floor(v.length/3)],t2=v[Math.floor(v.length*2/3)];
  rows.forEach(r=>{const a=R[r.i].at[240],c=a.ya>=a.na?1:0,ask=side(a,c);if(ask<75||ask>93)return;const g=k==='vc'?(r.G[k]?'yes':'no'):r.G[k]<t1?'low':r.G[k]<t2?'mid':'high';
   (B[g]??=[]).push({pnl:(r.y?100-ask:-ask)-feeP(ask),won:!!r.y,ask});});
  console.log(`   75–93 favourites by ${k}: `+Object.keys(B).sort().map(g=>`${g} ${J(stat(B[g]))}`).join(' | '));}}
for(const k of FK){const B={};const v=F.map((x,i)=>E18[i]?sF(x,k,E18[i].c):null).filter(x=>x!=null).sort((a,b)=>a-b),t1=v[Math.floor(v.length/3)],t2=v[Math.floor(v.length*2/3)];
 E18.forEach((e,i)=>{if(!e)return;const x=sF(F[i],k,e.c);if(x==null)return;const g=k==='vc'?(x?'yes':'no'):x<t1?'low':x<t2?'mid':'high';(B[g]??=[]).push(e);});
 console.log(`   18a bets by ${k}: `+Object.keys(B).sort().map(g=>`${g} ${J(stat(B[g]))}`).join(' | '));}
// B) gates
const DD=(A,B,a,b)=>{const X=[];for(let i=a;i<b;i++)X.push((A[i]?A[i].pnl:0)-(B[i]?B[i].pnl:0));return X;};
const CK=['rV','hV','dV'];
const terc=(k,end)=>{const v=[];for(let i=0;i<end;i++){const e=E18[i];if(!e)continue;const x=sF(F[i],k,e.c);if(x!=null)v.push(x);}v.sort((a,b)=>a-b);return[v[Math.floor(v.length/3)],v[Math.floor(v.length*2/3)]];};
const RULES=['none','vc skip no','vc skip yes'];for(const k of CK)RULES.push(k+' skip low',k+' skip high',k+' skip neg',k+' skip pos');
function variant(rule,thr){if(rule==='none')return E18;const[k,,w]=rule.split(' ');
 return E18.map((e,i)=>{if(!e)return e;const x=sF(F[i],k,e.c);if(x==null)return e;if(k==='vc')return(w==='no'?!x:!!x)?null:e;const[t1,t2]=thr[k];
  if(w==='low'&&x<t1)return null;if(w==='high'&&x>=t2)return null;if(w==='neg'&&x<0)return null;if(w==='pos'&&x>0)return null;return e;});}
function gates(title,RUL,varf,thrf){console.log(`\n${title}: Δ ¢/round whole | quarters; removed bets`);
 const thrAll=thrf(Math.floor(n*.25));
 for(const r of RUL.slice(1)){const A=varf(r,thrAll),d=ms(DD(A,E18,0,n));const q=[0,1,2,3].map(i=>{const[a,b]=Qs(i);return f(ms(DD(A,E18,a,b)).m,2);}).join('/');
  console.log(`   ${r.padEnd(16)} ${f(d.m)}±${d.se.toFixed(3)} (${(d.m/(d.se||1)).toFixed(1)} SE) | ${q}; removed ${J(stat(E18.filter((e,i)=>e&&!A[i])))}`);}
 const pooled=[],picks=[];let tb=0;for(let qq=1;qq<4;qq++){const[a,b]=Qs(qq);const thr=thrf(a);let best='none',bv=0;
  for(const r of RUL){const v=ms(DD(varf(r,thr),E18,0,a)).m;if(v>bv){bv=v;best=r;}}
  picks.push(`Q${qq+1} ${best}`);const A=varf(best,thr);pooled.push(...DD(A,E18,a,b));tb+=A.slice(a,b).filter(Boolean).length;}
 const p=ms(pooled);console.log(`   WF: ${picks.join(', ')} → ${f(p.m)}±${p.se.toFixed(3)} (${(p.m/(p.se||1)).toFixed(1)} SE; ${tb} test bets)`);
 const[a,b]=Qs(3);const thr=thrf(a);console.log('   newest 25% only: '+RUL.slice(1).map(r=>{const d=ms(DD(varf(r,thr),E18,a,b));return`${r} ${f(d.m,2)}±${d.se.toFixed(2)}`;}).join('; '));}
gates('B1) VWAP skip gates vs 18a (terciles of 18a bets before the scored part)',RULES,variant,end=>{const t={};for(const k of CK)t[k]=terc(k,end);return t;});
// B2 edge cap
const CAPS=['none',6,8,10,12,15].map(String);
const capV=(r)=>r==='none'?E18:E18.map(e=>e&&e.kind==='band'&&e.edge>+r?null:e);
console.log('\n18a band bets by raw edge: '+[[3,5],[5,8],[8,12],[12,99]].map(([a,b])=>`${a}–${b} ${J(stat(E18.filter(e=>e&&e.kind==='band'&&e.edge>=a&&e.edge<b)))}`).join(' | '));
gates('B2) edge cap on 18a 75–90 bets (checkpoint ask)',CAPS,r=>capV(r),()=>null);
// slippage-adjusted: subtract real-fill slippage by edge bucket from every band bet (and from the baseline)
const slip=e=>e.kind!=='band'?0:e.edge<5?0.9:e.edge<8?1.3:e.edge<12?1.3:3.3;
{const adj=A=>A.map(e=>e?{...e,pnl:e.pnl-slip(e)*(e.won?1:1)}:e);const base=adj(E18);
 console.log(`\nB3) edge cap with real-fill slippage (18a slip-adjusted ${J(stat(base.filter(Boolean)))})`);
 for(const r of CAPS.slice(1)){const A=adj(capV(r));const d=ms(DD(A,base,0,n)),d4=ms(DD(A,base,...Qs(3)));console.log(`   cap ${r.padEnd(3)} ${f(d.m)}±${d.se.toFixed(3)} (${(d.m/(d.se||1)).toFixed(1)} SE), newest 25% ${f(d4.m)}±${d4.se.toFixed(3)}`);}}
