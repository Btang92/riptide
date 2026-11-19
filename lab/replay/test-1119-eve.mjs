// Nov 19 evening. Reference = pending proposal 2026-11-18a ("18a" = live rule at 4:00, all hours, + 91–93¢ read-agreeing favourite add-on).
// B) Momentum guard at the 4:00 lock (aimed at calls that turn against by 3:00–5:00): skip a bet when BTC's 5-min (f[1]) or
//    15-min (f[2]) momentum, in vol units, points against our side by more than k. Applied to all 18a bets, or only to the 75–90 part.
// C) Which rounds / price paid inside 18a: 75–90 floor 75/77/78/80 under all hours; margin 5 in 75–80¢; stake ×0.5/×1.5/×2 on 91–93 adds.
// D) Price path for the 91–93 adds: require our side's ask at 3:00 ≥ 85 / ≥ 88 (settled favourite) or rising 3:00→4:00 (no give-back).
// Paired ¢/round vs 18a (1 contract = 1 unit stake), expanding walk-forward Q2–Q4 menu incl. 18a.
import {R,feeP,stat} from './sim.mjs';
const J=JSON.stringify,f=(v,d=3)=>(v>=0?'+':'')+v.toFixed(d);
const ms=d=>{if(!d.length)return{m:0,se:0,n:0};const m=d.reduce((s,v)=>s+v,0)/d.length;return{m,se:d.length>1?Math.sqrt(d.reduce((s,v)=>s+(v-m)**2,0)/(d.length-1)/d.length):0,n:d.length};};
const side=(a,c)=>c?a.ya:a.na,n=R.length,Qs=i=>[Math.floor(n*i/4),Math.floor(n*(i+1)/4)];
function at(o,s,m=3,lo=75,hi=90){const a=o.at[s];if(!a||!a.f||a.ya==null||a.na==null||a.pu==null)return null;const c=a.pu>=.5?1:0,ask=side(a,c);
 if(ask<lo||ask>hi)return null;if(m!=null&&Math.max(a.pu,1-a.pu)*100<ask+feeP(ask)+m)return null;const won=o.up===c;return{t:o.t,o,c,ask,won,s,kind:'live',pnl:(won?100-ask:-ask)-feeP(ask)};}
function fav(o,s,lo,hi){const a=o.at[s];if(!a||a.ya==null||a.na==null)return null;const c=a.ya>=a.na?1:0,ask=side(a,c);if(ask<lo||ask>hi)return null;
 if(a.pu!=null&&(a.pu>=.5?1:0)!==c)return null;const won=o.up===c;return{t:o.t,o,c,ask,won,s,kind:'add',pnl:(won?100-ask:-ask)-feeP(ask)};}
const b18=o=>at(o,240)||fav(o,240,91,93);const E18=R.map(b18);
const mom=(e,j)=>{const a=e.o.at[240];if(!a||!a.f)return 0;const v=a.f[j];return e.c?v:-v;}; // signed toward our side
const sc=(e,k)=>e?{...e,pnl:e.pnl*k}:null;
const ask3=e=>{const a=e.o.at[180];return a&&a.ya!=null?side(a,e.c):null;};
const MENU={'18a':(o,i)=>E18[i]};
for(const j of [1,2])for(const k of [0,.5,1,1.5]){const nm=j===1?'m5':'m15';
 MENU[`guard ${nm}<-${k} all`]=(o,i)=>{const e=E18[i];return e&&mom(e,j)<-k?null:e;};
 MENU[`guard ${nm}<-${k} 75-90`]=(o,i)=>{const e=E18[i];return e&&e.kind==='live'&&mom(e,j)<-k?null:e;};}
