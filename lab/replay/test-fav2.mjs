// Favourite rule chosen on older rounds only, scored on newest; plus fav bets the live gate skips
import {R,brain,run,stat,paired,LIVE,feeP} from './sim.mjs';import {et} from './lib.mjs';
const mkt=a=>(a.ya+(100-a.na))/200;
function fav(te,rule){const b=[];for(const o of te){const h=et(o.t).h;if(rule.hs!=null&&(h<rule.hs||h>=rule.he))continue;
  for(const s of rule.times){const a=o.at[s];if(!a)continue;const up=mkt(a)>=.5,ask=up?a.ya:a.na;if(!(ask>=rule.lo&&ask<=rule.hi&&ask>0&&ask<100))continue;
   const won=(o.up===1)===up;b.push({t:o.t,pnl:(won?100-ask:-ask)-feeP(ask),won,ask,s});break;}}return b;}
const grid=[];for(const[lo,hi]of[[60,90],[70,90],[75,90],[80,94],[85,95],[75,95]])for(const hs of[null,12])for(const times of[[120],[120,180,240,300]])grid.push({lo,hi,hs,he:24,times});
for(const f0 of[.5,.75]){const c=Math.floor(R.length*f0),tr=R.slice(0,c),te=R.slice(c,Math.floor(R.length*(f0+.25)));
 const sc=grid.map(g=>({g,st:stat(fav(tr,g))})).filter(x=>x.st.n>=300).sort((a,b)=>b.st.c-a.st.c);const best=sc[0];
 console.log(`fold ${f0} best on train`,JSON.stringify(best.g),JSON.stringify(best.st),'→ test',JSON.stringify(stat(fav(te,best.g))));
 console.log('  top3 train:',sc.slice(0,3).map(x=>`${x.g.lo}-${x.g.hi} h${x.g.hs} t${x.g.times.length} ${x.st.c}±${x.st.se}`).join(' | '));
 const B=brain(tr),live=run(te,B,LIVE),L=new Set(live.map(x=>x.t)),f=fav(te,LIVE);
 console.log('  fav bets live also took',JSON.stringify(stat(f.filter(x=>L.has(x.t)))),' fav bets live skipped',JSON.stringify(stat(f.filter(x=>!L.has(x.t)))));}
