// Follow-up: Kalshi favourite priced 90–97¢ at the first 2:00–4:00 check, all three coins; by week, pooled with same-time clustering.
import fs from 'fs';import {pUp} from '../replay/lib.mjs';
const D='lab/xcoin/data/',feeP=a=>0.07*a*(100-a)/100;const all=[];
for(const coin of ['BTC','ETH','XRP']){const R=JSON.parse(fs.readFileSync(D+coin+'-rounds.json'));
 for(const o of R){if(!o.at)continue;for(const s of [120,180,240]){const a=o.at[s];if(!a||a.ya==null||a.na==null)continue;let c=0,ask;
  if(a.ya>90&&a.ya<=97){c=1;ask=a.ya;}else if(a.na>90&&a.na<=97){c=-1;ask=a.na;}
  if(c){const won=(o.up===1)===(c===1);all.push({coin,t:o.t,s,ask,won,pnl:(won?100-ask:-ask)-feeP(ask)});break;}
  if(a.ya>97||a.na>97)break;}}}
const st=b=>{const n=b.length,m=b.reduce((s,x)=>s+x.pnl,0)/n,sd=Math.sqrt(b.reduce((s,x)=>s+(x.pnl-m)**2,0)/(n-1));return `n ${n} ${m.toFixed(1)}±${(sd/Math.sqrt(n)).toFixed(1)} ¢/ct win ${(b.filter(x=>x.won).length/n*100).toFixed(1)}% ask ${(b.reduce((s,x)=>s+x.ask,0)/n).toFixed(1)}`;};
for(const c of ['BTC','ETH','XRP'])console.log(c,st(all.filter(x=>x.coin===c)));
console.log('pooled',st(all));
// cluster by round time (coins move together): sum pnl per time slot
const by={};for(const x of all)(by[x.t]??=[]).push(x.pnl);const sl=Object.values(by).map(v=>v.reduce((a,b)=>a+b,0)),n=sl.length,m=sl.reduce((a,b)=>a+b,0)/n,sd=Math.sqrt(sl.reduce((a,b)=>a+(b-m)**2,0)/(n-1));
console.log(`clustered: ${n} time slots, total ${(m*n).toFixed(0)}¢ over ${all.length} bets → ${(m*n/all.length).toFixed(1)}¢/ct ± ${(sd*Math.sqrt(n)/all.length).toFixed(1)}; slots with >1 coin ${Object.values(by).filter(v=>v.length>1).length}`);
const t0=Math.min(...all.map(x=>x.t));for(let w=0;w<4;w++)console.log('week',w+1,st(all.filter(x=>Math.floor((x.t-t0)/(7*864e5))===w)));
for(const[lo,hi]of[[90,93],[93,95],[95,97]])console.log(`${lo}–${hi}¢`,st(all.filter(x=>x.ask>lo&&x.ask<=hi)));
console.log('losses detail: per coin losses',['BTC','ETH','XRP'].map(c=>all.filter(x=>x.coin===c&&!x.won).length).join('/'));
