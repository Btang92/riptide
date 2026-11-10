// Nov 10: Kalshi lag at second resolution under the 4:00 lock.
// At the 4:00 check, compare how far BTC moved over the last W seconds (Binance 1-s closes, in σ units of the trailing
// 60-min Coinbase 1-min volatility, mapped onto Kalshi's YES probability with 620 s effective time left) with how far
// Kalshi's last trade moved over the same W seconds. gap = (price BTC implies) − (Kalshi last trade), signed toward the bet side.
// Positive gap = Kalshi hasn't caught up with a BTC move toward our side; negative = BTC moved against us, Kalshi hasn't followed.
// Entry is RIPTIDE's 4:00 checkpoint ask (what the live rule actually pays), so any catch-up during the snapshot lag is priced in.
// Usage (repo root): node lab/kslag/test.mjs <dir with sec.json and kt.json>
import fs from 'fs';import {R,feeP,stat} from '../replay/sim.mjs';import {et} from '../replay/lib.mjs';const J=JSON.stringify;
const DIR=process.argv[2],SEC=JSON.parse(fs.readFileSync(DIR+'/sec.json')),KT=JSON.parse(fs.readFileSync(DIR+'/kt.json')),M=JSON.parse(fs.readFileSync('lab/data/candles.json'));
const Phi=x=>{const t=1/(1+0.2316419*Math.abs(x)),d=0.3989423*Math.exp(-x*x/2),p=d*t*(0.3193815+t*(-0.3565638+t*(1.781478+t*(-1.821256+t*1.330274))));return x>0?1-p:p;};
const iPhi=p=>{p=Math.min(.999,Math.max(.001,p));let lo=-8,hi=8;for(let i=0;i<60;i++){const m=(lo+hi)/2;if(Phi(m)<p)lo=m;else hi=m;}return (lo+hi)/2;};
function sig1m(t){const d=[];for(let k=60;k>=1;k--){const a=M[t-k*60000],b=M[t-(k-1)*60000];if(a&&b)d.push(b[4]-a[4]);}if(d.length<30)return null;const m=d.reduce((s,x)=>s+x,0)/d.length;return Math.sqrt(d.reduce((s,x)=>s+(x-m)**2,0)/(d.length-1));}
const lastK=(tr,ms)=>{let v=null;for(const x of tr){if(x[0]<=ms&&x[0]>ms-90000)v=x[1];else if(x[0]>ms)break;}return v;};
const WS=[10,20,30,60];
const rows=[];
for(const o of R){const a=o.at[240];if(!a||a.ya==null||a.na==null||a.pu==null)continue;const tr=KT[o.t];if(!tr)continue;tr.sort((x,y)=>x[0]-y[0]);
  const T4=Math.floor(o.t/1000)+240,s1=sig1m(o.t+180000);if(!s1)continue;const ss=s1/Math.sqrt(60);
  const g={};for(const W of WS){const bN=SEC[T4-1],bT=SEC[T4-1-W],kN=lastK(tr,T4*1000),kT=lastK(tr,(T4-W)*1000);if(bN==null||bT==null||kN==null||kT==null){g[W]=null;continue;}
    const z0=iPhi(kT/100),imp=Phi(z0+(bN-bT)/(ss*Math.sqrt(620)))*100;g[W]={gap:imp-kN,bz:(bN-bT)/(ss*Math.sqrt(W)),dk:kN-kT};}
  let q=[];for(let k=T4-60;k<T4;k++){const x=SEC[k-1],y=SEC[k];if(x!=null&&y!=null)q.push(y-x);}const burst=q.length>=50?Math.sqrt(q.reduce((s,v)=>s+v*v,0)/q.length)/ss:null;
  rows.push({o,a,g,h:et(o.t).h,burst});}
console.log('rounds with Kalshi trades + 1-s BTC',rows.length,'of',R.length,new Date(rows[0].o.t).toISOString(),'→',new Date(rows.at(-1).o.t).toISOString());
const side=(a,c)=>c?a.ya:a.na;
function entry(r,mode){const a=r.a;let c,ask;if(mode==='fav'){c=a.ya>=a.na?1:0;ask=side(a,c);if(ask<75||ask>90)return null;return{c,ask};}
  if(mode==='live'&&r.h<12)return null;c=a.pu>=.5?1:0;ask=side(a,c);if(ask<75||ask>90)return null;if(Math.max(a.pu,1-a.pu)*100-ask-feeP(ask)<3)return null;return{c,ask};}
