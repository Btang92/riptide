// Nov 28 morning. Live = 2026-11-18a (brain in charge). Two untested ideas at the 4:00 lock:
// (1) NEW family: VOLUME PROFILE around the strike. From the last 240 Coinbase 1-min candles (volume spread evenly over each candle's
//     high–low), vpB = share of 4-h volume traded between the strike and spot (a "cushion" of accepted prices on our side), and
//     vpS = volume density within ±0.05% of the strike vs a flat profile (a high-volume node AT the strike acts as a magnet → flips?).
//     Plus signed TREND EFFICIENCY er15/er60 = net move toward our side ÷ total path of 1-min moves (clean trend vs choppy grind).
// (2) PRICE FLOOR only inside 16–20 ET (the autopsy's weakest block 36 runs running; 75–85¢ entries also weakest): raise the band
//     floor to 78/80/82/85 or drop the 91–93 add-on in 16–20 ET only. Changes which rounds are bet / price paid.
// A) Information vs Kalshi 4:00 favourite LR (train older 75%, test newest 25%). B) 18a skip gates, paired ¢/round, quarters, expanding WF Q2–Q4.
import fs from 'node:fs';import {R,feeP,stat} from './sim.mjs';import {fitLR,brainP,scoreSet,et} from './lib.mjs';
const M=JSON.parse(fs.readFileSync('lab/data/candles.json'));const J=JSON.stringify,f=(v,d=3)=>(v>=0?'+':'')+v.toFixed(d);
const ms=d=>{if(!d.length)return{m:0,se:0,n:0};const m=d.reduce((s,v)=>s+v,0)/d.length;return{m,se:d.length>1?Math.sqrt(d.reduce((s,v)=>s+(v-m)**2,0)/(d.length-1)/d.length):0,n:d.length};};
const side=(a,c)=>c?a.ya:a.na,n=R.length,Qs=i=>[Math.floor(n*i/4),Math.floor(n*(i+1)/4)];
function at(o,s,m=3,lo=75,hi=90){const a=o.at[s];if(!a||!a.f||a.ya==null||a.na==null||a.pu==null)return null;const c=a.pu>=.5?1:0,ask=side(a,c);
 if(ask<lo||ask>hi)return null;const edge=Math.max(a.pu,1-a.pu)*100-ask-feeP(ask);if(edge<m)return null;const won=o.up===c;return{t:o.t,c,ask,won,edge,kind:'band',pnl:(won?100-ask:-ask)-feeP(ask)};}
function fav(o,s,lo,hi){const a=o.at[s];if(!a||a.ya==null||a.na==null)return null;const c=a.ya>=a.na?1:0,ask=side(a,c);if(ask<lo||ask>hi)return null;
 if(a.pu!=null&&(a.pu>=.5?1:0)!==c)return null;const won=o.up===c;return{t:o.t,c,ask,won,edge:null,kind:'add',pnl:(won?100-ask:-ask)-feeP(ask)};}
const E18=R.map(o=>at(o,240)||fav(o,240,91,93));const H=R.map(o=>et(o.t+240000).h);
const C=new Map(Object.entries(M).map(([k,v])=>[+k,v]));
const close=t=>{for(let d=1;d<=3;d++){const c=C.get(t-d*60000);if(c)return c[4];}return null;};
const F=R.map(o=>{const t=o.t+240000,spot=close(t),K=o.strike;if(!spot||!K)return{};
 let tot=0,btw=0,nr=0,ok=0,H4=-1e18,L4=1e18;const lo=Math.min(K,spot),hi=Math.max(K,spot),w=spot*0.0005;
 for(let i=1;i<=240;i++){const c=C.get(t-i*60000);if(!c||!(c[5]>0))continue;ok++;const l=c[1],h=c[2],v=c[5];H4=Math.max(H4,h);L4=Math.min(L4,l);tot+=v;
  const ov=(a,b)=>h>l?Math.max(0,Math.min(h,b)-Math.max(l,a))/(h-l):(l>=a&&l<=b?1:0);btw+=v*ov(lo,hi);nr+=v*ov(K-w,K+w);}
 if(ok<200||tot<=0||H4<=L4)return{};const vpB=btw/tot,vpS=(nr/tot)/Math.min(1,2*w/(H4-L4));
 const er=k=>{let path=0,ok2=0;const p0=close(t-k*60000);if(!p0)return null;let p=p0;for(let i=k-1;i>=0;i--){const q=close(t-i*60000);if(q){path+=Math.abs(q-p);p=q;ok2++;}}return ok2>k*.8&&path>0?(spot-p0)/path:null;};
 const e15=er(15),e60=er(60);if(e15==null||e60==null)return{};return{vpB,vpS,er15:e15,er60:e60};});
const sF=(x,k,c)=>{if(x[k]==null)return null;if(k==="er15"||k==="er60")return(c?1:-1)*x[k];return x[k];};
const FK=["vpB","vpS","er15","er60"];
console.log(`${n} rounds → ${new Date(R[n-1].t).toISOString().slice(0,16)}; 18a ${J(stat(E18.filter(Boolean)))} (band ${E18.filter(e=>e&&e.kind==='band').length}, add ${E18.filter(e=>e&&e.kind==='add').length}); features known ${F.filter(x=>x.vpB!=null).length}`);
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
  rows.forEach(r=>{const a=R[r.i].at[240],c=a.ya>=a.na?1:0,ask=side(a,c);if(ask<75||ask>93)return;const g=r.G[k]<t1?'low':r.G[k]<t2?'mid':'high';
   (B[g]??=[]).push({pnl:(r.y?100-ask:-ask)-feeP(ask),won:!!r.y,ask});});
  console.log(`   75–93 favourites by ${k}: `+['low','mid','high'].map(g=>`${g} ${J(stat(B[g]||[]))}`).join(' | '));}}
