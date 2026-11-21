// Nov 21 evening. Reference = pending proposal 2026-11-18a (live rule at 4:00, all hours, + 91–93¢ read-agreeing favourite add-on).
// A) Forward: 18a since Nov 18 12:00 UTC and since this morning's data (Nov 21 11:15 UTC); frozen lead package since Nov 17.
// B) Add-on stability gate (aimed at the expensive late flips of 92¢ adds; forward adds 10 of 13): add only if our side was already
//    ≥X at 3:00 (X 80/85/88/90) or ≥X at 2:00 and 3:00, or if the 3:00→4:00 rise of our side's ask ≤ Y (3/5/8¢). Paired vs 18a, WF Q2–Q4.
// C) Entry price paid with REAL Kalshi trades: for every 18a bet (and live bet), the first taker buy of our side in the 30 s after the
//    4:00 checkpoint vs the checkpoint ask the replay books. Re-price 18a and live at real fills (no trade → ask+1). Cache lab/data/entry-trades.json.
import {execFileSync} from 'node:child_process';import fs from 'node:fs';
import {R,feeP,stat} from './sim.mjs';import {et} from './lib.mjs';
const J=JSON.stringify,f=(v,d=3)=>(v>=0?'+':'')+v.toFixed(d);
const ms=d=>{if(!d.length)return{m:0,se:0,n:0};const m=d.reduce((s,v)=>s+v,0)/d.length;return{m,se:d.length>1?Math.sqrt(d.reduce((s,v)=>s+(v-m)**2,0)/(d.length-1)/d.length):0,n:d.length};};
const side=(a,c)=>c?a.ya:a.na,hr=o=>et(o.t).h,n=R.length,Qs=i=>[Math.floor(n*i/4),Math.floor(n*(i+1)/4)],EX=[300,360,420,480,600];
function at(o,s,m=3,lo=75,hi=90){const a=o.at[s];if(!a||!a.f||a.ya==null||a.na==null||a.pu==null)return null;const c=a.pu>=.5?1:0,ask=side(a,c);
 if(ask<lo||ask>hi)return null;if(Math.max(a.pu,1-a.pu)*100<ask+feeP(ask)+m)return null;const won=o.up===c;
 return{t:o.t,o,c,ask,won,kind:'live',edge:Math.max(a.pu,1-a.pu)*100-ask-feeP(ask),pnl:(won?100-ask:-ask)-feeP(ask)};}
function fav(o,s,lo,hi){const a=o.at[s];if(!a||a.ya==null||a.na==null)return null;const c=a.ya>=a.na?1:0,ask=side(a,c);if(ask<lo||ask>hi)return null;
 if(a.pu!=null&&(a.pu>=.5?1:0)!==c)return null;const won=o.up===c;return{t:o.t,o,c,ask,won,kind:'add',pnl:(won?100-ask:-ask)-feeP(ask)};}
const exitP=(e,th)=>{if(!e)return e;const o=e.o;for(const s of EX){const a=o.at[s];if(!a||a.ya==null||a.na==null||a.pu==null)continue;const bid=100-side(a,1-e.c)-1;if(bid<1)continue;
 const ps=e.c?a.pu:1-a.pu;if(ps<th)return{...e,pnl:bid-e.ask-feeP(e.ask)-feeP(bid),exited:1};}return e;};
