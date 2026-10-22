const etFmt=new Intl.DateTimeFormat("en-US",{timeZone:"America/New_York",year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",second:"2-digit",weekday:"short",hourCycle:"h23"});
function et(ms){const o={};for(const p of etFmt.formatToParts(new Date(ms)))o[p.type]=p.value;return{y:+o.year,mo:+o.month,d:+o.day,h:+o.hour,mi:+o.minute,s:+o.second,wd:o.weekday};}
function etEpoch(y,mo,d,h,mi,s){const g=Date.UTC(y,mo-1,d,h,mi,s);const p=et(g);return g+(g-Date.UTC(p.y,p.mo-1,p.d,p.h,p.mi,p.s));}
const pad=n=>String(n).padStart(2,"0");
function erf(x){const t=1/(1+0.3275911*Math.abs(x));const y=1-(((((1.061405429*t-1.453152027)*t)+1.421413741)*t-0.284496736)*t+0.254829592)*t*Math.exp(-x*x);return x>=0?y:-y;}
function pUp(spot,strike,secs,sig){if(secs<=0||!sig)return spot>strike?1:0;return 0.5*(1+erf(Math.log(spot/strike)/(sig*Math.sqrt(secs))/Math.SQRT2));}
const FN=["Distance to strike (model)","5-min momentum","15-min momentum","Volatility rising","30-min range size","Time of day (A)","Time of day (B)","Weekend","Distance × momentum"];
const clamp=v=>Math.max(-4,Math.min(4,isFinite(v)?v:0));
function feats(cl,hi,lo,spot,strike,left,ts){
  const n=cl.length;if(n<31)return null;const rets=[];for(let i=1;i<n;i++)rets.push(Math.log(cl[i]/cl[i-1]));
  const s60=Math.sqrt(rets.reduce((a,r)=>a+r*r,0)/rets.length/60),r15=rets.slice(-15),s15=Math.sqrt(r15.reduce((a,r)=>a+r*r,0)/r15.length/60);if(!s60)return null;
  let pu=pUp(spot,strike,left,s60);pu=Math.min(.999,Math.max(.001,pu));const lg=Math.log(pu/(1-pu));
  const m5=clamp(Math.log(spot/cl[n-6])/(s60*Math.sqrt(300))),m15=clamp(Math.log(spot/cl[n-16])/(s60*Math.sqrt(900)));
  const rng=clamp(Math.log(Math.max(...hi.slice(-30))/Math.min(...lo.slice(-30)))/(s60*Math.sqrt(1800))-1);
  const p=et(ts),hr=(p.h+p.mi/60)/24*2*Math.PI;
  return[clamp(lg),m5,m15,clamp(s15/s60-1),rng,Math.sin(hr),Math.cos(hr),p.wd==="Sat"||p.wd==="Sun"?1:0,clamp(lg*m5/3)].map(v=>+v.toFixed(4));}
/* candle-pattern measurements (closed 1-min candles, oldest→newest), signed toward UP like the other features */
const FNP=["Wick pressure (3 candles)","Last candle body","3-candle push","Up/down run","Strike rejection","Engulfing","Indecision (doji)"];
function featsP(op,hi,lo,cl,strike){
  const n=cl.length;if(n<6)return null;
  const rng=i=>Math.max(hi[i]-lo[i],1e-9),body=i=>cl[i]-op[i],uw=i=>hi[i]-Math.max(op[i],cl[i]),lw=i=>Math.min(op[i],cl[i])-lo[i];
  let wp=0,bs=0,rs=0;for(let i=n-3;i<n;i++){wp+=(lw(i)-uw(i))/rng(i);bs+=body(i);rs+=rng(i);}
  const dir=Math.sign(cl[n-1]-cl[n-2]);let cnt=0;if(dir)for(let i=n-1;i>0&&Math.sign(cl[i]-cl[i-1])===dir&&cnt<6;i--)cnt++;
  const side=Math.sign(cl[n-1]-strike)||1;let rej=0;for(let i=n-5;i<n;i++){if(side>0&&lo[i]<strike&&cl[i]>strike)rej++;if(side<0&&hi[i]>strike&&cl[i]<strike)rej++;}
  const bp=body(n-2),bl=body(n-1),eng=Math.sign(bp)!==Math.sign(bl)&&Math.abs(bl)>Math.abs(bp)?Math.sign(bl):0;
  return[wp/3,bl/rng(n-1),bs/rs,dir*cnt/6,side*rej/5,eng,1-Math.abs(bl)/rng(n-1)].map(v=>+(isFinite(v)?v:0).toFixed(4));}
/* ---------- RIPTIDE indicator set (standard settings, closed 1-min candles) ----------
   RSI 14 · StochRSI 14/14/3/3 · MACD 12/26/9 (histogram + fresh cross) · Bollinger 20/2 (%B + squeeze) · EMA 9 vs 21.
   Every value is scaled so positive leans UP and negative leans DOWN, the same way as RIPTIDE's other signals. */
const FNI=["RSI (14)","StochRSI %K","MACD histogram","MACD fresh cross","Bollinger %B","Bollinger squeeze/expansion","EMA 9 vs 21"];
function emaArr(a,n){const k=2/(n+1),o=[a[0]];for(let i=1;i<a.length;i++)o.push(a[i]*k+o[i-1]*(1-k));return o;}
function rsiArr(c,n){const o=Array(c.length).fill(50);let g=0,l=0;
  for(let i=1;i<c.length;i++){const d=c[i]-c[i-1],up=Math.max(d,0),dn=Math.max(-d,0);
    if(i<=n){g+=up/n;l+=dn/n;}else{g=(g*(n-1)+up)/n;l=(l*(n-1)+dn)/n;}
    if(i>=n)o[i]=l===0?100:100-100/(1+g/l);}return o;}
function featsI(cl){
  const n=cl.length;if(n<45)return null;
  const rets=[];for(let i=1;i<n;i++)rets.push(Math.log(cl[i]/cl[i-1]));
  const s1=Math.sqrt(rets.reduce((a,r)=>a+r*r,0)/rets.length)||1e-9,unit=cl[n-1]*s1*Math.sqrt(10); // ~10-minute move size
  const R=rsiArr(cl,14),rsi=R[n-1];
  const rr=R.slice(-30),st=rr.map((v,i)=>{if(i<13)return null;const w=rr.slice(i-13,i+1),lo=Math.min(...w),hi=Math.max(...w);return hi>lo?(v-lo)/(hi-lo)*100:50;}).filter(v=>v!=null);
  const kS=st.slice(-3).reduce((a,b)=>a+b,0)/Math.min(3,st.length);
  const e12=emaArr(cl,12),e26=emaArr(cl,26),macd=e12.map((v,i)=>v-e26[i]),sig=emaArr(macd,9),hist=macd.map((v,i)=>v-sig[i]);
  let cross=0;for(let i=n-3;i<n;i++){if(hist[i-1]<=0&&hist[i]>0)cross=1;if(hist[i-1]>=0&&hist[i]<0)cross=-1;}
  const bw=i=>{const w=cl.slice(i-19,i+1),m=w.reduce((a,b)=>a+b,0)/20,sd=Math.sqrt(w.reduce((a,b)=>a+(b-m)**2,0)/20);return{m,sd};};
  const B=bw(n-1),pb=B.sd>0?(cl[n-1]-(B.m-2*B.sd))/(4*B.sd):0.5;
  const widths=[];for(let i=n-20;i<n;i++){const b=bw(i);widths.push(b.sd/b.m);}
  const avgW=widths.reduce((a,b)=>a+b,0)/widths.length,sq=avgW>0?(B.sd/B.m)/avgW-1:0;
  const e9=emaArr(cl,9),e21=emaArr(cl,21);
  return[(rsi-50)/50,(kS-50)/50,clamp(hist[n-1]/unit),cross,clamp((pb-0.5)*2),clamp(sq),clamp((e9[n-1]-e21[n-1])/unit)].map(v=>+(isFinite(v)?v:0).toFixed(4));}
const sigm=z=>1/(1+Math.exp(-z));
function fitLR(X,y,l2=2,iters=400,lr=0.6){
  const n=X.length,d=X[0].length,mu=Array(d).fill(0),sd=Array(d).fill(0);
  for(const x of X)x.forEach((v,i)=>mu[i]+=v/n);for(const x of X)x.forEach((v,i)=>sd[i]+=(v-mu[i])**2/n);for(let i=0;i<d;i++)sd[i]=Math.sqrt(sd[i])||1;
  const Z=X.map(x=>x.map((v,i)=>(v-mu[i])/sd[i])),w=Array(d+1).fill(0);
  for(let it=0;it<iters;it++){const g=Array(d+1).fill(0);
    for(let k=0;k<n;k++){const z=Z[k];let s=w[0];for(let i=0;i<d;i++)s+=w[i+1]*z[i];const e=sigm(s)-y[k];g[0]+=e;for(let i=0;i<d;i++)g[i+1]+=e*z[i];}
    w[0]-=lr*g[0]/n;for(let i=1;i<=d;i++)w[i]-=lr*(g[i]+l2*w[i])/n;}
  return{w,mu,sd};}
function brainP(m,x){let s=m.w[0];for(let i=0;i<x.length;i++)s+=m.w[i+1]*(x[i]-m.mu[i])/m.sd[i];return Math.min(.99,Math.max(.01,sigm(s)));}
function scoreSet(P,y){let ll=0,acc=0;const bins=Array.from({length:10},()=>[0,0,0]);
  P.forEach((p,k)=>{ll-=y[k]?Math.log(p):Math.log(1-p);acc+=(p>=.5)===!!y[k];const q=Math.max(p,1-p),won=(p>=.5)===!!y[k],b=Math.min(9,Math.floor((q-.5)*20));bins[b][0]++;bins[b][1]+=q;bins[b][2]+=won;});
  const n=P.length,ece=bins.reduce((a,[c,q,w])=>a+(c?Math.abs(q-w):0),0)/n;return{ll:ll/n,acc:acc/n,ece};}
export {et,pUp,feats,featsP,featsI,sigm,fitLR,brainP,scoreSet,clamp};