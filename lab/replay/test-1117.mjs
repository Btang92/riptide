// Nov 17 morning, under the 4:00 lock (one check at 4:00, read ≥ ask + fee + 3, 75–90¢, live 12–24 ET).
// A) Frozen lead package (Nov 16 eve): all hours + sell at bid−1 when read on our side < .4 at 5:00–10:00 + double stake when
//    read edge ≥ median edge of bets before Nov 17 00:00 UTC. Scored ONLY on rounds from Nov 17 00:00 UTC, fixed config, paired vs live.
// B) Late-flip exit at 10:00 using distance in σ with the bid: z = ln(spot/strike) / (σ60 · √(effective secs left)), effective
//    secs left = 300 − 40 (60-s settlement average). Settlement-aware P(our side) = Φ(±z). Sell at bid−1 at 10:00 when
//    bid − exit fee > 100·P + m (m = −3/0/3/6), or when P < th (th = .6/.7/.8). Menu incl. "hold" chosen by expanding walk-forward Q2–Q4.
// C) Hours extension split by weekend: live 12–24 + 00–12 ET only on Sat/Sun, only on weekdays, or all days; expanding walk-forward Q2–Q4.
import fs from 'fs';import {R,feeP,stat} from './sim.mjs';import {et} from './lib.mjs';
const J=JSON.stringify,f=(v,d=3)=>(v>=0?'+':'')+v.toFixed(d);
const M=JSON.parse(fs.readFileSync('lab/data/candles.json'));const cb=t=>M[t]?.[4];
const n=R.length,Qs=i=>[Math.floor(n*i/4),Math.floor(n*(i+1)/4)];
const ms=d=>{if(!d.length)return{m:0,se:0,n:0};const m=d.reduce((s,v)=>s+v,0)/d.length;return{m,se:d.length>1?Math.sqrt(d.reduce((s,v)=>s+(v-m)**2,0)/(d.length-1)/d.length):0,n:d.length};};
const side=(a,c)=>c?a.ya:a.na,EX=[300,360,420,480,600];
const Phi=x=>{const t=1/(1+0.3275911*Math.abs(x/Math.SQRT2));const y=1-(((((1.061405429*t-1.453152027)*t)+1.421413741)*t-0.284496736)*t+0.254829592)*t*Math.exp(-x*x/2);return 0.5*(1+(x>=0?y:-y));};
function entry(o,set,lo=75,hi=90){const a=o.at[240];if(!a||!a.f||a.ya==null||a.na==null||a.pu==null)return null;const p=et(o.t);let c,ask;
 if(set==='live'&&p.h<12)return null;if(set==='wkend'&&p.h<12&&!['Sat','Sun'].includes(p.wd))return null;if(set==='wkday'&&p.h<12&&['Sat','Sun'].includes(p.wd))return null;
 c=a.pu>=.5?1:0;ask=side(a,c);if(ask<lo||ask>hi)return null;if(Math.max(a.pu,1-a.pu)*100<ask+feeP(ask)+3)return null;
 const won=o.up===c;return{t:o.t,o,c,ask,won,h:p.h,edge:Math.max(a.pu,1-a.pu)*100-ask-feeP(ask),hold:(won?100-ask:-ask)-feeP(ask),pnl:(won?100-ask:-ask)-feeP(ask)};}
console.log(`${n} rounds ${new Date(R[0].t).toISOString().slice(0,10)} → ${new Date(R[n-1].t).toISOString().slice(0,16)}`);
const out={A:{},B:{},C:{}};
const Elive=R.map(o=>entry(o,'live')),Eall=R.map(o=>entry(o,'all'));
// ---- A frozen package forward
function exitPnl(e,th){if(th==null)return e.hold;const o=e.o;for(const s of EX){const a=o.at[s];if(!a||a.ya==null||a.na==null||a.pu==null)continue;const bid=100-side(a,1-e.c)-1;if(bid<1)continue;const ps=e.c?a.pu:1-a.pu;
 if(ps<th)return bid-e.ask-feeP(e.ask)-feeP(bid);}return e.hold;}
const F0=Date.UTC(2026,10,17);const median=a=>{const s=[...a].sort((x,y)=>x-y);return s[Math.floor(s.length/2)];};
const med=median(Eall.filter(e=>e&&e.t<F0).map(e=>e.edge));
{const idx=R.map((o,i)=>i).filter(i=>R[i].t>=F0);const rs=idx.map(i=>{const e=Eall[i];if(!e)return{p:0,w:0};const w=e.edge>=med?2:1;return{p:exitPnl(e,.4)*w,w,e};});
 const nb=rs.filter(r=>r.w).length,mw=rs.reduce((s,r)=>s+r.w,0)/(nb||1)||1;const d=ms(idx.map((i,j)=>rs[j].p/mw-(Elive[i]?Elive[i].pnl:0)));
 const pk=rs.filter(r=>r.e).map(r=>({t:r.e.t,pnl:exitPnl(r.e,.4),won:r.e.won,ask:r.e.ask,exited:exitPnl(r.e,.4)!==r.e.hold}));
 out.A={rounds:idx.length,medEdge:+med.toFixed(2),pkgBets:nb,liveBets:idx.filter(i=>Elive[i]).length,diff:+d.m.toFixed(3),se:+d.se.toFixed(3),pkg:stat(pk),live:stat(idx.map(i=>Elive[i]).filter(Boolean))};
 console.log(`A frozen package forward (${idx.length} rounds since Nov 17 00:00 UTC): ${J(out.A)}`);}
