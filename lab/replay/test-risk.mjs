// Oct 24 run: (1) favourite-in-band (edge gate off inside 75–90¢) on rounds newer than the idea (after Oct 23 22:00 UTC);
// (2) risk limits: pause after N straight losses / daily loss cap; (3) previous round's result as a filter. All 3,179 rounds.
import {R,run,stat,paired,LIVE,feeP} from './sim.mjs';import {et} from './lib.mjs';
const live={margin:3,p:a=>a.pu},nogate={margin:-100,p:a=>a.pu};const ALLH={...LIVE,hs:0,he:24};
const IDEA=1792796467832;const nw=R.filter(o=>o.t>IDEA);
{const L=run(nw,live,LIVE),b=run(nw,nogate,LIVE);console.log(`(1) new rounds since idea: ${nw.length}; no-gate ${JSON.stringify(stat(b))} live ${JSON.stringify(stat(L))} paired ${JSON.stringify(paired(nw,b,L))}`);}
// (2) risk limits applied to a bet stream (time-ordered); pause rounds counted in 15-min rounds
function pause(b,N,K){const o=[];let streak=0,until=0;for(const x of b){if(x.t<until)continue;o.push(x);if(x.won)streak=0;else if(++streak>=N){until=x.t+K*900000;streak=0;}}return o;}
function cap(b,C){const o=[];const day={};for(const x of b){const p=et(x.t),d=`${p.y}-${p.mo}-${p.d}`;if((day[d]??0)<=-C)continue;o.push(x);day[d]=(day[d]??0)+x.pnl;}return o;}
const halves=[R.slice(0,Math.floor(R.length/2)),R.slice(Math.floor(R.length/2))];
for(const[nm,B,rule]of[['live',live,LIVE],['fav no-gate 12-24',nogate,LIVE],['fav no-gate all hours',nogate,ALLH]]){
 for(const[h,te]of halves.entries()){const b=run(te,B,rule);const rows=[['base',b]];
  for(const[N,K]of[[2,4],[2,8],[3,8],[3,16]])rows.push([`pause ${N}L→${K}r`,pause(b,N,K)]);for(const C of[100,200])rows.push([`daily cap ${C}¢`,cap(b,C)]);
  console.log(`\n(2) ${nm} half ${h+1}`);for(const[k,x]of rows)console.log('   ',k.padEnd(14),JSON.stringify(stat(x)),k==='base'?'':JSON.stringify(paired(te,x,b)));}}
// (3) previous round's result: did the previous round settle the same way as this bet's side?
console.log('\n(3) previous round result vs bet side (fav no-gate all hours)');
const byT=new Map(R.map(o=>[o.t,o]));
for(const[h,te]of halves.entries()){const b=run(te,nogate,ALLH),g={same:[],opp:[]};
 for(const x of b){const o=byT.get(x.t),p=byT.get(x.t-900000);if(!p)continue;const side=(o.up===1)===x.won?1:0; // side bet = UP?
  g[(p.up===side)?'same':'opp'].push(x);}
 console.log(`   half ${h+1} prev same dir ${JSON.stringify(stat(g.same))} | prev opposite ${JSON.stringify(stat(g.opp))}`);}
