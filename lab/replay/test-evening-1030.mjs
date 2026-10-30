// Evening Oct 30. Untested family: Kalshi's IMPLIED volatility vs BTC's REALIZED volatility at entry.
// IV (per minute) = ln(spot/strike) / (Φ⁻¹(Kalshi YES mid) · √(minutes left − 40s settlement averaging)).
// RV = rms of 1-min log returns over the last 60 min (and last 15 min). ratio = IV/RV (log2).
// (A) Favourites 75–90¢ (and the live rule): are favourites overpriced when the market's implied vol is BELOW realized
//     (market too confident → calls that turn against by 3:00–5:00)? Skip rule threshold chosen on older 75%, scored on newest 25% + quarters.
// (B) New bets: moderate favourites priced 60–75¢ when IV is well ABOVE realized (market under-confident → favourite underpriced).
// (C) Overpriced-favourite watch update.
import fs from 'fs';import {R,feeP,stat,paired} from './sim.mjs';import {et} from './lib.mjs';
const M=JSON.parse(fs.readFileSync('lab/data/candles.json'));const cb=t=>M[t]?.[4],J=JSON.stringify;
function ninv(p){// Acklam
 const a=[-39.69683028665376,220.9460984245205,-275.9285104469687,138.357751867269,-30.66479806614716,2.506628277459239],b=[-54.47609879822406,161.5853275888792,-155.6989798598866,66.80131188771972,-13.28068155288572],c=[-0.007784894002430293,-0.3223964580411365,-2.400758277161838,-2.549732539343734,4.374664141464968,2.938163982698783],d=[0.007784695709041462,0.3224671290700398,2.445134137142996,3.754408661907416];
 const pl=0.02425;let q,r;if(p<pl){q=Math.sqrt(-2*Math.log(p));return(((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5])/((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1);}
 if(p>1-pl){q=Math.sqrt(-2*Math.log(1-p));return-(((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5])/((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1);}
 q=p-0.5;r=q*q;return(((((a[0]*r+a[1])*r+a[2])*r+a[3])*r+a[4])*r+a[5])*q/(((((b[0]*r+b[1])*r+b[2])*r+b[3])*r+b[4])*r+1);}
const cache=new Map();
function feat(o,s){const k=o.t+':'+s;if(cache.has(k))return cache.get(k);let out=null;const a=o.at[s];
 const m=o.t+s*1000-60000,px=cb(m);
 if(a&&px&&a.ya!=null&&a.na!=null){let v60=0,n60=0,v15=0,n15=0;for(let i=0;i<60;i++){const x=cb(m-i*60000),y=cb(m-(i+1)*60000);if(x&&y){const r2=Math.log(x/y)**2;v60+=r2;n60++;if(i<15){v15+=r2;n15++;}}}
  if(n60>=40&&n15>=10){const rv60=Math.sqrt(v60/n60),rv15=Math.sqrt(v15/n15),mid=Math.min(.97,Math.max(.03,(a.ya+100-a.na)/200)),z=ninv(mid),d=Math.log(px/o.strike),tau=Math.max(.5,(900-s-40)/60);
   let iv=null,mis=false;if(Math.sign(z)===Math.sign(d)&&Math.abs(z)>0.15)iv=Math.abs(d)/(Math.abs(z)*Math.sqrt(tau));else mis=true;
   out={rv60,rv15,iv,mis,r60:iv?Math.log2(iv/rv60):null,r15:iv?Math.log2(iv/rv15):null};}}
 cache.set(k,out);return out;}
// strategies. skip:{key,lo,hi} skips (moves on, no bet this round) when feature in range.
function go(set,{hrs,live,lo=75,hi=90,skip,need}){const out=[];for(const o of set){if(hrs&&et(o.t).h<12)continue;
 for(const s of [120,180,240,300]){const a=o.at[s];if(!a)continue;let c=0,ask;
  if(live){if(!a.f)continue;const pu=a.pu,cl=pu>=.5?1:-1,pr=Math.max(pu,1-pu);ask=cl>0?a.ya:a.na;if(ask==null||ask<lo||ask>hi)continue;if(pr*100<ask+feeP(ask)+3)continue;c=cl;}
  else{if(a.ya>=lo&&a.ya<=hi){c=1;ask=a.ya;}else if(a.na>=lo&&a.na<=hi){c=-1;ask=a.na;}if(!c)continue;}
  const F=feat(o,s);
  if(skip){const v=F?.[skip.key];if(v!=null&&v>=skip.lo&&v<skip.hi)break;}
  if(need){const v=F?.[need.key];if(v==null||v<need.lo||v>=need.hi)break;}
  const won=(o.up===1)===(c===1);out.push({t:o.t,pnl:(won?100-ask:-ask)-feeP(ask),won,ask,s,F});break;}}return out;}
console.log(`rounds ${R.length} (${new Date(R[0].t).toISOString().slice(0,16)} → ${new Date(R.at(-1).t).toISOString().slice(0,16)})`);
const cut=Math.floor(R.length*.75),tr=R.slice(0,cut),te=R.slice(cut),Q=i=>R.slice(Math.floor(R.length*i/4),Math.floor(R.length*(i+1)/4));
// coverage + calibration of the Brownian IV model itself
const fav=go(R,{});console.log(`fav 75–90 all hours bets ${fav.length}, with IV ${fav.filter(x=>x.F?.iv).length}, mismatch ${fav.filter(x=>x.F?.mis).length}`);
const qs=(arr,k)=>{const v=arr.map(x=>x.F?.[k]).filter(x=>x!=null).sort((a,b)=>a-b);return[.2,.4,.6,.8].map(q=>v[Math.floor(v.length*q)]);};
for(const k of ['r60','r15']){const tq=qs(go(tr,{}),k);console.log(`\nA) ${k} quintile cuts (train) ${tq.map(x=>x.toFixed(2)).join(' ')}`);
 const bins=[-9,...tq,9];for(const[nm,set]of[['fav all hours',fav],['fav 12–24',go(R,{hrs:1})],['live rule 12–24',go(R,{hrs:1,live:1})],['live rule all hours',go(R,{live:1})]]){
  const row=[];for(let i=0;i<5;i++){const st=stat(set.filter(x=>x.F?.[k]!=null&&x.F[k]>=bins[i]&&x.F[k]<bins[i+1]));row.push(`q${i+1} ${st.c}±${st.se} (${st.n},${st.win}%)`);}
  const ms=stat(set.filter(x=>x.F?.mis));console.log(`  ${nm.padEnd(20)} ${row.join(' | ')} | mismatch ${ms.c}±${ms.se} (${ms.n})`);}}
// skip rules chosen on train
const BASES=[['fav no-gate all hours',{}],['fav no-gate 12–24',{hrs:1}],['live rule 12–24',{hrs:1,live:1}],['live rule all hours',{live:1}]];
const CANDS=[];for(const key of ['r60','r15'])for(const t of [-1.5,-1,-0.75,-0.5,-0.25,0]){CANDS.push({key,lo:-9,hi:t,nm:`${key}<${t}`});}
for(const key of ['r60','r15'])for(const t of [0.25,0.5,0.75,1]){CANDS.push({key,lo:t,hi:9,nm:`${key}≥${t}`});}
console.log('\nA) skip rules (threshold picked on older 75%)');
for(const[nm,b]of BASES){const g=s=>go(s,b);const rows=CANDS.map(sk=>{const f=s=>go(s,{...b,skip:sk});return{sk,ptr:paired(tr,f(tr),g(tr)),pte:paired(te,f(te),g(te)),skTe:g(te).length-f(te).length,nte:f(te).length,ste:stat(f(te)),q:[0,1,2,3].map(i=>paired(Q(i),f(Q(i)),g(Q(i))).perRound)};}).sort((a,b)=>b.ptr.perRound/(b.ptr.se||1)-a.ptr.perRound/(a.ptr.se||1));
 console.log(`  ${nm}: base test ${J(stat(g(te)))}`);for(const r of rows.slice(0,4))console.log(`    skip ${r.sk.nm.padEnd(10)} train ${r.ptr.perRound}±${r.ptr.se} → test ${r.pte.perRound}±${r.pte.se} (skips ${r.skTe}, test bets ${r.nte}, ${r.ste.c}±${r.ste.se}) quarters ${r.q.join(' / ')}`);}
// (B) new bets: favourites 60–75¢ (first in-band check 2:00–5:00) when IV well above RV
console.log('\nB) favourites 60–74¢ (all hours / 12–24), by IV/RV');
for(const hrs of [0,1]){const all=go(R,{lo:60,hi:74,hrs});console.log(`  ${hrs?'12–24':'all hours'} all: ${J(stat(all))}`);
 for(const key of ['r60','r15'])for(const t of [0,0.25,0.5,0.75,1]){const need={key,lo:t,hi:9};const ftr=go(tr,{lo:60,hi:74,hrs,need}),fte=go(te,{lo:60,hi:74,hrs,need});
  console.log(`    need ${key}≥${t}: train ${J(stat(ftr))} test ${J(stat(fte))} quarters ${[0,1,2,3].map(i=>stat(go(Q(i),{lo:60,hi:74,hrs,need})).c).join(' / ')}`);}}
// live rule extended down to 60¢ but only with high IV/RV, paired vs live
console.log('\nB2) live rule with band 60–90 when r60≥t (else live 75–90), paired vs live');
for(const hrs of [1,0])for(const t of [0.25,0.5,0.75]){const f=s=>{const base=go(s,{live:1,hrs}),bt=new Set(base.map(x=>x.t)),ext=go(s.filter(o=>!bt.has(o.t)),{live:1,hrs,lo:60,hi:74,need:{key:'r60',lo:t,hi:9}});return base.concat(ext);};
 const g=s=>go(s,{live:1,hrs});console.log(`  ${hrs?'12–24':'all'} t=${t}: train ${J(paired(tr,f(tr),g(tr)))} test ${J(paired(te,f(te),g(te)))} extra test bets ${f(te).length-g(te).length} ${J(stat(f(te).filter(x=>x.ask<75)))}`);}
// (C) watch
const W=Date.UTC(2026,9,23,22),band=(lo,hi,set)=>stat(set.filter(x=>x.ask>=lo&&x.ask<hi));const pre=fav.filter(x=>x.t<W),post=fav.filter(x=>x.t>=W),y=fav.filter(x=>x.t>=Date.UTC(2026,9,30,10,15));
console.log(`\nC) fav all hours since Oct 23 22:00 UTC: ${J(stat(post))} 75–80 ${J(band(75,80,post))} 80–85 ${J(band(80,85,post))} 85–90 ${J(band(85,91,post))}; before ${J(stat(pre))}; since Oct 30 10:15 UTC ${J(stat(y))}`);
// does IV/RV explain the recent overpricing? mean r60 before vs after
const mr=a=>{const v=a.map(x=>x.F?.r60).filter(x=>x!=null);return(v.reduce((s,x)=>s+x,0)/v.length).toFixed(3);};console.log(`   mean log2(IV/RV60) before ${mr(pre)} since ${mr(post)}`);
