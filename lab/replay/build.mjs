import fs from 'fs';import {pUp,feats,featsP,featsI} from './lib.mjs';
const D='lab/data/';const M=JSON.parse(fs.readFileSync(D+'candles.json'));
const kh=JSON.parse(fs.readFileSync(D+'khist.json')),calls=JSON.parse(fs.readFileSync(D+'calls.json')),cps=JSON.parse(fs.readFileSync(D+'checkpoints.json'));
const R=new Map();
for(const r of kh)R.set(r.start,{t:r.start,strike:r.strike,up:r.up,cps:r.cps,src:'kh'});
const cpBy={};for(const c of cps)(cpBy[c.start]??={})[c.s]={ya:c.ya,na:c.na,pu:c.pu,pb:c.pb};
for(const c of calls){if(!c.winner||R.has(c.start))continue;const cp=cpBy[c.start]||{};
  R.set(c.start,{t:c.start,strike:c.strike,up:c.winner==='UP'?1:0,cps:cp,src:'call',live:{pu:cp}})}
const S=[120,180,240,300,360,420,480,600];const out=[];let miss=0;
for(const r of [...R.values()].sort((a,b)=>a.t-b.t)){const w=r.t,o={t:w,up:r.up,strike:r.strike,src:r.src,at:{}};
  for(const s of S){const q=r.cps&&r.cps[s];if(!q||q.ya==null||q.na==null)continue;
    const cm=M[w+s*1000-60000];if(!cm){miss++;continue;}
    const prev=[],ph=[],pl=[],po=[];for(let i=60;i>=0;i--){const x=M[w+s*1000-60000-i*60000];if(x){prev.push(x[4]);ph.push(x[2]);pl.push(x[1]);po.push(x[3]);}}if(prev.length<40){miss++;continue;}
    let v=0;for(let i=1;i<prev.length;i++){const z=Math.log(prev[i]/prev[i-1]);v+=z*z;}const sg=Math.sqrt(v/(prev.length-1)/60);
    const spot=cm[4],pu=pUp(spot,r.strike,900-s,sg);
    o.at[s]={ya:q.ya,na:q.na,pu:+pu.toFixed(4),f:feats(prev,ph,pl,spot,r.strike,900-s,w+s*1000),fp:featsP(po,ph,pl,prev,r.strike),fi:featsI(prev),livePu:q.pu??null,mom5:prev.length>6?Math.sign(spot-prev[prev.length-6]):0};}
  if(o.at[120]&&o.at[120].f)out.push(o);}
fs.writeFileSync(D+'rounds.json',JSON.stringify(out));
console.log(out.length,'miss',miss);
// validate vs live pu
const v=out.filter(o=>o.at[120]?.livePu!=null);let d=0,agree=0;for(const o of v){d+=Math.abs(o.at[120].pu-o.at[120].livePu);agree+=(o.at[120].pu>=.5)===(o.at[120].livePu>=.5);}console.log('validate n',v.length,'mean|dpu|',(d/v.length).toFixed(3),'dir agree',(agree/v.length).toFixed(3));