const Elive=R.map(o=>hr(o)<12?null:at(o,240)),Eall=R.map(o=>at(o,240)),Eadd=R.map((o,i)=>Eall[i]?null:fav(o,240,91,93));
const E18=R.map((o,i)=>Eall[i]||Eadd[i]);
console.log(`${n} rounds ${new Date(R[0].t).toISOString().slice(0,10)} → ${new Date(R[n-1].t).toISOString().slice(0,16)}; 18a ${J(stat(E18.filter(Boolean)))} live ${J(stat(Elive.filter(Boolean)))}`);
const diff=(A,B,idx)=>ms(idx.map(i=>(A[i]?A[i].pnl:0)-(B[i]?B[i].pnl:0)));
// ---- A
for(const[lab,T]of[['since Nov 18 12:00 UTC',Date.UTC(2026,10,18,12)],['since Nov 21 11:15 UTC (new this evening)',Date.UTC(2026,10,21,11,15)]]){
 const idx=R.map((o,i)=>i).filter(i=>R[i].t>=T);const d=diff(E18,Elive,idx);
 console.log(`A 18a forward ${lab}: ${idx.length} rounds; 18a ${J(stat(idx.map(i=>E18[i]).filter(Boolean)))} live ${J(stat(idx.map(i=>Elive[i]).filter(Boolean)))} Δ ${f(d.m,2)}±${d.se.toFixed(2)} ¢/round; adds ${J(stat(idx.map(i=>Eadd[i]).filter(Boolean)))}`);
 if(T>Date.UTC(2026,10,21))console.log('   bets:',idx.filter(i=>E18[i]).map(i=>{const e=E18[i];return `${new Date(e.t).toISOString().slice(5,16)} ${e.kind} ${e.ask}¢ ${e.won?'W':'L'}`;}).join('; '));}
{const F0=Date.UTC(2026,10,17);const s=Eall.filter(e=>e&&e.t<F0).map(e=>e.edge).sort((x,y)=>x-y),med=s[Math.floor(s.length/2)];
 const idx=R.map((o,i)=>i).filter(i=>R[i].t>=F0);const rs=idx.map(i=>{const e=Eall[i];if(!e)return{p:0,w:0};const w=e.edge>=med?2:1;return{p:exitP(e,.4).pnl*w,w,e};});
 const nb=rs.filter(r=>r.w).length,mw=rs.reduce((s,r)=>s+r.w,0)/(nb||1)||1;const d=ms(idx.map((i,j)=>rs[j].p/mw-(Elive[i]?Elive[i].pnl:0)));
 const pk=rs.filter(r=>r.e).map(r=>exitP(r.e,.4));
 console.log(`A package forward since Nov 17 00:00 UTC: ${idx.length} rounds, pkg ${nb} bets ${J(stat(pk))} exits ${pk.filter(x=>x.exited).length}; live ${J(stat(idx.map(i=>Elive[i]).filter(Boolean)))}; Δ ${f(d.m)}±${d.se.toFixed(3)} ¢/round`);}
// ---- B
const MENU={'18a':(o,i)=>E18[i],'no adds':(o,i)=>Eall[i]};
const sp=(o,c,s)=>{const a=o.at[s];return a&&a.ya!=null&&a.na!=null?side(a,c):null;};
for(const X of [80,85,88,90])MENU[`add if ≥${X} at 3:00`]=(o,i)=>Eall[i]||(Eadd[i]&&(sp(o,Eadd[i].c,180)??0)>=X?Eadd[i]:null);
for(const X of [70,80,85])MENU[`add if ≥${X} at 2:00+3:00`]=(o,i)=>Eall[i]||(Eadd[i]&&(sp(o,Eadd[i].c,180)??0)>=X&&(sp(o,Eadd[i].c,120)??0)>=X?Eadd[i]:null);
for(const Y of [3,5,8])MENU[`add if 3→4 rise ≤${Y}`]=(o,i)=>Eall[i]||(Eadd[i]&&Eadd[i].ask-(sp(o,Eadd[i].c,180)??0)<=Y?Eadd[i]:null);
const E=Object.fromEntries(Object.entries(MENU).map(([k,fn])=>[k,R.map((o,i)=>fn(o,i))]));
const D=(k,ref,lo,hi)=>{const X=[];for(let i=lo;i<hi;i++){const e=E[k][i],l=E[ref][i];X.push((e?e.pnl:0)-(l?l.pnl:0));}return X;};
const all=[...Array(n).keys()];
console.log('\nB) adds by 3:00 price of our side (¢/ct):');
for(const[lo,hi]of[[0,79.9],[80,84.9],[85,87.9],[88,90.9],[91,100]]){const xs=Eadd.filter(e=>{if(!e)return false;const p=sp(e.o,e.c,180)??-1;return p>=lo&&p<=hi;});console.log(`   3:00 ${lo}–${hi}: ${J(stat(xs))}`);}
{const xs=Eadd.filter(e=>e&&sp(e.o,e.c,180)==null);console.log(`   no 3:00 price: ${J(stat(xs))}`);}
console.log('B) gates vs 18a (Δ¢/round):');
for(const k of Object.keys(MENU).slice(1)){const d=ms(D(k,'18a',0,n)),h2=ms(D(k,'18a',Math.floor(n/2),n));const q=[0,1,2,3].map(i=>{const[a,b]=Qs(i);return f(ms(D(k,'18a',a,b)).m,2);}).join('/');
 console.log(`   ${k}: ${f(d.m)}±${d.se.toFixed(3)} (${(d.m/(d.se||1)).toFixed(1)} SE) Q ${q} newer half ${f(h2.m)}±${h2.se.toFixed(3)}; adds kept ${E[k].filter(e=>e&&e.kind==='add').length}`);}
