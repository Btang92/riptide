// Nov 2: UTC hour-of-day drift (Quantpedia: BTC returns strongest 22–23 UTC, weakest 03–04 UTC). Does UP beat Kalshi's price in those hours?
import {R,feeP,stat} from './sim.mjs';const J=JSON.stringify;const cut=Math.floor(R.length*.75);
const up=(o,s)=>{const a=o.at[s];if(!a||a.ya==null||a.na==null)return null;const mid=(a.ya+100-a.na)/200;return{res:o.up-mid,b:{pnl:(o.up?100-a.ya:-a.ya)-feeP(a.ya),won:!!o.up,ask:a.ya},d:{pnl:(!o.up?100-a.na:-a.na)-feeP(a.na),won:!o.up,ask:a.na}};};
for(const s of [120,240]){console.log(`check ${s/60}:00 — UP minus price (¢) by UTC hour, train | test:`);const line=[];
 for(let h=0;h<24;h++){const f=set=>{const v=set.filter(o=>new Date(o.t).getUTCHours()===h).map(o=>up(o,s)).filter(Boolean).map(x=>x.res*100);const m=v.reduce((a,b)=>a+b,0)/v.length,sd=Math.sqrt(v.reduce((a,b)=>a+(b-m)**2,0)/(v.length-1));return `${m.toFixed(1)}±${(sd/Math.sqrt(v.length)).toFixed(1)}`;};
  line.push(`${String(h).padStart(2,'0')}h ${f(R.slice(0,cut))} | ${f(R.slice(cut))}`);}
 for(let i=0;i<24;i+=4)console.log('  '+line.slice(i,i+4).join('   '));
 for(const[n,hs]of[['22–23 UTC buy UP',[22,23]],['03–04 UTC buy DOWN',[3,4]]]){const k=hs[0]===22?'b':'d';const g=set=>stat(set.filter(o=>hs.includes(new Date(o.t).getUTCHours())).map(o=>up(o,s)).filter(Boolean).map(x=>x[k]));
  console.log(`  ${n}: train ${J(g(R.slice(0,cut)))} test ${J(g(R.slice(cut)))}`);}}
