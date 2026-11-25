// Nov 25 evening. Live = 2026-11-18a (brain in charge). NEW family: BTC micro-structure persistence before the 4:00 call.
// Idea: when 1-min returns have been MEAN-REVERTING (negative lag-1 autocorrelation, variance ratio < 1), the move that made our side
// the favourite is more likely to give back → "turned against by 5:00" losses; when TRENDING (VR > 1), favourites hold better.
// Kalshi's price reflects volatility level but maybe not its autocorrelation structure.
// Features (Coinbase 1-min candles ending at 4:00): ac60/ac120 = lag-1 autocorr of 1-min returns over last 60/120 min;
//   vr5 = var of non-overlapping 5-min returns / (5 · var 1-min) over last 120 min; vr15 = same with 15-min over last 240 min.
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
// features
const closes=(t,N)=>{const c=[];for(let k=N;k>=0;k--){const x=M[t-k*60000];c.push(x?x[4]:null);}return c;};
const rets=c=>{const r=[];for(let i=1;i<c.length;i++)r.push(c[i]!=null&&c[i-1]!=null?Math.log(c[i]/c[i-1]):null);return r;};
function ac(r){const p=[];for(let i=1;i<r.length;i++)if(r[i]!=null&&r[i-1]!=null)p.push([r[i-1],r[i]]);if(p.length<30)return null;
 const mx=p.reduce((s,v)=>s+v[0],0)/p.length,my=p.reduce((s,v)=>s+v[1],0)/p.length;let sxy=0,sx=0,sy=0;for(const[x,y]of p){sxy+=(x-mx)*(y-my);sx+=(x-mx)**2;sy+=(y-my)**2;}return sx&&sy?sxy/Math.sqrt(sx*sy):null;}
function vr(c,q){const r1=rets(c).filter(v=>v!=null);if(r1.length<c.length*.8)return null;const v1=r1.reduce((s,v)=>s+v*v,0)/r1.length;const rq=[];
 for(let i=c.length-1;i-q>=0;i-=q)if(c[i]!=null&&c[i-q]!=null)rq.push(Math.log(c[i]/c[i-q]));if(rq.length<6||!v1)return null;return rq.reduce((s,v)=>s+v*v,0)/rq.length/(q*v1);}
const F=R.map(o=>{const t=o.t+180000;const c120=closes(t,120),c240=closes(t,240),c60=c120.slice(60);
 return{ac60:ac(rets(c60)),ac120:ac(rets(c120)),vr5:vr(c120,5),vr15:vr(c240,15)};});
