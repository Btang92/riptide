// Evening Oct 23: (1) 60-second settlement averaging (effective time = secs-40), (2) second-chance entry to 8:00, (3) trading hours.
import {R,run,stat,paired,LIVE,feeP} from './sim.mjs';import {et} from './lib.mjs';
const S=[120,180,240,300,360,420,480,600];
// inverse normal
function ninv(p){const a=[-39.69683028665376,220.9460984245205,-275.9285104469687,138.357751867269,-30.66479806614716,2.506628277459239],b=[-54.47609879822406,161.5858368580409,-155.6989798598866,66.80131188771612,-13.28068155211307],c=[-.007784894002430293,-.3223964580411365,-2.400758277161838,-2.549732539343734,4.374664141464968,2.938163982698783],d=[.007784695709041462,.3224671290700398,2.445134137142996,3.754408661907416];
 const pl=.02425;let q,r;if(p<pl){q=Math.sqrt(-2*Math.log(p));return(((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5])/((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1);}
 if(p>1-pl){q=Math.sqrt(-2*Math.log(1-p));return-(((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5])/((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1);}
 q=p-.5;r=q*q;return(((((a[0]*r+a[1])*r+a[2])*r+a[3])*r+a[4])*r+a[5])*q/(((((b[0]*r+b[1])*r+b[2])*r+b[3])*r+b[4])*r+1);}
function erf(x){const t=1/(1+0.3275911*Math.abs(x));const y=1-(((((1.061405429*t-1.453152027)*t)+1.421413741)*t-0.284496736)*t+0.254829592)*t*Math.exp(-x*x);return x>=0?y:-y;}
const Phi=z=>0.5*(1+erf(z/Math.SQRT2));
const avgP=(pu,s,k=40)=>{const left=900-s;if(left<=60)return pu;const p=Math.min(.9999,Math.max(.0001,pu));return Phi(ninv(p)*Math.sqrt(left/(left-k)));};
const live={margin:3,p:a=>a.pu};
const mk=k=>({margin:3,p:a=>avgP(a.pu,a._s,k)});
for(const o of R)for(const s of S)if(o.at[s])o.at[s]._s=s;
const ll=(P,y)=>{let l=0,br=0;P.forEach((p,i)=>{p=Math.min(.999,Math.max(.001,p));l-=y[i]?Math.log(p):Math.log(1-p);br+=(p-y[i])**2});return{ll:+(l/P.length).toFixed(4),brier:+(br/P.length).toFixed(4)};};
const cut=Math.floor(R.length*.75),te=R.slice(cut),mid=R.slice(Math.floor(R.length*.5),cut);
console.log('rounds',R.length,'test',te.length,new Date(te[0].t).toISOString());
console.log('\n(1) settlement averaging: log-loss/brier, all rounds and test, per checkpoint');
for(const s of S){const X=R.filter(o=>o.at[s]),y=X.map(o=>o.up),T=te.filter(o=>o.at[s]),yt=T.map(o=>o.up);
  const r=[0,40].map(k=>[ll(X.map(o=>avgP(o.at[s].pu,s,k)),y),ll(T.map(o=>avgP(o.at[s].pu,s,k)),yt)]);
  // price
  const pr=ll(X.map(o=>o.at[s].ya/(o.at[s].ya+o.at[s].na)),y);
  console.log(s/60+':00',X.length,'spot',JSON.stringify(r[0]),'avg40',JSON.stringify(r[1]),'price',JSON.stringify(pr));}
// stretch factor: best k fitted on train
const tr=R.slice(0,cut);
for(const k of [0,20,40,60,90]){let l=0,n=0;for(const o of tr)for(const s of S){if(!o.at[s])continue;const p=Math.min(.999,Math.max(.001,avgP(o.at[s].pu,s,k)));l-=o.up?Math.log(p):Math.log(1-p);n++;}console.log('train all-checks k',k,(l/n).toFixed(5));}
const show=(nm,te,B,rule)=>{const b=run(te,B,rule),L=run(te,live,LIVE);console.log(nm.padEnd(34),JSON.stringify(stat(b)),'vs live',JSON.stringify(stat(L)),'paired',JSON.stringify(paired(te,b,L)));return b;};
console.log('\nbetting, live rule');
for(const [nm,T] of [['test(newest25%)',te],['fold 50-75%',mid],['all',R]]){console.log('--',nm);
  show('avg40 live rule',T,mk(40),LIVE);
  show('second chance to 6:00',T,live,{...LIVE,times:[120,180,240,300,360]});
  show('second chance to 8:00',T,live,{...LIVE,times:[120,180,240,300,360,420,480]});
  show('hours 04-24',T,live,{...LIVE,hs:4,he:24});
  show('hours all',T,live,{...LIVE,hs:0,he:24});
  // hours 04-08 only, added
  const add=run(T,live,{...LIVE,hs:4,he:8});console.log('  04-08 only'.padEnd(34),JSON.stringify(stat(add)));
  const add2=run(T,live,{...LIVE,hs:0,he:12});console.log('  00-12 only'.padEnd(34),JSON.stringify(stat(add2)));
}
// second chance: bets taken only at 6:00-8:00 (the extra ones)
const ex=run(R,live,{...LIVE,times:[120,180,240,300,360,420,480]}).filter(x=>x.s>300);console.log('\nextra 6-8 bets all rounds',JSON.stringify(stat(ex)));
const exA=run(R,live,{...LIVE,hs:0,he:24,times:[120,180,240,300,360,420,480]}).filter(x=>x.s>300);console.log('extra 6-8 bets all hours',JSON.stringify(stat(exA)));
// any price, value-at-later-check (autopsy's missed-chance definition, approx): band 0-100
const wide=run(R,live,{lo:1,hi:99,hs:12,he:24,times:[120,180,240,300,360,420,480]});
console.log('no band 12-24 to 8:00 by entry time');for(const s of [120,180,240,300,360,420,480]){console.log(' ',s/60,JSON.stringify(stat(wide.filter(x=>x.s===s))));}
