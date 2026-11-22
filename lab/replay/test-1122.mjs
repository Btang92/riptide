// Nov 22. Reference = pending proposal 2026-11-18a (live rule at 4:00, all hours, + 91–93¢ read-agreeing favourite add-on).
// A) Forward: 18a since Nov 18 12:00 UTC and since last evening's data (Nov 21 23:15 UTC).
// B) Add band reaching DOWN into the 75–90 zone: when the live read rule does not bet at 4:00 (read does not clear ask+fee+3),
//    buy the read-agreeing favourite anyway if priced L–93 (L = 86/87/88/89/90) — strong-favourite bias without the read's value gate;
//    also 91–94 / 90–94. Paired ¢/round vs 18a, quarters, expanding WF Q2–Q4, and +1¢ fill slippage on the new adds.
// C) Monthly re-check of the Oct 24 hour study: does the 10:00 / 4:00 favourite lose more in :45 rounds? Rounds after Oct 24 only.
import {R,feeP,stat} from './sim.mjs';import {et} from './lib.mjs';
const J=JSON.stringify,f=(v,d=3)=>(v>=0?'+':'')+v.toFixed(d);
const ms=d=>{if(!d.length)return{m:0,se:0,n:0};const m=d.reduce((s,v)=>s+v,0)/d.length;return{m,se:d.length>1?Math.sqrt(d.reduce((s,v)=>s+(v-m)**2,0)/(d.length-1)/d.length):0,n:d.length};};
const side=(a,c)=>c?a.ya:a.na,hr=o=>et(o.t).h,n=R.length,Qs=i=>[Math.floor(n*i/4),Math.floor(n*(i+1)/4)];
function at(o,s,m=3,lo=75,hi=90){const a=o.at[s];if(!a||!a.f||a.ya==null||a.na==null||a.pu==null)return null;const c=a.pu>=.5?1:0,ask=side(a,c);
 if(ask<lo||ask>hi)return null;if(Math.max(a.pu,1-a.pu)*100<ask+feeP(ask)+m)return null;const won=o.up===c;
 return{t:o.t,o,c,ask,won,kind:'live',pnl:(won?100-ask:-ask)-feeP(ask)};}
function fav(o,s,lo,hi,slip=0){const a=o.at[s];if(!a||a.ya==null||a.na==null)return null;const c=a.ya>=a.na?1:0,ask=side(a,c);if(ask<lo||ask>hi)return null;
 if(a.pu!=null&&(a.pu>=.5?1:0)!==c)return null;const won=o.up===c,px=ask+slip;return{t:o.t,o,c,ask,won,kind:'add',pnl:(won?100-px:-px)-feeP(px)};}
const Elive=R.map(o=>hr(o)<12?null:at(o,240)),Eall=R.map(o=>at(o,240)),Eadd=R.map((o,i)=>Eall[i]?null:fav(o,240,91,93));
const E18=R.map((o,i)=>Eall[i]||Eadd[i]);
console.log(`${n} rounds ${new Date(R[0].t).toISOString().slice(0,10)} → ${new Date(R[n-1].t).toISOString().slice(0,16)}; 18a ${J(stat(E18.filter(Boolean)))} live ${J(stat(Elive.filter(Boolean)))}`);
const diff=(A,B,idx)=>ms(idx.map(i=>(A[i]?A[i].pnl:0)-(B[i]?B[i].pnl:0)));
for(const[lab,T]of[['since Nov 18 12:00 UTC',Date.UTC(2026,10,18,12)],['since Nov 21 23:15 UTC (new this run)',Date.UTC(2026,10,21,23,15)]]){
 const idx=R.map((o,i)=>i).filter(i=>R[i].t>=T);const d=diff(E18,Elive,idx);
 console.log(`A 18a forward ${lab}: ${idx.length} rounds; 18a ${J(stat(idx.map(i=>E18[i]).filter(Boolean)))} live ${J(stat(idx.map(i=>Elive[i]).filter(Boolean)))} Δ ${f(d.m,2)}±${d.se.toFixed(2)} ¢/round; adds ${J(stat(idx.map(i=>Eadd[i]).filter(Boolean)))}`);
 if(T>Date.UTC(2026,10,21))console.log('   bets:',idx.filter(i=>E18[i]).map(i=>{const e=E18[i];return `${new Date(e.t).toISOString().slice(5,16)} ${e.kind} ${e.ask}¢ ${e.won?'W':'L'}`;}).join('; '));}
