// Morning Oct 29: two untested information families, walk-forward (choose on older 75%, score on newest 25%, halves).
// (A) Coinbase premium: log(Coinbase BTC-USD / Binance BTCUSDT spot). dev = premium minus its 15-min average, d1/d5 = change over 1/5 min,
//     scaled by BTC vol over the time left (so 1.0 = a move the size of the remaining expected move). Needs lab/data/bspot.json (lab/xasset/fetchspot.mjs).
// (B) Round-number levels: how many $250/$500/$1000 multiples lie between spot and strike (levels the price must cross back to flip the favourite),
//     and whether the strike sits within $50 of a $500 multiple.
import fs from 'fs';import {R,feeP,stat,paired} from './sim.mjs';import {et,fitLR,brainP,sigm} from './lib.mjs';
const M=JSON.parse(fs.readFileSync('lab/data/candles.json')),S=JSON.parse(fs.readFileSync('lab/data/bspot.json'));const cb=t=>M[t]?.[4],J=JSON.stringify;
const spot=(o,s)=>cb(o.t+s*1000-60000);
function prem(o,s){const m=o.t+s*1000-60000,P=t=>(cb(t)&&S[t])?Math.log(cb(t)/S[t]):null,p=P(m);if(p==null)return null;
 let v=0,n=0;for(let i=1;i<=60;i++){const x=cb(m-i*60000),y=cb(m-(i+1)*60000);if(x&&y){v+=Math.log(x/y)**2;n++;}}if(!n)return null;
 let pa=0,pn=0;for(let i=1;i<=15;i++){const q=P(m-i*60000);if(q!=null){pa+=q;pn++;}}const sc=Math.sqrt(v/n)*Math.sqrt((900-s)/60),p1=P(m-60000),p5=P(m-300000);
 return{dev:pn>=10?(p-pa/pn)/sc:null,d1:p1!=null?(p-p1)/sc:null,d5:p5!=null?(p-p5)/sc:null};}
function levels(o,s,step){const x=spot(o,s);if(!x)return null;const a=Math.min(x,o.strike),b=Math.max(x,o.strike);return Math.floor(b/step)-Math.floor(a/step);}
const nearK=o=>{const r=o.strike%500;return Math.min(r,500-r)<=50?1:0;};
// feature value signed toward the favourite side c (+1 UP / -1 DOWN)
const FEAT={
 'prem dev':(o,s,c)=>{const p=prem(o,s);return p&&p.dev!=null?p.dev*c:null;},
 'prem d1':(o,s,c)=>{const p=prem(o,s);return p&&p.d1!=null?p.d1*c:null;},
 'prem d5':(o,s,c)=>{const p=prem(o,s);return p&&p.d5!=null?p.d5*c:null;},
 '$250 levels':(o,s)=>levels(o,s,250),'$500 levels':(o,s)=>levels(o,s,500),'$1000 levels':(o,s)=>levels(o,s,1000),'strike near $500':o=>nearK(o)};
