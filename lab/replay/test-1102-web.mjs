// Nov 2: theories from the web, tested on RIPTIDE's rounds (walk-forward: fit on older 75%, score on newest 25%).
//  A) Quarter-hour effect (arXiv 2607.09426): 1-min returns at :00/:15/:30/:45 boundaries reverse (negative lag-1 autocorrelation), and boundary
//     order imbalance predicts reversal over the next ~30 min. Here: the round's first-minute move and first-minute Coinbase order imbalance.
//  B) 15-min mean reversion (arXiv 2608.21888): P(up) = sigmoid(C + A·Σ_k k^-α tanh(150·r_{t-k})), 12 previous 15-min bars, BTC AUC ~0.533.
//  C) Favourite–longshot bias (Bürgi, Deng & Whelan, Kalshi): expensive contracts win more than their price, cheap ones less.
import fs from 'fs';import {R,feeP,stat} from './sim.mjs';
const M=JSON.parse(fs.readFileSync('lab/data/candles.json'));const FL=JSON.parse(fs.readFileSync('lab/flowdata/minutes.json')).m;
const J=JSON.stringify,lg=p=>Math.log(p/(1-p)),cl=p=>Math.min(.99,Math.max(.01,p)),ll=(p,y)=>-(y?Math.log(p):Math.log(1-p));
const cut=Math.floor(R.length*.75);
function feat(o){const t=o.t;const c0=M[t];if(!c0)return null;const pre=[];for(let i=60;i>=1;i--){const x=M[t-i*60000];if(x)pre.push(x[4]);}if(pre.length<40)return null;
 let v=0;for(let i=1;i<pre.length;i++)v+=Math.log(pre[i]/pre[i-1])**2;const sd=Math.sqrt(v/(pre.length-1));
 const m1=Math.log(c0[4]/c0[3])/sd;const f=FL[Math.floor(t/1000)];const oi1=f&&f[0]+f[1]>0?(f[0]-f[1])/(f[0]+f[1]):null;
 let K=0,ok=0;for(let k=1;k<=12;k++){const a=M[t-k*900000],b=M[t-(k-1)*900000-60000];if(!a||!b)continue;ok++;K+=Math.tanh(150*Math.log(b[4]/a[3]))/k;}
 // previous 1-min boundary returns before the round (lag-1 reversal at boundaries, last 4 quarter boundaries)
 return{sd,m1,oi1,K:ok>=10?K:null};}
const rows=[];for(const o of R){const f=feat(o);if(!f)continue;rows.push({o,...f,i:rows.length});}
console.log('rounds with features',rows.length,'with flow',rows.filter(r=>r.oi1!=null).length);
function fit(X,y,it=600,lr=.5){const d=X[0].length;let w=Array(d).fill(0);for(let k=0;k<it;k++){const g=Array(d).fill(0);for(let i=0;i<X.length;i++){const z=X[i].reduce((s,x,j)=>s+x*w[j],0),p=1/(1+Math.exp(-z));for(let j=0;j<d;j++)g[j]+=(p-y[i])*X[i][j];}for(let j=0;j<d;j++)w[j]-=lr*(g[j]/X.length+1e-4*w[j]);}return w;}
const pr=(w,x)=>1/(1+Math.exp(-x.reduce((s,v,j)=>s+v*w[j],0)));
const clip=x=>Math.max(-4,Math.min(4,x));
console.log('\nA/B) log-loss gain over Kalshi mid alone on the newest 25% (positive = theory adds information), and raw correlation with outcome−mid');
for(const s of [120,180,240]){
 for(const[name,fx,need]of[['first-minute move (A)',r=>clip(r.m1),r=>true],['first-minute order imbalance (A)',r=>r.oi1,r=>r.oi1!=null],['15-min reversal kernel (B)',r=>r.K,r=>r.K!=null],['A move + B kernel',null,r=>r.K!=null]]){
  const S=rows.filter(r=>{const a=r.o.at[s];return a&&a.ya!=null&&a.na!=null&&need(r);}).map(r=>({...r,mid:cl((r.o.at[s].ya+100-r.o.at[s].na)/200),y:r.o.up}));
  const c=Math.floor(S.length*.75),TR=S.slice(0,c),TE=S.slice(c);
  const X0=r=>[1,lg(r.mid)],X1=fx?r=>[1,lg(r.mid),fx(r)]:r=>[1,lg(r.mid),clip(r.m1),r.K];
  const w0=fit(TR.map(X0),TR.map(r=>r.y)),w1=fit(TR.map(X1),TR.map(r=>r.y));
  const d=TE.map(r=>ll(pr(w0,X0(r)),r.y)-ll(pr(w1,X1(r)),r.y)),m=d.reduce((a,b)=>a+b,0)/d.length,se=Math.sqrt(d.reduce((a,b)=>a+(b-m)**2,0)/(d.length-1)/d.length);
  // correlation of feature with residual (y - mid) on all
  const fv=fx||(r=>clip(r.m1));const res=S.map(r=>r.y-r.mid),F=S.map(fv);const mf=F.reduce((a,b)=>a+b,0)/F.length,mr=res.reduce((a,b)=>a+b,0)/res.length;
  const cor=F.reduce((a,x,i)=>a+(x-mf)*(res[i]-mr),0)/Math.sqrt(F.reduce((a,x)=>a+(x-mf)**2,0)*res.reduce((a,x)=>a+(x-mr)**2,0));
  console.log(`  ${s/60}:00 ${name.padEnd(34)} n=${S.length} train coef ${w1.slice(2).map(x=>x.toFixed(3)).join(',')} | test LL gain ${m.toFixed(4)}±${se.toFixed(4)} | corr w/ outcome−price ${cor.toFixed(3)} (2SE ${(2/Math.sqrt(S.length)).toFixed(3)})`);}}
