// Favourite-in-band (Kalshi alone) stability + margin sweep + direct Kalshi-lag test
import {R,brain,run,stat,paired,LIVE,feeP} from './sim.mjs';
import {et} from './lib.mjs';
const lg=p=>{p=Math.min(.99,Math.max(.01,p));return Math.log(p/(1-p));};
const mkt=a=>Math.min(.97,Math.max(.03,(a.ya+(100-a.na))/200));
function fav(te,rule,{needModel=false,B=null,minProb=null}={}){const b=[];
  for(const o of te){const h=et(o.t).h;if(rule.hs!=null&&(h<rule.hs||h>=rule.he))continue;
    for(const s of rule.times){const a=o.at[s];if(!a)continue;const up=mkt(a)>=.5,ask=up?a.ya:a.na;if(!(ask>=rule.lo&&ask<=rule.hi&&ask>0&&ask<100))continue;
      if(needModel){const pu=B.p(a),ps=up?pu:1-pu;if(ps<(minProb??.5))continue;}
      const won=(o.up===1)===up;b.push({t:o.t,pnl:(won?100-ask:-ask)-feeP(ask),won,ask,s});break;}}return b;}
const q=k=>R.slice(Math.floor(R.length*k/4),Math.floor(R.length*(k+1)/4));
console.log('--- favourite in live band/hours (no fitting), by quarter of history');
for(let k=0;k<4;k++){const te=q(k);console.log('Q'+(k+1),new Date(te[0].t).toISOString().slice(5,10),JSON.stringify(stat(fav(te,LIVE))),'| 2:00 only',JSON.stringify(stat(fav(te,{...LIVE,times:[120]}))),'| all hours',JSON.stringify(stat(fav(te,{...LIVE,hs:null}))));}
console.log('--- by ET hour block, all rounds, band 75-90');
for(const[hs,he]of[[0,4],[4,8],[8,12],[12,16],[16,20],[20,24]]){const r={...LIVE,hs,he};console.log(hs+'-'+he,JSON.stringify(stat(fav(R,r))),'| half1',JSON.stringify(stat(fav(R.slice(0,1541),r))),'| half2',JSON.stringify(stat(fav(R.slice(1541),r))));}
console.log('--- by band, 12-24 ET, all rounds (half1 | half2)');
for(const[lo,hi]of[[55,64],[65,74],[75,79],[80,84],[85,90],[91,96]]){const r={...LIVE,lo,hi};console.log(lo+'-'+hi,JSON.stringify(stat(fav(R.slice(0,1541),r))),JSON.stringify(stat(fav(R.slice(1541),r))));}
for(const f0 of [.5,.75]){const c=Math.floor(R.length*f0),tr=R.slice(0,c),te=R.slice(c,Math.floor(R.length*(f0+.25)));const B=brain(tr);const live=run(te,B,LIVE);
  console.log(`\n=== fold ${f0}: live`,JSON.stringify(stat(live)));
  const f=fav(te,LIVE);console.log('fav in band'.padEnd(34),JSON.stringify(stat(f)),JSON.stringify(paired(te,f,live)));
  for(const mp of [.5,.6,.7,.75]){const b=fav(te,LIVE,{needModel:true,B,minProb:mp});console.log(`fav + model≥${mp}`.padEnd(34),JSON.stringify(stat(b)),JSON.stringify(paired(te,b,live)));}
  for(const add of [-20,-10,-6,-3,0]){const b=run(te,B,{...LIVE,add});console.log(`live rule margin add ${add}`.padEnd(34),JSON.stringify(stat(b)),JSON.stringify(paired(te,b,live)));}
  // Kalshi-lag: model logit moved since previous check but price did not. thresholds picked on train
  const lagBets=(set,thr,band)=>{const b=[];for(const o of set){for(const s of [180,240,300]){const a=o.at[s],p=o.at[s-60];if(!a||!p)continue;
      const g=(lg(a.pu)-lg(p.pu))-(lg(mkt(a))-lg(mkt(p)));if(Math.abs(g)<thr)continue;const up=g>0,ask=up?a.ya:a.na;if(!(ask>=band[0]&&ask<=band[1]))continue;
      const won=(o.up===1)===up;b.push({t:o.t,pnl:(won?100-ask:-ask)-feeP(ask),won,ask});break;}}return b;};
  let best=null;for(const thr of [.25,.5,.75,1,1.5])for(const band of [[1,99],[30,70],[50,90]]){const st=stat(lagBets(tr,thr,band));if(st.n>=150&&(!best||st.c>best.st.c))best={thr,band,st};
    console.log(`  lag train thr ${thr} band ${band}`.padEnd(34),JSON.stringify(st));}
  const lb=lagBets(te,best.thr,best.band);console.log(`LAG test (picked thr ${best.thr} band ${best.band})`.padEnd(34),JSON.stringify(stat(lb)),JSON.stringify(paired(te,lb,live)));}