for(const k of FK){const B={};const v=F.map((x,i)=>E18[i]?sF(x,k,E18[i].c):null).filter(x=>x!=null).sort((a,b)=>a-b),t1=v[Math.floor(v.length/3)],t2=v[Math.floor(v.length*2/3)];
 E18.forEach((e,i)=>{if(!e)return;const x=sF(F[i],k,e.c);if(x==null)return;const g=x<t1?'low':x<t2?'mid':'high';(B[g]??=[]).push(e);});
 console.log(`   18a bets by ${k}: `+['low','mid','high'].map(g=>`${g} ${J(stat(B[g]||[]))}`).join(' | '));}
const DD=(A,B,a,b)=>{const X=[];for(let i=a;i<b;i++)X.push((A[i]?A[i].pnl:0)-(B[i]?B[i].pnl:0));return X;};
const terc=(k,end)=>{const v=[];for(let i=0;i<end;i++){const e=E18[i];if(!e)continue;const x=sF(F[i],k,e.c);if(x!=null)v.push(x);}v.sort((a,b)=>a-b);return[v[Math.floor(v.length/3)],v[Math.floor(v.length*2/3)]];};
function gates(title,RUL,varf,thrf){console.log(`\n${title}: Δ ¢/round whole | quarters; removed bets`);
 const thrAll=thrf(Math.floor(n*.25));
 for(const r of RUL.slice(1)){const A=varf(r,thrAll),d=ms(DD(A,E18,0,n));const q=[0,1,2,3].map(i=>{const[a,b]=Qs(i);return f(ms(DD(A,E18,a,b)).m,2);}).join('/');
  console.log(`   ${r.padEnd(18)} ${f(d.m)}±${d.se.toFixed(3)} (${(d.m/(d.se||1)).toFixed(1)} SE) | ${q}; removed ${J(stat(E18.filter((e,i)=>e&&!A[i])))}`);}
 const pooled=[],picks=[];let tb=0;for(let qq=1;qq<4;qq++){const[a,b]=Qs(qq);const thr=thrf(a);let best='none',bv=0;
  for(const r of RUL){const v=ms(DD(varf(r,thr),E18,0,a)).m;if(v>bv){bv=v;best=r;}}
  picks.push(`Q${qq+1} ${best}`);const A=varf(best,thr);pooled.push(...DD(A,E18,a,b));tb+=A.slice(a,b).filter(Boolean).length;}
 const p=ms(pooled);console.log(`   WF: ${picks.join(', ')} → ${f(p.m)}±${p.se.toFixed(3)} (${(p.m/(p.se||1)).toFixed(1)} SE; ${tb} test bets)`);
 const[a,b]=Qs(3);const thr=thrf(a);console.log('   newest 25% only: '+RUL.slice(1).map(r=>{const d=ms(DD(varf(r,thr),E18,a,b));return`${r} ${f(d.m,2)}±${d.se.toFixed(2)}`;}).join('; '));}
const RULES=['none'];for(const k of FK)RULES.push(k+' skip low',k+' skip high');
const variant=(rule,thr)=>{if(rule==='none')return E18;const[k,,w]=rule.split(' ');
 return E18.map((e,i)=>{if(!e)return e;const x=sF(F[i],k,e.c);if(x==null)return e;const[t1,t2]=thr[k];if(w==='low'&&x<t1)return null;if(w==='high'&&x>=t2)return null;return e;});};
gates('B1) volume-profile / trend-efficiency skip gates vs 18a (terciles of 18a bets before the scored part)',RULES,variant,end=>{const t={};for(const k of FK)t[k]=terc(k,end);return t;});
// C) 16–20 ET price floor
const inB=(h,blk)=>blk==='16–20'?(h>=16&&h<20):blk==='17–20'?(h>=17&&h<20):blk==='18–20'?(h>=18&&h<20):true;
const R2=['none'];for(const blk of ['16–20','17–20','18–20','all'])for(const fl of [78,80,82,85,'noadd'])R2.push(`${blk} ${fl}`);
const v2=rule=>{if(rule==='none')return E18;const[blk,fl]=rule.split(' ');return E18.map((e,i)=>{if(!e||!inB(H[i],blk))return e;
 if(fl==='noadd')return e.kind==='add'?null:e;return e.kind==='band'&&e.ask<+fl?null:e;});};
console.log('\n18a bets in 16–20 ET by price: '+[[75,78],[78,80],[80,82],[82,85],[85,91],[91,94]].map(([a,b])=>`${a}–${b-1} ${J(stat(E18.filter((e,i)=>e&&H[i]>=16&&H[i]<20&&e.ask>=a&&e.ask<b)))}`).join(' | '));
console.log('18a bets other hours by price: '+[[75,78],[78,80],[80,82],[82,85],[85,91],[91,94]].map(([a,b])=>`${a}–${b-1} ${J(stat(E18.filter((e,i)=>e&&!(H[i]>=16&&H[i]<20)&&e.ask>=a&&e.ask<b)))}`).join(' | '));
gates('C) price floor / no add-on inside an ET block vs 18a',R2,v2,()=>null);
