// Nov 16 evening, under the 4:00 lock (one check at 4:00, read ≥ ask + fee + 3, 75–90¢, live 12–24 ET).
// A) US market-session events inside the live window (aimed at the 16–20 ET weakness, worst block 14 runs running):
//    rounds starting 15:45/16:00 ET (US equity close), 17:00–17:45 ET on CME BTC-futures halt days (Mon–Thu; Fri from 17:00 = weekend close),
//    18:00 ET CME reopen (Sun–Thu), 09:30 open is outside the window. Per-slot ¢/ct for live / fav; skip rules chosen by expanding walk-forward Q2–Q4.
// B) Lead package: all hours (00–24) + read<th exit + double stake when edge ≥ median of earlier bets, each component switched on per fold
//    only if it helped on all earlier rounds (expanding walk-forward Q2–Q4); paired vs live ¢/round per $1-equivalent stake.
import fs from 'fs';import {R,feeP,stat} from './sim.mjs';import {et} from './lib.mjs';
const J=JSON.stringify,f=(v,d=3)=>(v>=0?'+':'')+v.toFixed(d);
const n=R.length,Qs=i=>[Math.floor(n*i/4),Math.floor(n*(i+1)/4)];
const ms=d=>{if(!d.length)return{m:0,se:0,n:0};const m=d.reduce((s,v)=>s+v,0)/d.length;return{m,se:d.length>1?Math.sqrt(d.reduce((s,v)=>s+(v-m)**2,0)/(d.length-1)/d.length):0,n:d.length};};
const side=(a,c)=>c?a.ya:a.na,EX=[300,360,420,480,600];
function entry(o,set,lo=75,hi=90){const a=o.at[240];if(!a||!a.f||a.ya==null||a.na==null||a.pu==null)return null;const h=et(o.t).h;let c,ask;
 if(set==='fav'){c=a.ya>=a.na?1:0;ask=side(a,c);if(ask<lo||ask>hi)return null;}
 else{if(set==='live'&&h<12)return null;c=a.pu>=.5?1:0;ask=side(a,c);if(ask<lo||ask>hi)return null;if(Math.max(a.pu,1-a.pu)*100<ask+feeP(ask)+3)return null;}
 const won=o.up===c;return{t:o.t,o,c,ask,won,h,edge:Math.max(a.pu,1-a.pu)*100-ask-feeP(ask),hold:(won?100-ask:-ask)-feeP(ask),pnl:(won?100-ask:-ask)-feeP(ask)};}
console.log(`${n} rounds ${new Date(R[0].t).toISOString().slice(0,10)} → ${new Date(R[n-1].t).toISOString().slice(0,16)}`);
const out={A:{},B:{}};
// ---- A slots
function slot(t){const p=et(t),m=p.h*60+p.mi,wd=p.wd;const halt=['Mon','Tue','Wed','Thu'].includes(wd),reopen=['Sun','Mon','Tue','Wed','Thu'].includes(wd);
 const s=[];if(m===945||m===960)s.push('eqClose');if(halt&&m>=1020&&m<1080)s.push('cmeHalt');if(wd==='Fri'&&m>=1020)s.push('friClose');if(reopen&&m===1080)s.push('cmeReopen');
 if(m>=960&&m<1200)s.push('16–20');return s;}
const SL=['eqClose','cmeHalt','friClose','cmeReopen','16–20'];
const SKIPS={none:[],eqClose:['eqClose'],cmeHalt:['cmeHalt'],cmeReopen:['cmeReopen'],'halt+reopen':['cmeHalt','cmeReopen'],'close+halt+reopen':['eqClose','cmeHalt','cmeReopen'],'16–20':['16–20']};
for(const[sn,set]of[['live 12–24','live'],['fav 12–24','fav12'],['fav all hours','fav']]){
 const E=R.map(o=>{if(set==='fav12'&&et(o.t).h<12)return null;return entry(o,set==='fav12'?'fav':set);});const B=E.filter(Boolean);
 const by={};for(const s of SL)by[s]=stat(B.filter(e=>slot(e.t).includes(s)));by.rest=stat(B.filter(e=>!slot(e.t).length));
 const D=(k,lo,hi)=>{const X=[];for(let i=lo;i<hi;i++){const e=E[i];X.push(e&&SKIPS[k].some(s=>slot(e.t).includes(s))?-e.pnl:0);}return X;};
 const whole=Object.fromEntries(Object.keys(SKIPS).slice(1).map(k=>{const d=ms(D(k,0,n));return[k,`${f(d.m)}±${d.se.toFixed(3)}`];}));
 const pooled=[],picks=[];let tb=0;for(let i=1;i<4;i++){const[a,b]=Qs(i);let best='none',bv=0;for(const k of Object.keys(SKIPS)){const v=ms(D(k,0,a)).m;if(v>bv){bv=v;best=k;}}
  picks.push(`Q${i+1} ${best}`);pooled.push(...D(best,a,b));tb+=E.slice(a,b).filter((e,j)=>e&&!SKIPS[best].some(s=>slot(e.t).includes(s))).length;}
 const p=ms(pooled);out.A[sn]={base:stat(B),bySlot:by,skipWhole:whole,WF:{m:+p.m.toFixed(3),se:+p.se.toFixed(3),picks,testBets:tb}};
 console.log(`\nA ${sn}: base ${J(stat(B))}`);for(const s of [...SL,'rest'])console.log(`   ${s}: ${J(by[s])}`);
 console.log(`   skip whole Δ¢/round ${Object.entries(whole).map(([k,v])=>k+' '+v).join(' | ')}`);console.log(`   WF ${picks.join(', ')} → ${f(p.m)}±${p.se.toFixed(3)} (${tb} test bets)`);}
