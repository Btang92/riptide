// Is ETH or XRP more profitable than BTC for RIPTIDE? Same model (distance-to-strike vs 60-min vol, Coinbase 1-min),
// same bet rules, Kalshi taker fee 0.07·P·(1−P). Train older 75% / test newest 25%. node lab/xcoin/test.mjs
import fs from 'fs';import {pUp,et,fitLR,brainP} from '../replay/lib.mjs';
const D='lab/xcoin/data/',J=JSON.stringify,feeP=a=>0.07*a*(100-a)/100,lg=p=>Math.log(p/(1-p));
const stat=b=>{const n=b.length;if(!n)return{n:0};const m=b.reduce((s,x)=>s+x.pnl,0)/n,sd=Math.sqrt(b.reduce((s,x)=>s+(x.pnl-m)**2,0)/Math.max(1,n-1));return{n,c:+m.toFixed(1),se:+(sd/Math.sqrt(n)).toFixed(1),win:Math.round(b.filter(x=>x.won).length/n*100),ask:Math.round(b.reduce((s,x)=>s+x.ask,0)/n)};};
const med=a=>{const s=[...a].sort((x,y)=>x-y);return s[s.length>>1];};
const bet=(o,c,ask,s)=>{const won=(o.up===1)===(c===1);return{t:o.t,pnl:(won?100-ask:-ask)-feeP(ask),won,ask,s};};
const S=[120,180,240,300];
for(const coin of ['BTC','ETH','XRP']){if(!fs.existsSync(D+coin+'-candles.json'))continue;
 const RR=JSON.parse(fs.readFileSync(D+coin+'-rounds.json')),M=JSON.parse(fs.readFileSync(D+coin+'-candles.json'));
 const R=[];for(const r of RR){if(!r.at)continue;const o={t:r.t,up:r.up,at:{}};
  for(const s of [...S,360,480,600]){const q=r.at[s];if(!q||q.ya==null||q.na==null||q.ya<=0||q.na<=0||q.ya>=100||q.na>=100)continue;
   const prev=[];for(let i=60;i>=0;i--){const x=M[r.t+s*1000-60000-i*60000];if(x)prev.push(x[4]);}if(prev.length<40)continue;
   let v=0;for(let i=1;i<prev.length;i++){const z=Math.log(prev[i]/prev[i-1]);v+=z*z;}const sg=Math.sqrt(v/(prev.length-1)/60);
   o.at[s]={ya:q.ya,na:q.na,v:q.v,pu:Math.min(.995,Math.max(.005,pUp(prev.at(-1),r.strike,900-s,sg)))};}
  if(o.at[120])R.push(o);}
 const cut=Math.floor(R.length*.75),tr=R.slice(0,cut),te=R.slice(cut),iso=t=>new Date(t).toISOString().slice(0,10);
 console.log(`\n===== ${coin}: ${R.length} rounds ${iso(R[0].t)} → ${iso(R.at(-1).t)} (test from ${iso(te[0].t)})`);
 const a2=R.map(o=>o.at[120]);console.log(`  liquidity @2:00: median spread ${med(a2.map(a=>a.ya+a.na-100)).toFixed(1)}¢, median 1:00–2:00 volume ${med(a2.map(a=>a.v))} contracts; spread ≥5¢ in ${Math.round(a2.filter(a=>a.ya+a.na-100>=5).length/a2.length*100)}% of rounds`);
 // forecasting: log-loss at 2:00 on test
 const rows=set=>set.map(o=>{const a=o.at[120],mid=Math.min(.98,Math.max(.02,(a.ya+100-a.na)/200));return{x:[lg(mid),lg(a.pu)],y:o.up,mid,pu:a.pu};});
 const Tr=rows(tr),Te=rows(te),L=(f)=>Te.reduce((s,r)=>{const p=Math.min(.99,Math.max(.01,f(r)));return s-(r.y?Math.log(p):Math.log(1-p));},0)/Te.length;
 const mB=fitLR(Tr.map(r=>r.x),Tr.map(r=>r.y)),mK=fitLR(Tr.map(r=>[r.x[0]]),Tr.map(r=>r.y));
 console.log(`  log-loss @2:00 (test): Kalshi mid ${L(r=>r.mid).toFixed(4)}, Kalshi refit ${L(r=>brainP(mK,[r.x[0]])).toFixed(4)}, RIPTIDE model ${L(r=>r.pu).toFixed(4)}, blend ${L(r=>brainP(mB,r.x)).toFixed(4)} (model weight ${mB.w[2].toFixed(2)} vs Kalshi ${mB.w[1].toFixed(2)})`);
 // rules
 const live=(set,{hrs=1,cut=240,lo=75,hi=90,m=3}={})=>{const out=[];for(const o of set){if(hrs&&et(o.t).h<12)continue;for(const s of S){if(s>cut)break;const a=o.at[s];if(!a)continue;
   const c=a.pu>=.5?1:-1,pr=Math.max(a.pu,1-a.pu),ask=c>0?a.ya:a.na;if(ask<lo||ask>hi)continue;if(pr*100<ask+feeP(ask)+m)continue;out.push(bet(o,c,ask,s));break;}}return out;};
 const fav=(set,{cut=240,lo=75,hi=90}={})=>{const out=[];for(const o of set)for(const s of S){if(s>cut)break;const a=o.at[s];if(!a)continue;let c=0,ask;if(a.ya>=lo&&a.ya<=hi){c=1;ask=a.ya;}else if(a.na>=lo&&a.na<=hi){c=-1;ask=a.na;}if(c){out.push(bet(o,c,ask,s));break;}}return out;};
 const modelSide=(set)=>set.map(o=>{const a=o.at[120],c=a.pu>=.5?1:-1;return bet(o,c,c>0?a.ya:a.na,120);});
 const value=(set,{lo=5,hi=95,m=3}={})=>live(set,{hrs:0,lo,hi,m});
 const line=(lab,f)=>console.log(`  ${lab.padEnd(44)} train ${J(stat(f(tr)))}  test ${J(stat(f(te)))}  all ${J(stat(f(R)))}`);
 line('LIVE RULE 12–24 ET (75–90¢, +3 edge, to 4:00)',s=>live(s));
 line('live rule all hours',s=>live(s,{hrs:0}));
 line('live rule all hours, any price 5–95¢',s=>value(s));
 line('live rule all hours, any price, edge +8',s=>value(s,{m:8}));
 line('Kalshi favourite 75–90¢ (2:00–4:00, all hrs)',s=>fav(s));
 line('Kalshi favourite 60–75¢',s=>fav(s,{lo:60,hi:74.9}));
 line('Kalshi favourite 90–97¢',s=>fav(s,{lo:90.1,hi:97}));
 line('model side every round @2:00',modelSide);
 // calibration of the market: all sides at 2:00 by price bucket (is any band mispriced?)
 const cal={};for(const o of R){const a=o.at[120];for(const[c,ask]of[[1,a.ya],[-1,a.na]]){const k=Math.min(9,Math.floor(ask/10));(cal[k]??=[]).push(bet(o,c,ask,120));}}
 console.log('  market calibration @2:00, buy any side by price (¢/ct after fee):',Object.keys(cal).sort((a,b)=>a-b).filter(k=>cal[k].length>=30).map(k=>`${k*10}s ${stat(cal[k]).c}±${stat(cal[k]).se} (${cal[k].length})`).join(' | '));
}