// does the first minute reverse at all in BTC itself? (sign of minute-1 move vs rest of round move)
{const a=rows.map(r=>{const t=r.o.t,c0=M[t],e=M[t+840000];if(!c0||!e)return null;return[Math.sign(Math.log(c0[4]/c0[3])),Math.sign(Math.log(e[4]/c0[4]))];}).filter(x=>x&&x[0]&&x[1]);
 console.log(`\n  BTC itself: rest-of-round move opposite to first-minute move in ${(a.filter(x=>x[0]!==x[1]).length/a.length*100).toFixed(1)}% of ${a.length} rounds (50% = no reversal; 1 SE ${(50/Math.sqrt(a.length)).toFixed(1)})`);
 const b=rows.map(r=>{if(r.K==null)return null;const t=r.o.t,c0=M[t],e=M[t+840000];if(!c0||!e)return null;const up=e[4]>c0[3]?1:0;return{K:r.K,up};}).filter(Boolean);
 const lo=b.filter(x=>x.K<-0.3),hi=b.filter(x=>x.K>0.3);console.log(`  BTC itself: 15-min kernel < −0.3 (recent downs) → bar up ${(lo.filter(x=>x.up).length/lo.length*100).toFixed(1)}% (${lo.length}); kernel > 0.3 → up ${(hi.filter(x=>x.up).length/hi.length*100).toFixed(1)}% (${hi.length})`);}
// C) favourite–longshot: every checkpoint, both sides, by ask bucket: win% − ask − fee (¢/ct), train vs test
console.log('\nC) favourite–longshot bias: buy a side at its ask at a checkpoint (all checkpoints 2:00–10:00 pooled, one bucket per round per side), ¢/ct after fee');
const B=[[1,10],[10,20],[20,35],[35,50],[50,65],[65,80],[80,90],[90,95],[95,99]];
for(const[n,set]of[['train',R.slice(0,cut)],['test',R.slice(cut)]]){const line=[];
 for(const[lo,hi]of B){const bs=[];for(const o of set){for(const s of [120,240,480]){const a=o.at[s];if(!a||a.ya==null||a.na==null)continue;for(const c of [1,0]){const ask=c?a.ya:a.na;if(ask>=lo&&ask<hi){const w=o.up===c;bs.push({pnl:(w?100-ask:-ask)-feeP(ask),won:w,ask});}}}}
  const st=stat(bs);line.push(`${lo}–${hi}¢ ${st.c}±${st.se} (${st.n})`);}console.log(`  ${n} (checks 2:00/4:00/8:00): `+line.join(' | '));}
for(const s of [120,240,480,600]){const line=[];for(const[lo,hi]of [[1,10],[10,20],[90,95],[95,99]]){const bs=[];for(const o of R.slice(cut)){const a=o.at[s];if(!a||a.ya==null)continue;for(const c of [1,0]){const ask=c?a.ya:a.na;if(ask>=lo&&ask<hi){const w=o.up===c;bs.push({pnl:(w?100-ask:-ask)-feeP(ask),won:w,ask});}}}const st=stat(bs);line.push(`${lo}–${hi}¢ ${st.c}±${st.se} (${st.n})`);}console.log(`  test at ${s/60}:00: `+line.join(' | '));}
// D) YES vs NO bias (Becker, Kalshi microstructure: NO beat YES at 69 of 99 price levels): same price bucket, YES (UP) vs NO (DOWN), checks 2:00/4:00/8:00
console.log('\nD) YES (UP) vs NO (DOWN) at the same price, ¢/ct after fee:');
for(const[n,set]of[['train',R.slice(0,cut)],['test',R.slice(cut)]]){const line=[];
 for(const[lo,hi]of[[1,20],[20,50],[50,80],[80,99]]){const g={1:[],0:[]};for(const o of set)for(const s of [120,240,480]){const a=o.at[s];if(!a||a.ya==null||a.na==null)continue;for(const c of [1,0]){const ask=c?a.ya:a.na;if(ask>=lo&&ask<hi){const w=o.up===c;g[c].push({pnl:(w?100-ask:-ask)-feeP(ask),won:w,ask});}}}
  const y=stat(g[1]),no=stat(g[0]);line.push(`${lo}–${hi}¢ YES ${y.c}±${y.se} NO ${no.c}±${no.se}`);}console.log(`  ${n}: `+line.join(' | '));}
const upShare=R.filter(o=>o.up).length/R.length;console.log(`  rounds that settled UP: ${(upShare*100).toFixed(1)}% of ${R.length}`);