for(const lo of [77,78,80])MENU[`floor ${lo}`]=(o,i)=>at(o,240,3,lo,90)||fav(o,240,91,93);
MENU['m5 in 75-80']=(o,i)=>{const e=E18[i];if(e&&e.kind==='live'&&e.ask<80&&!at(o,240,5,75,80))return fav(o,240,91,93);return e;};
for(const k of [.5,1.5,2])MENU[`add stake x${k}`]=(o,i)=>{const e=E18[i];return e&&e.kind==='add'?sc(e,k):e;};
MENU['add 3:00≥85']=(o,i)=>{const e=E18[i];if(e&&e.kind==='add'){const a3=ask3(e);if(a3==null||a3<85)return null;}return e;};
MENU['add 3:00≥88']=(o,i)=>{const e=E18[i];if(e&&e.kind==='add'){const a3=ask3(e);if(a3==null||a3<88)return null;}return e;};
MENU['add rising']=(o,i)=>{const e=E18[i];if(e&&e.kind==='add'){const a3=ask3(e);if(a3==null||a3>e.ask)return null;}return e;};
const E=Object.fromEntries(Object.entries(MENU).map(([k,fn])=>[k,R.map((o,i)=>fn(o,i))]));
const D=(k,ref,lo,hi)=>{const X=[];for(let i=lo;i<hi;i++){const e=E[k][i],l=E[ref][i];X.push((e?e.pnl:0)-(l?l.pnl:0));}return X;};
console.log(`${n} rounds ${new Date(R[0].t).toISOString().slice(0,10)} → ${new Date(R[n-1].t).toISOString().slice(0,16)}; 18a ${J(stat(E18.filter(Boolean)))}`);
// diagnostics: 18a bets by momentum toward our side
for(const j of [1,2]){const g={};E18.forEach(e=>{if(!e)return;const m=mom(e,j),b=m<-1?'<-1':m<-.5?'-1..-.5':m<0?'-.5..0':m<1?'0..1':'≥1';(g[b]=g[b]||[]).push(e);});
 console.log(`18a bets by ${j===1?'5':'15'}-min momentum toward our side:`,Object.entries(g).map(([b,x])=>`${b} ${J(stat(x))}`).join(' | '));}
{const g={};E18.forEach(e=>{if(!e||e.kind!=='add')return;const a3=ask3(e),b=a3==null?'na':a3<80?'<80':a3<85?'80-84':a3<88?'85-87':a3<=e.ask?'88..≤4:00':'>4:00';(g[b]=g[b]||[]).push(e);});
 console.log('91–93 adds by our ask at 3:00:',Object.entries(g).map(([b,x])=>`${b} ${J(stat(x))}`).join(' | '));}
console.log('\nvariants vs 18a (Δ¢/round):');
for(const k of Object.keys(MENU).slice(1)){const d=ms(D(k,'18a',0,n));const q=[0,1,2,3].map(i=>{const[a,b]=Qs(i);return f(ms(D(k,'18a',a,b)).m,2);}).join('/');
 const h2=ms(D(k,'18a',Math.floor(n/2),n));const nb=E[k].filter(Boolean).length,dropped=E18.filter((e,i)=>e&&!E[k][i]);
 console.log(`  ${k}: ${f(d.m)}±${d.se.toFixed(3)} (${(d.m/(d.se||1)).toFixed(1)} SE) Q ${q} newer half ${f(h2.m)}±${h2.se.toFixed(3)} | bets ${nb} | dropped ${J(stat(dropped))}`);}
function wf(keys,ref){const pooled=[],picks=[];let tb=0;for(let q=1;q<4;q++){const[a,b]=Qs(q);let best=ref,bv=0;for(const k of keys){const v=ms(D(k,ref,0,a)).m;if(v>bv){bv=v;best=k;}}
 picks.push(`Q${q+1} ${best}`);pooled.push(...D(best,ref,a,b));tb+=E[best].slice(a,b).filter(Boolean).length;}
 const p=ms(pooled);return `${picks.join(', ')} → ${f(p.m)}±${p.se.toFixed(3)} (${(p.m/(p.se||1)).toFixed(1)} SE; ${tb} test bets)`;}
const K=Object.keys(MENU);
console.log('\nWF B (momentum guard):',wf(K.filter(k=>k==='18a'||k.startsWith('guard')),'18a'));
console.log('WF C (floor/margin/stake):',wf(K.filter(k=>k==='18a'||/^(floor|m5|add stake)/.test(k)),'18a'));
console.log('WF D (add price path):',wf(K.filter(k=>k==='18a'||/^add (3|rising)/.test(k)),'18a'));
console.log('WF all:',wf(K,'18a'));
