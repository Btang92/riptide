// Oct 25 run: (1) favourite-in-band (edge gate off in 75–90¢) recheck incl. rounds since the idea;
// (2) favourite band edges chosen on older 75%, scored on newest 25%; (3) favourite entry window (last check 2:00…8:00) chosen on train;
// (4) spread check (is a tight-spread filter possible?).
import {R,run,stat,paired,LIVE,split} from './sim.mjs';
const J=JSON.stringify,live={margin:3,p:a=>a.pu},nogate={margin:-100,p:a=>a.pu};
const IDEA=1792796467832,nw=R.filter(o=>o.t>IDEA);
console.log(`rounds ${R.length}, last ${new Date(R.at(-1).t).toISOString()}`);
{const L=run(nw,live,LIVE),b=run(nw,nogate,LIVE);console.log(`(1) since idea ${nw.length} rounds: no-gate ${J(stat(b))} live ${J(stat(L))} paired ${J(paired(nw,b,L))}`);
 for(let i=0;i<4;i++){const te=R.slice(Math.floor(R.length*i/4),Math.floor(R.length*(i+1)/4));const L=run(te,live,LIVE),b=run(te,nogate,LIVE);
  console.log(`   Q${i+1} ${new Date(te[0].t).toISOString().slice(5,10)}→${new Date(te.at(-1).t).toISOString().slice(5,10)} paired ${J(paired(te,b,L))} nogate ${J(stat(b))} live ${J(stat(L))}`);}}
const {tr,te}=split(.75);
const best=(cands,f)=>cands.map(c=>({c,tr:f(tr,c),te:f(te,c)})).sort((a,b)=>b.tr.c-a.tr.c);
// (2) band edges
{const C=[];for(const lo of[65,70,75,78,80])for(const hi of[85,88,90,93,95])C.push({lo,hi});
 const f=(set,c)=>stat(run(set,nogate,{...LIVE,lo:c.lo,hi:c.hi}));const r=best(C.filter(c=>f(tr,c).n>=150),f);
 console.log('\n(2) fav band, top 5 on train (≥150 train bets):');for(const x of r.slice(0,5)){const b=run(te,nogate,{...LIVE,...x.c}),L=run(te,live,LIVE),L2=run(te,nogate,LIVE);console.log(`   ${x.c.lo}–${x.c.hi}: train ${J(x.tr)} test ${J(x.te)} paired vs live ${J(paired(te,b,L))} vs 75–90 no-gate ${J(paired(te,b,L2))}`);}
 for(const c of[{lo:75,hi:90},{lo:80,hi:90},{lo:70,hi:90},{lo:75,hi:95}])console.log(`   fixed ${c.lo}–${c.hi}: train ${J(f(tr,c))} test ${J(f(te,c))}`);}
// (3) entry window
{const W=[[120],[120,180],[120,180,240],[120,180,240,300],[120,180,240,300,360],[120,180,240,300,360,420,480]];
 const f=(set,w)=>stat(run(set,nogate,{...LIVE,times:w}));const r=best(W,f);
 console.log('\n(3) fav entry window:');for(const x of r){const b=run(te,nogate,{...LIVE,times:x.c}),L=run(te,live,LIVE);console.log(`   to ${x.c.at(-1)/60}:00 train ${J(x.tr)} test ${J(x.te)} paired vs live ${J(paired(te,b,L))}`);}
 const Lt=run(te,live,LIVE);console.log(`   live on test ${J(stat(Lt))}; live on train ${J(stat(run(tr,live,LIVE)))}`);}
// (4) spreads
{const sp={};for(const o of R)for(const s of[120,180,240,300]){const a=o.at[s];if(!a)continue;const k=a.ya+a.na-100;sp[k]=(sp[k]||0)+1;}console.log('\n(4) spread (ya+na−100) at 2:00–5:00:',J(sp));}
