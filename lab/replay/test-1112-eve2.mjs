// Nov 12 evening (B): recheck of the exit "sell at the bid when RIPTIDE's read on our side drops below .4 at any check 5:00–10:00"
// under the 4:00 lock — exit-by-exit detail, slippage 1/2/3¢, thresholds .35–.45, forward since Nov 9 (after the first test).
import {R,feeP,stat} from './sim.mjs';import {et} from './lib.mjs';const J=JSON.stringify;
const EX=[300,360,420,480,600],side=(a,c)=>c?a.ya:a.na;
function entry(o,hrs){const a=o.at[240];if(!a||a.ya==null||a.na==null||a.pu==null||!a.f)return null;if(hrs&&et(o.t).h<12)return null;const c=a.pu>=.5?1:0,ask=side(a,c);if(ask<75||ask>90)return null;if(Math.max(a.pu,1-a.pu)*100<ask+feeP(ask)+3)return null;return{c,ask};}
function sim(S,hrs,th,slip,log){const out=[];for(const o of S){const e=entry(o,hrs);if(!e)continue;const won=o.up===e.c;const hold=(won?100-e.ask:-e.ask)-feeP(e.ask);let pnl=hold,ex=null;
 if(th!=null)for(const s of EX){const a=o.at[s];if(!a||a.ya==null||a.na==null||a.pu==null)continue;const bid=100-side(a,1-e.c)-slip;if(bid<1)continue;const ps=e.c?a.pu:1-a.pu;if(ps<th){pnl=bid-e.ask-feeP(e.ask)-feeP(bid);ex={s,bid,ps};break;}}
 if(ex&&log)log.push(`${new Date(o.t).toISOString().slice(0,16)} ask ${e.ask} exit ${ex.s/60}:00 bid ${ex.bid} read ${ex.ps.toFixed(2)} → ${won?'would have WON':'would have lost'} Δ ${(pnl-hold).toFixed(1)}`);
 out.push({t:o.t,pnl,d:pnl-hold,won,ask:e.ask});}return out;}
const ms=d=>{const m=d.reduce((s,v)=>s+v,0)/d.length;return{m:+m.toFixed(2),se:+Math.sqrt(d.reduce((s,v)=>s+(v-m)**2,0)/(d.length-1)/d.length).toFixed(2),n:d.length};};
for(const [hn,h] of [['live 12–24',1],['live all hours',0]]){console.log(`\n=== ${hn}`);
 const log=[];sim(R,h,.4,1,log);log.forEach(x=>console.log('  ',x));
 for(const th of[.3,.35,.4,.45,.5])console.log(`  read<${th}: `+[1,2,3].map(sl=>`slip ${sl} Δ ${J(ms(sim(R,h,th,sl).map(x=>x.d)))}`).join(' | '));
 const fw=R.filter(o=>o.t>=Date.UTC(2026,10,9,12));console.log(`  forward since Nov 9 12:00 (${fw.length} rounds): hold ${J(stat(sim(fw,h,null,1)))} exit<.4 Δ ${J(ms(sim(fw,h,.4,1).map(x=>x.d)))}`);}
