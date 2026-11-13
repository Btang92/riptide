// Nov 13 evening: buy at 3:15 / 3:30 / 3:45 instead of 4:00 (entry price / timing inside the last minute before the lock).
// Data: every Kalshi trade 3:00–4:05 of every replay round (download script: /tmp k330/dl.mjs pattern = lab/kslag/ktrades.mjs with lo=+180 s, hi=+245 s).
// Price proxy for buying side c at time τ: last taker BUY of side c in [τ−15 s, τ] (YES taker → p, NO taker → 100−p); else last trade in window +1¢.
// Rules: fav = Kalshi favourite at τ (last trade), ask 75–90; live-like = fav also matches RIPTIDE's latest read with prob ≥ ask+fee+3
//   (read at 3:00 for τ<4:00, read at 4:00 for τ=4:00, so earlier entries use a staler read).
// Usage: node lab/replay/test-1113-eve2.mjs kt.json [kt2.json ...]
import fs from 'fs';import {R,feeP,stat} from './sim.mjs';import {et} from './lib.mjs';
const J=JSON.stringify,f=(v,d=3)=>(v>=0?'+':'')+v.toFixed(d);
const T={};for(const p of process.argv.slice(2))Object.assign(T,JSON.parse(fs.readFileSync(p)));for(const k in T)T[k].sort((a,b)=>a[0]-b[0]);
const S=R.filter(o=>T[o.t]&&T[o.t].length>=5&&o.at[240]&&o.at[240].ya!=null);const n=S.length;console.log('rounds with trades',n,new Date(S[0].t).toISOString().slice(0,10),'→',new Date(S[n-1].t).toISOString().slice(0,16));
function px(o,tau){const tr=T[o.t].filter(r=>r[0]-o.t<=tau*1000&&r[0]-o.t>tau*1000-15000);if(!tr.length)return null;const last=tr[tr.length-1];
 const fav=last[1]>=50?1:0;const ask=c=>{for(let i=tr.length-1;i>=0;i--){const r=tr[i];if(c===1&&r[2]===1)return r[1];if(c===0&&r[2]===0)return 100-r[1];}return(c?last[1]:100-last[1])+1;};
 return{fav,ask};}
const TAUS=[195,210,225,240];
function bet(o,tau,mode,hrs){if(hrs==='12–24'&&et(o.t).h<12)return null;const q=px(o,tau);if(!q)return null;
 let c;if(mode==='fav')c=q.fav;else{const a=tau<240?o.at[180]:o.at[240];if(!a||a.pu==null)return null;c=a.pu>=.5?1:0;}
 const ask=Math.round(q.ask(c));if(ask<75||ask>90)return null;
 if(mode==='live'){const a=tau<240?o.at[180]:o.at[240];if(Math.max(a.pu,1-a.pu)*100<ask+feeP(ask)+3)return null;}
 const won=o.up===c;return{t:o.t,c,ask,won,pnl:(won?100-ask:-ask)-feeP(ask)};}
// checkpoint-ask live rule, for reference
function liveCk(o,hrs){if(hrs==='12–24'&&et(o.t).h<12)return null;const a=o.at[240];if(!a||a.pu==null||a.ya==null)return null;const c=a.pu>=.5?1:0,ask=c?a.ya:a.na;if(ask<75||ask>90||Math.max(a.pu,1-a.pu)*100<ask+feeP(ask)+3)return null;const won=o.up===c;return{t:o.t,c,ask,won,pnl:(won?100-ask:-ask)-feeP(ask)};}
const ms=d=>{const m=d.reduce((s,v)=>s+v,0)/d.length;return{m,se:Math.sqrt(d.reduce((s,v)=>s+(v-m)**2,0)/(d.length-1)/d.length)};};
const Qs=i=>[Math.floor(n*i/4),Math.floor(n*(i+1)/4)];
const pnlR=(o,tau,mode,hrs)=>{const b=bet(o,tau,mode,hrs);return b?b.pnl:0;};
for(const mode of['live','fav'])for(const hrs of['12–24','all']){
 console.log(`\n=== ${mode} ${hrs}` + (mode==='live'?` | checkpoint-ask live rule ${J(stat(S.map(o=>liveCk(o,hrs)).filter(Boolean)))}`:''));
 for(const tau of TAUS){const B=S.map(o=>bet(o,tau,mode,hrs)).filter(Boolean);const d=ms(S.map(o=>pnlR(o,tau,mode,hrs)-pnlR(o,240,mode,hrs)));
  const q=[0,1,2,3].map(i=>{const[a,b]=Qs(i);return ms(S.slice(a,b).map(o=>pnlR(o,tau,mode,hrs)-pnlR(o,240,mode,hrs))).m;});
  // same-side same-round price difference where both bet
  const both=S.map(o=>{const x=bet(o,tau,mode,hrs),y=bet(o,240,mode,hrs);return x&&y&&x.c===y.c?x.ask-y.ask:null;}).filter(v=>v!=null);const pd=both.length>1?ms(both):{m:0,se:0};
  console.log(`  ${(tau/60|0)}:${String(tau%60).padStart(2,'0')} ${J(stat(B))}`+(tau<240?` | vs 4:00 Δ ${f(d.m)}±${d.se.toFixed(3)} ¢/round (${(d.m/d.se).toFixed(1)} SE) Q ${q.map(v=>f(v,2)).join(' / ')} | same-side price diff ${f(pd.m,2)}±${pd.se.toFixed(2)}¢ (${both.length})`:''));}
 // walk-forward choice of τ
 const pooled=[],picks=[],kept=[];for(let i=1;i<4;i++){const[a,b]=Qs(i);const tr=S.slice(0,a),te=S.slice(a,b);let best=240,bv=-1e9;
  for(const tau of TAUS){const v=ms(tr.map(o=>pnlR(o,tau,mode,hrs))).m;if(v>bv+1e-9){bv=v;best=tau;}}
  picks.push(`Q${i+1} ${best}s`);for(const o of te){pooled.push(pnlR(o,best,mode,hrs)-pnlR(o,240,mode,hrs));const x=bet(o,best,mode,hrs);if(x)kept.push(x);}}
 const p=ms(pooled);console.log(`  WF ${picks.join(', ')} → Δ ${f(p.m)}±${p.se.toFixed(3)} ¢/round, test bets ${J(stat(kept))}`);}
