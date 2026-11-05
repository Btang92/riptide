// Nov 5 evening. (A) :45 rounds: Kalshi's hourly BTC ladder (KXBTCD, same 60-s BRTI average at the top of the hour) as information
// on the 15-min round — implied P(above the 15-min strike) from a probit fit across nearby hourly strikes, vs the 15-min market's own
// price; log-loss value and disagreement bets / skip filters at 2:00–10:00. (B) all rounds: Kalshi activity so far in the round
// (contracts traded 0:00–4:00 vs the trailing 96-round median) as a which-rounds-to-bet filter for 75–90¢ favourites at 4:00.
// Walk-forward: everything chosen on the older 75% of rounds, scored on the newest 25% (+ quarters).
import fs from 'fs';
const R=JSON.parse(fs.readFileSync('lab/xhour/data/rounds.json')).filter(r=>r.at&&Object.keys(r.at).length);
const feeP=a=>0.07*a*(100-a)/100,J=JSON.stringify;
const lg=p=>Math.log(p/(1-p)),sg=x=>1/(1+Math.exp(-x));
function ninv(p){// Acklam
  const a=[-39.6968302866538,220.946098424521,-275.928510446969,138.357751867269,-30.6647980661472,2.50662827745924],b=[-54.4760987982241,161.585836858041,-155.698979859887,66.8013118877197,-13.2805815547982],c=[-0.00778489400243029,-0.322396458041136,-2.40075827716184,-2.54973253934373,4.37466414146497,2.93816398269878],d=[0.00778469570904146,0.32246712907004,2.445134137143,3.75440866190742];
  const pl=0.02425;if(p<pl){const q=Math.sqrt(-2*Math.log(p));return(((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5])/((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1);}
  if(p>1-pl){const q=Math.sqrt(-2*Math.log(1-p));return-(((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5])/((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1);}
  const q=p-.5,r=q*q;return(((((a[0]*r+a[1])*r+a[2])*r+a[3])*r+a[4])*r+a[5])*q/(((((b[0]*r+b[1])*r+b[2])*r+b[3])*r+b[4])*r+1);}
const ncdf=x=>{const t=1/(1+0.2316419*Math.abs(x)),d=0.3989423*Math.exp(-x*x/2),p=d*t*(0.3193815+t*(-0.3565638+t*(1.781478+t*(-1.821256+t*1.330274))));return x>0?1-p:p;};
// hourly-implied P(UP) for the 15-min strike at second s
function pH(r,s){if(!r.hr)return null;const pts=[];for(const h of r.hr){const x=h.at[s];if(!x||x.ya==null||x.yb==null)continue;
    const m=(x.ya+x.yb)/2;if(m<2||m>98||x.ya-x.yb>6)continue;pts.push([h.K,ninv(m/100)]);}
  if(pts.length<2)return null;// local probit line: weight strikes near K15
  let sw=0,sx=0,sy=0,sxx=0,sxy=0;for(const[k,z]of pts){const w=1/(1+((k-r.strike)/250)**2);sw+=w;sx+=w*k;sy+=w*z;sxx+=w*k*k;sxy+=w*k*z;}
  const den=sw*sxx-sx*sx;if(den<=0)return null;const b=(sw*sxy-sx*sy)/den,a=(sy-b*sx)/sw;if(b>=0)return null;
  const p=ncdf(a+b*r.strike);return Math.min(.995,Math.max(.005,p));}
const mid15=(r,s)=>{const x=r.at[s];if(!x||x.ya==null||x.na==null)return null;return(x.ya+100-x.na)/200;};
const cut=Math.floor(R.length*.75),T0=R[cut].t,isTr=r=>r.t<T0;
const st=b=>{const n=b.length;if(!n)return{n:0};const m=b.reduce((s,x)=>s+x,0)/n,sd=Math.sqrt(b.reduce((s,x)=>s+(x-m)**2,0)/Math.max(1,n-1));return{n,c:+m.toFixed(1),se:+(sd/Math.sqrt(n)).toFixed(1)};};
console.log('rounds',R.length,'test from',new Date(T0).toISOString(),':45 with ladder',R.filter(r=>r.hr).length);
// ---------- (A) ladder
const LL=(p,y)=>-(y?Math.log(Math.max(1e-6,p)):Math.log(Math.max(1e-6,1-p)));
console.log('\n(A) :45 rounds — log-loss on test (older 75% fit for blend), 15-min mid vs hourly-implied vs blend; corr; n');
for(const s of[120,180,240,300,360,480,600,720]){
  const rows=R.filter(r=>r.hr).map(r=>({r,m:mid15(r,s),h:pH(r,s),y:r.up})).filter(o=>o.m!=null&&o.h!=null&&o.m>.01&&o.m<.99);
  const tr=rows.filter(o=>isTr(o.r)),te=rows.filter(o=>!isTr(o.r));if(te.length<30)continue;
  // fit blend logit(p)=a*lg(m)+b*(lg(h)-lg(m)) by simple grid on train
  let best=null;for(let w=-0.5;w<=1.001;w+=0.05){const l=tr.reduce((s,o)=>s+LL(sg(lg(o.m)+w*(lg(o.h)-lg(o.m))),o.y),0)/tr.length;if(!best||l<best.l)best={w,l};}
  const sc=f=>te.reduce((s,o)=>s+LL(f(o),o.y),0)/te.length;const d=te.map(o=>LL(o.m,o.y)-LL(sg(lg(o.m)+best.w*(lg(o.h)-lg(o.m))),o.y));const gd=st(d.map(x=>x*1000));
  const agree=rows.filter(o=>(o.m>=.5)===(o.h>=.5)).length/rows.length;const gap=st(rows.map(o=>(o.h-o.m)*100));
  console.log(`  ${s/60}:00 n=${rows.length} test ${te.length} | 15m ${sc(o=>o.m).toFixed(4)} hourly ${sc(o=>o.h).toFixed(4)} blend(w=${best.w.toFixed(2)}) ${sc(o=>sg(lg(o.m)+best.w*(lg(o.h)-lg(o.m)))).toFixed(4)} gain ${(gd.c/1000).toFixed(4)}±${(gd.se/1000).toFixed(4)} | same side ${(agree*100).toFixed(1)}% | gap h−m ${gap.c}¢ (sd ${(gap.se*Math.sqrt(gap.n)).toFixed(1)})`);}
// disagreement bets: buy the 15-min side where hourly-implied − ask − fee ≥ th
console.log('\n(A) disagreement bets on the 15-min market (side with hourly-implied value ≥ ask+fee+th), all hours, :45 only; th chosen on train');
for(const s of[120,180,240,300,360,480,600]){const bets=th=>R.filter(r=>r.hr).map(r=>{const x=r.at[s],h=pH(r,s);if(!x||h==null||x.ya==null||x.na==null)return null;
    for(const[c,ask,p]of[[1,x.ya,h*100],[0,x.na,(1-h)*100]]){if(ask<3||ask>97)continue;if(p>=ask+feeP(ask)+th){const w=r.up===c;return{r,pnl:(w?100-ask:-ask)-feeP(ask),ask};}}return null;}).filter(Boolean);
  const res=[0,2,4,6,8].map(th=>{const b=bets(th);return{th,tr:st(b.filter(o=>isTr(o.r)).map(o=>o.pnl)),te:st(b.filter(o=>!isTr(o.r)).map(o=>o.pnl)),all:st(b.map(o=>o.pnl))};});
  const bt=res.filter(x=>x.tr.n>=40).sort((a,b)=>b.tr.c-a.tr.c)[0];
  console.log(`  ${s/60}:00 `+res.map(x=>`th${x.th}: tr ${x.tr.c}±${x.tr.se}(${x.tr.n}) te ${x.te.c}±${x.te.se}(${x.te.n})`).join(' | ')+(bt?`  → train-best th${bt.th} test ${J(bt.te)}`:''));}
// skip filter for 75–90 favourite at 4:00 (and fav 60–70 fade lead) when hourly disagrees
console.log('\n(A) :45 favourite 75–90 @4:00 all hours, by hourly-implied minus fav ask (¢):');
const fav=(r,s,lo,hi)=>{const x=r.at[s];if(!x||x.ya==null||x.na==null)return null;const c=x.ya>=x.na?1:0,ask=c?x.ya:x.na;if(ask<lo||ask>hi)return null;const w=r.up===c;return{c,ask,w,pnl:(w?100-ask:-ask)-feeP(ask)};};
for(const[lo,hi]of[[75,90],[60,75],[50,60]]){const rows=R.filter(r=>r.hr).map(r=>{const f=fav(r,240,lo,hi),h=pH(r,240);if(!f||h==null)return null;const ph=(f.c?h:1-h)*100;return{...f,g:ph-f.ask,r};}).filter(Boolean);
  const g=(a,b)=>st(rows.filter(o=>o.g>=a&&o.g<b).map(o=>o.pnl));
  console.log(`  fav ${lo}-${hi}: all ${J(st(rows.map(o=>o.pnl)))} | gap<-5 ${J(g(-99,-5))} | -5..-2 ${J(g(-5,-2))} | -2..2 ${J(g(-2,2))} | 2..5 ${J(g(2,5))} | ≥5 ${J(g(5,99))}`);}
// ---------- (B) activity
console.log('\n(B) Kalshi activity 0:00–4:00 (contracts, log2 vs trailing 96-round median), favourite @4:00 all hours');
const vol=r=>{let v=0,k=0;for(const s of[60,120,180,240]){const x=r.at[s];if(x){v+=x.v||0;k++;}}return k>=3?v:null;};
const V=R.map(vol);const rel=R.map((r,i)=>{if(V[i]==null||i<96)return null;const p=V.slice(i-96,i).filter(x=>x!=null).sort((a,b)=>a-b);if(p.length<60)return null;const md=p[p.length>>1];return md>0&&V[i]>0?Math.log2(V[i]/md):null;});
for(const[lo,hi]of[[75,90],[60,75]]){const rows=R.map((r,i)=>{const f=fav(r,240,lo,hi);return f&&rel[i]!=null?{...f,a:rel[i],r}:null;}).filter(Boolean);
  const trA=rows.filter(o=>isTr(o.r)).map(o=>o.a).sort((a,b)=>a-b),q1=trA[Math.floor(trA.length/3)],q2=trA[Math.floor(trA.length*2/3)];
  const grp=(set,a,b)=>st(set.filter(o=>o.a>=a&&o.a<b).map(o=>o.pnl));const TR=rows.filter(o=>isTr(o.r)),TE=rows.filter(o=>!isTr(o.r));
  console.log(`  fav ${lo}-${hi} terciles (cuts ${q1.toFixed(2)}, ${q2.toFixed(2)}): train low ${J(grp(TR,-99,q1))} mid ${J(grp(TR,q1,q2))} high ${J(grp(TR,q2,99))} | test low ${J(grp(TE,-99,q1))} mid ${J(grp(TE,q1,q2))} high ${J(grp(TE,q2,99))}`);
  // train-best skip rule (skip a ≥ t or a < t), paired per favourite-round
  const cand=[];for(const t of[-1.5,-1,-0.5,0,0.5,1,1.5])for(const dir of['skipHigh','skipLow']){const keep=o=>dir==='skipHigh'?o.a<t:o.a>=t;
    const d=set=>st(set.map(o=>keep(o)?0:-o.pnl));cand.push({t,dir,tr:d(TR),te:d(TE),nTe:TE.filter(keep).length});}
  const bt=cand.filter(c=>c.tr.n).sort((a,b)=>b.tr.c-a.tr.c)[0];
  console.log(`   train-best ${bt.dir} ${bt.t}: paired ¢/fav-round train ${bt.tr.c}±${bt.tr.se} → test ${bt.te.c}±${bt.te.se} (kept ${bt.nTe} of ${TE.length} test bets)`);}
// activity vs late flip: does high activity predict the 10:00 favourite losing?
const late=R.map((r,i)=>{const f=fav(r,600,80,97);return f&&rel[i]!=null?{...f,a:rel[i]}:null;}).filter(Boolean);
for(const[a,b]of[[-99,-0.5],[-0.5,0.5],[0.5,99]]){const s=late.filter(o=>o.a>=a&&o.a<b);console.log(`  10:00 fav 80–97 by activity ${a}..${b}: lost ${(100*s.filter(o=>!o.w).length/s.length).toFixed(1)}% n=${s.length} ${J(st(s.map(o=>o.pnl)))}`);}
