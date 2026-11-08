// Nov 8 evening: (A) cross-family stack at the 4:00 lock. One pre-registered, L2-regularised logistic model on top of Kalshi's 4:00 logit,
// using ALL the weak single-family inputs from the last week at once (variance ratio, USDT premium, futures positioning, BVOL, Kalshi price path,
// strike chop, clock, realised vol, momentum). Nothing was picked by looking at test results: every family is in, also the ones whose test was negative.
// L2 and skip-share are chosen inside the training rounds only. Walk-forward (expanding) and newest-25% views.
// (B) Scale-in / confirm-and-add under the lock: 1/2 at 4:00 + 1/2 at 5:00 if still clearing, vs 1 at 4:00. (C) stake sizing by read edge.
import fs from 'fs';import {R,feeP,stat,paired} from './sim.mjs';import {et} from './lib.mjs';const J=JSON.stringify;
const C=JSON.parse(fs.readFileSync('lab/data/candles.json')),U=JSON.parse(fs.readFileSync('lab/usdt/minutes.json')),OI=JSON.parse(fs.readFileSync('lab/oi/metrics.json')),BV=JSON.parse(fs.readFileSync('lab/bvol/minutes.json'));
const MIN=60000,FIVE=300000,S=240;const lg=p=>Math.log(p/(1-p)),sg=z=>1/(1+Math.exp(-z)),cl=p=>Math.min(.99,Math.max(.01,p));
const side=(a,c)=>a?(c?a.ya:a.na):null,mid=(a,c)=>a&&a.ya!=null&&a.na!=null?(c?(a.ya+100-a.na)/2:(a.na+100-a.ya)/2):null;
const rets=(w,n)=>{const r=[];for(let i=n-1;i>=0;i--){const a=C[w-i*MIN-MIN],b=C[w-i*MIN];if(a&&b)r.push(Math.log(b[4]/a[4]));}return r;};
const vr=(r,k)=>{const n=r.length;if(n<k*6)return null;const v1=r.reduce((s,x)=>s+x*x,0)/n;if(!v1)return null;let vk=0,c=0;for(let i=k;i<=n;i++){let s=0;for(let j=i-k;j<i;j++)s+=r[j];vk+=s*s;c++;}return vk/c/(k*v1);};
const rms=r=>r.length>5?Math.sqrt(r.reduce((s,x)=>s+x*x,0)/r.length):null;
const med=a=>{const s=[...a].sort((x,y)=>x-y);return s[s.length>>1];};
const ub=ms=>{for(let k=0;k<3;k++){const v=U[ms-k*MIN];if(v)return v;}return null;};
const bv=ms=>{for(let k=0;k<3;k++){const v=BV[ms-k*MIN];if(v)return v;}return null;};
const obar=ms=>{let b=Math.floor(ms/FIVE)*FIVE;for(let k=0;k<3;k++){const v=OI[b-k*FIVE];if(v&&v[0]>0&&v[3]>0&&v[4]>0&&v[5]>0)return v;}return null;};
const N=v=>v==null||!isFinite(v)?null:v;
const ctx=R.map(o=>{const a=o.at[S];if(!a||a.ya==null||a.na==null)return null;const c=a.ya>=a.na?1:0,s=c?1:-1,now=o.t+S*1000,w=now-MIN,pf=mid(a,c)/100,x={c,pf};
  // variance ratio
  const r=rets(w,240);for(const[k,n]of[[5,240],[10,240],[3,60],[5,120]]){const rr=r.slice(-n);x[`vr${k}_${n}`]=rr.length>=n*.9?vr(rr,k):null;}
  // realised vol & momentum
  const rv15=rms(r.slice(-15)),rv60=rms(r.slice(-60)),rv240=rms(r);x.rv1560=rv15&&rv60?Math.log(rv15/rv60):null;x.rv60240=rv60&&rv240?Math.log(rv60/rv240):null;
  const sum=n=>r.slice(-n).reduce((q,v)=>q+v,0);x.mom5=r.length>=5?s*sum(5)/(rv60||1):null;x.mom15=r.length>=15?s*sum(15)/(rv60||1):null;x.mom60=r.length>=60?s*sum(60)/(rv60||1):null;
  // USDT
  const u0=ub(now-MIN);if(u0){const u15=ub(now-16*MIN),u60=ub(now-61*MIN);x.ud15=u15?s*(u0-u15)*1e4:null;x.ud60=u60?s*(u0-u60)*1e4:null;const v60=[];for(let i=1;i<=60;i++){const v=ub(now-i*MIN);if(v)v60.push(v);}x.uv60=v60.length>40?s*(u0-v60.reduce((q,v)=>q+v,0)/v60.length)*1e4:null;const wk=[];for(let h=1;h<=168;h++){const v=ub(now-h*3600000);if(v)wk.push(v);}x.uwk=wk.length>100?s*(u0-med(wk))*1e4:null;}
  // OI / positioning
  const ref=now-FIVE,B=obar(ref),B15=obar(ref-15*MIN),B60=obar(ref-60*MIN);if(B&&B15&&B60){const k3=C[o.t+180000],k15=C[o.t+180000-15*MIN],k60=C[o.t+180000-60*MIN],mv15=k3&&k15?Math.log(k3[4]/k15[4])*s:null,mv60=k3&&k60?Math.log(k3[4]/k60[4])*s:null,d15=Math.log(B[0]/B15[0]),d60=Math.log(B[0]/B60[0]);x.conv15=mv15==null?null:Math.sign(mv15)*d15;x.conv60=mv60==null?null:Math.sign(mv60)*d60;x.topLS=s*Math.log(B[3]);x.topLSd60=s*Math.log(B[3]/B60[3]);x.taker=s*Math.log(B[5]);x.takerd=s*Math.log(B[5]/B15[5]);x.acctLS=s*Math.log(B[4]);}
  // BVOL
  const b0=bv(now-MIN);if(b0){const b60=bv(now-61*MIN),b240=bv(now-241*MIN);x.bd60=b60?Math.log(b0/b60):null;x.bd240=b240?Math.log(b0/b240):null;x.bratio=rv60?Math.log((b0/100/Math.sqrt(525600))/rv60):null;const wk=[];for(let h=1;h<=168;h++){const v=bv(now-h*3600000);if(v)wk.push(v);}x.bwk=wk.length>100?Math.log(b0/med(wk)):null;}
  // Kalshi path
  const m4=mid(a,c),m3=mid(o.at[180],c),m2=mid(o.at[120],c);if(m3!=null&&m2!=null){x.gb=Math.max(m2,m3)-m4;x.d1=m4-m3;x.d2=m4-m2;x.settled=Math.min(m2,m3);}
  // strike chop
  const K=o.strike,k=[0,1,2,3].map(i=>C[o.t+i*MIN]);if(K&&k.every(Boolean)){x.touch=k.filter(v=>v[1]<=K&&v[2]>=K).length;x.dogCl=k.filter(v=>c?v[4]<K:v[4]>K).length;let path=Math.abs(k[0][4]-k[0][3]);for(let i=1;i<4;i++)path+=Math.abs(k[i][4]-k[i-1][4]);x.eff=path>0?Math.abs(k[3][4]-k[0][3])/path:1;}
  // clock
  x.q45=new Date(o.t).getUTCMinutes()===45?1:0;x.q00=new Date(o.t).getUTCMinutes()===0?1:0;
  // read vs market
  if(a.pu!=null){const rf=c?a.pu:1-a.pu;x.readGap=lg(cl(rf))-lg(cl(pf));}
  return x;});
