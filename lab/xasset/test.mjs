// Evening Oct 27: new-information families Kalshi may not price at minute resolution.
// (A) ETH lead: ETH's last 1/3-min move beyond what BTC's own move implies (residual), in BTC-vol units over time left.
// (B) Futures premium: Binance BTCUSDT futures vs Coinbase spot, change of the premium over the last 1/5 min.
// Test: LR on logit(Kalshi mid) + feature, fit older 75%, score newest 25% (log-loss) and bet rules after fees.
import fs from 'fs';import {R,feeP,stat,run,paired,LIVE} from '../replay/sim.mjs';import {fitLR,brainP,et} from '../replay/lib.mjs';
const M=JSON.parse(fs.readFileSync('lab/data/candles.json')),E=JSON.parse(fs.readFileSync('lab/data/eth.json')),F=JSON.parse(fs.readFileSync('lab/data/bfut.json'));
const L=x=>Math.log(x/(1-x)),cl=x=>Math.min(.98,Math.max(.02,x)),J=JSON.stringify;
const cb=t=>M[t]?.[4],eh=t=>E[t]?.[4],fu=t=>F[t];
// estimate beta of ETH 1-min return on BTC 1-min return from the first 75% span
const T75=R[Math.floor(R.length*.75)].t;let sxy=0,sxx=0;for(const k in M){const t=+k;if(t>=T75)continue;const a=cb(t),b=cb(t-60000),c=eh(t),d=eh(t-60000);if(!a||!b||!c||!d)continue;const x=Math.log(a/b),y=Math.log(c/d);sxy+=x*y;sxx+=x*x;}
const beta=sxy/sxx;console.log('rounds',R.length,'ETH beta',beta.toFixed(3));
function feat(o,s){const a=o.at[s];if(!a||a.ya==null||a.na==null)return null;const m=o.t+s*1000-60000;// candle opened 1 min before checkpoint
 const p0=cb(m),p1=cb(m-60000),p3=cb(m-180000),e0=eh(m),e1=eh(m-60000),e3=eh(m-180000);if(!p0||!p1||!p3||!e0||!e1||!e3)return null;
 let v=0,n=0;for(let i=1;i<=60;i++){const x=cb(m-i*60000),y=cb(m-(i+1)*60000);if(x&&y){v+=Math.log(x/y)**2;n++;}}if(n<40)return null;const sg=Math.sqrt(v/n);// per-minute vol
 const scale=sg*Math.sqrt((900-s)/60);
 const r1=Math.log(p0/p1),r3=Math.log(p0/p3),q1=Math.log(e0/e1),q3=Math.log(e0/e3);
 const f0=fu(m),f1=fu(m-60000),f5=fu(m-300000);const prem=f0?Math.log(f0/p0):null,prem1=f1?Math.log(f1/p1):null,p5=cb(m-300000),prem5=(f5&&p5)?Math.log(f5/p5):null;
 let pa=0,pn=0;for(let i=1;i<=15;i++){const x=fu(m-i*60000),y=cb(m-i*60000);if(x&&y){pa+=Math.log(x/y);pn++;}}
 const mid=cl((a.ya+100-a.na)/200);
 return{lp:L(mid),eth1:(q1-beta*r1)/scale,eth3:(q3-beta*r3)/scale,btc1:r1/scale,
  pd1:prem!=null&&prem1!=null?(prem-prem1)/scale:null,pd5:prem!=null&&prem5!=null?(prem-prem5)/scale:null,pdev:prem!=null&&pn>=10?(prem-pa/pn)/scale:null,a};}