const cut=Math.floor(R.length*.75),tr=R.slice(0,cut),te=R.slice(cut),H=[R.slice(0,R.length>>1),R.slice(R.length>>1)];
console.log(`rounds ${R.length} (${new Date(R[0].t).toISOString().slice(0,10)} → ${new Date(R.at(-1).t).toISOString()}), train ${tr.length}, test ${te.length}`);
// --- 1. information test: does the feature predict outcome beyond Kalshi's mid? (LR on [logit mid, x], fit train, score test)
const mid=a=>{if(a.ya==null||a.na==null)return null;const m=(a.ya+100-a.na)/200;return Math.min(.98,Math.max(.02,m));};
console.log('\n1) log-loss on top of Kalshi mid (test, fit on train); feature signed toward UP');
for(const s of [120,180,240,300])for(const[k,f]of Object.entries(FEAT)){if(k.includes('levels')||k.includes('near'))continue;
 const rows=set=>set.map(o=>{const a=o.at[s];if(!a)return null;const m=mid(a);const x=f(o,s,1);return m!=null&&x!=null?{z:Math.log(m/(1-m)),x:Math.max(-3,Math.min(3,x)),y:o.up}:null;}).filter(Boolean);
 const A=rows(tr),B=rows(te);if(A.length<200||B.length<100)continue;
 const m0=fitLR(A.map(r=>[r.z]),A.map(r=>r.y)),m1=fitLR(A.map(r=>[r.z,r.x]),A.map(r=>r.y));
 const ll=(m,X)=>{const d=B.map((r,i)=>{const p=brainP(m,X(r));return -(r.y?Math.log(p):Math.log(1-p));});return d;};
 const d0=ll(m0,r=>[r.z]),d1=ll(m1,r=>[r.z,r.x]),df=d0.map((v,i)=>v-d1[i]),mn=df.reduce((a,b)=>a+b,0)/df.length,se=Math.sqrt(df.reduce((a,b)=>a+(b-mn)**2,0)/(df.length-1)/df.length);
 // correlation of x with (y - mid)
 const res=B.map(r=>r.y-sigm(r.z)),mx=B.reduce((a,r)=>a+r.x,0)/B.length,mr=res.reduce((a,b)=>a+b,0)/B.length;let sxy=0,sxx=0,syy=0;B.forEach((r,i)=>{sxy+=(r.x-mx)*(res[i]-mr);sxx+=(r.x-mx)**2;syy+=(res[i]-mr)**2;});
 console.log(`  @${s/60}:00 ${k.padEnd(9)} n ${A.length}/${B.length} ll gain ${mn.toFixed(4)}±${se.toFixed(4)} corr ${(sxy/Math.sqrt(sxx*syy)).toFixed(3)} (2SE ${(2/Math.sqrt(B.length)).toFixed(3)})`);}
// --- 2. favourite 75–90 at first 2:00–5:00 check in band (no gate) and live rule, with skip rule chosen on train
function go(set,{hrs,live,key,dir,k}){const out=[];for(const o of set){if(hrs&&et(o.t).h<12)continue;
 for(const s of [120,180,240,300]){const a=o.at[s];if(!a)continue;let c=0,ask;
  if(live){if(!a.f)continue;const pu=a.pu,cl=pu>=.5?1:-1,pr=Math.max(pu,1-pu);ask=cl>0?a.ya:a.na;if(ask==null||ask<75||ask>90)continue;if(pr*100<ask+feeP(ask)+3)continue;c=cl;}
  else{if(a.ya>=75&&a.ya<=90){c=1;ask=a.ya;}else if(a.na>=75&&a.na<=90){c=-1;ask=a.na;}if(!c)continue;}
  if(key){const v=FEAT[key](o,s,c);if(v!=null&&dir*v>k)break;}
  const won=(o.up===1)===(c===1);out.push({t:o.t,pnl:(won?100-ask:-ask)-feeP(ask),won,ask,s});break;}}return out;}
