// Nov 18 morning, under the 4:00 lock (live 2026-11-12c: one check at 4:00, read ≥ ask + fee + 3, 75–90¢, 12–24 ET).
// A) Upper band recheck (watch since Oct/Nov 8): (1) Kalshi favourite rule = buy the favourite at the first 2:00–4:00 check
//    priced 91–96¢ (stop if already above 96¢), all hours; whole / older 75% / newest 25% / since Nov 8 12:00 (forward of the
//    last check). (2) As an add-on to live at the 4:00 lock: also bet 91–93 / 91–96 at 4:00 when the read clears ask+fee+m
//    (m 0/3), or the favourite alone; paired ¢/round vs live, expanding walk-forward Q2–Q4 menu incl. none.
// B) Delayed entry: decide at 4:00 with the live rule (checkpoint ask), but BUY at 4:15 / 4:30 (or at 4:00) from real Kalshi
//    trades (lab/kslag/ktrades415.mjs, trades 3:45–4:35). Price proxy for buying side c at τ: last taker BUY of side c in
//    [τ−15 s, τ]; else last trade +1¢. Also "buy at 4:30 only if cheaper than at 4:00, else at 4:00" is NOT executable (look-ahead),
//    so the executable variants are: always 4:00 / always 4:15 / always 4:30 / skip if the 4:15 (4:30) price left 75–90.
//    Paired ¢/round vs buying at 4:00 on real trades; expanding WF Q2–Q4.
// Usage: node lab/replay/test-1118.mjs [kt415.json]
import fs from 'fs';import {R,feeP,stat} from './sim.mjs';import {et} from './lib.mjs';
const J=JSON.stringify,f=(v,d=3)=>(v>=0?'+':'')+v.toFixed(d);
const ms=d=>{if(!d.length)return{m:0,se:0,n:0};const m=d.reduce((s,v)=>s+v,0)/d.length;return{m,se:d.length>1?Math.sqrt(d.reduce((s,v)=>s+(v-m)**2,0)/(d.length-1)/d.length):0,n:d.length};};
const side=(a,c)=>c?a.ya:a.na,hr=o=>et(o.t).h,n=R.length,Qs=(i,N=n)=>[Math.floor(N*i/4),Math.floor(N*(i+1)/4)];
function at(o,s,m=3,lo=75,hi=90){const a=o.at[s];if(!a||!a.f||a.ya==null||a.na==null||a.pu==null)return null;const c=a.pu>=.5?1:0,ask=side(a,c);
 if(ask<lo||ask>hi)return null;if(m!=null&&Math.max(a.pu,1-a.pu)*100<ask+feeP(ask)+m)return null;const won=o.up===c;return{t:o.t,o,c,ask,won,pnl:(won?100-ask:-ask)-feeP(ask)};}
function fav(o,s,lo,hi){const a=o.at[s];if(!a||a.ya==null||a.na==null)return null;const c=a.ya>=a.na?1:0,ask=side(a,c);if(ask<lo||ask>hi)return null;const won=o.up===c;return{t:o.t,o,c,ask,won,pnl:(won?100-ask:-ask)-feeP(ask)};}
const live=o=>hr(o)<12?null:at(o,240);const Elive=R.map(live);
console.log(`${n} rounds ${new Date(R[0].t).toISOString().slice(0,10)} → ${new Date(R[n-1].t).toISOString().slice(0,16)}`);
const out={A:{},B:{}};
// ---- A1 favourite 91–96 rule
{const E=R.map(o=>{for(const s of[120,180,240]){const a=o.at[s];if(!a||a.ya==null||a.na==null)continue;const p=Math.max(a.ya,a.na);if(p>96)return null;const b=fav(o,s,91,96);if(b)return b;}return null;}).filter(Boolean);
 const c=Math.floor(n*.75),tc=R[c].t,F=Date.UTC(2026,10,8,12);
 const wk={};for(const e of E){const w=new Date(e.t-((new Date(e.t).getUTCDay()+6)%7)*864e5).toISOString().slice(5,10);(wk[w]=wk[w]||[]).push(e);}
 out.A.fav={whole:stat(E),older:stat(E.filter(e=>e.t<tc)),newest:stat(E.filter(e=>e.t>=tc)),sinceNov8:stat(E.filter(e=>e.t>=F)),weeks:Object.fromEntries(Object.entries(wk).map(([k,v])=>[k,stat(v).c]))};
 console.log('A1 favourite 91–96 first 2:00–4:00, all hours:',J(out.A.fav));}
