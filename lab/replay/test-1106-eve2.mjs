// Nov 6 evening (b): short-horizon options-vol jumps before the 4:00 lock (BVOL change over the last 2 and 10 minutes, per-second index
// reduced to minute values), as an event-risk skip for 75–90¢ favourites and the live lock. Quintile cuts on older 75%, test newest 25%.
import fs from 'fs';import {R,feeP,stat,paired} from './sim.mjs';import {et} from './lib.mjs';const J=JSON.stringify;
const BV=JSON.parse(fs.readFileSync('lab/bvol/minutes.json'));const bv=ms=>BV[ms]||null;
const side=(a,c)=>a?(c?a.ya:a.na):null;
const ctx=R.map(o=>{const now=o.t+4*60000;const B=bv(now-60000),B2=bv(now-180000),B10=bv(now-660000);if(!B||!B2||!B10)return null;
  return{d2:Math.abs(Math.log(B/B2)),d10:Math.abs(Math.log(B/B10)),s2:Math.log(B/B2)};});
const idx=new Map(R.map((o,i)=>[o.t,i]));const go=(s,f)=>s.map(o=>f(o,idx.get(o.t))).filter(Boolean);
const mk=(mode,allH,gate)=>(o,i)=>{if(!allH&&et(o.t).h<12)return null;const a=o.at[240];if(!a||a.ya==null||a.na==null)return null;let c,ask;
  if(mode==='live'){if(!a.f)return null;const pu=a.pu;c=pu>=.5?1:0;ask=side(a,c);if(ask<75||ask>90||Math.max(pu,1-pu)*100<ask+feeP(ask)+3)return null;}
  else{c=a.ya>=a.na?1:0;ask=side(a,c);if(ask<75||ask>90)return null;}
  if(gate&&!gate(i,c))return null;const w=o.up===c;return{t:o.t,pnl:(w?100-ask:-ask)-feeP(ask),won:w,ask};};
const cut=Math.floor(R.length*.75),TR=R.slice(0,cut),TE=R.slice(cut),Q=i=>R.slice(Math.floor(R.length*i/4),Math.floor(R.length*(i+1)/4));
const qcuts=k=>{const v=TR.map(o=>ctx[idx.get(o.t)]).filter(x=>x).map(x=>x[k]).sort((a,b)=>a-b);return[.2,.4,.6,.8,.9,.95].map(q=>v[Math.floor(q*v.length)]);};
const favAll=mk('fav',true,null);
for(const k of['d2','d10','s2']){const q=qcuts(k);console.log(k,'cuts',q.map(x=>x.toFixed(4)).join('/'));const b=x=>q.slice(0,4).filter(c=>x>=c).length;
  for(let j=0;j<5;j++){const f=bb=>{const x=ctx[idx.get(bb.t)];return x&&b(x[k])===j;};console.log(`  q${j+1} whole`,J(stat(go(R,favAll).filter(f))),'test',J(stat(go(TE,favAll).filter(f))));}
  const f=bb=>{const x=ctx[idx.get(bb.t)];return x&&x[k]>=q[5];};console.log('  top 5% whole',J(stat(go(R,favAll).filter(f))),'test',J(stat(go(TE,favAll).filter(f))));}
const gates=[];for(const k of['d2','d10']){const q=qcuts(k);for(const j of[3,4,5])gates.push([`skip ${k}≥p${[20,40,60,80,90,95][j]}`,()=>i=>!(ctx[i]&&ctx[i][k]>=q[j])]);}
for(const[mode,allH]of[['live',false],['live',true],['fav',true]]){const base=mk(mode,allH,null);
  console.log(`\n== ${mode} ${allH?'all hours':'12–24'}`);
  const res=gates.map(([k,g])=>{const f=mk(mode,allH,g());return{k,f,te:stat(go(TE,f)),ptr:paired(TR,go(TR,f),go(TR,base)),pte:paired(TE,go(TE,f),go(TE,base)),pw:paired(R,go(R,f),go(R,base))};});
  res.sort((x,y)=>y.ptr.perRound-x.ptr.perRound);
  for(const r of res)console.log(`  ${r.k.padEnd(14)} trainΔ ${r.ptr.perRound}±${r.ptr.se} | test Δ${r.pte.perRound}±${r.pte.se} | whole Δ${r.pw.perRound}±${r.pw.se}`);
  const b=res[0];console.log('   train-best',b.k,'quarters Δ',[0,1,2,3].map(i=>{const p=paired(Q(i),go(Q(i),b.f),go(Q(i),base));return `${p.perRound}±${p.se}`;}).join(' / '));}
