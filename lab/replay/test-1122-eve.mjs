// Nov 22 evening. Reference = pending proposal 2026-11-18a (live rule at 4:00, all hours, + 91–93¢ read-agreeing favourite add-on).
// A) Forward: 18a since Nov 18 12:00 UTC and since this morning's data (Nov 22 11:15 UTC); adds forward win rate; 18–20 / 16–20 ET forward.
// B) Volatility gate on top of 18a, aimed at calls that turn against us by 3:00–5:00 (and late flips on 92¢ adds):
//    skip the 75–90 part / the adds / both when, at 4:00, σ60 ($ per √min, absolute), σ15, σ15/σ60 or the 30-min range ($)
//    is above (or below) a cut set at the 67th (33rd) percentile of the TRAINING rounds' 18a bets. Paired ¢/round vs 18a,
//    quarters, expanding walk-forward Q2–Q4 (feature, part, side chosen on older rounds only).
import fs from 'fs';import {R,feeP,stat} from './sim.mjs';import {et} from './lib.mjs';
const M=JSON.parse(fs.readFileSync('lab/data/candles.json'));
const J=JSON.stringify,f=(v,d=3)=>(v>=0?'+':'')+v.toFixed(d);
const ms=d=>{if(!d.length)return{m:0,se:0,n:0};const m=d.reduce((s,v)=>s+v,0)/d.length;return{m,se:d.length>1?Math.sqrt(d.reduce((s,v)=>s+(v-m)**2,0)/(d.length-1)/d.length):0,n:d.length};};
const side=(a,c)=>c?a.ya:a.na,hr=o=>et(o.t).h,n=R.length,Qs=i=>[Math.floor(n*i/4),Math.floor(n*(i+1)/4)];
function at(o,s,m=3,lo=75,hi=90){const a=o.at[s];if(!a||!a.f||a.ya==null||a.na==null||a.pu==null)return null;const c=a.pu>=.5?1:0,ask=side(a,c);
 if(ask<lo||ask>hi)return null;if(Math.max(a.pu,1-a.pu)*100<ask+feeP(ask)+m)return null;const won=o.up===c;
 return{t:o.t,o,c,ask,won,kind:'live',pnl:(won?100-ask:-ask)-feeP(ask)};}
function fav(o,s,lo,hi){const a=o.at[s];if(!a||a.ya==null||a.na==null)return null;const c=a.ya>=a.na?1:0,ask=side(a,c);if(ask<lo||ask>hi)return null;
 if(a.pu!=null&&(a.pu>=.5?1:0)!==c)return null;const won=o.up===c;return{t:o.t,o,c,ask,won,kind:'add',pnl:(won?100-ask:-ask)-feeP(ask)};}
const Elive=R.map(o=>hr(o)<12?null:at(o,240)),Eall=R.map(o=>at(o,240)),Eadd=R.map((o,i)=>Eall[i]?null:fav(o,240,91,93));
const E18=R.map((o,i)=>Eall[i]||Eadd[i]);
console.log(`${n} rounds ${new Date(R[0].t).toISOString().slice(0,10)} → ${new Date(R[n-1].t).toISOString().slice(0,16)}; 18a ${J(stat(E18.filter(Boolean)))} live ${J(stat(Elive.filter(Boolean)))} adds ${J(stat(Eadd.filter(Boolean)))}`);
const diff=(A,B,idx)=>ms(idx.map(i=>(A[i]?A[i].pnl:0)-(B[i]?B[i].pnl:0)));
for(const[lab,T]of[['since Nov 18 12:00 UTC',Date.UTC(2026,10,18,12)],['since Nov 22 11:15 UTC (new this run)',Date.UTC(2026,10,22,11,15)]]){
 const idx=R.map((o,i)=>i).filter(i=>R[i].t>=T);const d=diff(E18,Elive,idx);
 console.log(`A 18a forward ${lab}: ${idx.length} rounds; 18a ${J(stat(idx.map(i=>E18[i]).filter(Boolean)))} live ${J(stat(idx.map(i=>Elive[i]).filter(Boolean)))} Δ ${f(d.m,2)}±${d.se.toFixed(2)} ¢/round; adds ${J(stat(idx.map(i=>Eadd[i]).filter(Boolean)))}; 75–90 all-hours part ${J(stat(idx.map(i=>Eall[i]).filter(Boolean)))}`);
 if(T>Date.UTC(2026,10,22))console.log('   bets:',idx.filter(i=>E18[i]).map(i=>{const e=E18[i];return `${new Date(e.t).toISOString().slice(5,16)} ${e.kind} ${e.ask}¢ ${e.won?'W':'L'}`;}).join('; '));}
{const T=Date.UTC(2026,10,18,12);for(const[a,b]of[[18,20],[16,20]]){const xs=E18.filter(e=>e&&e.t>=T&&hr(e.o)>=a&&hr(e.o)<b);console.log(`A 18a bets ${a}–${b} ET forward since Nov 18 12:00: ${J(stat(xs))}; all-time ${J(stat(E18.filter(e=>e&&hr(e.o)>=a&&hr(e.o)<b)))}`);}}
// ---- B: volatility at 4:00 from Coinbase 1-min closes (candle starting at 3:00 closes at 4:00)
const VOL=R.map(o=>{const end=o.t+240000-60000;const cl=[],hi=[],lo=[];for(let i=60;i>=0;i--){const x=M[end-i*60000];if(x){cl.push(x[4]);hi.push(x[2]);lo.push(x[1]);}}
 if(cl.length<40)return null;const r=[];for(let i=1;i<cl.length;i++)r.push(cl[i]-cl[i-1]);const sd=a=>Math.sqrt(a.reduce((s,v)=>s+v*v,0)/a.length);
 const s60=sd(r),s15=sd(r.slice(-15));return{s60,s15,ratio:s15/(s60||1),rng30:Math.max(...hi.slice(-30))-Math.min(...lo.slice(-30))};});
