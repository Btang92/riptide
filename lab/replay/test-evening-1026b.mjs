// Evening Oct 26 (b): strike chop at entry — how many of the last 6 one-minute closes before the entry check
// sat on the other side of the strike from the bet (and how many times price crossed the strike). Unsigned "chop around the strike"
// is different from the signed spike filter. Aimed at calls that turn against early. Train older 75% / test newest 25% / halves.
import fs from 'fs';import {R,stat,paired,LIVE,split,feeP} from './sim.mjs';import {et} from './lib.mjs';
const M=JSON.parse(fs.readFileSync('lab/data/candles.json'));const cl=ms=>M[ms]?M[ms][4]:null,J=JSON.stringify;
const live={margin:3,p:a=>a.pu},nogate={margin:-100,p:a=>a.pu},ALLH={...LIVE,hs:null,he:null};const askOf=(a,c)=>c==='UP'?a.ya:a.na;
function chop(o,c,s){const end=o.t+s*1000;let other=0,cross=0,prev=null,k=0;for(let m=end-6*60000;m<end;m+=60000){const x=cl(m);if(x==null)continue;k++;const sd=x>o.strike?1:-1;
  if((c==='UP'&&sd<0)||(c==='DOWN'&&sd>0))other++;if(prev!=null&&sd!==prev)cross++;prev=sd;}return k<4?null:{other,cross};}
function runF(set,B,rule,keep){const out=[];for(const o of set){const h=et(o.t).h;if(rule.hs!=null&&(h<rule.hs||h>=rule.he))continue;let bet=null;
  for(const s of rule.times){const a=o.at[s];if(!a||!a.f)continue;const pu=B.p(a),call=pu>=.5?'UP':'DOWN',prob=Math.max(pu,1-pu),ask=askOf(a,call);
    if(ask==null||ask<rule.lo||ask>rule.hi)continue;if(prob*100<ask+feeP(ask)+B.margin)continue;if(keep&&!keep(o,call,ask,s))continue;bet={call,ask,s};break;}
  if(!bet)continue;const won=(o.up===1)===(bet.call==='UP');out.push({t:o.t,pnl:(won?100-bet.ask:-bet.ask)-feeP(bet.ask),won,ask:bet.ask,call:bet.call,s:bet.s,ch:chop(o,bet.call,bet.s)});}return out;}
const K=t=>(o,c,a,s)=>{const x=chop(o,c,s);return x==null||t(x);};
const filters={'skip if other side ≥1 of 6':K(x=>x.other<1),'skip if other side ≥2':K(x=>x.other<2),'skip if other side ≥3':K(x=>x.other<3),
 'skip if crosses ≥1':K(x=>x.cross<1),'skip if crosses ≥2':K(x=>x.cross<2),'skip if crosses ≥3':K(x=>x.cross<3),
 'only if chop (other ≥1)':K(x=>x.other>=1),'only if crosses ≥1':K(x=>x.cross>=1)};
const {tr,te}=split(.75);const halves=[R.slice(0,R.length>>1),R.slice(R.length>>1)];
for(const[bn,[B,rule]]of Object.entries({'fav no-gate 12–24':[nogate,LIVE],'fav no-gate all hours':[nogate,ALLH],'live 12–24':[live,LIVE],'live all hours':[live,ALLH]})){
  const b0tr=runF(tr,B,rule),b0te=runF(te,B,rule);console.log(`\n== base ${bn}: train ${J(stat(b0tr))} test ${J(stat(b0te))}`);
  const all=runF(R,B,rule),bo={},bc={};for(const x of all){if(!x.ch)continue;(bo[x.ch.other]=bo[x.ch.other]||[]).push(x);(bc[Math.min(3,x.ch.cross)]=bc[Math.min(3,x.ch.cross)]||[]).push(x);}
  console.log('   by other-side closes: '+Object.entries(bo).map(([k,v])=>`${k}: ${J(stat(v))}`).join(' | '));
  console.log('   by crosses (3=3+): '+Object.entries(bc).map(([k,v])=>`${k}: ${J(stat(v))}`).join(' | '));
  const rows=[];for(const[fn,f]of Object.entries(filters)){const xtr=runF(tr,B,rule,f),xte=runF(te,B,rule,f);
    rows.push({fn,ptr:paired(tr,xtr,b0tr),str:stat(xtr),ste:stat(xte),pte:paired(te,xte,b0te),hv:halves.map(H=>paired(H,runF(H,B,rule,f),runF(H,B,rule)))});}
  for(const r of rows)console.log(`  ${r.fn.padEnd(28)} train ${J(r.str)} p ${r.ptr.perRound}±${r.ptr.se} | test ${J(r.ste)} p ${r.pte.perRound}±${r.pte.se} | halves ${r.hv.map(p=>p.perRound+'±'+p.se).join(' ')}`);
  const best=rows.filter(r=>r.str.n>=100).sort((a,b)=>b.ptr.perRound-a.ptr.perRound)[0];
  if(best)console.log(`  train-best: ${best.fn} (train ${best.ptr.perRound}±${best.ptr.se}) → test paired ${best.pte.perRound}±${best.pte.se}, ${best.ste.n} test bets ${J(best.ste)}`);}
