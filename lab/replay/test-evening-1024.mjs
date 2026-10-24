// Oct 24 evening run: (1) favourite-in-band recheck on rounds newer than the idea; (2) news-time rounds (weekday 8:30/9:30/10:00 ET);
// (3) confirmation entry (two consecutive checks agree and clear the rule); (4) skip when the last 1–2 min BTC move is against the call.
import fs from 'fs';import {R,run,stat,paired,LIVE,feeP} from './sim.mjs';import {et} from './lib.mjs';
const M=JSON.parse(fs.readFileSync('lab/data/candles.json'));
const live={margin:3,p:a=>a.pu},nogate={margin:-100,p:a=>a.pu};const ALLH={...LIVE,hs:0,he:24};
const halves=[R.slice(0,Math.floor(R.length/2)),R.slice(Math.floor(R.length/2))];
const J=JSON.stringify;
// generic runner with a per-check filter; returns side too
function run2(te,B,rule,ok){const out=[];for(const o of te){const h=et(o.t).h;if(rule.hs!=null&&(h<rule.hs||h>=rule.he))continue;
  for(const s of rule.times){const a=o.at[s];if(!a||!a.f)continue;const pu=B.p(a),call=pu>=.5?'UP':'DOWN',prob=Math.max(pu,1-pu),ask=call==='UP'?a.ya:a.na;
    if(ask==null||ask<rule.lo||ask>rule.hi||ask<=0||ask>=100)continue;if(prob*100<ask+feeP(ask)+B.margin)continue;
    if(ok&&!ok(o,s,call,B,rule))continue;const won=(o.up===1)===(call==='UP');out.push({t:o.t,s,call,ask,won,pnl:(won?100-ask:-ask)-feeP(ask)});break;}}return out;}
// (1)
const IDEA=1792796467832,nw=R.filter(o=>o.t>IDEA);
{const L=run(nw,live,LIVE),b=run(nw,nogate,LIVE);console.log(`(1) rounds since idea: ${nw.length} (last ${new Date(R.at(-1).t).toISOString()}); no-gate ${J(stat(b))} live ${J(stat(L))} paired ${J(paired(nw,b,L))}`);
 for(const[q,te]of[0,1,2,3].map(i=>[i,R.slice(Math.floor(R.length*i/4),Math.floor(R.length*(i+1)/4))])){const L=run(te,live,LIVE),b=run(te,nogate,LIVE);console.log(`    Q${q+1} paired ${J(paired(te,b,L))} nogate ${J(stat(b))}`);}}
// (2) news-time rounds
const isNews=o=>{const p=et(o.t);if(p.wd==='Sat'||p.wd==='Sun')return false;const k=p.h*60+p.mi;return k===510||k===570||k===600;};
const isWkAM=o=>{const p=et(o.t);return p.wd!=='Sat'&&p.wd!=='Sun'&&p.h>=8&&p.h<12&&!isNews(o);};
const mv=(o,s1,s2)=>{const a=M[o.t+s1*1000-60000],b=M[o.t+s2*1000-60000];return a&&b?Math.abs(b[4]-a[4]):null;};
const fav=(o,s)=>{const a=o.at[s];if(!a)return null;const up=(a.ya+(100-a.na))>=100,ask=up?a.ya:a.na;const won=(o.up===1)===up;return{ask,won,pnl:(won?100-ask:-ask)-feeP(ask)};};
const med=x=>{x=x.filter(v=>v!=null).sort((a,b)=>a-b);return x.length?Math.round(x[x.length>>1]):null;};
console.log('\n(2) news-time rounds (weekday 8:30/9:30/10:00 ET) vs other weekday 08–12 ET vs everything else');
for(const[nm,f]of[['news',isNews],['wk 08-12 other',isWkAM],['all other',o=>!isNews(o)&&!isWkAM(o)]]){const g=R.filter(f);
 const f2=g.map(o=>fav(o,120)).filter(Boolean),fb=f2.filter(x=>x.ask>=75&&x.ask<=90),f10=g.map(o=>fav(o,600)).filter(Boolean);
 console.log(`   ${nm.padEnd(15)} rounds ${g.length} | fav@2:00 any ${J(stat(f2))} | in 75–90 ${J(stat(fb))} | fav@10:00 loses ${(100-stat(f10).win)}% | median move 0–2:00 $${med(g.map(o=>mv(o,60,120)))} 2:00–end $${med(g.map(o=>mv(o,120,900)))}`);}
