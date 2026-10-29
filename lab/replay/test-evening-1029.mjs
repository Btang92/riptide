// Evening Oct 29: two untested information families, walk-forward (choose on older 75%, score on newest 25%, halves/quarters).
// (A) Volume surge: Coinbase 1-min volume over the last 1 / 3 / 5 closed minutes vs the trailing 60-min average (ratio, log2).
//     Also signed: log2 ratio(3m) × sign of the last-3-min move relative to the favourite (+ = heavy volume WITH the favourite).
// (B) Range position / breakout: where spot sits in the trailing 4h and 24h high–low range (0 = at the low, 1 = at the high),
//     signed toward the favourite (1 = at the favourite's extreme); and "fresh extreme" = last 5 min printed a new 4h high/low in the favourite's direction.
// Aimed at calls that turn against by 3:00–5:00 (fake breakouts / volume climaxes reversing).
import fs from 'fs';import {R,feeP,stat,paired} from './sim.mjs';import {et,fitLR,brainP,sigm} from './lib.mjs';
const M=JSON.parse(fs.readFileSync('lab/data/candles.json')),J=JSON.stringify;
const C=t=>M[t];const cl=t=>M[t]?.[4];
const last=(o,s)=>o.t+s*1000-60000; // last closed minute start at checkpoint s
function vol(o,s,k){const m=last(o,s);let a=0,n=0;for(let i=0;i<k;i++){const c=C(m-i*60000);if(c){a+=c[5];n++;}}let b=0,bn=0;for(let i=k;i<k+60;i++){const c=C(m-i*60000);if(c){b+=c[5];bn++;}}
 if(!n||bn<40||!b)return null;return Math.log2((a/n)/(b/bn));}
function rangePos(o,s,mins){const m=last(o,s),x=cl(m);if(!x)return null;let hi=-1e18,lo=1e18,n=0;for(let i=0;i<mins;i++){const c=C(m-i*60000);if(c){hi=Math.max(hi,c[2]);lo=Math.min(lo,c[1]);n++;}}
 if(n<mins*.8||hi<=lo)return null;return(x-lo)/(hi-lo);}
function freshExt(o,s){const m=last(o,s);let hi=-1e18,lo=1e18,n=0;for(let i=5;i<240;i++){const c=C(m-i*60000);if(c){hi=Math.max(hi,c[2]);lo=Math.min(lo,c[1]);n++;}}if(n<190)return null;
 let h5=-1e18,l5=1e18;for(let i=0;i<5;i++){const c=C(m-i*60000);if(c){h5=Math.max(h5,c[2]);l5=Math.min(l5,c[1]);}}return(h5>hi?1:0)-(l5<lo?1:0);}
const mv3=(o,s)=>{const m=last(o,s),a=cl(m),b=cl(m-180000);return a&&b?Math.sign(a-b):null;};
const sgnPos=(p,c)=>p==null?null:(c>0?p:1-p);
const FEAT={
 'vol1':(o,s)=>vol(o,s,1),'vol3':(o,s)=>vol(o,s,3),'vol5':(o,s)=>vol(o,s,5),
 'vol3 signed':(o,s,c)=>{const v=vol(o,s,3),d=mv3(o,s);return v==null||d==null?null:v*d*c;},
 'pos4h':(o,s,c)=>sgnPos(rangePos(o,s,240),c),'pos24h':(o,s,c)=>sgnPos(rangePos(o,s,1440),c),
 'fresh4h':(o,s,c)=>{const f=freshExt(o,s);return f==null?null:f*c;}};
const cut=Math.floor(R.length*.75),tr=R.slice(0,cut),te=R.slice(cut),Qs=i=>R.slice(Math.floor(R.length*i/4),Math.floor(R.length*(i+1)/4));
console.log(`rounds ${R.length} (${new Date(R[0].t).toISOString().slice(0,10)} → ${new Date(R.at(-1).t).toISOString()}), train ${tr.length}, test ${te.length}`);
const mid=a=>{if(a.ya==null||a.na==null)return null;const m=(a.ya+100-a.na)/200;return Math.min(.98,Math.max(.02,m));};
console.log('\n1) log-loss on top of Kalshi mid (test, fit on train); feature signed toward UP (c=+1)');
for(const s of [120,180,240,300])for(const[k,f]of Object.entries(FEAT)){
 const rows=set=>set.map(o=>{const a=o.at[s];if(!a)return null;const m=mid(a);const x=f(o,s,1);return m!=null&&x!=null?{z:Math.log(m/(1-m)),x:Math.max(-3,Math.min(3,k.startsWith('pos')?x-.5:x)),y:o.up}:null;}).filter(Boolean);
 const A=rows(tr),B=rows(te);if(A.length<200||B.length<100)continue;
 // vol (unsigned) can only matter through interaction with direction: use x*z as the extra input for unsigned ones
 const un=k==='vol1'||k==='vol3'||k==='vol5';const X=r=>un?[r.z,r.x*r.z]:[r.z,r.x];
 const m0=fitLR(A.map(r=>[r.z]),A.map(r=>r.y)),m1=fitLR(A.map(X),A.map(r=>r.y));
 const d=B.map(r=>{const p0=brainP(m0,[r.z]),p1=brainP(m1,X(r));return (r.y?-Math.log(p0):-Math.log(1-p0))-(r.y?-Math.log(p1):-Math.log(1-p1));});
 const mn=d.reduce((a,b)=>a+b,0)/d.length,se=Math.sqrt(d.reduce((a,b)=>a+(b-mn)**2,0)/(d.length-1)/d.length);
 console.log(`  @${s/60}:00 ${k.padEnd(12)} n ${A.length}/${B.length} ll gain ${mn.toFixed(4)}±${se.toFixed(4)}`);}