// ---- B lead package
function exitPnl(e,th){if(th==null)return e.hold;const o=e.o;for(const s of EX){const a=o.at[s];if(!a||a.ya==null||a.na==null||a.pu==null)continue;const bid=100-side(a,1-e.c)-1;if(bid<1)continue;const ps=e.c?a.pu:1-a.pu;
 if(ps<th)return bid-e.ask-feeP(e.ask)-feeP(bid);}return e.hold;}
const Elive=R.map(o=>entry(o,'live')),Eall=R.map(o=>entry(o,'all'));
// per-round pnl for config {hrs:'live'|'all', th, stake:bool, med} (stake weight 2 if edge≥med; normalised later)
const cfgPnl=(c,i)=>{const e=(c.hrs==='all'?Eall:Elive)[i];if(!e)return{p:0,w:0};const w=c.stake&&e.edge>=c.med?2:1;return{p:exitPnl(e,c.th)*w,w};};
const median=a=>{const s=[...a].sort((x,y)=>x-y);return s[Math.floor(s.length/2)];};
const CF=[];for(const hrs of['live','all'])for(const th of[null,.4])for(const stake of[false,true])CF.push({hrs,th,stake});
const pooled=[],base=[],picks=[];let tb=0;
for(let q=1;q<4;q++){const[a,b]=Qs(q);let best=CF[0],bv=-1e9;
 for(const c0 of CF){const med=median(Eall.slice(0,a).filter(Boolean).map(e=>e.edge));const c={...c0,med};let s=0,w=0;for(let i=0;i<a;i++){const r=cfgPnl(c,i);s+=r.p;w+=r.w;}
  // score per round normalised to average stake = live's average stake per bet over the same rounds
  const lb=Elive.slice(0,a).filter(Boolean).length;const nb=(c.hrs==='all'?Eall:Elive).slice(0,a).filter(Boolean).length;const v=s/(w/nb||1)/a;if(v>bv){bv=v;best=c;}}
 const med=median(Eall.slice(0,a).filter(Boolean).map(e=>e.edge));const c={...best,med};picks.push(`Q${q+1} ${c.hrs}${c.th?' exit<'+c.th:''}${c.stake?' stake×2':''}`);
 const rs=[];let w=0,nb=0;for(let i=a;i<b;i++){const r=cfgPnl(c,i);rs.push(r);w+=r.w;if(r.w)nb++;}const mw=w/nb||1;tb+=nb;
 for(let i=a;i<b;i++){pooled.push(rs[i-a].p/mw);base.push(Elive[i]?Elive[i].pnl:0);}}
const d=ms(pooled.map((v,i)=>v-base[i]));out.B={picks,testBets:tb,diff:+d.m.toFixed(3),se:+d.se.toFixed(3)};
console.log(`\nB package WF ${picks.join(', ')} → Δ ${f(d.m)}±${d.se.toFixed(3)} ¢/round vs live (${tb} test bets)`);
// fixed full package (all hours + exit<.4 + stake), per quarter, for reference
for(let q=0;q<4;q++){const[a,b]=Qs(q);const med=median(Eall.slice(0,Math.max(a,1)).filter(Boolean).map(e=>e.edge))??0;const c={hrs:'all',th:.4,stake:q>0,med};
 const rs=[];let w=0,nb=0;for(let i=a;i<b;i++){const r=cfgPnl(c,i);rs.push(r);w+=r.w;if(r.w)nb++;}const mw=w/nb||1;const dd=ms(rs.map((r,j)=>r.p/mw-(Elive[a+j]?Elive[a+j].pnl:0)));
 console.log(`   fixed full package Q${q+1}: Δ ${f(dd.m)}±${dd.se.toFixed(3)} (${nb} bets)`);out.B['fixedQ'+(q+1)]={m:+dd.m.toFixed(3),se:+dd.se.toFixed(3),n:nb};}
fs.writeFileSync('/tmp/claude-0/t1116e.json',J(out));