const FEAT=['s60','s15','ratio','rng30'];
console.log('\nB) 18a bets by volatility tercile at 4:00 (whole history; cuts = terciles of all 18a bets):');
for(const F of FEAT){for(const part of ['live','add']){const xs=E18.map((e,i)=>e&&e.kind===part&&VOL[i]?{e,v:VOL[i][F]}:null).filter(Boolean).sort((a,b)=>a.v-b.v);
 const k=xs.length,g=[xs.slice(0,k/3|0),xs.slice(k/3|0,2*k/3|0),xs.slice(2*k/3|0)];
 console.log(`   ${F.padEnd(5)} ${part==='live'?'75–90':'adds '}: `+g.map((s,j)=>`T${j+1} (≤${s.length?s[s.length-1].v.toFixed(F==='ratio'?2:1):'-'}) ${J(stat(s.map(x=>x.e)))}`).join(' | '));}}
const D=(A,B,lo,hi)=>{const X=[];for(let i=lo;i<hi;i++)X.push((A[i]?A[i].pnl:0)-(B[i]?B[i].pnl:0));return X;};
const q=(arr,p)=>{const s=[...arr].sort((a,b)=>a-b);return s[Math.min(s.length-1,Math.floor(p*s.length))];};
function gated(F,part,dir,cut){return E18.map((e,i)=>{if(!e)return null;if(part!=='both'&&e.kind!==part)return e;const v=VOL[i]&&VOL[i][F];if(v==null)return e;return (dir>0?v>=cut:v<=cut)?null:e;});}
function menu(trainEnd){const out={'18a':E18};for(const F of FEAT)for(const part of ['live','add','both']){
  const vs=[];for(let i=0;i<trainEnd;i++)if(E18[i]&&(part==='both'||E18[i].kind===part)&&VOL[i])vs.push(VOL[i][F]);if(vs.length<30)continue;
  out[`${F} ${part} skip≥p67`]=gated(F,part,1,q(vs,.67));out[`${F} ${part} skip≤p33`]=gated(F,part,-1,q(vs,.33));
  out[`${F} ${part} skip≥p90`]=gated(F,part,1,q(vs,.9));}return out;}
console.log('B) gates vs 18a, cuts from the older half (Δ¢/round, whole and newer half):');
{const half=Math.floor(n/2),MN=menu(half);const rows=[];for(const k of Object.keys(MN).slice(1)){const A=MN[k],d=ms(D(A,E18,0,n)),h2=ms(D(A,E18,half,n));const sk=E18.filter((e,i)=>e&&!A[i]);
 rows.push({k,d,h2,sk});}
 rows.sort((a,b)=>b.h2.m-a.h2.m);for(const r of rows)console.log(`   ${r.k.padEnd(24)} whole ${f(r.d.m)}±${r.d.se.toFixed(3)} newer half ${f(r.h2.m)}±${r.h2.se.toFixed(3)} skipped ${J(stat(r.sk))}`);}
{const pooled=[],picks=[];let tb=0;for(let qq=1;qq<4;qq++){const[a,b]=Qs(qq);const MN=menu(a);let best='18a',bv=0;for(const k of Object.keys(MN)){const v=ms(D(MN[k],E18,0,a)).m;if(v>bv){bv=v;best=k;}}
 picks.push(`Q${qq+1} ${best}`);pooled.push(...D(MN[best],E18,a,b));tb+=MN[best].slice(a,b).filter(Boolean).length;}
 const p=ms(pooled);console.log(`   WF: ${picks.join(', ')} → ${f(p.m)}±${p.se.toFixed(3)} (${(p.m/(p.se||1)).toFixed(1)} SE; ${tb} test bets)`);}
