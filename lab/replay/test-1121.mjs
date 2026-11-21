// Nov 21 morning. Reference = pending proposal 2026-11-18a (live rule at 4:00, all hours, + 91–93¢ read-agreeing favourite add-on).
// A) US news-time rounds under 18a (18a adds 00–12 ET, which contains the 8:30 and 10:00 ET weekday data releases):
//    skip weekday rounds starting 8:15 / 8:30 / 8:45 / 9:45 / 10:00 ET and combos; paired ¢/round vs 18a, expanding WF Q2–Q4.
// B) The read<.4 exit lead re-priced with REAL Kalshi trades: for every exit trigger, the price takers actually sold our side at in
//    the 30 s after the checkpoint (trades where the taker bought the other side), vs the checkpoint bid−1 the replay assumes.
//    Cache: lab/data/exit-trades.json (local).
import {execFileSync} from 'node:child_process';import fs from 'node:fs';
import {R,feeP,stat} from './sim.mjs';import {et} from './lib.mjs';
const J=JSON.stringify,f=(v,d=3)=>(v>=0?'+':'')+v.toFixed(d);
const ms=d=>{if(!d.length)return{m:0,se:0,n:0};const m=d.reduce((s,v)=>s+v,0)/d.length;return{m,se:d.length>1?Math.sqrt(d.reduce((s,v)=>s+(v-m)**2,0)/(d.length-1)/d.length):0,n:d.length};};
const side=(a,c)=>c?a.ya:a.na,n=R.length,Qs=i=>[Math.floor(n*i/4),Math.floor(n*(i+1)/4)],EX=[300,360,420,480,600];
const wkday=o=>{const w=et(o.t).wd;return w!=='Sat'&&w!=='Sun';};
function at(o,s,m=3,lo=75,hi=90){const a=o.at[s];if(!a||!a.f||a.ya==null||a.na==null||a.pu==null)return null;const c=a.pu>=.5?1:0,ask=side(a,c);
 if(ask<lo||ask>hi)return null;if(Math.max(a.pu,1-a.pu)*100<ask+feeP(ask)+m)return null;const won=o.up===c;
 return{t:o.t,o,c,ask,won,kind:'live',pnl:(won?100-ask:-ask)-feeP(ask)};}
function fav(o,s,lo,hi){const a=o.at[s];if(!a||a.ya==null||a.na==null)return null;const c=a.ya>=a.na?1:0,ask=side(a,c);if(ask<lo||ask>hi)return null;
 if(a.pu!=null&&(a.pu>=.5?1:0)!==c)return null;const won=o.up===c;return{t:o.t,o,c,ask,won,kind:'add',pnl:(won?100-ask:-ask)-feeP(ask)};}
const trig=(e,th)=>{if(!e)return null;const o=e.o;for(const s of EX){const a=o.at[s];if(!a||a.ya==null||a.na==null||a.pu==null)continue;const bid=100-side(a,1-e.c)-1;if(bid<1)continue;
 const ps=e.c?a.pu:1-a.pu;if(ps<th)return{s,bid};}return null;};