// ---- A2 add-on to live at 4:00
for(const allH of[false,true]){const sn=allH?'all hours':'live 12–24';
 const base=allH?R.map(o=>at(o,240)):Elive;
 const MENU={none:o=>null,'91–93 m3':o=>at(o,240,3,91,93),'91–96 m3':o=>at(o,240,3,91,96),'91–93 m0':o=>at(o,240,0,91,93),'91–96 m0':o=>at(o,240,0,91,96),'91–93 fav':o=>fav(o,240,91,93),'91–96 fav':o=>fav(o,240,91,96)};
 const E=Object.fromEntries(Object.entries(MENU).map(([k,fn])=>[k,R.map((o,i)=>{if(!allH&&hr(o)<12)return null;return base[i]||fn(o);})]));
 const D=(k,lo,hi)=>{const X=[];for(let i=lo;i<hi;i++){const e=E[k][i],l=base[i];X.push((e?e.pnl:0)-(l?l.pnl:0));}return X;};
 const whole={};for(const k of Object.keys(MENU).slice(1)){const add=E[k].filter((e,i)=>e&&!base[i]);const d=ms(D(k,0,n));whole[k]={d:`${f(d.m)}±${d.se.toFixed(3)}`,added:stat(add),addedSinceNov8:stat(add.filter(e=>e.t>=Date.UTC(2026,10,8,12)))};}
 const pooled=[],picks=[];let tb=0;for(let q=1;q<4;q++){const[a,b]=Qs(q);let best='none',bv=0;for(const k of Object.keys(MENU)){const v=ms(D(k,0,a)).m;if(v>bv){bv=v;best=k;}}
  picks.push(`Q${q+1} ${best}`);pooled.push(...D(best,a,b));tb+=E[best].slice(a,b).filter((e,j)=>e&&!base[a+j]).length;}
 const p=ms(pooled);out.A[sn]={whole,WF:{m:+p.m.toFixed(3),se:+p.se.toFixed(3),picks,addedTestBets:tb}};
 console.log(`\nA2 add 91–9x at 4:00, ${sn}:`);for(const[k,v]of Object.entries(whole))console.log(`   ${k}: Δ¢/round ${v.d} | added ${J(v.added)} | since Nov 8 ${J(v.addedSinceNov8)}`);
 console.log(`   WF ${picks.join(', ')} → ${f(p.m)}±${p.se.toFixed(3)} (${tb} added test bets)`);}
// ---- B delayed entry on real trades
const files=process.argv.slice(2);
if(files.length){const T={};for(const p of files)Object.assign(T,JSON.parse(fs.readFileSync(p)));for(const k in T)T[k].sort((a,b)=>a[0]-b[0]);
 const px=(o,tau,c)=>{const tr=T[o.t].filter(r=>r[0]-o.t<=tau*1000&&r[0]-o.t>tau*1000-15000);if(!tr.length)return null;
  for(let i=tr.length-1;i>=0;i--){const r=tr[i];if(c===1&&r[2]===1)return Math.round(r[1]);if(c===0&&r[2]===0)return Math.round(100-r[1]);}const l=tr[tr.length-1];return Math.round((c?l[1]:100-l[1])+1);};
 for(const allH of[false,true]){const sn=allH?'all hours':'live 12–24';
  const S=R.filter(o=>T[o.t]&&T[o.t].length>=5&&(allH||hr(o)>=12));const N=S.length;
  const dec=S.map(o=>at(o,240));// decision at 4:00 checkpoint (live rule)
  const buy=(i,tau,band)=>{const d=dec[i];if(!d)return null;const ask=px(S[i],tau,d.c);if(ask==null)return null;if(band&&(ask<75||ask>90))return null;if(ask<1||ask>99)return null;const won=d.won;return{t:d.t,ask,won,pnl:(won?100-ask:-ask)-feeP(ask)};};
  const V={'4:00':i=>buy(i,240),'4:15':i=>buy(i,255),'4:30':i=>buy(i,270),'4:15 band':i=>buy(i,255,1),'4:30 band':i=>buy(i,270,1)};
  const P=Object.fromEntries(Object.entries(V).map(([k,fn])=>[k,S.map((o,i)=>fn(i))]));
  const D=(k,lo,hi)=>{const X=[];for(let i=lo;i<hi;i++){const e=P[k][i],l=P['4:00'][i];X.push((e?e.pnl:0)-(l?l.pnl:0));}return X;};
  const res={rounds:N,from:new Date(S[0].t).toISOString().slice(0,10),ck:stat(dec.filter(Boolean))};
  for(const k of Object.keys(V)){const d=ms(D(k,0,N));const both=S.map((o,i)=>P[k][i]&&P['4:00'][i]?P[k][i].ask-P['4:00'][i].ask:null).filter(v=>v!=null);const pd=ms(both);
   const q=[0,1,2,3].map(j=>{const[a,b]=Qs(j,N);return f(ms(D(k,a,b)).m,2);}).join('/');
   res[k]={bets:stat(P[k].filter(Boolean)),vs400:`${f(d.m)}±${d.se.toFixed(3)}`,quarters:q,priceDiff:`${f(pd.m,2)}±${pd.se.toFixed(2)} (${both.length})`};}
  const pooled=[],picks=[];let tb=0;for(let q=1;q<4;q++){const[a,b]=Qs(q,N);let best='4:00',bv=0;for(const k of Object.keys(V)){const v=ms(D(k,0,a)).m;if(v>bv){bv=v;best=k;}}
   picks.push(`Q${q+1} ${best}`);pooled.push(...D(best,a,b));tb+=P[best].slice(a,b).filter(Boolean).length;}
  const p=ms(pooled);res.WF={m:+p.m.toFixed(3),se:+p.se.toFixed(3),picks,testBets:tb};out.B[sn]=res;
  console.log(`\nB delayed entry, ${sn}: ${N} rounds from ${res.from}; checkpoint-ask live rule ${J(res.ck)}`);
  for(const k of Object.keys(V))console.log(`   ${k}: ${J(res[k].bets)} | vs real 4:00 Δ¢/round ${res[k].vs400} Q ${res[k].quarters} | same-bet price diff ${res[k].priceDiff}`);
  console.log(`   WF ${picks.join(', ')} → ${f(p.m)}±${p.se.toFixed(3)} (${tb} test bets)`);}}
fs.writeFileSync(process.env.OUT||'/tmp/claude-0/t1118.json',J(out));