for(const[h,te]of halves.entries()){const A=run2(te,live,ALLH),X=run2(te,live,ALLH,o=>!isNews(o)),An=run2(te,nogate,ALLH),Xn=run2(te,nogate,ALLH,o=>!isNews(o));
 console.log(`   half ${h+1}: live rule all hours, skip news rounds paired ${J(paired(te,X,A))} (news bets ${A.length-X.length}: ${J(stat(A.filter(x=>isNews(R.find(o=>o.t===x.t)))))}) | fav no-gate all hours skip news ${J(paired(te,Xn,An))}`);}
// (3) confirmation entry: bet at s only if the check 60 s earlier had the same call and also cleared the rule
const clears=(o,s,call,B,rule)=>{const a=o.at[s];if(!a||!a.f)return false;const pu=B.p(a),c=pu>=.5?'UP':'DOWN';if(c!==call)return false;const prob=Math.max(pu,1-pu),ask=c==='UP'?a.ya:a.na;
  return ask!=null&&ask>=rule.lo&&ask<=rule.hi&&prob*100>=ask+feeP(ask)+B.margin;};
const conf=(o,s,call,B,rule)=>s>120&&clears(o,s-60,call,B,rule);
const confSoft=(o,s,call,B)=>{if(s===120)return false;const a=o.at[s-60];if(!a||!a.f)return false;const pu=B.p(a);return (pu>=.5?'UP':'DOWN')===call;};
console.log('\n(3) confirmation entry');
for(const[nm,B,rule]of[['live',live,LIVE],['live all hours',live,ALLH],['fav no-gate 12-24',nogate,LIVE],['fav no-gate all hours',nogate,ALLH]])for(const[h,te]of halves.entries()){
 const b=run2(te,B,rule),c=run2(te,B,rule,conf),d=run2(te,B,rule,confSoft);
 console.log(`   ${nm.padEnd(22)} h${h+1} base ${J(stat(b))} | strict ${J(stat(c))} ${J(paired(te,c,b))} | same-side ${J(stat(d))} ${J(paired(te,d,b))}`);}
// (4) last 1/2-min BTC move against the call (in $), threshold picked on half 1, checked on half 2
const mom=(o,s,k,call)=>{const a=M[o.t+s*1000-60000],b=M[o.t+s*1000-60000-k*60000];if(!a||!b)return 0;return (a[4]-b[4])*(call==='UP'?1:-1);};
console.log('\n(4) skip when the last k minutes moved against the call by more than $T');
for(const[nm,B,rule]of[['live all hours',live,ALLH],['fav no-gate 12-24',nogate,LIVE],['fav no-gate all hours',nogate,ALLH]]){const rows=[];
 for(const k of[1,2,3])for(const T of[0,20,50,100]){const f=(o,s,call)=>mom(o,s,k,call)>=-T;const r=halves.map(te=>{const b=run2(te,B,rule),x=run2(te,B,rule,f);return{p:paired(te,x,b),sk:stat(b.filter(y=>!x.some(z=>z.t===y.t)))};});rows.push({k,T,r});}
 rows.sort((a,b)=>b.r[0].p.perRound-a.r[0].p.perRound);
 for(const x of rows.slice(0,4))console.log(`   ${nm.padEnd(22)} k${x.k} T$${x.T}: h1 ${J(x.r[0].p)} skipped ${J(x.r[0].sk)} → h2 ${J(x.r[1].p)} skipped ${J(x.r[1].sk)}`);}
// (5) trading-hours windows, picked on half 1 and checked on half 2 (4-hour blocks on/off), live rule and fav no-gate
console.log('\n(5) hours: 4-hour ET blocks, ¢/ct by half (live rule, fav no-gate in band)');
const blk=o=>Math.floor(et(o.t).h/4);
for(const[nm,B]of[['live rule',live],['fav no-gate',nogate]]){const per=halves.map(te=>{const b=run2(te,B,ALLH);return[0,1,2,3,4,5].map(k=>stat(b.filter(x=>blk(R.find(o=>o.t===x.t))===k)));});
 console.log('  ',nm,[0,1,2,3,4,5].map(k=>`${String(k*4).padStart(2,'0')}-${String(k*4+4).padStart(2,'0')}: ${per[0][k].c}±${per[0][k].se}(${per[0][k].n}) / ${per[1][k].c}±${per[1][k].se}(${per[1][k].n})`).join(' | '));
 // pick blocks with positive h1 mean, test on h2 vs live 12-24
 const keep=[0,1,2,3,4,5].filter(k=>per[0][k].c>0);const te=halves[1];const x=run2(te,B,ALLH,o=>keep.includes(blk(o))),L=run2(te,live,LIVE),same=run2(te,B,LIVE);
 console.log(`     h1-chosen blocks ${keep.map(k=>k*4)} → h2 ${J(stat(x))} paired vs live ${J(paired(te,x,L))} | same rule 12–24 ${J(stat(same))} paired vs live ${J(paired(te,same,L))}`);}