const KS={'prem dev':[0,.05,.1,.2,.3],'prem d1':[0,.05,.1,.2],'prem d5':[0,.05,.1,.2,.3],'$250 levels':[-.5,.5,1.5,2.5],'$500 levels':[-.5,.5,1.5],'$1000 levels':[-.5,.5],'strike near $500':[.5]};
const res={};
for(const[nm,base]of[['fav no-gate all hours',{}],['fav no-gate 12–24',{hrs:1}],['live rule 12–24',{hrs:1,live:1}],['live rule all hours',{live:1}]]){
 const g=s=>go(s,base);console.log(`\n2) ${nm}: base train ${J(stat(g(tr)))} test ${J(stat(g(te)))}`);const rows=[];
 for(const[key,ks]of Object.entries(KS))for(const dir of [1,-1])for(const k of ks){const r={...base,key,dir,k},f=s=>go(s,r);
  const row={lab:`skip if ${key} ${dir>0?'>':'<'} ${dir>0?k:-k}`,ptr:paired(tr,f(tr),g(tr)),pte:paired(te,f(te),g(te)),ste:stat(f(te)),skipTe:g(te).length-f(te).length,h:H.map(h=>paired(h,f(h),g(h)).perRound)};rows.push(row);}
 rows.sort((a,b)=>b.ptr.perRound-a.ptr.perRound);for(const r of rows.slice(0,6))console.log(`  ${r.lab.padEnd(28)} train ${r.ptr.perRound}±${r.ptr.se} test ${r.pte.perRound}±${r.pte.se} (skips ${r.skipTe} of test bets; test ${J(r.ste)}) halves ${r.h.join(' / ')}`);
 res[nm]=rows[0];console.log(`  TRAIN-BEST ${rows[0].lab}: test ${rows[0].pte.perRound}±${rows[0].pte.se}, ${rows[0].ste.n} test bets`);}
// --- 3. descriptive: favourite all hours by $500 levels between spot and strike, and by premium dev tercile (signed with fav)
const all=go(R,{});const byS=new Map(all.map(x=>[x.t,x]));
const grp=(fn)=>{const G={};for(const o of R){const b=byS.get(o.t);if(!b)continue;const c=(o.up===1)===b.won?1:-1;const v=fn(o,b.s,c);if(v==null)continue;(G[v]??=[]).push(b);}return Object.fromEntries(Object.entries(G).map(([k,v])=>[k,stat(v)]));};
console.log('\n3) fav all hours by $500 levels crossed back to flip:',J(grp((o,s)=>Math.min(3,levels(o,s,500)))));
console.log('   by $1000 levels:',J(grp((o,s)=>Math.min(2,levels(o,s,1000)))));
console.log('   by strike near $500:',J(grp(o=>nearK(o))));
console.log('   by premium dev (with fav) bucket:',J(grp((o,s,c)=>{const v=FEAT['prem dev'](o,s,c);return v==null?null:v<-.1?'against>.1':v>.1?'with>.1':'flat';})));
console.log('   by premium d5 (with fav) bucket:',J(grp((o,s,c)=>{const v=FEAT['prem d5'](o,s,c);return v==null?null:v<-.1?'against>.1':v>.1?'with>.1':'flat';})));
// --- 4. follow-up (from the table in 3, so partly hindsight): skip when the premium moved a lot over 5 min in EITHER direction, k chosen on train
FEAT['|prem d5|']=(o,s,c)=>{const p=prem(o,s);return p&&p.d5!=null?Math.abs(p.d5):null;};
const Qs=i=>R.slice(Math.floor(R.length*i/4),Math.floor(R.length*(i+1)/4));
for(const[nm,base]of[['fav no-gate all hours',{}],['fav no-gate 12–24',{hrs:1}],['live rule 12–24',{hrs:1,live:1}],['live rule all hours',{live:1}]]){const g=s=>go(s,base);const rows=[];
 for(const k of [.05,.1,.15,.2,.3]){const r={...base,key:'|prem d5|',dir:1,k},f=s=>go(s,r);rows.push({k,ptr:paired(tr,f(tr),g(tr)),pte:paired(te,f(te),g(te)),ste:stat(f(te)),q:[0,1,2,3].map(i=>paired(Qs(i),f(Qs(i)),g(Qs(i))).perRound)});}
 for(const r of rows)console.log(`4) ${nm} skip if |d5|>${r.k}: train ${r.ptr.perRound}±${r.ptr.se} test ${r.pte.perRound}±${r.pte.se} test ${J(r.ste)} quarters ${r.q.join(' / ')}`);
 const b=rows.sort((a,b)=>b.ptr.perRound-a.ptr.perRound)[0];console.log(`   TRAIN-BEST k=${b.k}: test ${b.pte.perRound}±${b.pte.se} (${b.ste.n} bets)`);}
