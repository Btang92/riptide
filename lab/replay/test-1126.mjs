// Nov 26 (Thanksgiving). Live = 2026-11-18a (brain in charge). NEW family: BTC trading-ACTIVITY regime at the 4:00 lock.
// Idea: on thin days (holidays, quiet weekends) or unusually busy days, Kalshi's 75–93¢ favourites may be mispriced
// (thin tape = moves stick / busy tape = moves reverse). Kalshi's price reflects volatility, maybe not participation.
// Features (Coinbase 1-min volume, BTC units, ending at 4:00): v24r = log(24h volume / mean 24h volume over prior 7 days);
//   v60h = log(last-60-min volume / mean of the same clock hour on the prior 7 days); v60r = log(last 60 min / last 24h hourly mean).
// A) Information: favourite-wins LR on logit(Kalshi fav mid at 4:00) ± feature and feature×logit; train older 75%, test newest 25%.
// B) 18a skip gates (terciles fixed on rounds BEFORE each test quarter), paired ¢/round vs 18a, quarters, expanding WF Q2–Q4 incl none.
import fs from 'node:fs';import {R,feeP,stat} from './sim.mjs';import {fitLR,brainP,scoreSet} from './lib.mjs';
const M=JSON.parse(fs.readFileSync('lab/data/candles.json'));const J=JSON.stringify,f=(v,d=3)=>(v>=0?'+':'')+v.toFixed(d);
const ms=d=>{if(!d.length)return{m:0,se:0,n:0};const m=d.reduce((s,v)=>s+v,0)/d.length;return{m,se:d.length>1?Math.sqrt(d.reduce((s,v)=>s+(v-m)**2,0)/(d.length-1)/d.length):0,n:d.length};};
const side=(a,c)=>c?a.ya:a.na,n=R.length,Qs=i=>[Math.floor(n*i/4),Math.floor(n*(i+1)/4)];
function at(o,s,m=3,lo=75,hi=90){const a=o.at[s];if(!a||!a.f||a.ya==null||a.na==null||a.pu==null)return null;const c=a.pu>=.5?1:0,ask=side(a,c);
 if(ask<lo||ask>hi)return null;if(Math.max(a.pu,1-a.pu)*100<ask+feeP(ask)+m)return null;const won=o.up===c;return{t:o.t,c,ask,won,pnl:(won?100-ask:-ask)-feeP(ask)};}
function fav(o,s,lo,hi){const a=o.at[s];if(!a||a.ya==null||a.na==null)return null;const c=a.ya>=a.na?1:0,ask=side(a,c);if(ask<lo||ask>hi)return null;
 if(a.pu!=null&&(a.pu>=.5?1:0)!==c)return null;const won=o.up===c;return{t:o.t,c,ask,won,pnl:(won?100-ask:-ask)-feeP(ask)};}
const E18=R.map(o=>at(o,240)||fav(o,240,91,93));
// minute volume prefix sums
const keys=Object.keys(M).map(Number).sort((a,b)=>a-b),t0=keys[0],NM=(keys.at(-1)-t0)/60000+1;
const vol=new Float64Array(NM),have=new Uint8Array(NM);for(const k of keys){const i=(k-t0)/60000;vol[i]=M[k][5]||0;have[i]=1;}
const P=new Float64Array(NM+1),H=new Float64Array(NM+1);for(let i=0;i<NM;i++){P[i+1]=P[i]+vol[i];H[i+1]=H[i]+have[i];}
const V=(end,mins)=>{const b=(end-t0)/60000,a=b-mins;if(a<0||b>NM)return null;const h=H[b]-H[a];if(h<mins*.9)return null;return(P[b]-P[a])*mins/h;};
const F=R.map(o=>{const t=o.t+240000;const v24=V(t,1440),v60=V(t,60);if(v24==null||v60==null)return{};
 let s24=0,s60=0,c=0;for(let d=1;d<=7;d++){const a=V(t-d*86400000,1440),b=V(t-d*86400000,60);if(a!=null&&b!=null){s24+=a;s60+=b;c++;}}
 if(c<5)return{};return{v24r:Math.log(v24/(s24/c)),v60h:Math.log(v60/(s60/c)),v60r:Math.log(v60/(v24/24))};});
const FK=['v24r','v60h','v60r'];
console.log(`${n} rounds → ${new Date(R[n-1].t).toISOString().slice(0,16)}; 18a ${J(stat(E18.filter(Boolean)))}; features known ${FK.map(k=>k+' '+F.filter(x=>x[k]!=null).length).join(', ')}`);
{const md=k=>{const v=F.map(x=>x[k]).filter(v=>v!=null).sort((a,b)=>a-b);return[.25,.5,.75].map(q=>v[Math.floor(v.length*q)].toFixed(2)).join('/');};console.log('   quartiles: '+FK.map(k=>k+' '+md(k)).join(', '));}
// recent days activity
{const D={};R.forEach((o,i)=>{if(F[i].v24r==null)return;const d=new Date(o.t-5*3600e3).toISOString().slice(0,10);(D[d]??=[]).push(F[i].v24r);});
 console.log('   last 8 ET days mean v24r: '+Object.entries(D).slice(-8).map(([d,v])=>d.slice(5)+' '+f(v.reduce((s,x)=>s+x,0)/v.length,2)).join(', '));}