const KEYS=['vr5_240','vr10_240','vr3_60','vr5_120','rv1560','rv60240','mom5','mom15','mom60','ud15','ud60','uv60','uwk','conv15','conv60','topLS','topLSd60','taker','takerd','acctLS','bd60','bd240','bratio','bwk','gb','d1','d2','settled','touch','dogCl','eff','q45','q00','readGap'];
console.log('features',KEYS.length,'non-null share in all rounds:',KEYS.map(k=>k+':'+(ctx.filter(x=>x&&x[k]!=null).length/ctx.filter(Boolean).length).toFixed(2)).join(' '));
const idx=new Map(R.map((o,i)=>[o.t,i]));
function fitRidge(X,y,l2,it=400){const d=X[0].length;let w=new Array(d).fill(0);w[1]=1;for(let t=0;t<it;t++){const g=new Array(d).fill(0);for(let i=0;i<X.length;i++){const p=sg(X[i].reduce((s,v,j)=>s+v*w[j],0));for(let j=0;j<d;j++)g[j]+=(p-y[i])*X[i][j];}for(let j=0;j<d;j++){g[j]/=X.length;if(j>=2)g[j]+=l2*w[j];w[j]-=(j<2?.3:.5)*g[j];}}return w;}
const pred=(X,w)=>X.map(x=>sg(x.reduce((s,v,j)=>s+v*w[j],0)));
function norm(tr){const st={};for(const k of KEYS){const v=tr.map(o=>ctx[idx.get(o.t)]).filter(x=>x&&x[k]!=null).map(x=>x[k]);const m=v.length?v.reduce((s,x)=>s+x,0)/v.length:0;st[k]={m,s:Math.sqrt(v.reduce((s,x)=>s+(x-m)**2,0)/Math.max(1,v.length))||1};}return st;}
const row=(o,st,base)=>{const x=ctx[idx.get(o.t)];if(!x)return null;const l=lg(cl(x.pf));if(base)return[1,l];const v=KEYS.map(k=>x[k]==null?0:Math.max(-4,Math.min(4,(x[k]-st[k].m)/st[k].s)));return[1,l,...v];};
const rows=(s,st,base)=>{const X=[],y=[],t=[];for(const o of s){const r=row(o,st,base);if(!r)continue;X.push(r);y.push(o.up===ctx[idx.get(o.t)].c?1:0);t.push(o.t);}return{X,y,t};};
const L2s=[0.003,0.01,0.03,0.1,0.3];
function trainPick(tr){const c=Math.floor(tr.length*.75),a=tr.slice(0,c),b=tr.slice(c),st=norm(a),A=rows(a,st),Bb=rows(b,st);let best=null;for(const l of L2s){const w=fitRidge(A.X,A.y,l);const p=pred(Bb.X,w);const ll=-p.reduce((s,v,i)=>s+(Bb.y[i]?Math.log(v):Math.log(1-v)),0)/p.length;if(!best||ll<best.ll)best={l,ll};}
  // choose skip share on the inner holdout (fav 75–90 all hours, by predicted residual)
  const w=fitRidge(A.X,A.y,best.l);const p=pred(Bb.X,w);const m=new Map();Bb.t.forEach((t,i)=>m.set(t,p[i]-ctx[idx.get(t)].pf));const bets=[];for(const o of b){const x=ctx[idx.get(o.t)];if(!x)continue;const ask=side(o.at[S],x.c);if(ask<75||ask>90)continue;const won=o.up===x.c;bets.push({t:o.t,r:m.get(o.t),pnl:(won?100-ask:-ask)-feeP(ask)});}
  const so=[...bets].sort((u,v)=>u.r-v.r);let sk={q:0,val:bets.reduce((s,x)=>s+x.pnl,0)};for(const q of[.1,.2,.3,.5]){const th=so[Math.floor(q*so.length)].r;const val=bets.filter(x=>x.r>=th).reduce((s,x)=>s+x.pnl,0);if(val>sk.val)sk={q,val,th};}
  const stAll=norm(tr),F=rows(tr,stAll),wAll=fitRidge(F.X,F.y,best.l),B0=rows(tr,stAll,true),w0=fitRidge(B0.X,B0.y,0);
  const inRes=pred(F.X,wAll).map((v,i)=>v-ctx[idx.get(F.t[i])].pf);return{l:best.l,q:sk.q,th:sk.th,st:stAll,w:wAll,w0};}