const E18=R.map(o=>at(o,240)||fav(o,240,91,93));
const Elive=R.map(o=>et(o.t).h<12?null:at(o,240));
console.log(`${n} rounds ${new Date(R[0].t).toISOString().slice(0,10)} → ${new Date(R[n-1].t).toISOString().slice(0,16)}; 18a ${J(stat(E18.filter(Boolean)))}`);
// ---------- A
const slot=(o,h,mi)=>{const p=et(o.t);return wkday(o)&&p.h===h&&p.mi===mi;};
const SK={'8:15':o=>slot(o,8,15),'8:30':o=>slot(o,8,30),'8:45':o=>slot(o,8,45),'9:45':o=>slot(o,9,45),'10:00':o=>slot(o,10,0)};
SK['8:30+10:00']=o=>SK['8:30'](o)||SK['10:00'](o);SK['8:15–8:45']=o=>SK['8:15'](o)||SK['8:30'](o)||SK['8:45'](o);
SK['8:15–10:00 all']=o=>{const p=et(o.t),m=p.h*60+p.mi;return wkday(o)&&m>=495&&m<=600;};
console.log('\nA) 18a bets in weekday news slots (¢/ct) and skip vs 18a (Δ¢/round):');
const MENU={'18a':(o,i)=>E18[i]};for(const[k,fn]of Object.entries(SK))MENU['skip '+k]=(o,i)=>fn(o)?null:E18[i];
const E=Object.fromEntries(Object.entries(MENU).map(([k,fn])=>[k,R.map((o,i)=>fn(o,i))]));
const D=(k,ref,lo,hi)=>{const X=[];for(let i=lo;i<hi;i++){const e=E[k][i],l=E[ref][i];X.push((e?e.pnl:0)-(l?l.pnl:0));}return X;};
for(const[k,fn]of Object.entries(SK)){const inS=E18.filter(e=>e&&fn(e.o));const d=ms(D('skip '+k,'18a',0,n));const h2=ms(D('skip '+k,'18a',Math.floor(n/2),n));
 const all=R.filter(fn),fw=all.filter(o=>{const a=o.at[240];if(!a||a.ya==null)return false;const c=a.ya>=a.na?1:0;return true;});
 const favWin=fw.length?fw.filter(o=>{const a=o.at[240];return o.up===(a.ya>=a.na?1:0);}).length/fw.length:0;
 console.log(`  ${k}: ${all.length} rounds, 4:00 favourite won ${(favWin*100).toFixed(1)}%; 18a bets there ${J(stat(inS))} | skip Δ ${f(d.m)}±${d.se.toFixed(3)} newer half ${f(h2.m)}±${h2.se.toFixed(3)}`);}
{const all=R.filter(o=>!SK['8:15–10:00 all'](o)&&o.at[240]&&o.at[240].ya!=null);console.log(`  (other rounds: 4:00 favourite won ${(all.filter(o=>{const a=o.at[240];return o.up===(a.ya>=a.na?1:0);}).length/all.length*100).toFixed(1)}%)`);}
function wf(keys,ref){const pooled=[],picks=[];let tb=0;for(let q=1;q<4;q++){const[a,b]=Qs(q);let best=ref,bv=0;for(const k of keys){const v=ms(D(k,ref,0,a)).m;if(v>bv){bv=v;best=k;}}
 picks.push(`Q${q+1} ${best}`);pooled.push(...D(best,ref,a,b));tb+=E[best].slice(a,b).filter(Boolean).length;}
 const p=ms(pooled);return `${picks.join(', ')} → ${f(p.m)}±${p.se.toFixed(3)} (${(p.m/(p.se||1)).toFixed(1)} SE; ${tb} test bets)`;}
