// Morning Oct 26: (1) favourite-in-band (edge gate off in 75–90¢) recheck incl. rounds since the idea;
// (2) which side: favourite YES (UP) vs NO (DOWN) inside 75–90¢ — does one side earn more (Kalshi YES-bias)?
// (3) 60-min trend filter: favourite with vs against the BTC move over the 60 minutes before the round.
// Filters chosen on the older 75%, scored on the newest 25% and on halves; paired ¢/round vs the base rule.
import fs from 'fs';import {R,run,stat,paired,LIVE,split,feeP} from './sim.mjs';import {et} from './lib.mjs';
const M=JSON.parse(fs.readFileSync('lab/data/candles.json'));const J=JSON.stringify,cl=ms=>M[ms]?M[ms][4]:null;
const live={margin:3,p:a=>a.pu},nogate={margin:-100,p:a=>a.pu},ALLH={...LIVE,hs:null,he:null};
const IDEA=1792796467832,nw=R.filter(o=>o.t>IDEA);
console.log(`rounds ${R.length}, last ${new Date(R.at(-1).t).toISOString()}`);
// (1)
{const L=run(nw,live,LIVE),b=run(nw,nogate,LIVE);console.log(`(1) since idea ${nw.length} rounds: no-gate ${J(stat(b))} live ${J(stat(L))} paired ${J(paired(nw,b,L))}`);
 for(let i=0;i<4;i++){const te=R.slice(Math.floor(R.length*i/4),Math.floor(R.length*(i+1)/4));const L=run(te,live,LIVE),b=run(te,nogate,LIVE);
  console.log(`   Q${i+1} ${new Date(te[0].t).toISOString().slice(5,10)}→${new Date(te.at(-1).t).toISOString().slice(5,10)} paired ${J(paired(te,b,L))} nogate ${J(stat(b))} live ${J(stat(L))}`);}
 const La=run(nw,live,ALLH),ba=run(nw,nogate,ALLH);console.log(`   since idea, all hours: no-gate ${J(stat(ba))} live ${J(stat(La))} paired vs live12–24 ${J(paired(nw,ba,run(nw,live,LIVE)))}`);}
// trend over the 60 min before the open (sign), per round
const tr60=new Map();for(const o of R){const a=cl(o.t-60000),b=cl(o.t-61*60000);if(a&&b)tr60.set(o.t,Math.log(a/b));}
// runner with a per-bet filter (keep=false → skip that round entirely at that check and keep checking)
function runF(set,B,rule,keep){const out=[];for(const o of set){const h=et(o.t).h;if(rule.hs!=null&&(h<rule.hs||h>=rule.he))continue;let bet=null;
  for(const s of rule.times){const a=o.at[s];if(!a||!a.f)continue;const pu=B.p(a),call=pu>=.5?'UP':'DOWN',prob=Math.max(pu,1-pu),ask=call==='UP'?a.ya:a.na;
    if(ask==null||ask<rule.lo||ask>rule.hi)continue;if(prob*100<ask+feeP(ask)+B.margin)continue;if(keep&&!keep(o,call,ask,s))continue;bet={call,ask,s};break;}
  if(!bet)continue;const won=(o.up===1)===(bet.call==='UP');out.push({t:o.t,pnl:(won?100-bet.ask:-bet.ask)-feeP(bet.ask),won,ask:bet.ask,call:bet.call});}return out;}
const {tr,te}=split(.75);const halves=[R.slice(0,R.length>>1),R.slice(R.length>>1)];
const filters={
  'UP only':(o,c)=>c==='UP','DOWN only':(o,c)=>c==='DOWN',
  'with 60m trend':(o,c)=>{const x=tr60.get(o.t);return x==null||(c==='UP')===(x>0);},
  'against 60m trend':(o,c)=>{const x=tr60.get(o.t);return x==null||(c==='UP')!==(x>0);},
  'skip if 60m move against > 0.3%':(o,c)=>{const x=tr60.get(o.t);return x==null||(c==='UP'?x:-x)>-0.003;},
  'skip if 60m move with > 0.3%':(o,c)=>{const x=tr60.get(o.t);return x==null||(c==='UP'?x:-x)<0.003;},
};
for(const[bn,[B,rule]]of Object.entries({'fav no-gate 12–24':[nogate,LIVE],'fav no-gate all hours':[nogate,ALLH],'live 12–24':[live,LIVE],'live all hours':[live,ALLH]})){
  console.log(`\n== base ${bn}: train ${J(stat(runF(tr,B,rule)))} test ${J(stat(runF(te,B,rule)))} halves ${halves.map(H=>J(stat(runF(H,B,rule)))).join(' ')}`);
  const b0tr=runF(tr,B,rule),b0te=runF(te,B,rule);const rows=[];
  for(const[fn,f]of Object.entries(filters)){const xtr=runF(tr,B,rule,f),xte=runF(te,B,rule,f);
    rows.push({fn,ptr:paired(tr,xtr,b0tr),str:stat(xtr),ste:stat(xte),pte:paired(te,xte,b0te),hv:halves.map(H=>paired(H,runF(H,B,rule,f),runF(H,B,rule)))});}
  for(const r of rows)console.log(`  ${r.fn.padEnd(32)} train ${J(r.str)} paired ${r.ptr.perRound}±${r.ptr.se} | test ${J(r.ste)} paired ${r.pte.perRound}±${r.pte.se} | halves ${r.hv.map(p=>p.perRound+'±'+p.se).join(' ')}`);
  const best=rows.filter(r=>r.str.n>=100).sort((a,b)=>b.ptr.perRound-a.ptr.perRound)[0];
  console.log(`  train-best: ${best.fn} → test paired ${best.pte.perRound}±${best.pte.se}, ${best.ste.n} test bets`);}
// (2b) side split, descriptive, by quarter (fav no-gate all hours)
console.log('\n(2b) fav no-gate all hours by side and quarter:');
for(let i=0;i<4;i++){const q=R.slice(Math.floor(R.length*i/4),Math.floor(R.length*(i+1)/4));const b=runF(q,nogate,ALLH);
  console.log(`  Q${i+1} UP ${J(stat(b.filter(x=>x.call==='UP')))} DOWN ${J(stat(b.filter(x=>x.call==='DOWN')))} | 60m-trend share up ${(q.filter(o=>tr60.get(o.t)>0).length/q.length*100).toFixed(0)}% BTC moved ${(Math.log(cl(q.at(-1).t)/cl(q[0].t))*100).toFixed(1)}%`);}
