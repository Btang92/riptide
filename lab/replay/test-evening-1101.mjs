// Nov 1 evening. (A) forward check of 2026-10-31a (latest call 4:00) + favourite watch.
//  (B) NEW for BTC: "high favourite" add-on. When the live rule makes no bet, buy the Kalshi favourite if it is priced
//      in a high band (e.g. 91–96¢) at the first 2:00–4:00 check. Aimed at which rounds get bet / price paid; these are the
//      rounds where late flips are the only way to lose. Variants chosen on the older 75%, scored on the newest 25% + quarters.
//      Fee 0.07·P·(1−P) (plus a per-order cent-rounding sensitivity check). Paired ¢/round vs live.
import {R,feeP,stat,paired} from './sim.mjs';import {et} from './lib.mjs';
const J=JSON.stringify,iso=t=>new Date(t).toISOString().slice(0,16);
const cutI=Math.floor(R.length*.75),tr=R.slice(0,cutI),te=R.slice(cutI),Q=i=>R.slice(Math.floor(R.length*i/4),Math.floor(R.length*(i+1)/4));
console.log(`rounds ${R.length} (${iso(R[0].t)} → ${iso(R.at(-1).t)}), train ${tr.length}, test ${te.length} from ${iso(te[0].t)}`);
const feeR=(a,n)=>Math.ceil(0.07*n*a/100*(100-a)/100*100-1e-9)/n; // Kalshi rounds the order fee up to the cent
let FEE=feeP;
const bet=(o,c,ask,s,kind)=>{const won=(o.up===1)===(c===1);return{t:o.t,pnl:(won?100-ask:-ask)-FEE(ask),won,ask,s,kind};};
function liveOne(o,{hrs=1,cut=240}={}){if(hrs&&et(o.t).h<12)return null;
 for(const s of [120,180,240,300]){if(s>cut)break;const a=o.at[s];if(!a||!a.f)continue;const pu=a.pu,c=pu>=.5?1:-1,pr=Math.max(pu,1-pu),ask=c>0?a.ya:a.na;
  if(ask==null||ask<75||ask>90)continue;if(pr*100<ask+FEE(ask)+3)continue;return bet(o,c,ask,s,'live');}return null;}
const live=(set,opt)=>set.map(o=>liveOne(o,opt)).filter(Boolean);
// high favourite: first check (2:00..cut) where either side is priced in (lo,hi]; stop if the favourite is already above hi
function hiOne(o,{lo=90,hi=96,cut=240,hrs=0,gate=null}={}){if(hrs&&et(o.t).h<12)return null;
 for(const s of [120,180,240,300]){if(s>cut)break;const a=o.at[s];if(!a||a.ya==null||a.na==null)continue;
  if(a.ya>hi||a.na>hi)return null;let c=0,ask;if(a.ya>lo&&a.ya<=hi){c=1;ask=a.ya;}else if(a.na>lo&&a.na<=hi){c=-1;ask=a.na;}
  if(!c)continue;if(gate&&a.pu!=null){const pr=c>0?a.pu:1-a.pu;if(pr*100<ask+FEE(ask)+gate)return null;}return bet(o,c,ask,s,'hi');}return null;}
const hiAll=(set,opt)=>set.map(o=>hiOne(o,opt)).filter(Boolean);
const combo=(set,opt)=>set.map(o=>liveOne(o)||hiOne(o,opt)).filter(Boolean);
// ---- A
const PROP=Date.UTC(2026,9,31,4,0),LIVEAT=1793462744196,SL=Date.UTC(2026,9,23,22,0),MORN=Date.UTC(2026,10,1,11,15);
const F=R.filter(o=>o.t>=PROP),S=R.filter(o=>o.t>=SL),NEW=R.filter(o=>o.t>=MORN);
console.log(`\nA) rounds since 31a proposal ${F.length} (live-hours ${F.filter(o=>et(o.t).h>=12).length}); since live ${R.filter(o=>o.t>=LIVEAT).length}; new since morning ${NEW.length}`);
for(const[lab,set]of[['since proposal',F],['since Oct 23 22:00',S],['all',R]]){const p=paired(set,live(set,{cut:240}),live(set,{cut:300}));
 console.log(`  live 12–24 ${lab}: 4:00 vs 5:00 ${p.perRound}±${p.se} ¢/round, 4:00 ${J(stat(live(set,{cut:240})))} 5:00 ${J(stat(live(set,{cut:300})))}`);}
