// Nov 1. (A) forward check of 2026-10-31a (latest call 4:00) + overpriced-favourite watch.
//  (B) NEW: strike basis. Kalshi's strike is the BRTI price at the round open; RIPTIDE measures distance with Coinbase spot.
//      basis = log(Coinbase price at the open / strike). If Coinbase sits above/below BRTI, the model's distance (and its "edge"
//      over the ask) is partly a price-source error. Tests: (1) size and persistence of the basis; (2) does the basis carry
//      information beyond Kalshi's price (log-loss, train/test); (3) basis-corrected read under the live bet rule (paired vs live);
//      (4) skip live bets whose edge is mostly basis. Fee 0.07·P·(1−P). Train older 75% / test newest 25% / quarters.
import fs from 'fs';import {R,feeP,stat,paired} from './sim.mjs';import {et,pUp,fitLR,brainP} from './lib.mjs';
const M=JSON.parse(fs.readFileSync('lab/data/candles.json'));
const J=JSON.stringify,iso=t=>new Date(t).toISOString().slice(0,16);
const cutI=Math.floor(R.length*.75),tr=R.slice(0,cutI),te=R.slice(cutI),Q=i=>R.slice(Math.floor(R.length*i/4),Math.floor(R.length*(i+1)/4));
console.log(`rounds ${R.length} (${iso(R[0].t)} → ${iso(R.at(-1).t)}), train ${tr.length}, test ${te.length} from ${iso(te[0].t)}`);
const bet=(o,c,ask,s)=>{const won=(o.up===1)===(c===1);return{t:o.t,pnl:(won?100-ask:-ask)-feeP(ask),won,ask,s};};
const PU=(o,s,a)=>a.pu;
function live(set,{hrs=1,cut=240,pf=PU,skip=null}={}){const out=[];for(const o of set){if(hrs&&et(o.t).h<12)continue;
 for(const s of [120,180,240,300]){if(s>cut)break;const a=o.at[s];if(!a||!a.f)continue;const pu=pf(o,s,a);if(pu==null)continue;const c=pu>=.5?1:-1,pr=Math.max(pu,1-pu),ask=c>0?a.ya:a.na;
  if(ask==null||ask<75||ask>90)continue;if(pr*100<ask+feeP(ask)+3)continue;if(skip&&skip(o,s,a,c))break;out.push(bet(o,c,ask,s));break;}}return out;}
function fav(set,{hrs=0,cut=300}={}){const out=[];for(const o of set){if(hrs&&et(o.t).h<12)continue;for(const s of [120,180,240,300]){if(s>cut)break;const a=o.at[s];if(!a)continue;
 let c=0,ask;if(a.ya>=75&&a.ya<=90){c=1;ask=a.ya;}else if(a.na>=75&&a.na<=90){c=-1;ask=a.na;}if(!c)continue;out.push(bet(o,c,ask,s));break;}}return out;}
// ---- A
const PROP=Date.UTC(2026,9,31,4,0),LIVEAT=1793462744196,SL=Date.UTC(2026,9,23,22,0);
const F=R.filter(o=>o.t>=PROP),FL=R.filter(o=>o.t>=LIVEAT),S=R.filter(o=>o.t>=SL),B0=R.filter(o=>o.t<SL);
console.log(`\nA) rounds since 31a proposal ${F.length} (live-hours ${F.filter(o=>et(o.t).h>=12).length}); since live ${FL.length}`);
for(const[lab,set]of[['since proposal',F],['since Oct 23 22:00',S],['all',R]]){const p=paired(set,live(set,{cut:240}),live(set,{cut:300}));
 console.log(`  live 12–24 ${lab}: 4:00 vs 5:00 ${p.perRound}±${p.se} ¢/round, 4:00 ${J(stat(live(set,{cut:240})))} 5:00 ${J(stat(live(set,{cut:300})))}`);}
console.log('  live bets since proposal:',live(F,{cut:300}).map(b=>`${iso(b.t)} s${b.s} ${b.ask}¢ ${b.won?'W':'L'}`).join(', ')||'none');
console.log('  fav watch (all hours, 2:00–5:00): before',J(stat(fav(B0))),'since Oct 23',J(stat(fav(S))),'since 31a',J(stat(fav(F))));
console.log('  fav watch 2:00–4:00: since Oct 23',J(stat(fav(S,{cut:240}))),'since 31a',J(stat(fav(F,{cut:240}))));
// ---- B) basis
const cand=t=>M[t];
function ctx(o){ // price at the open: close of the minute ending at t (candle starting t-60s) and that minute's typical price (≈60 s average)
 const c=cand(o.t-60000);if(!c)return null;return{close:c[4],avg:(c[1]+c[2]+c[3]+c[4])/4};}