const sgn=(x,c)=>c?x:-x;
const cut=Math.floor(rows.length*.75),TR=rows.slice(0,cut),TE=rows.slice(cut);
const bets=(S,mode,f)=>{const out=[];for(const r of S){const e=entry(r,mode);if(!e||!f(r,e))continue;const won=r.o.up===e.c;out.push({t:r.o.t,pnl:(won?100-e.ask:-e.ask)-feeP(e.ask),won,ask:e.ask});}return out;};
const pr=(S,a,b)=>{const A=new Map(a.map(x=>[x.t,x.pnl])),B=new Map(b.map(x=>[x.t,x.pnl]));const d=S.map(r=>(A.get(r.o.t)||0)-(B.get(r.o.t)||0)),m=d.reduce((s,v)=>s+v,0)/d.length,se=Math.sqrt(d.reduce((s,v)=>s+(v-m)**2,0)/(d.length-1)/d.length);return{d:+m.toFixed(3),se:+se.toFixed(3)};};
// 1) how often is there a lag at all
for(const W of WS){const G=rows.map(r=>r.g[W]).filter(Boolean);const ab=G.map(x=>Math.abs(x.gap)).sort((x,y)=>x-y);console.log(`W=${W}s: n ${G.length}, |gap| median ${ab[ab.length>>1].toFixed(1)}¢, 90th ${ab[Math.floor(ab.length*.9)].toFixed(1)}¢, ≥3¢ ${(ab.filter(x=>x>=3).length/ab.length*100).toFixed(0)}%`);}
// 2) quintiles of signed gap for all 75–90¢ favourites (all hours): ¢/ct at the checkpoint ask
for(const W of WS){const B=[];for(const r of rows){const e=entry(r,'fav');if(!e||!r.g[W])continue;const won=r.o.up===e.c;B.push({x:sgn(r.g[W].gap,e.c),pnl:(won?100-e.ask:-e.ask)-feeP(e.ask),won,ask:e.ask});}
  B.sort((p,q)=>p.x-q.x);const qs=[0,1,2,3,4].map(i=>B.slice(Math.floor(B.length*i/5),Math.floor(B.length*(i+1)/5)));
  console.log(`fav 75–90 W=${W}s quintiles of gap toward fav: `+qs.map(q=>`[${q[0].x.toFixed(1)}..${q.at(-1).x.toFixed(1)}] ${J(stat(q))}`).join(' | '));}
{const B=[];for(const r of rows){const e=entry(r,'fav');if(!e||r.burst==null)continue;const won=r.o.up===e.c;B.push({x:r.burst,pnl:(won?100-e.ask:-e.ask)-feeP(e.ask),won,ask:e.ask});}B.sort((p,q)=>p.x-q.x);console.log('fav 75–90 by 1-s burst quintile: '+[0,1,2,3,4].map(i=>B.slice(Math.floor(B.length*i/5),Math.floor(B.length*(i+1)/5))).map(q=>`[${q[0].x.toFixed(2)}..${q.at(-1).x.toFixed(2)}] ${J(stat(q))}`).join(' | '));}
// 3) rules chosen on the older 75%, scored on the newest 25% (paired ¢/round vs the base rule)
const F={};for(const W of WS)for(const g of[1,2,3,5]){F[`skip gap≤−${g} W${W}`]=(r,e)=>!r.g[W]||sgn(r.g[W].gap,e.c)>-g;F[`only gap≥${g} W${W}`]=(r,e)=>!!r.g[W]&&sgn(r.g[W].gap,e.c)>=g;}
for(const W of WS)for(const z of[.5,1,1.5])F[`skip BTC moved against ≥${z}σ W${W}`]=(r,e)=>!r.g[W]||sgn(r.g[W].bz,e.c)>-z;
for(const b of[1.25,1.5,2])F[`skip 1-s burst (last 60 s σ ≥${b}× trailing)`]=(r,e)=>r.burst==null||r.burst<b;
for(const mode of['live','liveAll','fav']){const base=S=>bets(S,mode,()=>true);
  console.log(`\n=== ${mode} base train ${J(stat(base(TR)))} test ${J(stat(base(TE)))} whole ${J(stat(base(rows)))}`);
  const res=Object.entries(F).map(([k,f])=>({k,tr:pr(TR,bets(TR,mode,f),base(TR)),te:pr(TE,bets(TE,mode,f),base(TE)),wh:pr(rows,bets(rows,mode,f),base(rows)),kept:stat(bets(TE,mode,f))})).sort((p,q)=>q.tr.d-p.tr.d);
  for(const x of res.slice(0,6))console.log(`  ${x.k.padEnd(34)} train Δ${x.tr.d}±${x.tr.se} → test Δ${x.te.d}±${x.te.se} (test kept ${J(x.kept)}) whole Δ${x.wh.d}±${x.wh.se}`);}
// 4) log-loss: Kalshi 4:00 mid logit alone vs + gap (W=30) on fav 65–95 rounds
const lg=p=>Math.log(p/(1-p));function fit(X,Y){let w=X[0].map(()=>0);for(let it=0;it<400;it++){const gr=w.map(()=>0);for(let i=0;i<X.length;i++){const p=1/(1+Math.exp(-X[i].reduce((s,v,j)=>s+v*w[j],0)));for(let j=0;j<w.length;j++)gr[j]+=(p-Y[i])*X[i][j];}w=w.map((v,j)=>v-0.5*gr[j]/X.length);}return w;}
const ll=(X,Y,w)=>{let s=0;for(let i=0;i<X.length;i++){const p=Math.min(1-1e-6,Math.max(1e-6,1/(1+Math.exp(-X[i].reduce((a,v,j)=>a+v*w[j],0)))));s-=Y[i]?Math.log(p):Math.log(1-p);}return s/X.length;};
for(const W of WS){const mk=S=>S.filter(r=>r.g[W]).map(r=>{const m=(r.a.ya+100-r.a.na)/2/100;return{x0:[1,lg(Math.min(.99,Math.max(.01,m)))],x1:[1,lg(Math.min(.99,Math.max(.01,m))),r.g[W].gap/10],y:r.o.up};});
  const a=mk(TR),b=mk(TE),w0=fit(a.map(r=>r.x0),a.map(r=>r.y)),w1=fit(a.map(r=>r.x1),a.map(r=>r.y));
  console.log(`log-loss W=${W}s test (n ${b.length}): Kalshi mid ${ll(b.map(r=>r.x0),b.map(r=>r.y),w0).toFixed(4)} vs + gap ${ll(b.map(r=>r.x1),b.map(r=>r.y),w1).toFixed(4)} (gap weight ${w1[2].toFixed(3)} per 10¢)`);}
