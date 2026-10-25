// Evening Oct 25: (A) spike / overreaction filter (aimed at calls that turn against by 3:00–5:00):
//   skip a bet when the move that made the favourite was unusually sharp (last 1-min / 2-min move WITH the call,
//   or the move since the open, in units of the pre-round 1-min volatility). Threshold chosen on the older 75%.
// (B) underdog / contrarian bets (autopsy keeps showing "against the market" calls positive): buy RIPTIDE's side
//   when it is the Kalshi underdog (ask < 50) and the read clears ask + fee + margin; margin chosen on train.
// (C) favourite-in-band recheck is in test-1025.mjs.
import fs from 'fs';import {R,run,stat,paired,LIVE,split,feeP} from './sim.mjs';import {et} from './lib.mjs';
const M=JSON.parse(fs.readFileSync('lab/data/candles.json'));const J=JSON.stringify;
const cl=ms=>M[ms]?M[ms][4]:null;
// per round: pre-round sigma (per minute, 60 min ending at the open)
const sig=new Map();for(const o of R){const r=[];for(let i=60;i>=1;i--){const a=cl(o.t-i*60000),b=cl(o.t-(i+1)*60000);if(a&&b)r.push(Math.log(a/b));}
  if(r.length<40)continue;sig.set(o.t,Math.sqrt(r.reduce((s,x)=>s+x*x,0)/r.length));}
// feature at checkpoint s for a side: signed move in sigma units
function feat(o,s,side){const sg=sig.get(o.t);if(!sg)return null;const c=cl(o.t+s*1000-60000),c1=cl(o.t+s*1000-120000),c2=cl(o.t+s*1000-180000);if(!c||!c1||!c2)return null;
  const sgn=side==='UP'?1:-1;return{m1:sgn*Math.log(c/c1)/sg,m2:sgn*Math.log(c/c2)/(sg*Math.SQRT2),mo:sgn*Math.log(c/o.strike)/(sg*Math.sqrt(s/60))};}
// generic runner with a skip predicate (keeps checking later checkpoints after a skip, like live)
function runF(te,B,rule,skip){const out=[];for(const o of te){const h=et(o.t).h;if(rule.hs!=null&&(h<rule.hs||h>=rule.he))continue;let bet=null;
  for(const s of rule.times){const a=o.at[s];if(!a||!a.f)continue;const pu=B.p(a);let call=pu>=.5?'UP':'DOWN';if(rule.side==='under'){call=a.ya<a.na?'UP':'DOWN';}
    const prob=call==='UP'?pu:1-pu,ask=call==='UP'?a.ya:a.na;if(ask==null||ask<rule.lo||ask>rule.hi)continue;if(prob*100<ask+feeP(ask)+B.margin)continue;
    if(skip){const f=feat(o,s,call);if(f&&skip(f))continue;}bet={s,call,ask};break;}
  if(!bet)continue;const won=(o.up===1)===(bet.call==='UP');out.push({t:o.t,pnl:(won?100-bet.ask:-bet.ask)-feeP(bet.ask),won,ask:bet.ask,s:bet.s});}return out;}
const live={margin:3,p:a=>a.pu},nogate={margin:-100,p:a=>a.pu};
const ALLH={...LIVE,hs:null,he:null};
console.log(`rounds ${R.length} (${new Date(R[0].t).toISOString().slice(0,10)} → ${new Date(R.at(-1).t).toISOString().slice(0,16)}), with sigma ${sig.size}`);
const {tr,te}=split(.75);const halves=[R.slice(0,R.length>>1),R.slice(R.length>>1)];
// (A) descriptive: favourite 75–90 at first check 2:00–5:00 (all hours), by feature quintile
console.log('\n(A) favourite 75–90¢ all hours, ¢/ct by quintile of the move that made it (sigma units):');
{const bets=[];for(const o of R){for(const s of LIVE.times){const a=o.at[s];if(!a)continue;const side=a.ya>=a.na?'UP':'DOWN',ask=Math.max(a.ya,a.na);if(ask<75||ask>90)continue;const f=feat(o,s,side);if(!f)break;
  const won=(o.up===1)===(side==='UP');bets.push({...f,pnl:(won?100-ask:-ask)-feeP(ask),won,ask});break;}}
 for(const k of['m1','m2','mo']){const v=bets.map(b=>b[k]).sort((a,b)=>a-b),q=[1,2,3,4].map(i=>v[Math.floor(v.length*i/5)]);
  const g=[[],[],[],[],[]];for(const b of bets){let i=0;while(i<4&&b[k]>=q[i])i++;g[i].push(b);}
  console.log(`  ${k} cuts ${q.map(x=>x.toFixed(2)).join('/')}: `+g.map(x=>{const s=stat(x);return `${s.c}±${s.se} (${s.n}, ${s.win}%)`}).join(' | '));}}
