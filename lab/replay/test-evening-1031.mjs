// Oct 31 evening. (A) forward check of 2026-10-31a (latest call 4:00, now live) on rounds since Oct 31 04:00 UTC,
//     and the overpriced-favourite watch. (B) NEW: lead-change / reversal entry, aimed at calls that turn against by 3:00–6:00:
//     when the side priced as favourite at 2:00 (ask ≥ T) has become the underdog (ask < 50) at a later check, buy the NEW
//     favourite at its ask. Also "price surge" entry: buy the side whose ask rose ≥ X¢ since 2:00, priced 50–90¢.
//     Compared with an ordinary favourite bought at the same check and price bucket (is the lead change underpriced?).
//     Rule variants picked on older 75%, scored on newest 25% + quarters. Fee 0.07·P·(1−P).
import {R,feeP,stat,paired} from './sim.mjs';import {et} from './lib.mjs';
const J=JSON.stringify,iso=t=>new Date(t).toISOString().slice(0,16);
const cutI=Math.floor(R.length*.75),tr=R.slice(0,cutI),te=R.slice(cutI),Q=i=>R.slice(Math.floor(R.length*i/4),Math.floor(R.length*(i+1)/4));
console.log(`rounds ${R.length} (${iso(R[0].t)} → ${iso(R.at(-1).t)}), train ${tr.length}, test ${te.length} from ${iso(te[0].t)}`);
const bet=(o,c,ask,s,tag)=>{const won=(o.up===1)===(c===1);return{t:o.t,pnl:(won?100-ask:-ask)-feeP(ask),won,ask,s,tag};};
// ---- A) live rule with cutoff
function live(set,{hrs=1,cut=240}={}){const out=[];for(const o of set){if(hrs&&et(o.t).h<12)continue;
 for(const s of [120,180,240,300]){if(s>cut)break;const a=o.at[s];if(!a||!a.f)continue;const pu=a.pu,c=pu>=.5?1:-1,pr=Math.max(pu,1-pu),ask=c>0?a.ya:a.na;
  if(ask==null||ask<75||ask>90)continue;if(pr*100<ask+feeP(ask)+3)continue;out.push(bet(o,c,ask,s));break;}}return out;}
function fav(set,{hrs=0,cut=300}={}){const out=[];for(const o of set){if(hrs&&et(o.t).h<12)continue;for(const s of [120,180,240,300]){if(s>cut)break;const a=o.at[s];if(!a)continue;
 let c=0,ask;if(a.ya>=75&&a.ya<=90){c=1;ask=a.ya;}else if(a.na>=75&&a.na<=90){c=-1;ask=a.na;}if(!c)continue;out.push(bet(o,c,ask,s));break;}}return out;}
const PROP=Date.UTC(2026,9,31,4,0),LIVEAT=1793462744196,SL=Date.UTC(2026,9,23,22,0);
const F=R.filter(o=>o.t>=PROP),FL=R.filter(o=>o.t>=LIVEAT),S=R.filter(o=>o.t>=SL),B0=R.filter(o=>o.t<SL);
console.log(`\nA) rounds since 31a proposal ${F.length} (live-hours ${F.filter(o=>et(o.t).h>=12).length}); since it went live ${FL.length}`);
for(const[lab,set]of[['since proposal',F],['since Oct 23 22:00',S],['all',R]]){const p=paired(set,live(set,{cut:240}),live(set,{cut:300}));
 console.log(`  live 12–24 ${lab}: 4:00 vs 5:00 ${p.perRound}±${p.se} ¢/round, 4:00 ${J(stat(live(set,{cut:240})))} 5:00 ${J(stat(live(set,{cut:300})))}`);}
console.log('  live 12–24 bets since proposal:',live(F).map(b=>`${iso(b.t)} s${b.s} ${b.ask}¢ ${b.won?'W':'L'}`).join(', ')||'none');
console.log('  fav watch (all hours, cutoff 5:00): before',J(stat(fav(B0))),'since Oct 23',J(stat(fav(S))),'since 31a',J(stat(fav(F))));
// ---- B) lead change
const SS=[180,240,300,360,420,480];
function lead(set,{T=60,cut=360,lo=50,hi=90,agree=0,hrs=0}){const out=[];for(const o of set){if(hrs&&et(o.t).h<12)continue;const a0=o.at[120];if(!a0||a0.ya==null)continue;
 let c0=0;if(a0.ya>=T)c0=1;else if(a0.na>=T)c0=-1;if(!c0)continue;
 for(const s of SS){if(s>cut)break;const a=o.at[s];if(!a||a.ya==null)continue;const old=c0>0?a.ya:a.na,neu=c0>0?a.na:a.ya;
  if(old<50&&neu>=lo&&neu<=hi){if(agree){const pu=a.pu;if(pu==null||(pu>=.5?1:-1)!==-c0)break;}out.push(bet(o,-c0,neu,s,'lead'));break;}}}return out;}