// ---- B
const MENU={'18a':E18};
const band=(lo,hi,slip=0)=>R.map((o,i)=>Eall[i]||fav(o,240,lo,hi,slip));
for(const L of [86,87,88,89,90])MENU[`adds ${L}–93`]=band(L,93);
MENU['adds 91–94']=band(91,94);MENU['adds 90–94']=band(90,94);
const SL={};for(const L of [86,87,88,89,90])SL[`adds ${L}–93`]=R.map((o,i)=>Eall[i]||(fav(o,240,L,90)?fav(o,240,L,90,1):fav(o,240,91,93)));
const D=(A,B,lo,hi)=>{const X=[];for(let i=lo;i<hi;i++)X.push((A[i]?A[i].pnl:0)-(B[i]?B[i].pnl:0));return X;};
console.log('\nB) read-free favourites by 4:00 price when the live read rule skips (read agrees; ¢/ct):');
for(const p of [84,85,86,87,88,89,90,91,92,93,94,95]){const xs=R.map((o,i)=>Eall[i]?null:fav(o,240,p,p)).filter(Boolean);const h=xs.filter(e=>e.t>=R[Math.floor(n/2)].t);
 console.log(`   ${p}¢: ${J(stat(xs))} newer half ${J(stat(h))}`);}
console.log('B) vs 18a (Δ¢/round):');
for(const k of Object.keys(MENU).slice(1)){const A=MENU[k],d=ms(D(A,E18,0,n)),h2=ms(D(A,E18,Math.floor(n/2),n));const q=[0,1,2,3].map(i=>{const[a,b]=Qs(i);return f(ms(D(A,E18,a,b)).m,2);}).join('/');
 const add=A.filter((e,i)=>e&&!E18[i]);const sl=SL[k]?ms(D(SL[k],E18,0,n)):null;
 console.log(`   ${k}: ${f(d.m)}±${d.se.toFixed(3)} (${(d.m/(d.se||1)).toFixed(1)} SE) Q ${q} newer half ${f(h2.m)}±${h2.se.toFixed(3)}; new adds ${J(stat(add))}${sl?`; +1¢ slip on new adds ${f(sl.m)}±${sl.se.toFixed(3)}`:''}`);}
{const pooled=[],picks=[];let tb=0,ta=0;for(let q=1;q<4;q++){const[a,b]=Qs(q);let best='18a',bv=0;for(const k of Object.keys(MENU)){const v=ms(D(MENU[k],E18,0,a)).m;if(v>bv){bv=v;best=k;}}
 picks.push(`Q${q+1} ${best}`);pooled.push(...D(MENU[best],E18,a,b));tb+=MENU[best].slice(a,b).filter(Boolean).length;ta+=MENU[best].slice(a,b).filter((e,j)=>e&&!E18[a+j]).length;}
 const p=ms(pooled);console.log(`   WF: ${picks.join(', ')} → ${f(p.m)}±${p.se.toFixed(3)} (${(p.m/(p.se||1)).toFixed(1)} SE; ${tb} test bets, ${ta} of them new adds)`);}
// ---- C
console.log('\nC) favourite by round start minute, rounds after Oct 24 (favourite = higher ask side; ¢/ct buying it, after fee):');
const T0=Date.UTC(2026,9,25);
for(const s of [240,600]){const g={0:[],15:[],30:[],45:[]};for(const o of R){if(o.t<T0)continue;const a=o.at[s];if(!a||a.ya==null||a.na==null||a.ya===a.na)continue;const c=a.ya>a.na?1:0,ask=side(a,c);if(ask<50||ask>97)continue;
 const won=o.up===c;g[new Date(o.t).getUTCMinutes()].push({won,ask,pnl:(won?100-ask:-ask)-feeP(ask)});}
 console.log(`   at ${s/60}:00 ` + Object.entries(g).map(([k,v])=>`:${k.padStart(2,'0')} lost ${(100-stat(v).win)}% n=${v.length} ${stat(v).c}±${stat(v).se}`).join(' | '));}
