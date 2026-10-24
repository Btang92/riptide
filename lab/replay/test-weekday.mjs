// Brandon (Oct 24): which days of the week are better? By ET weekday: live rule, favourite 75–90¢ (no gate),
// RIPTIDE's real calls, and BTC movement. Split into first/second half of the data to see whether a day's edge repeats.
import fs from 'fs';import {R,run,stat,LIVE,feeP} from './sim.mjs';import {et} from './lib.mjs';
const D=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];const wd=t=>et(t).wd;
const live={margin:3,p:a=>a.pu},fav={margin:-100,p:a=>(a.ya+100-a.na)/200},ALLH={...LIVE,hs:0,he:24};
const half=Math.floor(R.length/2),H=[R.slice(0,half),R.slice(half)];
const by=(b)=>Object.fromEntries(D.map(d=>[d,b.filter(x=>wd(x.t)===d)]));
const fmt=s=>s.n?`${String(s.n).padStart(4)} ${(s.c>=0?'+':'')+s.c.toFixed(1)}±${s.se.toFixed(1)} (${s.win}%)`.padEnd(24):'   0'.padEnd(24);
for(const[nm,B,rule]of[['Live rule (75–90¢, 12–24 ET)',live,LIVE],['Live rule all hours',live,ALLH],['Kalshi favourite 75–90¢, all hours',fav,ALLH],['Kalshi favourite 75–90¢, 12–24 ET',fav,LIVE]]){
 const all=by(run(R,B,rule)),h1=by(run(H[0],B,rule)),h2=by(run(H[1],B,rule));
 console.log(`\n${nm}   ¢/contract after fees: n  mean±se (win%)\n  day   all rounds              first half              second half`);
 for(const d of D)console.log(`  ${d}  ${fmt(stat(all[d]))}${fmt(stat(h1[d]))}${fmt(stat(h2[d]))}`);}
// RIPTIDE's own settled calls
const calls=JSON.parse(fs.readFileSync('lab/data/calls.json')).filter(c=>c.winner&&c.price!=null);
console.log('\nRIPTIDE real calls by day (price key:',Object.keys(calls[0]||{}).join(','),')');
// BTC movement and favourite upsets per day (all rounds)
console.log('\nMarket by day: rounds, median |BTC move| over the round ($, from strike to settle proxy), favourite at 2:00 lost %');
const M=JSON.parse(fs.readFileSync('lab/data/candles.json'));
for(const d of D){const rs=R.filter(o=>wd(o.t)===d);const mv=[];let up=0,lost=0,n=0;for(const o of rs){const a=M[o.t],b=M[o.t+840000];if(a&&b)mv.push(Math.abs(b[4]-a[3]));const c=o.at[120];if(c){n++;const fu=(c.ya+100-c.na)>=100;if(fu!==(o.up===1))lost++;}}
 mv.sort((x,y)=>x-y);const days=new Set(rs.map(o=>{const p=et(o.t);return p.mo+'-'+p.d;})).size;
 console.log(`  ${d}  ${days} days, ${rs.length} rounds, median move $${(mv[mv.length>>1]||0).toFixed(0)}, favourite lost ${(lost/n*100).toFixed(1)}%`);}