function surge(set,{X=15,cut=360,lo=50,hi=90,hrs=0}){const out=[];for(const o of set){if(hrs&&et(o.t).h<12)continue;const a0=o.at[120];if(!a0||a0.ya==null)continue;
 for(const s of SS){if(s>cut)break;const a=o.at[s];if(!a||a.ya==null)continue;let c=0;
  if(a.ya-a0.ya>=X&&a.ya>=lo&&a.ya<=hi)c=1;else if(a.na-a0.na>=X&&a.na>=lo&&a.na<=hi)c=-1;if(c){out.push(bet(o,c,c>0?a.ya:a.na,s,'surge'));break;}}}return out;}
// baseline: ordinary favourite at each check & 5¢ price bucket (calibration of the market) → expected ¢/ct for a bet with that (s, bucket)
function calib(set){const m={};for(const o of set)for(const s of SS){const a=o.at[s];if(!a||a.ya==null)continue;for(const[c,ask]of[[1,a.ya],[-1,a.na]]){if(ask<50||ask>90)continue;const k=s+':'+Math.floor(ask/5);const b=bet(o,c,ask,s);(m[k]??=[]).push(b.pnl);}}
 return k=>{const v=m[k];return v?v.reduce((x,y)=>x+y,0)/v.length:0;};}
const cal=calib(R);
const excess=b=>{const n=b.length;if(!n)return{n:0};const d=b.map(x=>x.pnl-cal(x.s+':'+Math.floor(x.ask/5)));const m=d.reduce((s,x)=>s+x,0)/n,sd=Math.sqrt(d.reduce((s,x)=>s+(x-m)**2,0)/Math.max(1,n-1));return{ex:+m.toFixed(1),se:+(sd/Math.sqrt(n)).toFixed(1)};};
console.log('\nB) market calibration, any side 50–90¢ at 3:00–8:00, all rounds (¢/ct by check):',SS.map(s=>{const b=[];for(const o of R){const a=o.at[s];if(!a||a.ya==null)continue;for(const[c,ask]of[[1,a.ya],[-1,a.na]])if(ask>=50&&ask<=90)b.push(bet(o,c,ask,s));}return s/60+':00 '+J(stat(b));}).join(' | '));
const rows=[];
for(const T of [55,60,65,70])for(const cut of [240,300,360,480])for(const[lo,hi]of[[50,90],[50,75],[60,90]])for(const agree of [0,1])for(const hrs of [0,1]){const r={T,cut,lo,hi,agree,hrs},f=s=>lead(s,r);rows.push({lab:'lead '+J(r),f});}
for(const X of [10,15,20,30])for(const cut of [240,300,360,480])for(const[lo,hi]of[[50,90],[50,75],[60,90]])for(const hrs of [0,1]){const r={X,cut,lo,hi,hrs},f=s=>surge(s,r);rows.push({lab:'surge '+J(r),f});}
for(const r of rows){r.tr=stat(r.f(tr));r.te=stat(r.f(te));r.all=stat(r.f(R));r.q=[0,1,2,3].map(i=>stat(r.f(Q(i))).c);r.ex=excess(r.f(R));r.exS=stat(r.f(S));}
const show=r=>console.log(`  ${r.lab.padEnd(58)} train ${J(r.tr)} → test ${J(r.te)} | quarters ${r.q.join(' / ')} | all ${J(r.all)} excess vs same check+price ${J(r.ex)} | since Oct23 ${J(r.exS)}`);
console.log('\nB) top 6 by train ¢/ct (train n ≥ 100):');rows.filter(r=>r.tr.n>=100).sort((a,b)=>b.tr.c-a.tr.c).slice(0,6).forEach(show);
console.log('\nB) reference variants:');for(const lab of ['lead {"T":60,"cut":360,"lo":50,"hi":90,"agree":0,"hrs":0}','lead {"T":60,"cut":300,"lo":50,"hi":90,"agree":1,"hrs":0}','lead {"T":65,"cut":480,"lo":50,"hi":90,"agree":0,"hrs":0}','surge {"X":15,"cut":360,"lo":50,"hi":90,"hrs":0}','surge {"X":20,"cut":480,"lo":60,"hi":90,"hrs":0}'])show(rows.find(r=>r.lab===lab));
// distribution of the train-best across all variants on test (multiple-testing check)
const tb=rows.filter(r=>r.tr.n>=100).map(r=>r.te.c).filter(x=>x!=null).sort((a,b)=>a-b);console.log(`\n  test ¢/ct over all ${tb.length} variants: min ${tb[0]} median ${tb[tb.length>>1]} max ${tb.at(-1)}`);
// added on top of the live rule (12–24): live bets + lead-change bets in rounds the live rule skipped
const best=rows.filter(r=>r.tr.n>=100).sort((a,b)=>b.tr.c-a.tr.c)[0];
for(const[lab,set]of[['train',tr],['test',te],['since Oct 23',S]]){const L=live(set),Lt=new Set(L.map(b=>b.t)),add=best.f(set).filter(b=>!Lt.has(b.t)&&et(b.t).h>=12);
 const p=paired(set,L.concat(add),L);console.log(`  live + train-best (12–24) ${lab}: added ${J(stat(add))}, paired ${p.perRound}±${p.se} ¢/round`);}
