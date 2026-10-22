import {R,brain,split,run,stat,feeP} from './sim.mjs';
const res={};const fav={};
for(const f0 of [.5,.75]){const tr=R.slice(0,Math.floor(R.length*f0)),te=R.slice(Math.floor(R.length*f0),Math.floor(R.length*(f0+.25)));const B=brain(tr);
 for(const s of [120,240]){for(const o of te){const a=o.at[s];if(!a||!a.f)continue;const pu=B.p(a);
  for(const side of ['UP','DOWN']){const p=side==='UP'?pu:1-pu,ask=side==='UP'?a.ya:a.na;if(!(ask>0&&ask<100))continue;const e=p*100-ask-feeP(ask);
   const pnl=((o.up===1)===(side==='UP')?100-ask:-ask)-feeP(ask);
   const k=`${s} edge `+(e<0?'<0':e<3?'0-3':e<6?'3-6':e<10?'6-10':e<15?'10-15':'15+');(res[k]??=[]).push({pnl,won:pnl>0,ask});
   if(ask>=80&&ask<=94){(fav[`${s} fav80-94 f${f0}`]??=[]).push({pnl,won:pnl>0,ask});}}}}}
for(const k of Object.keys(res).sort())console.log(k.padEnd(16),JSON.stringify(stat(res[k])));
for(const k of Object.keys(fav).sort())console.log(k.padEnd(20),JSON.stringify(stat(fav[k])));
