// Per calendar day (is a weekday's edge from one big day or every week?) + RIPTIDE's real calls by weekday.
import fs from 'fs';import {R,run,stat,LIVE,feeP} from './sim.mjs';import {et} from './lib.mjs';
const D=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
const fav={margin:-100,p:a=>(a.ya+100-a.na)/200},ALLH={...LIVE,hs:0,he:24};
for(const[nm,rule]of[['favourite 75–90¢ all hours',ALLH],['favourite 75–90¢ 12–24 ET',LIVE]]){const b=run(R,fav,rule);console.log('\n'+nm+': ¢/contract per date (bets)');
 for(const d of D){const g={};for(const x of b){const p=et(x.t);if(p.wd!==d)continue;(g[`${p.mo}/${p.d}`]??=[]).push(x.pnl);}
  console.log(`  ${d}: `+Object.entries(g).map(([k,v])=>`${k} ${(v.reduce((s,x)=>s+x,0)/v.length).toFixed(1)} (${v.length})`).join(' | '));}}
const calls=JSON.parse(fs.readFileSync('lab/data/calls.json')).filter(c=>c.winner&&c.ask>0);
console.log('\nRIPTIDE real calls (every call, 1 contract at the ask):');
for(const d of D){const v=calls.filter(c=>et(c.start).wd===d).map(c=>{const won=c.winner===c.call;return{pnl:(won?100-c.ask:-c.ask)-feeP(c.ask),won,ask:c.ask};});console.log(`  ${d} ${JSON.stringify(stat(v))}`);}
