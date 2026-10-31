// Oct 31: pick the live rule's latest call time (3:00 / 4:00 vs live 5:00). Paired ¢/round by sixths of all rounds, plus the bad week.
import {R,feeP,stat,paired} from './sim.mjs';import {et} from './lib.mjs';
function go(set,{hrs,times}){const out=[];for(const o of set){if(hrs&&et(o.t).h<12)continue;for(const s of times){const a=o.at[s];if(!a||!a.f)continue;const pu=a.pu,c=pu>=.5?1:-1,pr=Math.max(pu,1-pu),ask=c>0?a.ya:a.na;
 if(ask==null||ask<75||ask>90||pr*100<ask+feeP(ask)+3)continue;const won=(o.up===1)===(c===1);out.push({t:o.t,pnl:(won?100-ask:-ask)-feeP(ask),won,ask,s});break;}}return out;}
const parts=6,P=i=>R.slice(Math.floor(R.length*i/parts),Math.floor(R.length*(i+1)/parts));
for(const hrs of [1,0]){const base=s=>go(s,{hrs,times:[120,180,240,300]});console.log(`\n${hrs?'12–24 ET (live hours)':'all hours'}: live 5:00 all rounds ${JSON.stringify(stat(base(R)))}`);
 for(const[nm,times]of[['3:00',[120,180]],['4:00',[120,180,240]]]){const f=s=>go(s,{hrs,times});const row=[...Array(parts)].map((_,i)=>{const p=paired(P(i),f(P(i)),base(P(i)));return`${p.perRound}±${p.se}`;});
  const all=paired(R,f(R),base(R)),rm=base(R).filter(x=>!f(R).some(y=>y.t===x.t));console.log(`  latest ${nm}: all ${all.perRound}±${all.se} ¢/round (${all.total}¢ total) | sixths ${row.join(' ')} | removed bets ${JSON.stringify(stat(rm))} | kept ${JSON.stringify(stat(f(R)))}`);}}