// A
{const cl=p=>Math.min(.99,Math.max(.01,p)),lg=p=>Math.log(p/(1-p));const rows=[];
 R.forEach((o,i)=>{const a=o.at[240];if(!a||a.ya==null||a.na==null)return;const c=a.ya>=a.na?1:0,mid=cl(((c?a.ya:a.na)+100-(c?a.na:a.ya))/200);if(FK.some(k=>F[i][k]==null))return;rows.push({i,L:lg(mid),y:o.up===c?1:0,F:F[i]});});
 const cut=Math.floor(rows.length*.75),tr=rows.slice(0,cut),te=rows.slice(cut);
 const z={};for(const k of FK){const v=tr.map(r=>r.F[k]);const m=v.reduce((s,x)=>s+x,0)/v.length,sd=Math.sqrt(v.reduce((s,x)=>s+(x-m)**2,0)/v.length);z[k]=x=>(x-m)/sd;}
 const sc=(fx)=>{const m=fitLR(tr.map(fx),tr.map(r=>r.y));const p=te.map(r=>brainP(m,fx(r)));const s=scoreSet(p,te.map(r=>r.y));
  const ll=te.map((r,j)=>-(r.y?Math.log(cl(p[j])):Math.log(1-cl(p[j]))));return{s,ll};};
 const base=sc(r=>[r.L]);console.log(`\nA) favourite-wins at 4:00, ${rows.length} rounds (test ${te.length}): Kalshi-only LR log-loss ${base.s.ll.toFixed(4)}`);
 for(const k of FK){const v=sc(r=>[r.L,z[k](r.F[k]),z[k](r.F[k])*r.L]);const d=ms(v.ll.map((x,j)=>base.ll[j]-x));console.log(`   + ${k.padEnd(5)} log-loss ${v.s.ll.toFixed(4)} (gain ${f(d.m,4)}±${d.se.toFixed(4)})`);}
 const all=sc(r=>[r.L,...FK.flatMap(k=>[z[k](r.F[k]),z[k](r.F[k])*r.L])]);const d=ms(all.ll.map((x,j)=>base.ll[j]-x));console.log(`   + all   log-loss ${all.s.ll.toFixed(4)} (gain ${f(d.m,4)}±${d.se.toFixed(4)})`);
 for(const k of FK){const B={};const v=F.map(x=>x[k]).filter(x=>x!=null).sort((a,b)=>a-b),t1=v[Math.floor(v.length/3)],t2=v[Math.floor(v.length*2/3)];
  E18.forEach((e,i)=>{if(!e||F[i][k]==null)return;const g=F[i][k]<t1?'low':F[i][k]<t2?'mid':'high';(B[g]??=[]).push(e);});console.log(`   18a bets by ${k} tercile: `+['low','mid','high'].map(g=>`${g} ${J(stat(B[g]||[]))}`).join(' | '));}}
// B
const DD=(A,B,a,b)=>{const X=[];for(let i=a;i<b;i++)X.push((A[i]?A[i].pnl:0)-(B[i]?B[i].pnl:0));return X;};
const terc=(k,end)=>{const v=F.slice(0,end).map(x=>x[k]).filter(x=>x!=null).sort((a,b)=>a-b);return[v[Math.floor(v.length/3)],v[Math.floor(v.length*2/3)]];};
const RULES=['none'];for(const k of FK)RULES.push(k+' skip low',k+' skip high',k+' skip mid',k+' skip out');
function variant(rule,thr){if(rule==='none')return E18;const[k,,w]=rule.split(' ');const[t1,t2]=thr[k];
 return E18.map((e,i)=>{if(!e)return e;const x=F[i][k];if(x==null)return e;if(w==='low'&&x<t1)return null;if(w==='high'&&x>=t2)return null;if(w==='mid'&&x>=t1&&x<t2)return null;if(w==='out'&&(x<t1||x>=t2))return null;return e;});}
const thrAll={};for(const k of FK)thrAll[k]=terc(k,Math.floor(n*.25));
console.log(`\nB) skip gates vs 18a (terciles from oldest 25%): Δ ¢/round whole | quarters; removed bets`);
for(const r of RULES.slice(1)){const A=variant(r,thrAll),d=ms(DD(A,E18,0,n));const q=[0,1,2,3].map(i=>{const[a,b]=Qs(i);return f(ms(DD(A,E18,a,b)).m,2);}).join('/');
 console.log(`   ${r.padEnd(15)} ${f(d.m)}±${d.se.toFixed(3)} (${(d.m/(d.se||1)).toFixed(1)} SE) | ${q}; removed ${J(stat(E18.filter((e,i)=>e&&!A[i])))}`);}
{const pooled=[],picks=[];let tb=0;for(let qq=1;qq<4;qq++){const[a,b]=Qs(qq);const thr={};for(const k of FK)thr[k]=terc(k,a);let best='none',bv=0;
  for(const r of RULES){const v=ms(DD(variant(r,thr),E18,0,a)).m;if(v>bv){bv=v;best=r;}}
  picks.push(`Q${qq+1} ${best}`);const A=variant(best,thr);pooled.push(...DD(A,E18,a,b));tb+=A.slice(a,b).filter(Boolean).length;}
 const p=ms(pooled);console.log(`   WF: ${picks.join(', ')} → ${f(p.m)}±${p.se.toFixed(3)} (${(p.m/(p.se||1)).toFixed(1)} SE; ${tb} test bets)`);}
// newest 25% alone, each rule with thresholds from older 75%
{const[a,b]=Qs(3);const thr={};for(const k of FK)thr[k]=terc(k,a);console.log('   newest 25% only (thresholds from older): '+RULES.slice(1).map(r=>{const d=ms(DD(variant(r,thr),E18,a,b));return`${r} ${f(d.m,2)}±${d.se.toFixed(2)}`;}).join('; '));}