// (A) walk-forward threshold choice
const base={nogate:[nogate,LIVE],nogateAll:[nogate,ALLH],live:[live,LIVE],liveAll:[live,ALLH]};
console.log('\n(A) skip if feature > k (chosen on older 75%, scored on newest 25% and on halves):');
for(const[bn,[B,rule]]of Object.entries(base)){const cands=[];for(const k of['m1','m2','mo'])for(const th of[0.5,1,1.5,2,2.5,3,4])cands.push({k,th});
  const b0tr=runF(tr,B,rule),b0te=runF(te,B,rule);
  const sc=cands.map(c=>{const sk=f=>f[c.k]>c.th;const x=runF(tr,B,rule,sk);return{c,p:paired(tr,x,b0tr),n:x.length};}).sort((a,b)=>b.p.perRound-a.p.perRound);
  const best=sc[0],sk=f=>f[best.c.k]>best.c.th,xt=runF(te,B,rule,sk);
  const hv=halves.map(H=>{const a=runF(H,B,rule,sk),b=runF(H,B,rule);return `${J(paired(H,a,b))}`;});
  console.log(`  ${bn}: base test ${J(stat(b0te))} | best on train ${best.c.k}>${best.c.th} train paired ${J(best.p)} | test ${J(stat(xt))} paired ${J(paired(te,xt,b0te))} | halves ${hv.join(' ')}`);
  console.log(`     train top 4: ${sc.slice(0,4).map(s=>`${s.c.k}>${s.c.th} ${s.p.perRound}±${s.p.se}`).join(', ')}`);}
// (B) underdog bets
console.log('\n(B) RIPTIDE side when it is the underdog (ask 20–49¢), margin chosen on train:');
for(const[hn,hr]of[['12–24',{hs:12,he:24}],['all',{hs:null,he:null}]]){const rows=[];
  for(const m of[0,3,6,10,15,20]){const rule={...LIVE,...hr,lo:20,hi:49},B={margin:m,p:a=>a.pu};rows.push({m,tr:stat(runF(tr,B,rule)),te:stat(runF(te,B,rule)),h:halves.map(H=>stat(runF(H,B,rule)))});}
  for(const r of rows)console.log(`  ${hn} margin ${r.m}: train ${J(r.tr)} test ${J(r.te)} halves ${J(r.h[0])} ${J(r.h[1])}`);
  const best=rows.filter(r=>r.tr.n>=60).sort((a,b)=>b.tr.c-a.tr.c)[0];if(best)console.log(`  ${hn} train-best margin ${best.m} → test ${J(best.te)}`);}
// (B2) and the plain Kalshi underdog (no model) for reference
{const rule={...ALLH,lo:20,hi:49,side:'under'},B={margin:-100,p:a=>a.pu};console.log(`  plain underdog 20–49 all hours: halves ${halves.map(H=>J(stat(runF(H,B,rule)))).join(' ')}`);}
// (C) round start minute (:00/:15/:30/:45) — :00 and :30 rounds start in the jumpiest minutes of the hour
console.log('\n(C) favourite no-gate 75–90¢ (all hours / 12–24) by round start minute, halves:');
for(const[hn,rule]of[['all',ALLH],['12–24',LIVE]])for(const mm of[0,15,30,45]){const f=H=>stat(runF(H.filter(o=>et(o.t).mi===mm),nogate,rule));console.log(`  ${hn} :${String(mm).padStart(2,'0')} ${J(f(halves[0]))} ${J(f(halves[1]))}`);}
