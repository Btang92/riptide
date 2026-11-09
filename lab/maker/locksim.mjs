// Nov 9. Does a resting limit under the 4:00 ask (instead of crossing it) beat paying the ask, on the same 75–90¢ favourites and live-rule bets?
// Real Kalshi trades 4:15–5:45. Buy limit at ask−k posted ~15 s after the 4:00 check, rests W seconds.
// Filled: a seller hit a bid strictly below our limit (strict: our queue was reached) or at/below our limit (optimistic).
// Unfilled: (a) walk away, or (b) pay the ask at the 5:00 check if the rule still clears ("chase").
// Fees: taker formula on every fill (conservative), plus a variant with Kalshi's maker fee 0.0175·P·(1−P) on resting fills.
import fs from 'fs';import {R,feeP,stat} from '../replay/sim.mjs';import {et} from '../replay/lib.mjs';const J=JSON.stringify;
const T=JSON.parse(fs.readFileSync(process.argv[2]));const mk=a=>0.0175*a*(100-a)/100;const side=(a,c)=>c?a.ya:a.na;
const rows=R.filter(o=>T[o.t]);const n=rows.length,cut=Math.floor(n*.75),TR=rows.slice(0,cut),TE=rows.slice(cut),Q=i=>rows.slice(Math.floor(n*i/4),Math.floor(n*(i+1)/4));
console.log('rounds with trades',n,'from',new Date(rows[0].t).toISOString(),'test from',new Date(TE[0].t).toISOString(),'trades',Object.values(T).reduce((a,x)=>a+x.length,0));
const entry=(o,mode)=>{const a=o.at[240];if(!a||a.ya==null||a.na==null||a.pu==null||!a.f)return null;if(mode==='fav'){const c=a.ya>=a.na?1:0,ask=side(a,c);return ask<75||ask>90?null:{c,ask};}if(mode==='live'&&et(o.t).h<12)return null;const c=a.pu>=.5?1:0,ask=side(a,c);if(ask<75||ask>90)return null;if(Math.max(a.pu,1-a.pu)*100-ask-feeP(ask)<3)return null;return{c,ask};};
// fill price scan: sell-takers on our side. Buying YES fills when taker_side=no (flag 0) at yes price ≤ L. Buying NO: taker_side=yes (flag 1) at no price (100−yes) ≤ L.
const fillAt=(o,c,L,W,strict)=>{const start=o.t+240000+15000,end=start+W*1000;for(const[ts,yes,ty]of [...T[o.t]].sort((a,b)=>a[0]-b[0])){if(ts<start||ts>end)continue;const px=c?yes:100-yes,hit=c?ty===0:ty===1;if(!hit)continue;if(strict?px<L:px<=L)return L;}return null;};
const chaseAsk=(o,c,mode)=>{const a=o.at[300];if(!a||a.ya==null||a.na==null||a.pu==null)return null;const ask=side(a,c);if(ask<75||ask>90)return null;if(mode==='fav')return (c?a.ya>=a.na:a.na>a.ya)?ask:null;const p=c?a.pu:1-a.pu;return p*100>=ask+feeP(ask)+3?ask:null;};
function sim(S,mode,k,W,strict,chase,maker){const out=[];let fills=0,chased=0,bets=0;for(const o of S){const e=entry(o,mode);if(!e)continue;bets++;const won=o.up===e.c,L=e.ask-k;let price=null,feeF=feeP;
  if(k===0){price=e.ask;}else{const f=fillAt(o,e.c,L,W,strict);if(f!=null){price=f;fills++;if(maker)feeF=mk;}else if(chase){const q=chaseAsk(o,e.c,mode);if(q!=null){price=q;chased++;}}}
  if(price==null){out.push({t:o.t,pnl:0,won,ask:e.ask,skip:1});continue;}
  out.push({t:o.t,pnl:(won?100-price:-price)-feeF(price),won,ask:price});}return{out,fills,chased,bets};}