function scoreFold(te,M){const X=rows(te,M.st),X0=rows(te,M.st,true);const p=pred(X.X,M.w),p0=pred(X0.X,M.w0);const d=p.map((v,i)=>X.y[i]?Math.log(v/p0[i]):Math.log((1-v)/(1-p0[i])));const res=new Map(X.t.map((t,i)=>[t,p[i]]));return{d,res};}
const side2=(o,x)=>side(o.at[S],x.c);
function betsOf(te,res,mode,gate){const out=[];for(const o of te){const i=idx.get(o.t),x=ctx[i];if(!x)continue;const a=o.at[S];let c,ask;
  if(mode.startsWith('live')){if(!a.f)continue;if(mode==='live'&&et(o.t).h<12)continue;c=a.pu>=.5?1:0;ask=side(a,c);if(ask<75||ask>90||Math.max(a.pu,1-a.pu)*100<ask+feeP(ask)+3)continue;}
  else{if(mode==='fav12'&&et(o.t).h<12)continue;c=x.c;ask=side(a,c);if(ask<75||ask>90)continue;}
  if(gate&&!gate(o,x,c,ask,res.get(o.t)))continue;const won=o.up===c;out.push({t:o.t,pnl:(won?100-ask:-ask)-feeP(ask),won,ask});}return out;}
