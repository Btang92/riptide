// Per-round version of the premium filter: favourite 75–90¢ at the first 2:00–5:00 check in band (all hours / 12–24 ET),
// skip if the futures premium (vs its 15-min average, or its 1-min change) points WITH / AGAINST the favourite beyond k; k and direction chosen on older 75%.
import fs from 'fs';import {R,feeP,stat,paired} from '../replay/sim.mjs';import {et} from '../replay/lib.mjs';
const M=JSON.parse(fs.readFileSync('lab/data/candles.json')),F=JSON.parse(fs.readFileSync('lab/data/bfut.json'));const cb=t=>M[t]?.[4],J=JSON.stringify;
function prem(o,s){const m=o.t+s*1000-60000,p0=cb(m),f0=F[m],p1=cb(m-60000),f1=F[m-60000];if(!p0||!f0)return null;let v=0,n=0;for(let i=1;i<=60;i++){const x=cb(m-i*60000),y=cb(m-(i+1)*60000);if(x&&y){v+=Math.log(x/y)**2;n++;}}
 let pa=0,pn=0;for(let i=1;i<=15;i++){const x=F[m-i*60000],y=cb(m-i*60000);if(x&&y){pa+=Math.log(x/y);pn++;}}const sc=Math.sqrt(v/n)*Math.sqrt((900-s)/60),p=Math.log(f0/p0);
 return{dev:pn>=10?(p-pa/pn)/sc:null,d1:(p1&&f1)?(p-Math.log(f1/p1))/sc:null};}
function go(set,hrs,key,dir,k){const out=[];for(const o of set){const h=et(o.t).h;if(hrs&&h<12)continue;for(const s of [120,180,240,300]){const a=o.at[s];if(!a)continue;let c=0,ask;
 if(a.ya>=75&&a.ya<=90){c=1;ask=a.ya;}else if(a.na>=75&&a.na<=90){c=-1;ask=a.na;}if(!c)continue;
 if(dir){const p=prem(o,s);const v=p&&p[key]!=null?p[key]*c:0;if(dir*v>k)break;}// skip round
 const won=(o.up===1)===(c===1);out.push({t:o.t,pnl:(won?100-ask:-ask)-feeP(ask),won,ask});break;}}return out;}
const c=Math.floor(R.length*.75),tr=R.slice(0,c),te=R.slice(c);
for(const hrs of [false,true]){console.log(`\n${hrs?'12–24 ET':'all hours'} base fav: train ${J(stat(go(tr,hrs)))} test ${J(stat(go(te,hrs)))}`);
 const rows=[];for(const key of ['dev','d1'])for(const dir of [1,-1])for(const k of [0,.05,.1,.2,.3]){const a=go(tr,hrs,key,dir,k),b=go(te,hrs,key,dir,k);rows.push({key,dir,k,ptr:paired(tr,a,go(tr,hrs)),pte:paired(te,b,go(te,hrs)),ste:stat(b)});}
 for(const r of rows)console.log(`  skip if ${r.key} ${r.dir>0?'WITH':'AGAINST'} fav > ${r.k}: train ${r.ptr.perRound}±${r.ptr.se} test ${r.pte.perRound}±${r.pte.se} test bets ${J(r.ste)}`);
 const best=rows.sort((a,b)=>b.ptr.perRound-a.ptr.perRound)[0];console.log(`  TRAIN-BEST: skip if ${best.key} ${best.dir>0?'WITH':'AGAINST'} > ${best.k}: train ${best.ptr.perRound}±${best.ptr.se} → test ${best.pte.perRound}±${best.pte.se} (${best.ste.n} test bets, ${best.ste.c}±${best.ste.se} ¢/ct)`);}