console.log('  live bets since morning:',live(NEW,{cut:300}).map(b=>`${iso(b.t)} s${b.s} ${b.ask}¢ ${b.won?'W':'L'}`).join(', ')||'none');
const fav=(set,cut)=>set.map(o=>{for(const s of [120,180,240,300]){if(s>cut)break;const a=o.at[s];if(!a)continue;let c=0,ask;if(a.ya>=75&&a.ya<=90){c=1;ask=a.ya;}else if(a.na>=75&&a.na<=90){c=-1;ask=a.na;}if(c)return bet(o,c,ask,s);}return null;}).filter(Boolean);
console.log('  fav 75–90 watch (all hours): since Oct 23',J(stat(fav(S,300))),'since 31a',J(stat(fav(F,300))),'2:00–4:00 since 31a',J(stat(fav(F,240))));
// ---- B
console.log('\nB1) high favourite alone (all hours unless noted):');
const grid=[];for(const lo of [88,89,90,91,92])for(const hi of [94,95,96,97])for(const cut of [120,180,240,300])for(const hrs of [0,1])for(const gate of [null,0])grid.push({lo,hi,cut,hrs,gate});
const rows=grid.map(g=>({g,tr:stat(hiAll(tr,g)),te:stat(hiAll(te,g)),pTr:paired(tr,combo(tr,g),live(tr)),pTe:paired(te,combo(te,g),live(te))}));
const base={lo:90,hi:96,cut:240,hrs:0,gate:null},show=g=>`(${g.lo},${g.hi}] to ${g.cut/60}:00 ${g.hrs?'12–24':'all hrs'}${g.gate!=null?' +read gate':''}`;
const pr=r=>console.log(`  ${show(r.g).padEnd(34)} train ${J(r.tr)} test ${J(r.te)} | combo vs live: train ${r.pTr.perRound}±${r.pTr.se} test ${r.pTe.perRound}±${r.pTe.se}`);
pr(rows.find(r=>J(r.g)===J(base)));pr(rows.find(r=>J(r.g)===J({...base,hrs:1})));pr(rows.find(r=>J(r.g)===J({...base,gate:0})));
const ok=rows.filter(r=>r.tr.n>=60).sort((a,b)=>b.pTr.perRound-a.pTr.perRound);
console.log(`  train-best (of ${rows.length}, ≥60 train bets):`);ok.slice(0,5).forEach(pr);
const med=a=>{const s=[...a].sort((x,y)=>x-y);return s[Math.floor(s.length/2)];};
console.log(`  median over variants: test ¢/ct ${med(rows.filter(r=>r.te.n).map(r=>r.te.c))}, combo test ¢/round ${med(rows.map(r=>r.pTe.perRound))}; share of variants with test ¢/ct > 0: ${(rows.filter(r=>r.te.n&&r.te.c>0).length/rows.filter(r=>r.te.n).length*100).toFixed(0)}%`);
const chosen=ok[0].g;
console.log('\nB2) stability of base (90,96] to 4:00 all hrs and train-best',show(chosen));
for(const g of [base,chosen]){console.log('  '+show(g));
 console.log('   quarters alone:',[0,1,2,3].map(i=>{const s=stat(hiAll(Q(i),g));return `${s.c}±${s.se} (${s.n})`;}).join(' / '));
 console.log('   quarters combo vs live ¢/round:',[0,1,2,3].map(i=>{const s=Q(i),p=paired(s,combo(s,g),live(s));return `${p.perRound}±${p.se}`;}).join(' / '));
 const t0=R[0].t,W=Math.ceil((R.at(-1).t-t0)/(7*864e5));console.log('   weeks alone:',Array.from({length:W},(_,w)=>{const s=stat(hiAll(R.filter(o=>Math.floor((o.t-t0)/(7*864e5))===w),g));return s.n?`${s.c}±${s.se} (${s.n})`:'-';}).join(' / '));
 const all=hiAll(R,g);console.log('   whole history',J(stat(all)),'since Oct 23',J(stat(hiAll(S,g))),'since 31a',J(stat(hiAll(F,g))));
 console.log('   by check:',[120,180,240,300].map(s=>{const b=all.filter(x=>x.s===s);return `${s/60}:00 ${J(stat(b))}`;}).join(' '));
 console.log('   by price:',[[88,91],[91,93],[93,95],[95,97]].map(([a,b])=>`${a}–${b} ${J(stat(all.filter(x=>x.ask>a&&x.ask<=b)))}`).join(' '));
 console.log('   by ET block:',[0,4,8,12,16,20].map(h=>`${h}–${h+4} ${J(stat(all.filter(x=>{const k=et(x.t).h;return k>=h&&k<h+4;})))}`).join(' '));
 console.log('   by source (kh = imported Kalshi minute asks, call = RIPTIDE checkpoint snapshots):',['kh','call'].map(k=>`${k} ${J(stat(all.filter(x=>R.find(o=>o.t===x.t).src===k)))}`).join(' '));
 console.log('   bets per day',(all.length/((R.at(-1).t-R[0].t)/864e5)).toFixed(1),'; overlap with live bets',all.filter(x=>liveOne(R.find(o=>o.t===x.t))).length);}
// fee rounding sensitivity
console.log('\nB3) fee rounding (Kalshi rounds the order fee up to the cent): whole history base rule');
for(const n of [1,5,10,25,100]){FEE=a=>feeR(a,n);console.log(`  ${n} contracts/order: ${J(stat(hiAll(R,base)))}, test ${J(stat(hiAll(te,base)))}`);}
FEE=feeP;
// how the losses happen: last checkpoint price of the bet side before the loss
const L=hiAll(R,base).filter(x=>!x.won);console.log(`\nB4) losses ${L.length}: bet-side ask at 10:00:`,L.map(x=>{const o=R.find(r=>r.t===x.t),a=o.at[600];if(!a)return '?';return (o.at[x.s].ya===x.ask&&x.ask>50?a.ya:a.na);}).join(' '));
import fs from 'fs';fs.writeFileSync('lab/data/hifav-bets.json',JSON.stringify(hiAll(R,base).map(x=>({...x,src:R.find(o=>o.t===x.t).src}))));