// walk-forward folds: expanding train, next 12.5% test, 4 folds = newest half; plus the newest-25% single split
const n=R.length,cuts=[.5,.625,.75,.875,1].map(f=>Math.floor(f*n));const folds=[];for(let k=0;k<4;k++)folds.push({tr:R.slice(0,cuts[k]),te:R.slice(cuts[k],cuts[k+1])});
const single={tr:R.slice(0,cuts[2]),te:R.slice(cuts[2])};
function bases(te){return{fav:betsOf(te,new Map(),'fav'),fav12:betsOf(te,new Map(),'fav12'),live:betsOf(te,new Map(),'live'),liveA:betsOf(te,new Map(),'liveA')};}
const skipG=q=>(o,x,c,ask,p)=>p==null||p*100>=ask+feeP(ask)+q; // value rule
const skipRes=th=>(o,x,c,ask,p)=>p==null||(p-x.pf)>=th; // skip lowest residuals (train-chosen)
function report(label,F){const allD=[],R0=[];const collect={};for(const k of ['fav','fav12','live','liveA'])collect[k]={b:[],g:[],v:[]};let info=[];
  for(const f of F){const M=trainPick(f.tr),sc=scoreFold(f.te,M);allD.push(...sc.d);R0.push(...f.te);info.push(`L2 ${M.l} skip ${M.q}`);const gate=M.q?skipRes(M.th):null;
    for(const k of Object.keys(collect)){collect[k].b.push(...betsOf(f.te,sc.res,k));collect[k].g.push(...betsOf(f.te,sc.res,k,gate));collect[k].v.push(...betsOf(f.te,sc.res,k,skipG(0)));}}
  const m=allD.reduce((s,x)=>s+x,0)/allD.length,se=Math.sqrt(allD.reduce((s,x)=>s+(x-m)**2,0)/(allD.length-1)/allD.length);console.log(`\n### ${label}: log-loss gain over Kalshi 4:00 (recalibrated) ${m.toFixed(4)}±${se.toFixed(4)} (n ${allD.length}); ${info.join(' | ')}`);
  for(const k of Object.keys(collect)){const c=collect[k],p1=paired(R0,c.g,c.b),p2=paired(R0,c.v,c.b);console.log(`  ${k.padEnd(6)} base ${J(stat(c.b))}`);console.log(`         train-chosen skip ${J(stat(c.g))} Δ${p1.perRound}±${p1.se} ¢/round`);console.log(`         stack ≥ ask+fee   ${J(stat(c.v))} Δ${p2.perRound}±${p2.se} ¢/round`);}
  return{R0,collect};}
console.log('rounds',R.length,'test from (newest 25%)',new Date(R[cuts[2]].t).toISOString(),' walk-forward from',new Date(R[cuts[0]].t).toISOString());
const wf=report('walk-forward 4 folds (newest 50%)',folds);report('single split newest 25%',[single]);
// coefficient view on the full train fit
{const M=trainPick(single.tr);const v=KEYS.map((k,i)=>[k,M.w[i+2]]).sort((a,b)=>Math.abs(b[1])-Math.abs(a[1]));console.log('\ntop coefficients (std units, fit on older 75%):',v.slice(0,12).map(([k,w])=>k+' '+w.toFixed(3)).join(', '),' logit coef',M.w[1].toFixed(3));}
// Part B: scale-in under the lock
const qualifies=(o,s,c,mode)=>{const a=o.at[s];if(!a||a.ya==null||a.na==null)return null;const ask=side(a,c);if(ask<75||ask>90)return null;if(mode==='live'){if(!a.f||a.pu==null)return null;const pc=c?a.pu:1-a.pu;if(pc*100<ask+feeP(ask)+3)return null;}else{if(a.ya>=a.na?c!==1:c!==0)return null;}return ask;};
function sim(te,mode,scheme){const out=[];for(const o of te){const i=idx.get(o.t),x=ctx[i];if(!x)continue;const a=o.at[S];let c,ask;if(mode==='live'){if(!a.f||et(o.t).h<12)continue;c=a.pu>=.5?1:0;ask=side(a,c);if(ask<75||ask>90||Math.max(a.pu,1-a.pu)*100<ask+feeP(ask)+3)continue;}else{c=x.c;ask=side(a,c);if(ask<75||ask>90)continue;}
  const won=o.up===c,px=q=>(won?100-q:-q)-feeP(q);let pnl=0,stake=0;if(scheme==='full'){pnl=px(ask);stake=1;}else{const[a1,add]=scheme;pnl=a1*px(ask);stake=a1;const q5=qualifies(o,300,c,mode);if(q5!=null){pnl+=add*px(q5);stake+=add;}}out.push({t:o.t,pnl,won,ask,stake});}return out;}
