// Model shootout + Kalshi-lag: node lab/replay/test-shootout.mjs
// Every candidate gives P(up) at each checkpoint 2:00–5:00; all are scored on the same unseen rounds
// with the live bet rule (prob ≥ ask + fee + margin), ¢/contract after the Kalshi taker fee.
import {R,brain,run,stat,paired,LIVE,feeP} from './sim.mjs';
import {sigm,fitLR,brainP,scoreSet} from './lib.mjs';
const S=[120,180,240,300];
const lg=p=>{p=Math.min(.99,Math.max(.01,p));return Math.log(p/(1-p));};
const mkt=a=>{const m=(a.ya+(100-a.na))/200;return Math.min(.97,Math.max(.03,m));};
const prevOf=(o,s)=>o.at[s-60];
// lag gap: how far the model's read moved since the last check, minus how far Kalshi's price moved
const lagGap=(o,s)=>{const a=o.at[s],b=prevOf(o,s);if(!a||!b||!a.f||!b.f)return 0;return (lg(a.pu)-lg(b.pu))-(lg(mkt(a))-lg(mkt(b)));};
const tf=s=>[(s-210)/90];
const FEAT={
  raw:(o,s,a)=>[a.f[0]],
  base:(o,s,a)=>a.f,
  pattern:(o,s,a)=>a.fp?a.f.concat(a.fp):null,
  indicator:(o,s,a)=>a.fi?a.f.concat(a.fi):null,
  full:(o,s,a)=>a.fp&&a.fi?a.f.concat(a.fp,a.fi):null,
  blend:(o,s,a)=>[a.f[0],lg(mkt(a))],
  blendBase:(o,s,a)=>a.f.concat([lg(mkt(a))]),
  blendLag:(o,s,a)=>[a.f[0],lg(mkt(a)),lagGap(o,s)],
};
function rows(tr,fx,times){const X=[],y=[];for(const o of tr)for(const s of times){const a=o.at[s];if(!a||!a.f)continue;const x=fx(o,s,a);if(!x)continue;X.push(x);y.push(o.up);}return{X,y};}
// small gradient-boosted trees (depth 2, log-loss) in plain JS
function fitGBT(X,y,{T=150,lr=0.08,depth=2,minLeaf=40}={}){
  const n=X.length,d=X[0].length,F=Array(n).fill(0),trees=[];
  const qs=[];for(let j=0;j<d;j++){const v=X.map(x=>x[j]).sort((a,b)=>a-b);qs.push([...new Set([.1,.2,.3,.4,.5,.6,.7,.8,.9].map(q=>v[Math.floor(q*(n-1))]))]);}
  function build(idx,g,h,dep){const G=idx.reduce((s,i)=>s+g[i],0),H=idx.reduce((s,i)=>s+h[i],0);const leaf={v:-G/(H+1)};
    if(dep>=depth||idx.length<2*minLeaf)return leaf;let best=null;
    for(let j=0;j<d;j++)for(const t of qs[j]){let gl=0,hl=0,nl=0;for(const i of idx)if(X[i][j]<=t){gl+=g[i];hl+=h[i];nl++;}
      if(nl<minLeaf||idx.length-nl<minLeaf)continue;const gr=G-gl,hr=H-hl,gain=gl*gl/(hl+1)+gr*gr/(hr+1)-G*G/(H+1);if(!best||gain>best.gain)best={j,t,gain};}
    if(!best)return leaf;const L=idx.filter(i=>X[i][best.j]<=best.t),Rr=idx.filter(i=>X[i][best.j]>best.t);
    return{j:best.j,t:best.t,l:build(L,g,h,dep+1),r:build(Rr,g,h,dep+1)};}
  const pred=(tr,x)=>tr.v!=null?tr.v:pred(x[tr.j]<=tr.t?tr.l:tr.r,x);
  const all=[...Array(n).keys()];
  for(let k=0;k<T;k++){const g=[],h=[];for(let i=0;i<n;i++){const p=sigm(F[i]);g.push(p-y[i]);h.push(p*(1-p));}
    const tr=build(all,g,h,0);trees.push(tr);for(let i=0;i<n;i++)F[i]+=lr*pred(tr,X[i]);}
  return x=>{let s=0;for(const t of trees)s+=lr*pred(t,x);return Math.min(.99,Math.max(.01,sigm(s)));};}
