// Oct 31 (chat): does the 99-period moving average (1-min candles, ~1h39m) help RIPTIDE's calls?
// Rounds: Kalshi public API (settled KXBTC15M + 1-min ask/bid) + Coinbase 1-min candles, last ~30 days.
// MA99 features at each checkpoint: z = ln(spot/MA99)/(σ1m·√99), above = sign, slope = ln(MA99 now / MA99 15 min ago)/(σ1m·√15).
import fs from 'fs';import {R,feeP,stat,paired} from './sim.mjs';import {et,fitLR,brainP,scoreSet,sigm} from './lib.mjs';
const M=JSON.parse(fs.readFileSync('lab/data/candles.json'));const J=JSON.stringify;
function ma(tEnd,n){let s=0,k=0;for(let i=0;i<n;i++){const x=M[tEnd-i*60000];if(x){s+=x[4];k++;}}return k>=n*.9?s/k:null;}
function f99(o,s){const a=o.at[s];if(!a)return null;const tEnd=o.t+s*1000-60000,c=M[tEnd];if(!c)return null;const spot=c[4];
 let v=0,k=0;for(let i=1;i<=60;i++){const p=M[tEnd-i*60000],q=M[tEnd-(i-1)*60000];if(p&&q){const z=Math.log(q[4]/p[4]);v+=z*z;k++;}}const sg=Math.sqrt(v/Math.max(1,k));
 const m=ma(tEnd,99),m15=ma(tEnd-15*60000,99);if(m==null||m15==null||!sg)return null;
 return{z:Math.log(spot/m)/(sg*Math.sqrt(99)),slope:Math.log(m/m15)/(sg*Math.sqrt(15)),above:spot>m?1:-1,strikeVs:Math.log(o.strike/m)/(sg*Math.sqrt(99))};}
const T=[120,180,240,300];const Rs=R.filter(o=>f99(o,120));
const cut=Math.floor(Rs.length*.75),tr=Rs.slice(0,cut),te=Rs.slice(cut),Q=i=>Rs.slice(Math.floor(Rs.length*i/4),Math.floor(Rs.length*(i+1)/4));
const iso=t=>new Date(t).toISOString().slice(0,16);
console.log(`rounds ${Rs.length} (${iso(Rs[0].t)} → ${iso(Rs.at(-1).t)}), train ${tr.length}, test ${te.length}`);
// 1) descriptive at 2:00
const a2=o=>o.at[120];
const grp=(set,fn)=>{const g={};for(const o of set){const k=fn(o);if(k==null)continue;(g[k]??=[0,0,0]);g[k][0]++;g[k][1]+=o.up;g[k][2]+=a2(o).ya;}return Object.entries(g).map(([k,[n,u,ya]])=>`${k}: n ${n} up ${(u/n*100).toFixed(1)}% (Kalshi YES avg ${(ya/n).toFixed(1)}¢)`).join(' | ');};
console.log('\n1) At 2:00, price vs MA99 →',grp(Rs,o=>f99(o,120).above>0?'above':'below'));
console.log('   MA99 slope →',grp(Rs,o=>{const s=f99(o,120).slope;return s>0.5?'rising':s<-0.5?'falling':'flat';}));
console.log('   strike vs MA99 →',grp(Rs,o=>f99(o,120).strikeVs>0?'strike above MA99':'strike below MA99'));
// 2) information beyond the price/model: walk-forward logistic regression at 2:00
const lg=p=>Math.log(Math.max(.01,Math.min(.99,p))/(1-Math.max(.01,Math.min(.99,p))));
const mid=o=>{const a=a2(o);return (a.ya+(100-a.na))/200;};
const ma3=o=>{const f=f99(o,120);return [f.z,f.slope,f.strikeVs];};
const sets={
 'Kalshi price only':o=>[lg(mid(o))],'Kalshi price + MA99':o=>[lg(mid(o)),...ma3(o)],
 'RIPTIDE base inputs':o=>a2(o).f,'RIPTIDE base + MA99':o=>[...a2(o).f,...ma3(o)],
 'RIPTIDE full (base+pattern+indicator)':o=>[...a2(o).f,...(a2(o).fp||[]),...(a2(o).fi||[])],'RIPTIDE full + MA99':o=>[...a2(o).f,...(a2(o).fp||[]),...(a2(o).fi||[]),...ma3(o)],
 'MA99 alone':ma3};