// ---- B late-flip exit at 10:00 with σ-distance
function zAt(o,s){const m=o.t+s*1000-60000,px=cb(m);if(!px)return null;let v=0,k=0;for(let i=0;i<60;i++){const x=cb(m-i*60000),y=cb(m-(i+1)*60000);if(x&&y){v+=Math.log(x/y)**2;k++;}}
 if(k<40)return null;const sig=Math.sqrt(v/k/60);return Math.log(px/o.strike)/(sig*Math.sqrt(900-s-40));}
const RULES={hold:null};for(const m of[-3,0,3,6])RULES[`bid−fee>P+${m}`]={m};for(const th of[.6,.7,.8])RULES[`P<${th}`]={th};
function lateExit(e,r){if(!r)return e.hold;const a=e.o.at[600];if(!a||a.ya==null||a.na==null)return e.hold;const bid=100-side(a,1-e.c)-1;if(bid<1)return e.hold;
 const z=zAt(e.o,600);if(z==null)return e.hold;const P=e.c?Phi(z):1-Phi(z);const sell=r.m!=null?(bid-feeP(bid)>100*P+r.m):(P<r.th);return sell?bid-e.ask-feeP(e.ask)-feeP(bid):e.hold;}
for(const[sn,E]of[['live 12–24',Elive],['live all hours',Eall]]){
 const D=(k,lo,hi)=>{const X=[];for(let i=lo;i<hi;i++){const e=E[i];X.push(e?lateExit(e,RULES[k])-e.hold:0);}return X;};
 const whole={};for(const k of Object.keys(RULES).slice(1)){const d=ms(D(k,0,n));const ex=E.filter(e=>e&&lateExit(e,RULES[k])!==e.hold);whole[k]={d:`${f(d.m)}±${d.se.toFixed(3)}`,exits:ex.length,wouldWin:ex.filter(e=>e.won).length};}
 const pooled=[],picks=[];let tb=0;for(let q=1;q<4;q++){const[a,b]=Qs(q);let best='hold',bv=0;for(const k of Object.keys(RULES)){const v=ms(D(k,0,a)).m;if(v>bv){bv=v;best=k;}}
  picks.push(`Q${q+1} ${best}`);pooled.push(...D(best,a,b));tb+=E.slice(a,b).filter(Boolean).length;}
 const p=ms(pooled);out.B[sn]={whole,WF:{m:+p.m.toFixed(3),se:+p.se.toFixed(3),picks,testBets:tb}};
 console.log(`\nB ${sn}:`);for(const[k,v]of Object.entries(whole))console.log(`   ${k}: Δ¢/round ${v.d}, exits ${v.exits} (would have won ${v.wouldWin})`);
 console.log(`   WF ${picks.join(', ')} → ${f(p.m)}±${p.se.toFixed(3)} (${tb} test bets)`);}
// calibration of the σ-read vs Kalshi at 10:00 on the live-rule bets that reach 10:00 (all hours)
{const rows=Eall.filter(Boolean).map(e=>{const a=e.o.at[600];if(!a||a.ya==null||a.na==null)return null;const z=zAt(e.o,600);if(z==null)return null;const P=e.c?Phi(z):1-Phi(z);const bid=100-side(a,1-e.c);return{P,bid,won:e.won};}).filter(Boolean);
 const ll=(p,y)=>-Math.log(y?Math.max(1e-4,p):Math.max(1e-4,1-p));const llP=rows.reduce((s,r)=>s+ll(Math.min(.999,Math.max(.001,r.P)),r.won),0)/rows.length,llK=rows.reduce((s,r)=>s+ll(Math.min(.99,Math.max(.01,(r.bid+0.5)/100)),r.won),0)/rows.length;
 out.B.calib={n:rows.length,llSigma:+llP.toFixed(4),llKalshiBid:+llK.toFixed(4)};console.log(`   10:00 log-loss on held bets: σ-read ${llP.toFixed(4)} vs Kalshi bid ${llK.toFixed(4)} (n ${rows.length})`);}
// ---- C weekend split of the hours extension
const HS={live:Elive,wkend:R.map(o=>entry(o,'wkend')),wkday:R.map(o=>entry(o,'wkday')),all:Eall};
const DC=(k,lo,hi)=>{const X=[];for(let i=lo;i<hi;i++){const e=HS[k][i],l=Elive[i];X.push((e?e.pnl:0)-(l?l.pnl:0));}return X;};
{const by={};for(const k of['wkend','wkday']){const add=HS[k].filter((e,i)=>e&&!Elive[i]);by[k]={added:stat(add),whole:(d=>`${f(d.m)}±${d.se.toFixed(3)}`)(ms(DC(k,0,n)))};}
 by.all={added:stat(Eall.filter((e,i)=>e&&!Elive[i])),whole:(d=>`${f(d.m)}±${d.se.toFixed(3)}`)(ms(DC('all',0,n)))};
 const pooled=[],picks=[];let tb=0;for(let q=1;q<4;q++){const[a,b]=Qs(q);let best='live',bv=0;for(const k of Object.keys(HS)){const v=ms(DC(k,0,a)).m;if(v>bv){bv=v;best=k;}}
  picks.push(`Q${q+1} ${best}`);pooled.push(...DC(best,a,b));tb+=HS[best].slice(a,b).filter(Boolean).length;}
 const p=ms(pooled);const fw=Date.UTC(2026,10,12,12);const fwd=Eall.filter((e,i)=>e&&!Elive[i]&&e.t>=fw);
 out.C={by,WF:{m:+p.m.toFixed(3),se:+p.se.toFixed(3),picks,testBets:tb},addedSinceNov12:stat(fwd)};
 console.log(`\nC hours split: ${J(by)}\n   WF ${picks.join(', ')} → ${f(p.m)}±${p.se.toFixed(3)} (${tb} test bets); 00–12 added since Nov 12 12:00 ${J(stat(fwd))}`);}
fs.writeFileSync(process.env.OUT||'/tmp/t1117.json',J(out));