function model(tr,kind,opt={}){
  if(kind==='rawModel')return{p:(a)=>a.pu};
  if(kind==='kalshi')return{p:(a)=>mkt(a)};
  if(kind.startsWith('gbt')){const fx=kind==='gbtMkt'?(o,s,a)=>a.fp&&a.fi?a.f.concat(a.fp,a.fi,[lg(mkt(a)),lagGap(o,s)]):null:FEAT.full;
    const {X,y}=rows(tr,(o,s,a)=>{const x=fx(o,s,a);return x?x.concat(tf(s)):null;},S);const f=fitGBT(X,y);return{p:(a,o,s)=>{const x=fx(o,s,a);return x?f(x.concat(tf(s))):a.pu;}};}
  const fx=FEAT[kind];
  if(opt.perTime){const M={};for(const s of S){const {X,y}=rows(tr,fx,[s]);M[s]=fitLR(X,y);}return{p:(a,o,s)=>{const x=fx(o,s,a);return x?brainP(M[s],x):a.pu;}};}
  const times=opt.at2?[120]:S;const {X,y}=rows(tr,fx,times);const m=fitLR(X,y);return{p:(a,o,s)=>{const x=fx(o,s,a);return x?brainP(m,x):a.pu;}};}
// generic runner that passes (a,o,s) to the model
function runM(te,M,rule,margin=3){const B={margin,p:null};const out=[];
  for(const o of te){const wrap={...B,p:null};const r=run([o],{margin,p:a=>{const s=+Object.keys(o.at).find(k=>o.at[k]===a);return M.p(a,o,s);}},rule);out.push(...r);}return out;}
const RULES={live:LIVE,'band75-90 allH':{...LIVE,hs:null},'any price allH':{...LIVE,lo:1,hi:99,hs:null}};
const res={};
for(const f0 of [.5,.75]){const c=Math.floor(R.length*f0),tr=R.slice(0,c),te=R.slice(c,Math.floor(R.length*(f0+.25)));
  const liveB=brain(tr),live={};for(const[rk,rule]of Object.entries(RULES))live[rk]=run(te,liveB,rule);
  // Kalshi-alone bar: buy the favourite at the first checkpoint whose ask is inside the rule's band/hours
  const lineup=[['LIVE (getBrain='+(liveB.kind||'none')+')',null],['kalshi','kalshi'],['raw logit only','raw'],['base LR','base'],['pattern LR','pattern'],['indicator LR','indicator'],['full LR','full'],
    ['blend raw+mkt','blend'],['blend base+mkt','blendBase'],['blend+lag','blendLag'],['GBT full','gbt'],['GBT full+mkt+lag','gbtMkt'],['base per-time','base',{perTime:true}],['blend per-time','blend',{perTime:true}],
    ['base 7-day window','base',{win:7*96}],['blend 7-day window','blend',{win:7*96}]];
  console.log(`\n=== fold train<${f0} (n=${tr.length})  test ${te.length} rounds`);
  for(const[name,kind,opt]of lineup){let M,trUse=opt&&opt.win?tr.slice(-opt.win):tr;
    if(kind===null)M={p:a=>liveB.p(a)};else M=model(trUse,kind,opt||{});
    const P=[],Y=[];for(const o of te){const a=o.at[120];P.push(M.p(a,o,120));Y.push(o.up);}const sc=scoreSet(P,Y);
    const line=[name.padEnd(28),'ll2:00',sc.ll.toFixed(4),'acc',sc.acc.toFixed(3)];
    for(const[rk,rule]of Object.entries(RULES)){let b;
      if(kind==='kalshi'){b=[];for(const o of te){const h=new Date(o.t);const etH=+new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',hour:'2-digit',hourCycle:'h23'}).format(h);if(rule.hs!=null&&(etH<rule.hs||etH>=rule.he))continue;
        for(const s of rule.times){const a=o.at[s];if(!a)continue;const up=mkt(a)>=.5,ask=up?a.ya:a.na;if(!(ask>=rule.lo&&ask<=rule.hi&&ask>0&&ask<100))continue;const won=(o.up===1)===up;b.push({t:o.t,pnl:(won?100-ask:-ask)-feeP(ask),won,ask});break;}}}
      else b=kind===null?live[rk]:runM(te,M,rule);
      const st=stat(b),pr=kind===null?'':paired(te,b,live[rk]);(res[name]??={})[`${f0} ${rk}`]={...st,d:pr};
      line.push(`| ${rk}: n=${st.n} ${st.c??'-'}±${st.se??'-'}${pr?` Δ${pr.perRound}±${pr.se}/rd`:''}`);}
    console.log(line.join(' '));}}
import fs from 'fs';fs.writeFileSync('lab/data/shootout.json',JSON.stringify(res));