const P={};console.log('\n2) Test-set (newest 25%) log-loss / accuracy at 2:00 (lower log-loss = better):');
for(const[k,fn]of Object.entries(sets)){const m=fitLR(tr.map(fn),tr.map(o=>o.up));P[k]=te.map(o=>brainP(m,fn(o)));const s=scoreSet(P[k],te.map(o=>o.up));console.log(`  ${k.padEnd(40)} ll ${s.ll.toFixed(4)} acc ${(s.acc*100).toFixed(1)}%`);}
const llr=(p,y)=>-(y?Math.log(p):Math.log(1-p));
const pd=(a,b)=>{const d=te.map((o,i)=>llr(P[a][i],o.up)-llr(P[b][i],o.up));const m=d.reduce((s,x)=>s+x,0)/d.length,sd=Math.sqrt(d.reduce((s,x)=>s+(x-m)**2,0)/(d.length-1));return `${(m*1000).toFixed(1)}±${(sd/Math.sqrt(d.length)*1000).toFixed(1)} (×0.001, negative = MA99 helps)`;};
console.log('  paired ll change from adding MA99: vs Kalshi',pd('Kalshi price + MA99','Kalshi price only'),'| vs base',pd('RIPTIDE base + MA99','RIPTIDE base inputs'),'| vs full',pd('RIPTIDE full + MA99','RIPTIDE full (base+pattern+indicator)'));
// 3) betting: live rule (raw model pu, 75–90¢, prob ≥ ask+fee+3, calls 2:00–5:00), with MA99 filters
function go(set,{hrs,filt}){const out=[];for(const o of set){if(hrs&&et(o.t).h<12)continue;
 for(const s of T){const a=o.at[s];if(!a||!a.f)continue;const pu=a.pu,c=pu>=.5?1:-1,pr=Math.max(pu,1-pu),ask=c>0?a.ya:a.na;
  if(ask==null||ask<75||ask>90)continue;if(pr*100<ask+feeP(ask)+3)continue;
  if(filt){const f=f99(o,s);if(f&&!filt(f,c))break;}
  const won=(o.up===1)===(c===1);out.push({t:o.t,pnl:(won?100-ask:-ask)-feeP(ask),won,ask,s});break;}}return out;}
const F={'skip if price on wrong side of MA99':(f,c)=>f.above===c,'skip if MA99 slope against call (>0.5)':(f,c)=>!(f.slope*c<-0.5),
 'skip if both price & slope against':(f,c)=>!(f.above!==c&&f.slope*c<0),'skip if far wrong side (z<-1)':(f,c)=>!(f.z*c<-1),'only if price on wrong side (reverse check)':(f,c)=>f.above!==c};
for(const[nm,b]of[['live hours 12–24 ET',{hrs:1}],['all hours',{}]]){const g=s=>go(s,b);
 console.log(`\n3) ${nm}: no filter — all ${J(stat(g(Rs)))}, train ${J(stat(g(tr)))}, test ${J(stat(g(te)))}`);
 for(const[k,fn]of Object.entries(F)){const f=s=>go(s,{...b,filt:fn});const ptr=paired(tr,f(tr),g(tr)),pte=paired(te,f(te),g(te));
  console.log(`  ${k.padEnd(44)} bets ${f(Rs).length}/${g(Rs).length}; Δ¢/round train ${ptr.perRound}±${ptr.se} → test ${pte.perRound}±${pte.se}; filtered all ${J(stat(f(Rs)))}; quarters ${[0,1,2,3].map(i=>paired(Q(i),f(Q(i)),g(Q(i))).perRound).join(' / ')}`);}}
// 4) skipped bets' own result (what the filter throws away)
const base=go(Rs,{}),kept=new Set(go(Rs,{filt:F['skip if price on wrong side of MA99']}).map(x=>x.t));
console.log('\n4) all-hours bets the MA99 side-filter would skip:',J(stat(base.filter(x=>!kept.has(x.t)))),' kept:',J(stat(base.filter(x=>kept.has(x.t)))));