const FK=['ac60','ac120','vr5','vr15'];
console.log(`${n} rounds → ${new Date(R[n-1].t).toISOString().slice(0,16)}; 18a ${J(stat(E18.filter(Boolean)))}; features known ${FK.map(k=>k+' '+F.filter(x=>x[k]!=null).length).join(', ')}`);
{const md=k=>{const v=F.map(x=>x[k]).filter(v=>v!=null).sort((a,b)=>a-b);return[v[Math.floor(v.length*.25)],v[Math.floor(v.length*.5)],v[Math.floor(v.length*.75)]].map(x=>x.toFixed(3)).join('/');};console.log('   quartiles: '+FK.map(k=>k+' '+md(k)).join(', '));}
// A) information test
{const cl=p=>Math.min(.99,Math.max(.01,p)),lg=p=>Math.log(p/(1-p));const rows=[];
 R.forEach((o,i)=>{const a=o.at[240];if(!a||a.ya==null||a.na==null)return;const c=a.ya>=a.na?1:0,mid=cl(((c?a.ya:a.na)+100-(c?a.na:a.ya))/200);if(FK.some(k=>F[i][k]==null))return;rows.push({i,L:lg(mid),y:o.up===c?1:0,F:F[i]});});
 const cut=Math.floor(rows.length*.75),tr=rows.slice(0,cut),te=rows.slice(cut);
 const z={};for(const k of FK){const v=tr.map(r=>r.F[k]);const m=v.reduce((s,x)=>s+x,0)/v.length,sd=Math.sqrt(v.reduce((s,x)=>s+(x-m)**2,0)/v.length);z[k]=x=>(x-m)/sd;}
 const sc=(fx)=>{const m=fitLR(tr.map(fx),tr.map(r=>r.y));const p=te.map(r=>brainP(m,fx(r)));const s=scoreSet(p,te.map(r=>r.y));
  const ll=te.map((r,j)=>-(r.y?Math.log(cl(p[j])):Math.log(1-cl(p[j]))));return{s,ll};};
 const base=sc(r=>[r.L]);console.log(`\nA) favourite-wins at 4:00, ${rows.length} rounds (test ${te.length}): Kalshi-only LR log-loss ${base.s.ll.toFixed(4)}`);
 for(const k of FK){const v=sc(r=>[r.L,z[k](r.F[k]),z[k](r.F[k])*r.L]);const d=ms(v.ll.map((x,j)=>base.ll[j]-x));console.log(`   + ${k.padEnd(5)} log-loss ${v.s.ll.toFixed(4)} (gain ${f(d.m,4)}±${d.se.toFixed(4)})`);}
 const all=sc(r=>[r.L,...FK.flatMap(k=>[z[k](r.F[k]),z[k](r.F[k])*r.L])]);const d=ms(all.ll.map((x,j)=>base.ll[j]-x));console.log(`   + all   log-loss ${all.s.ll.toFixed(4)} (gain ${f(d.m,4)}±${d.se.toFixed(4)})`);
 // 75–93 favourites by tercile (whole sample, descriptive)
 for(const k of FK){const B={};const v=F.map(x=>x[k]).filter(x=>x!=null).sort((a,b)=>a-b),t1=v[Math.floor(v.length/3)],t2=v[Math.floor(v.length*2/3)];
  E18.forEach((e,i)=>{if(!e||F[i][k]==null)return;const g=F[i][k]<t1?'low':F[i][k]<t2?'mid':'high';(B[g]??=[]).push(e);});console.log(`   18a bets by ${k} tercile: `+['low','mid','high'].map(g=>`${g} ${J(stat(B[g]||[]))}`).join(' | '));}}
// B) gates with causal terciles
const DD=(A,B,a,b)=>{const X=[];for(let i=a;i<b;i++)X.push((A[i]?A[i].pnl:0)-(B[i]?B[i].pnl:0));return X;};
const terc=(k,end)=>{const v=F.slice(0,end).map(x=>x[k]).filter(x=>x!=null).sort((a,b)=>a-b);return[v[Math.floor(v.length/3)],v[Math.floor(v.length*2/3)]];};
const RULES=['none'];for(const k of FK)RULES.push(k+' skip low',k+' skip high');
function variant(rule,thr){if(rule==='none')return E18;const[k,,w]=rule.split(' ');const[t1,t2]=thr[k];
 return E18.map((e,i)=>{if(!e)return e;const x=F[i][k];if(x==null)return e;if(w==='low'&&x<t1)return null;if(w==='high'&&x>=t2)return null;return e;});}
const thrAll={};for(const k of FK)thrAll[k]=terc(k,Math.floor(n*.25));
console.log(`\nB) skip gates vs 18a (terciles from oldest 25% for whole-sample view): Δ ¢/round whole | quarters; removed bets`);
for(const r of RULES.slice(1)){const A=variant(r,thrAll),d=ms(DD(A,E18,0,n));const q=[0,1,2,3].map(i=>{const[a,b]=Qs(i);return f(ms(DD(A,E18,a,b)).m,2);}).join('/');
 console.log(`   ${r.padEnd(16)} ${f(d.m)}±${d.se.toFixed(3)} (${(d.m/(d.se||1)).toFixed(1)} SE) | ${q}; removed ${J(stat(E18.filter((e,i)=>e&&!A[i])))}`);}
{const pooled=[],picks=[];let tb=0;for(let qq=1;qq<4;qq++){const[a,b]=Qs(qq);const thr={};for(const k of FK)thr[k]=terc(k,a);let best='none',bv=0;
  for(const r of RULES){const v=ms(DD(variant(r,thr),E18,0,a)).m;if(v>bv){bv=v;best=r;}}
  picks.push(`Q${qq+1} ${best}`);const A=variant(best,thr);pooled.push(...DD(A,E18,a,b));tb+=A.slice(a,b).filter(Boolean).length;}
 const p=ms(pooled);console.log(`   WF: ${picks.join(', ')} → ${f(p.m)}±${p.se.toFixed(3)} (${(p.m/(p.se||1)).toFixed(1)} SE; ${tb} test bets)`);}
