// Evening Oct 28:
// (1) favourite-in-band decision (edge gate off in 75–90¢), rounds since Oct 23 22:00 UTC; lower-band watch.
// (2) entry cutoff for the live rule: last check 2:00 / 3:00 / 4:00 / 5:00 (live) — later entries are the
//     "turned against by 3:00–5:00" group's source? Walk-forward: cutoff picked on older 75%, scored on newest 25%, halves, quarters.
// (3) lower-price skip inside the band (live rule / favourite with floor 75→78/80/82), picked on train, scored on test.
import {R,run,stat,paired,LIVE} from './sim.mjs';
const J=JSON.stringify,live={margin:3,p:a=>a.pu},nogate={margin:-100,p:a=>a.pu},ALLH={...LIVE,hs:null,he:null};
const IDEA=1792796467832,nw=R.filter(o=>o.t>IDEA),newly=R.filter(o=>o.t>1793184379006-15*60e3);
console.log(`rounds ${R.length}, → ${new Date(R.at(-1).t).toISOString()}; since idea ${nw.length}; since morning run ${newly.length}`);
const Q=i=>R.slice(Math.floor(R.length*i/4),Math.floor(R.length*(i+1)/4));
const cut=Math.floor(R.length*.75),tr=R.slice(0,cut),te=R.slice(cut),H=[R.slice(0,R.length>>1),R.slice(R.length>>1)];
{const L=run(nw,live,LIVE),b=run(nw,nogate,LIVE);console.log(`(1) since idea: no-gate ${J(stat(b))} live ${J(stat(L))} paired ${J(paired(nw,b,L))}`);
 for(let i=0;i<4;i++){const q=Q(i);console.log(`   Q${i+1} ${new Date(q[0].t).toISOString().slice(5,10)}→${new Date(q.at(-1).t).toISOString().slice(5,10)} paired ${J(paired(q,run(q,nogate,LIVE),run(q,live,LIVE)))} nogate ${J(stat(run(q,nogate,LIVE)))} live ${J(stat(run(q,live,LIVE)))}`);}
 console.log(`   since idea all hours: no-gate ${J(stat(run(nw,nogate,ALLH)))} live ${J(stat(run(nw,live,ALLH)))}`);
 console.log(`   since morning (${newly.length} rounds) all hours fav ${J(stat(run(newly,nogate,ALLH)))}`);
 for(const[lo,hi]of[[75,80],[80,85],[85,90]]){const r={...ALLH,lo,hi};console.log(`   fav ${lo}–${hi}¢ all hours: all ${J(stat(run(R,nogate,r)))} since idea ${J(stat(run(nw,nogate,r)))}`);}}
const TIMES={'2:00':[120],'to 3:00':[120,180],'to 4:00':[120,180,240],'to 5:00 (live)':[120,180,240,300]};
for(const[nm,B,base]of[['live rule 12–24',live,LIVE],['live rule all hours',live,ALLH],['fav no-gate all hours',nogate,ALLH]]){
 console.log(`\n(2) entry cutoff, ${nm}`);const rows=[];
 for(const[k,t]of Object.entries(TIMES)){const r={...base,times:t};const f=s=>run(s,B,r),g=s=>run(s,B,base);
  const row={k,ptr:paired(tr,f(tr),g(tr)),pte:paired(te,f(te),g(te)),ste:stat(f(te)),str:stat(f(tr)),q:[0,1,2,3].map(i=>paired(Q(i),f(Q(i)),g(Q(i))).perRound),pn:paired(nw,f(nw),g(nw))};rows.push(row);
  console.log(`  ${k.padEnd(15)} train ${J(row.str)} test ${J(row.ste)} | paired vs live-cutoff train ${row.ptr.perRound}±${row.ptr.se} test ${row.pte.perRound}±${row.pte.se} quarters ${row.q.join(' / ')} since idea ${row.pn.perRound}±${row.pn.se}`);}
 const best=rows.sort((a,b)=>b.ptr.perRound-a.ptr.perRound)[0];console.log(`  train-best ${best.k}: test ${best.pte.perRound}±${best.pte.se} (${best.ste.n} test bets)`);
 // only the late entries (bet at 3:00–5:00 that 2:00-only would not make)
 const late=run(R,B,base).filter(x=>x.s>120);console.log(`  bets entered at 3:00–5:00: ${J(stat(late))}; at 4:00–5:00 ${J(stat(late.filter(x=>x.s>180)))}`);}
for(const[nm,B,base]of[['live rule 12–24',live,LIVE],['live rule all hours',live,ALLH],['fav no-gate all hours',nogate,ALLH]]){
 console.log(`\n(3) price floor, ${nm}`);const rows=[];
 for(const lo of[75,77,78,80,82]){for(const hi of[88,90]){const r={...base,lo,hi};const f=s=>run(s,B,r),g=s=>run(s,B,base);
  const row={k:`${lo}–${hi}`,ptr:paired(tr,f(tr),g(tr)),pte:paired(te,f(te),g(te)),ste:stat(f(te)),h:H.map(h=>paired(h,f(h),g(h)).perRound)};rows.push(row);
  console.log(`  ${row.k} train ${row.ptr.perRound}±${row.ptr.se} test ${row.pte.perRound}±${row.pte.se} (${J(row.ste)}) halves ${row.h.join(' / ')}`);}}
 const best=rows.sort((a,b)=>b.ptr.perRound-a.ptr.perRound)[0];console.log(`  train-best ${best.k}: test ${best.pte.perRound}±${best.pte.se} (${best.ste.n} test bets)`);}
