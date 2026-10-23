// Evening Oct 23: 'drop the edge gate inside the live band' (bet Kalshi favourite 75-90¢, 12-24 ET, first check 2:00-5:00) vs live, paired, 4 quarters
import {R,run,stat,paired,LIVE,feeP} from './sim.mjs';import {et} from './lib.mjs';
const live={margin:3,p:a=>a.pu};
const nogate={margin:-100,p:a=>a.pu}; // live picks side by model; with no gate it bets model side if in band
const mkt=a=>(a.ya+(100-a.na))/200;const favB={margin:-100,p:a=>mkt(a)};
const q=Math.floor(R.length/4);
for(let k=0;k<4;k++){const te=R.slice(k*q,(k+1)*q),L=run(te,live,LIVE);
 for(const[nm,B,rule]of[['model side, no gate',nogate,LIVE],['favourite, no gate',favB,LIVE],['favourite all hours',favB,{...LIVE,hs:0,he:24}]]){const b=run(te,B,rule);
  console.log('Q'+(k+1),nm.padEnd(22),JSON.stringify(stat(b)),'live',JSON.stringify(stat(L)),'paired',JSON.stringify(paired(te,b,L)));}}