function sigAt(o,s){const prev=[];for(let i=60;i>=0;i--){const x=M[o.t+s*1000-60000-i*60000];if(x)prev.push(x[4]);}if(prev.length<40)return null;
 let v=0;for(let i=1;i<prev.length;i++){const z=Math.log(prev[i]/prev[i-1]);v+=z*z;}return{sg:Math.sqrt(v/(prev.length-1)/60),spot:prev.at(-1)};}
const B={};let nb=0;for(const o of R){const c=ctx(o);if(!c)continue;const g=sigAt(o,0);// vol known at the open
 const x={bc:Math.log(c.close/o.strike),ba:Math.log(c.avg/o.strike)};if(g){x.bcv=x.bc/(g.sg*Math.sqrt(900));x.bd=c.close-o.strike;}B[o.t]=x;nb++;}
const arr=R.filter(o=>B[o.t]&&B[o.t].bd!=null);
const q=(a,p)=>{const s=[...a].sort((x,y)=>x-y);return s[Math.floor(p*(s.length-1))];};
const bd=arr.map(o=>B[o.t].bd),bdv=arr.map(o=>B[o.t].bcv);
console.log(`\nB1) basis (Coinbase close at open − strike, $) n=${arr.length}: p5 ${q(bd,.05).toFixed(1)} p25 ${q(bd,.25).toFixed(1)} median ${q(bd,.5).toFixed(1)} p75 ${q(bd,.75).toFixed(1)} p95 ${q(bd,.95).toFixed(1)}; in 15-min vol units median |b| ${q(bdv.map(Math.abs),.5).toFixed(3)} p90 ${q(bdv.map(Math.abs),.9).toFixed(3)}`);
// persistence: correlation of basis with the previous round's basis, and a trailing 8-round mean
const corr=(x,y)=>{const n=x.length,mx=x.reduce((a,b)=>a+b,0)/n,my=y.reduce((a,b)=>a+b,0)/n;let sxy=0,sx=0,sy=0;for(let i=0;i<n;i++){sxy+=(x[i]-mx)*(y[i]-my);sx+=(x[i]-mx)**2;sy+=(y[i]-my)**2;}return sxy/Math.sqrt(sx*sy);};
{const a=[],b=[],c=[];for(let i=8;i<arr.length;i++){if(arr[i].t-arr[i-1].t!==900000)continue;a.push(B[arr[i].t].bd);b.push(B[arr[i-1].t].bd);let m=0;for(let k=1;k<=8;k++)m+=B[arr[i-k].t].bd/8;c.push(m);}
 console.log(`   persistence: corr with previous round ${corr(a,b).toFixed(3)} (n ${a.length}), with trailing-8 mean ${corr(a,c).toFixed(3)}; by week median $:`,
  [...new Set(arr.map(o=>Math.floor((o.t-arr[0].t)/(7*864e5))))].map(w=>q(arr.filter(o=>Math.floor((o.t-arr[0].t)/(7*864e5))===w).map(o=>B[o.t].bd),.5).toFixed(1)).join(' '));}
// trailing persistent part (known before the open): mean basis over previous 8 rounds
const trail={};for(let i=0;i<arr.length;i++){let m=0,n=0;for(let k=1;k<=8&&i-k>=0;k++){if(arr[i].t-arr[i-k].t>8*900000*1.5)break;m+=B[arr[i-k].t].bd;n++;}trail[arr[i].t]=n>=4?m/n:0;}
// B2) information beyond Kalshi price: LR on logit(mid) + basis(vol units) at each check
const lg=p=>Math.log(p/(1-p));
function rowsAt(set,s,withB){const X=[],y=[];for(const o of set){const a=o.at[s],b=B[o.t];if(!a||a.ya==null||!b||b.bcv==null)continue;const mid=Math.min(.98,Math.max(.02,(a.ya+100-a.na)/200));
 X.push(withB?[lg(mid),b.bcv]:[lg(mid)]);y.push(o.up);}return{X,y};}
