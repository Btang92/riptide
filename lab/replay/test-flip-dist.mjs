// Oct 24: how often a locked read flips and loses, by how sure the read was at lock (all 3,131 rounds)
import {R,feeP} from './sim.mjs';
for(const s of [120,300]){console.log(`lock at ${s/60}:00`);
 for(const[lo,hi]of[[.5,.6],[.6,.7],[.7,.8],[.8,.9],[.9,1.01]]){const X=R.filter(o=>o.at[s]&&Math.max(o.at[s].pu,1-o.at[s].pu)>=lo&&Math.max(o.at[s].pu,1-o.at[s].pu)<hi);
  const w=X.filter(o=>(o.at[s].pu>=.5)===(o.up===1)).length;
  const pl=X.map(o=>{const up=o.at[s].pu>=.5,a=up?o.at[s].ya:o.at[s].na;const ww=(o.up===1)===up;return (ww?100-a:-a)-feeP(a);});const m=pl.reduce((x,y)=>x+y,0)/pl.length;
  const askAvg=X.reduce((x,o)=>x+(o.at[s].pu>=.5?o.at[s].ya:o.at[s].na),0)/X.length;
  console.log(`  read ${(lo*100).toFixed(0)}–${Math.min(100,hi*100).toFixed(0)}%: ${String(X.length).padStart(4)} rounds (${(100*X.length/R.length).toFixed(0)}%), right ${(100*w/X.length).toFixed(0)}%, flipped & lost ${(100*(X.length-w)/X.length).toFixed(0)}%, avg price ${askAvg.toFixed(0)}¢, ${m>=0?'+':''}${m.toFixed(1)}¢/ct`);}}