const SETS={'price only':['lp'],'+ETH 1m':['lp','eth1'],'+ETH 3m':['lp','eth3'],'+ETH 1m+3m':['lp','eth1','eth3'],'+prem Δ1m':['lp','pd1'],'+prem Δ5m':['lp','pd5'],'+prem vs 15m avg':['lp','pdev'],'+ETH+prem':['lp','eth1','eth3','pd1','pdev']};
const ll=(p,y)=>-(y?Math.log(p):Math.log(1-p));
const halves=[R.slice(0,R.length>>1),R.slice(R.length>>1)];
for(const s of [120,180,240,300]){console.log(`\n=== checkpoint ${s/60}:00 ===`);
 const rows=R.map(o=>({o,f:feat(o,s)})).filter(r=>r.f&&Object.values(r.f).every(v=>v!=null));
 const c=Math.floor(rows.length*.75),tr=rows.slice(0,c),te=rows.slice(c);
 // univariate check: correlation of feature with residual (y − price)
 for(const k of ['eth1','eth3','btc1','pd1','pd5','pdev']){const by=(S)=>{let sx=0,sy=0,sxy=0,sxx=0,syy=0,n=S.length;for(const r of S){const x=r.f[k],y=r.o.up-1/(1+Math.exp(-r.f.lp));sx+=x;sy+=y;sxy+=x*y;sxx+=x*x;syy+=y*y;}return((sxy-sx*sy/n)/Math.sqrt((sxx-sx*sx/n)*(syy-sy*sy/n))).toFixed(3);};
  console.log(`  corr(${k}, outcome − price): train ${by(tr)} test ${by(te)}  (|r|>${(2/Math.sqrt(te.length)).toFixed(3)} ≈ 2 SE on test)`);}
 const base={};
 for(const[nm,ks]of Object.entries(SETS)){const m=fitLR(tr.map(r=>ks.map(k=>r.f[k])),tr.map(r=>r.o.up),0.5);
  const P=te.map(r=>brainP(m,ks.map(k=>r.f[k])));const L1=P.reduce((s,p,i)=>s+ll(p,te[i].o.up),0)/te.length;
  const d=P.map((p,i)=>ll(p,te[i].o.up));if(nm==='price only')base.d=d;const dd=base.d.map((x,i)=>x-d[i]),mm=dd.reduce((s,x)=>s+x,0)/dd.length,se=Math.sqrt(dd.reduce((s,x)=>s+(x-mm)**2,0)/dd.length/dd.length);
  // betting: buy side if model prob ≥ ask + fee + margin (any price 20–95¢)
  const bets=k=>{const out=[];te.forEach((r,i)=>{const p=P[i],a=r.f.a;for(const[c,pr,ask]of[['UP',p,a.ya],['DOWN',1-p,a.na]]){if(ask<20||ask>95)continue;if(pr*100>=ask+feeP(ask)+k){const won=(r.o.up===1)===(c==='UP');out.push({t:r.o.t,pnl:(won?100-ask:-ask)-feeP(ask),won,ask});}}});return out;};
  console.log(`  ${nm.padEnd(18)} test LL ${L1.toFixed(4)} gain vs price ${mm.toFixed(4)}±${se.toFixed(4)} | w ${m.w.slice(1).map(x=>x.toFixed(3)).join(',')} | bets m2 ${J(stat(bets(2)))} m4 ${J(stat(bets(4)))}`);}
 // simple filter on the favourite 75–90¢ (all hours): agree vs disagree with sign of feature
 for(const k of ['eth1','eth3','pd1','pdev']){const g={agree:[],dis:[],flat:[]};for(const r of rows){const a=r.f.a;let c=null,ask=null;if(a.ya>=75&&a.ya<=90){c=1;ask=a.ya;}else if(a.na>=75&&a.na<=90){c=-1;ask=a.na;}if(!c)continue;
   const v=r.f[k]*c,won=(r.o.up===1)===(c===1),x={t:r.o.t,pnl:(won?100-ask:-ask)-feeP(ask),won,ask};(Math.abs(r.f[k])<0.05?g.flat:v>0?g.agree:g.dis).push(x);}
  const hs=x=>halves.map(H=>{const S=new Set(H.map(o=>o.t));return stat(x.filter(z=>S.has(z.t)));});
  console.log(`  fav 75–90 by ${k}: agree ${J(stat(g.agree))} [halves ${hs(g.agree).map(q=>q.c+'±'+q.se).join(' / ')}]  disagree ${J(stat(g.dis))} [${hs(g.dis).map(q=>q.c+'±'+q.se).join(' / ')}]  flat ${J(stat(g.flat))}`);}
}