const ll=(m,{X,y})=>{let s=0;const d=[];X.forEach((x,i)=>{const p=brainP(m,x);const l=-(y[i]?Math.log(p):Math.log(1-p));s+=l;d.push(l);});return{ll:s/X.length,d};};
console.log('\nB2) log-loss on test, Kalshi mid alone vs + basis (vol units):');
for(const s of [120,180,240,300]){const a0=rowsAt(tr,s,0),a1=rowsAt(tr,s,1),t0=rowsAt(te,s,0),t1=rowsAt(te,s,1);const m0=fitLR(a0.X,a0.y),m1=fitLR(a1.X,a1.y);
 const L0=ll(m0,t0),L1=ll(m1,t1);const d=L0.d.map((v,i)=>v-L1.d[i]),md=d.reduce((a,b)=>a+b,0)/d.length,sd=Math.sqrt(d.reduce((a,b)=>a+(b-md)**2,0)/(d.length-1))/Math.sqrt(d.length);
 console.log(`  ${s/60}:00 n ${t0.X.length}: ${L0.ll.toFixed(4)} → ${L1.ll.toFixed(4)} (gain ${md.toFixed(4)}±${sd.toFixed(4)}), basis weight ${m1.w[2].toFixed(3)}`);}
// B3) basis-corrected read: spot shifted by −basis (full, trailing-8 persistent part, half)
function pfCorr(mode){return(o,s,a)=>{const b=B[o.t];if(!b||b.bd==null)return a.pu;const g=sigAt(o,s);if(!g)return a.pu;
 const shift=mode==='full'?b.bd:mode==='half'?b.bd/2:trail[o.t]??0;return pUp(g.spot-shift,o.strike,900-s,g.sg);};}
// edge-mostly-basis skip: skip if the uncorrected edge disappears after correcting
const skipB=(o,s,a,c)=>{const pu=pfCorr('full')(o,s,a),pr=c>0?pu:1-pu,ask=c>0?a.ya:a.na;return pr*100<ask+feeP(ask)+3;};
console.log('\nB3) live rule (75–90¢, read ≥ ask+fee+3, cutoff 4:00) — corrected reads, paired vs live read:');
const variants=[['full basis correction',{pf:pfCorr('full')}],['half basis correction',{pf:pfCorr('half')}],['trailing-8 basis correction',{pf:pfCorr('trail')}],['skip if edge vanishes after correction',{skip:skipB}]];
for(const hrs of [1,0])for(const[lab,v]of variants){const o={...v,hrs};const L=s=>live(s,{hrs}),V=s=>live(s,o);
 const pt=paired(tr,V(tr),L(tr)),pe=paired(te,V(te),L(te)),pq=[0,1,2,3].map(i=>{const s=Q(i);return paired(s,V(s),L(s)).perRound;});
 console.log(`  ${hrs?'12–24':'all hrs'} ${lab.padEnd(40)} train ${pt.perRound}±${pt.se} test ${pe.perRound}±${pe.se} quarters ${pq.join(' / ')} | test bets ${J(stat(V(te)))} vs live ${J(stat(L(te)))}`);}
// B4) favourite in band by basis direction relative to the bet side (does a basis that flatters the favourite matter?)
console.log('\nB4) favourite 75–90¢ (all hours, 2:00–4:00) by basis toward the favourite side ($):');
const fb=fav(R,{cut:240}).filter(b=>B[b.t]&&B[b.t].bd!=null).map(b=>{const o=R.find(x=>x.t===b.t);const a=o.at[b.s];const c=a.ya===b.ask&&a.ya>=75?1:-1;return{...b,tb:c*B[b.t].bd};});
for(const[lab,f]of[['basis against fav < −20',x=>x.tb<-20],['−20..−5',x=>x.tb>=-20&&x.tb<-5],['−5..5',x=>x.tb>=-5&&x.tb<=5],['5..20',x=>x.tb>5&&x.tb<=20],['> 20',x=>x.tb>20]]){
 const all=fb.filter(f),t1=all.filter(x=>x.t<te[0].t),t2=all.filter(x=>x.t>=te[0].t);console.log(`  ${lab.padEnd(26)} all ${J(stat(all))} train ${J(stat(t1))} test ${J(stat(t2))}`);}
