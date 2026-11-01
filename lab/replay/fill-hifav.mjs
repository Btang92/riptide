// Nov 1 evening: fill realism for the high-favourite (90,96] rule. For each bet, pull Kalshi public trades in the 60 s after the
// check and look at taker buys of the bet side: how many, at what price vs the snapshot ask, how many contracts.
// Run from repo root after test-evening-1101.mjs (writes lab/data/hifav-bets.json). Cache: lab/data/hifav-trades.json (local).
import {execFileSync} from 'node:child_process';import fs from 'node:fs';
const K='https://api.elections.kalshi.com/trade-api/v2',B=JSON.parse(fs.readFileSync('lab/data/hifav-bets.json'));
const CF='lab/data/hifav-trades.json',C=fs.existsSync(CF)?JSON.parse(fs.readFileSync(CF)):{};
const R=JSON.parse(fs.readFileSync('lab/data/rounds.json')),byT=new Map(R.map(o=>[o.t,o]));
const sleep=ms=>execFileSync('sleep',[String(ms/1000)]);
const get=u=>{for(let a=0;a<6;a++){try{return JSON.parse(execFileSync('curl',['-sS','--fail','-m','30',u],{maxBuffer:64<<20,stdio:['ignore','pipe','ignore']}).toString());}catch(e){sleep(1500*(a+1));}}return null;};
const M=['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
function ticker(t){const d=new Date(t+900000),p=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',year:'2-digit',month:'numeric',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(d).map(x=>[x.type,x.value]));
 return `KXBTC15M-${p.year}${M[+p.month-1]}${p.day}${p.hour}${p.minute}-${p.minute}`;}
for(const b of B){if(C[b.t])continue;const lo=Math.floor((b.t+b.s*1000)/1000),hi=lo+60;const d=get(`${K}/markets/trades?ticker=${ticker(b.t)}&min_ts=${lo}&max_ts=${hi}&limit=1000`);
 C[b.t]=d?(d.trades||[]).map(x=>[Date.parse(x.created_time),Math.round(+x.yes_price_dollars*100),x.taker_side==='yes'?1:0,+x.count_fp]):null;sleep(250);}
fs.writeFileSync(CF,JSON.stringify(C));
const feeP=a=>0.07*a*(100-a)/100;let n=0,withBuy=0,atOrBelow=0,qty=[],slip=[],pnlSnap=0,pnlVwap=0,nV=0;
for(const b of B){const tr=C[b.t];if(!tr)continue;n++;const o=byT.get(b.t),a=o.at[b.s],side=a.ya===b.ask?1:0;
 const buys=tr.filter(x=>x[2]===side).map(x=>({p:side?x[1]:100-x[1],q:x[3]}));if(!buys.length)continue;withBuy++;
 const q=buys.reduce((s,x)=>s+x.q,0),v=buys.reduce((s,x)=>s+x.p*x.q,0)/q;qty.push(q);slip.push(v-b.ask);if(buys.some(x=>x.p<=b.ask))atOrBelow++;
 pnlSnap+=b.pnl;pnlVwap+=(b.won?100-v:-v)-feeP(v);nV++;}
const med=a=>{const s=[...a].sort((x,y)=>x-y);return s[Math.floor(s.length/2)];};
console.log(`bets with trade data ${n}/${B.length}; with taker buys of the bet side in the 60 s after the check ${withBuy}; some fill at ≤ snapshot ask ${atOrBelow}`);
console.log(`contracts bought by takers in that minute: median ${med(qty)}, p25 ${[...qty].sort((x,y)=>x-y)[Math.floor(qty.length*.25)]}; VWAP − snapshot ask: median ${med(slip)}¢, mean ${(slip.reduce((a,b)=>a+b,0)/slip.length).toFixed(2)}¢`);
console.log(`on those ${nV} bets: ¢/ct at snapshot ask ${(pnlSnap/nV).toFixed(2)}, at taker VWAP ${(pnlVwap/nV).toFixed(2)}`);
console.log('by source:',['kh','call'].map(k=>{const bs=B.filter(b=>b.src===k&&C[b.t]);return `${k} ${bs.length} bets, ${bs.filter(b=>C[b.t].length).length} with any trades`;}).join('; '));