const s=(x)=>{const b=x.out.filter(y=>!y.skip);const m=x.out.reduce((a,y)=>a+y.pnl,0)/x.out.length,se=Math.sqrt(x.out.reduce((a,y)=>a+(y.pnl-m)**2,0)/Math.max(1,x.out.length-1)/x.out.length);return{...stat(b),perRound:+m.toFixed(2),perRoundSE:+se.toFixed(2)};};
const pair=(a,b)=>{const B=new Map(b.out.map(x=>[x.t,x.pnl])),d=a.out.map(x=>x.pnl-B.get(x.t)),m=d.reduce((s,v)=>s+v,0)/d.length,se=Math.sqrt(d.reduce((s,v)=>s+(v-m)**2,0)/Math.max(1,d.length-1)/d.length);return `Δ${m.toFixed(2)}±${se.toFixed(2)}`;};
for(const mode of['live','liveAll','fav']){const base=x=>sim(x,mode,0,0);
  console.log(`\n=== ${mode} taker at 4:00 — train ${J(s(base(TR)))}\n   test ${J(s(base(TE)))}  whole ${J(s(base(rows)))}`);
  const res=[];for(const k of[1,2,3,5])for(const W of[30,60,90])for(const[fl,strict]of[['strict',true],['optim',false]])for(const[cl,chase]of[['walk',false],['chase',true]]){const f=x=>sim(x,mode,k,W,strict,chase,false),a=f(TR),b=f(TE),c=f(rows);res.push({k,W,fl,cl,trD:pair(a,base(TR)),trV:s(a).perRound,te:s(b),teD:pair(b,base(TE)),wh:s(c),whD:pair(c,base(rows)),fr:+(c.fills/c.bets*100).toFixed(0),c});}
  res.sort((a,b)=>b.trV-a.trV);
  for(const r of res.slice(0,6))console.log(`  ask−${r.k} ${r.W}s ${r.fl} ${r.cl} | fill ${r.fr}% train ${r.trV} ${r.trD} | test ${r.te.perRound} ${r.teD} (${r.te.n}) | whole ${r.wh.perRound} ${r.whD}`);
  console.log('  strict walk-away detail (whole; fills, ¢/filled contract, win% vs avg limit):');for(const k of[1,2,3,5]){const f=sim(rows,mode,k,60,true,false,false),b=f.out.filter(y=>!y.skip);console.log(`   ask−${k} 60s: ${J(stat(b))} ${pair(f,base(rows))} ¢/bet-opportunity; maker-fee ${J(stat(sim(rows,mode,k,60,true,false,true).out.filter(y=>!y.skip)))}`);}
  // walk-forward choice on earlier quarters, strict fills only
  const D=[];const lines=[];for(let i=1;i<4;i++){const pre=rows.slice(0,Math.floor(n*i/4)),te=Q(i);let best=null;for(const k of[1,2,3,5])for(const W of[30,60,90])for(const chase of[false,true]){const a=sim(pre,mode,k,W,true,chase,false),v=s(a).perRound;if(!best||v>best.v)best={k,W,chase,v};}const a=sim(te,mode,best.k,best.W,true,best.chase,false),b=base(te);const Bm=new Map(b.out.map(x=>[x.t,x.pnl]));const d=a.out.map(x=>x.pnl-Bm.get(x.t));D.push(...d);const m=d.reduce((s,v)=>s+v,0)/d.length;lines.push(`Q${i+1} ask−${best.k} ${best.W}s ${best.chase?'chase':'walk'} ${m.toFixed(2)} (${d.length})`);}
  const m=D.reduce((s,v)=>s+v,0)/D.length,se=Math.sqrt(D.reduce((s,v)=>s+(v-m)**2,0)/(D.length-1)/D.length);console.log(`  walk-forward strict: ${lines.join(' | ')} | pooled Δ${m.toFixed(2)}±${se.toFixed(2)} ¢/bet-opportunity (${D.length})`);
}