function go(set,{hrs,live,key,dir,k}){const out=[];for(const o of set){if(hrs&&et(o.t).h<12)continue;
 for(const s of [120,180,240,300]){const a=o.at[s];if(!a)continue;let c=0,ask;
  if(live){if(!a.f)continue;const pu=a.pu,cl=pu>=.5?1:-1,pr=Math.max(pu,1-pu);ask=cl>0?a.ya:a.na;if(ask==null||ask<75||ask>90)continue;if(pr*100<ask+feeP(ask)+3)continue;c=cl;}
  else{if(a.ya>=75&&a.ya<=90){c=1;ask=a.ya;}else if(a.na>=75&&a.na<=90){c=-1;ask=a.na;}if(!c)continue;}
  if(key){const v=FEAT[key](o,s,c);if(v!=null&&dir*v>k)break;}
  const won=(o.up===1)===(c===1);out.push({t:o.t,pnl:(won?100-ask:-ask)-feeP(ask),won,ask,s});break;}}return out;}
const KS={'vol1':[-1,-.5,0,.5,1,1.5,2],'vol3':[-1,-.5,0,.5,1,1.5],'vol5':[-1,-.5,0,.5,1,1.5],'vol3 signed':[-1.5,-1,-.5,0,.5,1,1.5],
 'pos4h':[.1,.2,.3,.7,.8,.9],'pos24h':[.1,.2,.3,.7,.8,.9],'fresh4h':[-.5,.5]};
const summary={};
for(const[nm,base]of[['fav no-gate all hours',{}],['fav no-gate 12–24',{hrs:1}],['live rule 12–24',{hrs:1,live:1}],['live rule all hours',{live:1}]]){
 const g=s=>go(s,base);console.log(`\n2) ${nm}: base train ${J(stat(g(tr)))} test ${J(stat(g(te)))}`);const rows=[];
 for(const[key,ks]of Object.entries(KS))for(const dir of [1,-1])for(const k of ks){const r={...base,key,dir,k},f=s=>go(s,r);
  rows.push({lab:`skip if ${key} ${dir>0?'>':'<'} ${dir>0?k:-k}`,ptr:paired(tr,f(tr),g(tr)),pte:paired(te,f(te),g(te)),ste:stat(f(te)),skipTe:g(te).length-f(te).length,q:[0,1,2,3].map(i=>paired(Qs(i),f(Qs(i)),g(Qs(i))).perRound)});}
 rows.sort((a,b)=>b.ptr.perRound-a.ptr.perRound);for(const r of rows.slice(0,6))console.log(`  ${r.lab.padEnd(26)} train ${r.ptr.perRound}±${r.ptr.se} test ${r.pte.perRound}±${r.pte.se} (skips ${r.skipTe}; test ${J(r.ste)}) quarters ${r.q.join(' / ')}`);
 summary[nm]=rows[0];console.log(`  TRAIN-BEST ${rows[0].lab}: test ${rows[0].pte.perRound}±${rows[0].pte.se}, ${rows[0].ste.n} test bets`);}
const all=go(R,{});const byS=new Map(all.map(x=>[x.t,x]));
const grp=fn=>{const G={};for(const o of R){const b=byS.get(o.t);if(!b)continue;const c=(o.up===1)===b.won?1:-1;const v=fn(o,b.s,c);if(v==null)continue;(G[v]??=[]).push(b);}return Object.fromEntries(Object.entries(G).sort().map(([k,v])=>[k,stat(v)]));};
console.log('\n3) fav all hours, descriptive');
console.log('  vol3 ratio:',J(grp((o,s)=>{const v=vol(o,s,3);return v==null?null:v<-.5?'a quiet':v<.5?'b normal':v<1.5?'c high':'d surge';})));
console.log('  vol3 signed:',J(grp((o,s,c)=>{const v=FEAT['vol3 signed'](o,s,c);return v==null?null:v<-1?'a heavy against':v<0?'b against':v<1?'c with':'d heavy with';})));
console.log('  pos4h (fav):',J(grp((o,s,c)=>{const v=FEAT.pos4h(o,s,c);return v==null?null:'q'+Math.min(4,Math.floor(v*5));})));
console.log('  pos24h (fav):',J(grp((o,s,c)=>{const v=FEAT.pos24h(o,s,c);return v==null?null:'q'+Math.min(4,Math.floor(v*5));})));
console.log('  fresh4h (fav):',J(grp((o,s,c)=>FEAT.fresh4h(o,s,c))));