const SCHEMES=[['1/2 + 1/2 if clears 5:00',[.5,.5]],['1/2 + 1 if clears 5:00',[.5,1]],['1 + 1/2 if clears 5:00',[1,.5]],['1 + 1 if clears 5:00',[1,1]]];
console.log('\n(B) scale-in under the lock (1 contract at 4:00 = base; ¢/round paired, ¢ per contract-equivalent):');
for(const[mode,lbl]of[['live','live 12–24'],['fav','fav all hours']]){const s0=R.slice(0,cuts[2]),s1=R.slice(cuts[2]);const b0=sim(s0,mode,'full'),b1=sim(s1,mode,'full');console.log(' '+lbl,'base train',J(stat(b0)),'test',J(stat(b1)));
  for(const[nm,sc]of SCHEMES){const a0=sim(s0,mode,sc),a1=sim(s1,mode,sc),p0=paired(s0,a0,b0),p1=paired(s1,a1,b1),avg=x=>(x.reduce((s,v)=>s+v.pnl,0)/x.reduce((s,v)=>s+v.stake,0)).toFixed(2),st=x=>(x.reduce((s,v)=>s+v.stake,0)/x.length).toFixed(2);console.log(`   ${nm.padEnd(24)} train Δ${p0.perRound}±${p0.se} (¢/contract ${avg(a0)}, avg stake ${st(a0)}) | test Δ${p1.perRound}±${p1.se} (¢/contract ${avg(a1)}, stake ${st(a1)})`);}}
// Part C: stake by read edge (read − ask − fee), weights scaled to average stake 1 on train
console.log('\n(C) stake sizing by read edge (live 12–24, weights scaled to mean 1 on train; ¢/round vs flat 1):');
{const coll=te=>{const out=[];for(const o of te){const i=idx.get(o.t),x=ctx[i];if(!x)continue;const a=o.at[S];if(!a.f||et(o.t).h<12)continue;const c=a.pu>=.5?1:0,ask=side(a,c);if(ask<75||ask>90)continue;const prob=Math.max(a.pu,1-a.pu)*100,ed=prob-ask-feeP(ask);if(ed<3)continue;const won=o.up===c;out.push({t:o.t,ed,ask,pnl:(won?100-ask:-ask)-feeP(ask),won});}return out;};
 const s0=coll(R.slice(0,cuts[2])),s1=coll(R.slice(cuts[2]));const med2=med(s0.map(x=>x.ed));console.log('  train bets',s0.length,'test bets',s1.length,'median edge',med2.toFixed(1));
 const sch={'double when edge ≥ median':e=>e>=med2?2:1,'half when edge < median':e=>e>=med2?1:.5,'linear (edge/median, cap 2)':e=>Math.min(2,Math.max(.25,e/med2)),'bigger when edge small (inverse, sanity)':e=>e<med2?2:1};
 for(const[k,f]of Object.entries(sch)){const scale=s0.length/s0.reduce((s,x)=>s+f(x.ed),0);const ev=S0=>{const flat=S0.reduce((s,x)=>s+x.pnl,0)/S0.length,w=S0.reduce((s,x)=>s+x.pnl*f(x.ed)*scale,0)/S0.length,d=S0.map(x=>x.pnl*(f(x.ed)*scale-1)),m=d.reduce((s,x)=>s+x,0)/d.length,se=Math.sqrt(d.reduce((s,x)=>s+(x-m)**2,0)/(d.length-1)/d.length);return `flat ${flat.toFixed(1)} sized ${w.toFixed(1)} Δ${m.toFixed(2)}±${se.toFixed(2)} ¢/bet`;};console.log('  '+k.padEnd(34),'train',ev(s0),'| test',ev(s1));}
}