console.log('  WF A:',wf(Object.keys(MENU),'18a'));
// ---------- B
const K='https://api.elections.kalshi.com/trade-api/v2',CF='lab/data/exit-trades.json',C=fs.existsSync(CF)?JSON.parse(fs.readFileSync(CF)):{};
const sleep=s=>execFileSync('sleep',[String(s)]);
const get=u=>{for(let a=0;a<5;a++){try{return JSON.parse(execFileSync('curl',['-sS','--fail','-m','30',u],{maxBuffer:64<<20,stdio:['ignore','pipe','ignore']}).toString());}catch(e){sleep(1.5*(a+1));}}return null;};
const MO=['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
function ticker(t){const d=new Date(t+900000),p=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',year:'2-digit',month:'numeric',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(d).map(x=>[x.type,x.value]));
 return `KXBTC15M-${p.year}${MO[+p.month-1]}${p.day}${p.hour}${p.minute}-${p.minute}`;}
const TH=[.3,.4,.45];const ev=[];
E18.forEach((e,i)=>{if(!e)return;for(const th of TH){const x=trig(e,th);if(x)ev.push({i,th,s:x.s,bid:x.bid,e});}});
const need=[...new Set(ev.map(x=>x.e.t+'|'+x.s))].filter(k=>!(k in C));
console.log(`\nB) exit triggers on 18a bets: ${ev.length} (th .3/.4/.45), ${new Set(ev.map(x=>x.e.t+'|'+x.s)).size} distinct checkpoints; downloading ${need.length}`);
for(const k of need){const[t,s]=k.split('|').map(Number);const lo=Math.floor((t+s*1000)/1000);
 const d=get(`${K}/markets/trades?ticker=${ticker(t)}&min_ts=${lo}&max_ts=${lo+45}&limit=1000`);
 C[k]=d?(d.trades||[]).map(x=>[Date.parse(x.created_time),Math.round(+x.yes_price_dollars*100),x.taker_side==='yes'?1:0,+x.count_fp]):null;sleep(.25);}
fs.writeFileSync(CF,JSON.stringify(C));
// realised sell price for our side c: trades where the taker bought the OTHER side (i.e. hit our side's bid), price in our-side cents
function real(t,s,c,win=30){const tr=C[t+'|'+s];if(!tr)return null;const t0=t+s*1000;const x=tr.filter(z=>z[0]>=t0&&z[0]<t0+win*1000&&z[2]===1-c).sort((a,b)=>a[0]-b[0]);
 if(!x.length)return {none:1};const p=z=>c?z[1]:100-z[1];const q=x.reduce((a,z)=>a+z[3],0);return{first:p(x[0]),vwap:x.reduce((a,z)=>a+p(z)*z[3],0)/q,q,delay:(x[0][0]-t0)/1000};}
for(const th of TH){const xs=ev.filter(x=>x.th===th);let got=0,none=0;const gap=[],gapF=[],delay=[];
 const base=[],realP=[];
 for(const x of xs){const r=real(x.e.t,x.s,x.e.c);if(!r){continue;}if(r.none){none++;continue;}got++;gap.push(r.vwap-x.bid);gapF.push(r.first-x.bid);delay.push(r.delay);}
 const g=ms(gap),gf=ms(gapF);
 console.log(`  th ${th}: ${xs.length} exits, trades found ${got}, no sell-side trade in 30 s ${none}; realised VWAP − (checkpoint bid−1) ${f(g.m,2)}±${g.se.toFixed(2)}¢, first trade ${f(gf.m,2)}±${gf.se.toFixed(2)}¢, median delay ${[...delay].sort((a,b)=>a-b)[Math.floor(delay.length/2)]||'-'} s`);}
// exit variants re-priced at real trades (first sell-side trade within 30 s; if none, hold to settlement)
const exitReal=(e,th,mode)=>{if(!e)return e;const x=trig(e,th);if(!x)return e;let px=x.bid;
 if(mode==='real'){const r=real(e.t,x.s,e.c);if(!r||r.none)return e;px=r.first;}if(mode==='bid-3')px=x.bid-2;
 return{...e,pnl:px-e.ask-feeP(e.ask)-feeP(px),exited:1};};
for(const th of TH)for(const mode of ['checkpoint','real','bid-3'])MENU[`exit<${th} ${mode}`]=(o,i)=>exitReal(E18[i],th,mode);
for(const k of Object.keys(MENU))if(!E[k])E[k]=R.map((o,i)=>MENU[k](o,i));
console.log('  exit variants vs 18a (Δ¢/round):');
for(const k of Object.keys(MENU).filter(k=>k.startsWith('exit'))){const d=ms(D(k,'18a',0,n));const h2=ms(D(k,'18a',Math.floor(n/2),n));
 const q=[0,1,2,3].map(i=>{const[a,b]=Qs(i);return f(ms(D(k,'18a',a,b)).m,2);}).join('/');
 console.log(`    ${k}: ${f(d.m)}±${d.se.toFixed(3)} (${(d.m/(d.se||1)).toFixed(1)} SE) Q ${q} newer half ${f(h2.m)}±${h2.se.toFixed(3)} exits ${E[k].filter(e=>e&&e.exited).length}`);}
console.log('  WF B (real-trade exits):',wf(['18a',...Object.keys(MENU).filter(k=>k.endsWith(' real'))],'18a'));
// ---------- forward
for(const[lab,T]of[['since Nov 18 12:00 UTC',Date.UTC(2026,10,18,12)],['since Nov 21 00:00 UTC',Date.UTC(2026,10,21)]]){
 const idx=R.map((o,i)=>i).filter(i=>R[i].t>=T);const d=ms(idx.map(i=>(E18[i]?E18[i].pnl:0)-(Elive[i]?Elive[i].pnl:0)));
 console.log(`\nForward 18a ${lab}: ${idx.length} rounds; 18a ${J(stat(idx.map(i=>E18[i]).filter(Boolean)))} live ${J(stat(idx.map(i=>Elive[i]).filter(Boolean)))} Δ ${f(d.m,2)}±${d.se.toFixed(2)} ¢/round; adds ${J(stat(idx.filter(i=>E18[i]&&E18[i].kind==='add').map(i=>E18[i])))}`);}