function wf(keys,ref){const pooled=[],picks=[];let tb=0;for(let q=1;q<4;q++){const[a,b]=Qs(q);let best=ref,bv=0;for(const k of keys){const v=ms(D(k,ref,0,a)).m;if(v>bv){bv=v;best=k;}}
 picks.push(`Q${q+1} ${best}`);pooled.push(...D(best,ref,a,b));tb+=E[best].slice(a,b).filter(Boolean).length;}
 const p=ms(pooled);return `${picks.join(', ')} → ${f(p.m)}±${p.se.toFixed(3)} (${(p.m/(p.se||1)).toFixed(1)} SE; ${tb} test bets)`;}
console.log('   WF B:',wf(Object.keys(MENU),'18a'));
// ---- C
if(process.argv.includes('--noC'))process.exit(0);
const K='https://api.elections.kalshi.com/trade-api/v2',CF='lab/data/entry-trades.json',C=fs.existsSync(CF)?JSON.parse(fs.readFileSync(CF)):{};
const sleep=s=>execFileSync('sleep',[String(s)]);
const get=u=>{for(let a=0;a<5;a++){try{return JSON.parse(execFileSync('curl',['-sS','--fail','-m','30',u],{maxBuffer:64<<20,stdio:['ignore','pipe','ignore']}).toString());}catch(e){sleep(1.5*(a+1));}}return null;};
const MO=['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
function ticker(t){const d=new Date(t+900000),p=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',year:'2-digit',month:'numeric',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(d).map(x=>[x.type,x.value]));
 return `KXBTC15M-${p.year}${MO[+p.month-1]}${p.day}${p.hour}${p.minute}-${p.minute}`;}
const need=E18.filter(e=>e&&!(e.t in C));console.log(`\nC) entry trades: ${E18.filter(Boolean).length} 18a bets, downloading ${need.length}`);
let k=0;for(const e of need){const lo=Math.floor((e.t+240000)/1000);const d=get(`${K}/markets/trades?ticker=${ticker(e.t)}&min_ts=${lo}&max_ts=${lo+30}&limit=1000`);
 C[e.t]=d?(d.trades||[]).map(x=>[Date.parse(x.created_time),Math.round(+x.yes_price_dollars*100),x.taker_side==='yes'?1:0,+x.count_fp]):null;sleep(.2);
 if(++k%100===0){fs.writeFileSync(CF,JSON.stringify(C));console.log('  ',k);}}
fs.writeFileSync(CF,JSON.stringify(C));
// first taker buy of OUR side (taker_side = our side), price in our-side cents
function fill(e,win=30){const tr=C[e.t];if(!tr)return null;const t0=e.t+240000;const x=tr.filter(z=>z[0]>=t0&&z[0]<t0+win*1000&&z[2]===e.c).sort((a,b)=>a[0]-b[0]);
 if(!x.length)return{none:1};const p=z=>e.c?z[1]:100-z[1];const q=x.reduce((a,z)=>a+z[3],0);return{first:p(x[0]),vwap:x.reduce((a,z)=>a+p(z)*z[3],0)/q,delay:(x[0][0]-t0)/1000};}
for(const[lab,fl]of[['75–90 part (all hours)',e=>e.kind==='live'],['91–93 adds',e=>e.kind==='add'],['live bets (12–24)',e=>e.kind==='live'&&hr(e.o)>=12]]){
 const xs=E18.filter(e=>e&&fl(e));let none=0,miss=0;const g=[],gv=[],dl=[];for(const e of xs){const r=fill(e);if(!r){miss++;continue;}if(r.none){none++;continue;}g.push(r.first-e.ask);gv.push(r.vwap-e.ask);dl.push(r.delay);}
 const a=ms(g),b=ms(gv);dl.sort((x,y)=>x-y);
 console.log(`   ${lab}: ${xs.length} bets, trade found ${g.length}, none in 30 s ${none}, fetch failed ${miss}; first fill − checkpoint ask ${f(a.m,2)}±${a.se.toFixed(2)}¢, VWAP ${f(b.m,2)}±${b.se.toFixed(2)}¢, median delay ${dl[Math.floor(dl.length/2)]??'-'} s`);}
const reprice=e=>{if(!e)return e;const r=fill(e);const px=(!r||r.none)?Math.min(99,e.ask+1):r.first;return{...e,ask:px,pnl:(e.won?100-px:-px)-feeP(px)};};
const R18=E18.map(reprice),RL=Elive.map(reprice);
console.log(`   at real fills: 18a ${J(stat(R18.filter(Boolean)))} (adds ${J(stat(R18.filter(e=>e&&e.kind==='add')))}) live ${J(stat(RL.filter(Boolean)))}`);
for(const[lab,lo,hi]of[['whole',0,n],['newer half',Math.floor(n/2),n],['Q4',Qs(3)[0],n]]){const idx=all.slice(lo,hi);const d=diff(R18,RL,idx),d0=diff(E18,Elive,idx);
 console.log(`   18a − live ${lab}: real fills ${f(d.m)}±${d.se.toFixed(3)} (${(d.m/d.se).toFixed(1)} SE) vs checkpoint asks ${f(d0.m)}±${d0.se.toFixed(3)}`);}
{const RA=R.map((o,i)=>R18[i]&&R18[i].kind==='add'?R18[i]:null);const d=ms(all.map(i=>RA[i]?RA[i].pnl:0));const h=ms(all.slice(Math.floor(n/2)).map(i=>RA[i]?RA[i].pnl:0));
 console.log(`   adds alone at real fills: ${f(d.m)}±${d.se.toFixed(3)} ¢/round (newer half ${f(h.m)}±${h.se.toFixed(3)})`);}
// ---- C2: slippage by model edge (75–90 part) and edge margin m at REAL fills, vs 18a at real fills
console.log('\nC2) 75–90 part: real-fill slippage and ¢/ct by model edge (read − ask − fee):');
const L=R18.map((e,i)=>e&&e.kind==='live'?{e,raw:E18[i]}:null).filter(Boolean);
for(const[lo,hi]of[[3,5],[5,8],[8,12],[12,99]]){const xs=L.filter(x=>x.raw.edge>=lo&&x.raw.edge<hi);const sl=ms(xs.map(x=>x.e.ask-x.raw.ask));
 console.log(`   edge ${lo}–${hi}: ${J(stat(xs.map(x=>x.e)))} slippage ${f(sl.m,2)}±${sl.se.toFixed(2)}¢; at checkpoint ask ${J(stat(xs.map(x=>x.raw)))}`);}
const EM={'18a real':R18};for(const m of [5,8,12])EM[`m${m} real`]=R18.map((e,i)=>e&&e.kind==='live'&&E18[i].edge<m?(Eadd[i]||null):e);
// note: when the 75–90 part is dropped by a higher margin the round could take a 91–93 add only if the ask was 91–93, which it is not (75–90), so dropped = no bet
for(const k of Object.keys(EM))E[k]=EM[k];
for(const k of Object.keys(EM).slice(1)){const d=ms(D(k,'18a real',0,n)),h2=ms(D(k,'18a real',Math.floor(n/2),n));const q=[0,1,2,3].map(i=>{const[a,b]=Qs(i);return f(ms(D(k,'18a real',a,b)).m,2);}).join('/');
 console.log(`   ${k} vs 18a real: ${f(d.m)}±${d.se.toFixed(3)} (${(d.m/(d.se||1)).toFixed(1)} SE) Q ${q} newer half ${f(h2.m)}±${h2.se.toFixed(3)}; bets ${E[k].filter(Boolean).length}`);}
console.log('   WF C2:',wf(Object.keys(EM),'18a real'));
