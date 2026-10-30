// Morning Oct 30.
// (A) Forward check of the Oct 29 WATCH item: skip favourites when the Coinbase-vs-Binance premium moved > 0.1 (vol units) over 5 min,
//     scored ONLY on rounds after Oct 29 10:15 UTC (unseen when the rule was found). Needs lab/data/bspot.json.
// (B) Scheduled-event rounds (untested family): Binance funding times (00/08/16 UTC) — rounds that start or end on them;
//     US equity close (weekday 15:45 / 16:00 ET rounds); daily ET midnight (23:45 / 00:00 ET rounds). Skip rules chosen on older 75%, scored on newest 25% + quarters.
// (C) Overpriced-favourite watch update (descriptive).
import fs from 'fs';import {R,feeP,stat,paired} from './sim.mjs';import {et} from './lib.mjs';
const M=JSON.parse(fs.readFileSync('lab/data/candles.json')),S=JSON.parse(fs.readFileSync('lab/data/bspot.json'));const cb=t=>M[t]?.[4],J=JSON.stringify;
function d5(o,s){const m=o.t+s*1000-60000,P=t=>(cb(t)&&S[t])?Math.log(cb(t)/S[t]):null,p=P(m);if(p==null)return null;
 let v=0,n=0;for(let i=1;i<=60;i++){const x=cb(m-i*60000),y=cb(m-(i+1)*60000);if(x&&y){v+=Math.log(x/y)**2;n++;}}if(!n)return null;
 const sc=Math.sqrt(v/n)*Math.sqrt((900-s)/60),p5=P(m-300000);return p5!=null?Math.abs(p-p5)/sc:null;}
const utc=t=>new Date(t);
const EV={
 'funding start (00/08/16 UTC)':o=>{const d=utc(o.t);return d.getUTCMinutes()===0&&d.getUTCHours()%8===0;},
 'funding end (round ends 00/08/16 UTC)':o=>{const d=utc(o.t+900000);return d.getUTCMinutes()===0&&d.getUTCHours()%8===0;},
 'funding either':o=>EV['funding start (00/08/16 UTC)'](o)||EV['funding end (round ends 00/08/16 UTC)'](o),
 'equity close (wkday 15:45/16:00 ET)':o=>{const e=et(o.t);return !['Sat','Sun'].includes(e.wd)&&((e.h===15&&e.mi===45)||(e.h===16&&e.mi===0));},
 'ET midnight (23:45/00:00 ET)':o=>{const e=et(o.t);return (e.h===23&&e.mi===45)||(e.h===0&&e.mi===0);},
};
function go(set,{hrs,live,skip}){const out=[];for(const o of set){if(hrs&&et(o.t).h<12)continue;if(skip&&skip.ev&&EV[skip.ev](o))continue;
 for(const s of [120,180,240,300]){const a=o.at[s];if(!a)continue;let c=0,ask;
  if(live){if(!a.f)continue;const pu=a.pu,cl=pu>=.5?1:-1,pr=Math.max(pu,1-pu);ask=cl>0?a.ya:a.na;if(ask==null||ask<75||ask>90)continue;if(pr*100<ask+feeP(ask)+3)continue;c=cl;}
  else{if(a.ya>=75&&a.ya<=90){c=1;ask=a.ya;}else if(a.na>=75&&a.na<=90){c=-1;ask=a.na;}if(!c)continue;}
  if(skip&&skip.d5!=null){const v=d5(o,s);if(v!=null&&v>skip.d5)break;}
  const won=(o.up===1)===(c===1);out.push({t:o.t,pnl:(won?100-ask:-ask)-feeP(ask),won,ask,s});break;}}return out;}
const BASES=[['fav no-gate all hours',{}],['fav no-gate 12–24',{hrs:1}],['live rule 12–24',{hrs:1,live:1}],['live rule all hours',{live:1}]];
console.log(`rounds ${R.length} (${utc(R[0].t).toISOString().slice(0,10)} → ${utc(R.at(-1).t).toISOString()})`);
// (A)
const T0=Date.UTC(2026,9,29,10,15),Smax=Math.max(...Object.keys(S).map(Number)),F=R.filter(o=>o.t>T0&&o.t+300000<Smax);
console.log(`\nA) premium |d5|>0.1 skip, forward rounds ${F.length} (${utc(F[0]?.t).toISOString()} → ${utc(F.at(-1)?.t).toISOString()})`);
for(const[nm,b]of BASES){const g=go(F,b),f=go(F,{...b,skip:{d5:.1}});console.log(`  ${nm}: base ${J(stat(g))} skip ${J(stat(f))} skipped ${J(stat(g.filter(x=>!f.find(y=>y.t===x.t))))} paired ${J(paired(F,f,g))}`);}
// (B)
const cut=Math.floor(R.length*.75),tr=R.slice(0,cut),te=R.slice(cut),Q=i=>R.slice(Math.floor(R.length*i/4),Math.floor(R.length*(i+1)/4));
console.log('\nB) event rounds: favourite all hours, event vs other (all rounds)');
const fav=go(R,{});for(const ev of Object.keys(EV)){const i=fav.filter(x=>EV[ev](R.find(o=>o.t===x.t))),n=fav.filter(x=>!EV[ev](R.find(o=>o.t===x.t)));
 const half=k=>{const h=k?R.slice(R.length>>1):R.slice(0,R.length>>1),ts=new Set(h.map(o=>o.t));return stat(i.filter(x=>ts.has(x.t)));};
 console.log(`  ${ev.padEnd(38)} event ${J(stat(i))} other ${J(stat(n))} halves ${J(half(0))} / ${J(half(1))}`);}
for(const[nm,b]of BASES){const g=s=>go(s,b);const rows=Object.keys(EV).map(ev=>{const f=s=>go(s,{...b,skip:{ev}});
  return{ev,ptr:paired(tr,f(tr),g(tr)),pte:paired(te,f(te),g(te)),skipTe:g(te).length-f(te).length,q:[0,1,2,3].map(i=>paired(Q(i),f(Q(i)),g(Q(i))).perRound)};}).sort((a,b)=>b.ptr.perRound-a.ptr.perRound);
 console.log(`\n  ${nm}: base test ${J(stat(g(te)))}`);for(const r of rows)console.log(`    skip ${r.ev.padEnd(38)} train ${r.ptr.perRound}±${r.ptr.se} test ${r.pte.perRound}±${r.pte.se} (skips ${r.skipTe} test bets) quarters ${r.q.join(' / ')}`);
 console.log(`    TRAIN-BEST skip ${rows[0].ev}: test ${rows[0].pte.perRound}±${rows[0].pte.se}`);}
// (C)
const W=Date.UTC(2026,9,23,22),fa=go(R,{}),band=(lo,hi,set)=>stat(set.filter(x=>x.ask>=lo&&x.ask<hi));
const pre=fa.filter(x=>x.t<W),post=fa.filter(x=>x.t>=W),y=fa.filter(x=>x.t>=Date.UTC(2026,9,29,10,15));
console.log(`\nC) favourite all hours since Oct 23 22:00 UTC (${post.length} bets): all ${J(stat(post))} 75–80 ${J(band(75,80,post))} 80–85 ${J(band(80,85,post))} 85–90 ${J(band(85,91,post))}`);
console.log(`   before: all ${J(stat(pre))}; last day (since Oct 29 10:15 UTC): ${J(stat(y))}`);
