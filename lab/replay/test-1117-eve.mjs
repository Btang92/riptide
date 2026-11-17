// Nov 17 evening, under the 4:00 lock (live 2026-11-12c: one check at 4:00, read ≥ ask + fee + 3, 75–90¢, 12–24 ET).
// A) Frozen lead package (Nov 16 eve) forward score on rounds from Nov 17 00:00 UTC only (same code as test-1117.mjs A).
// B) Second-chance entry re-test at the larger sample (last full test Nov 3 on 4,106 rounds): if the 4:00 check does not
//    clear, keep checking 5:00 / 6:00 / 7:00 / 8:00 with the same rule and bet the first that clears. Menu (incl. none)
//    chosen by expanding walk-forward Q2–Q4, paired ¢/round vs live. Aimed at the autopsy's persistent "missed chances".
// C) Margin by hour block (aimed at the 16–20 ET weakness, worst block 16 runs in a row): in 16–20 ET require read ≥ ask +
//    fee + m with m = 3 (live) / 5 / 8 / 12, or skip. Expanding WF Q2–Q4. (Skipping hour blocks was NOT PROVEN Nov 10.)
import fs from 'fs';import {R,feeP,stat} from './sim.mjs';import {et} from './lib.mjs';
const J=JSON.stringify,f=(v,d=3)=>(v>=0?'+':'')+v.toFixed(d);
const n=R.length,Qs=i=>[Math.floor(n*i/4),Math.floor(n*(i+1)/4)];
const ms=d=>{if(!d.length)return{m:0,se:0,n:0};const m=d.reduce((s,v)=>s+v,0)/d.length;return{m,se:d.length>1?Math.sqrt(d.reduce((s,v)=>s+(v-m)**2,0)/(d.length-1)/d.length):0,n:d.length};};
const side=(a,c)=>c?a.ya:a.na,EX=[300,360,420,480,600];
function at(o,s,m=3,lo=75,hi=90){const a=o.at[s];if(!a||!a.f||a.ya==null||a.na==null||a.pu==null)return null;const c=a.pu>=.5?1:0,ask=side(a,c);
 if(ask<lo||ask>hi)return null;if(Math.max(a.pu,1-a.pu)*100<ask+feeP(ask)+m)return null;const won=o.up===c;
 return{t:o.t,o,c,s,ask,won,edge:Math.max(a.pu,1-a.pu)*100-ask-feeP(ask),hold:(won?100-ask:-ask)-feeP(ask),pnl:(won?100-ask:-ask)-feeP(ask)};}
const hr=o=>et(o.t).h;
const live=o=>hr(o)<12?null:at(o,240);
console.log(`${n} rounds ${new Date(R[0].t).toISOString().slice(0,10)} → ${new Date(R[n-1].t).toISOString().slice(0,16)}`);
const out={A:{},B:{},C:{}};const Elive=R.map(live);
// ---- A frozen package forward
{const Eall=R.map(o=>at(o,240));
 const exitPnl=(e,th)=>{const o=e.o;for(const s of EX){const a=o.at[s];if(!a||a.ya==null||a.na==null||a.pu==null)continue;const bid=100-side(a,1-e.c)-1;if(bid<1)continue;const ps=e.c?a.pu:1-a.pu;
  if(ps<th)return bid-e.ask-feeP(e.ask)-feeP(bid);}return e.hold;};
 const F0=Date.UTC(2026,10,17);const s=Eall.filter(e=>e&&e.t<F0).map(e=>e.edge).sort((x,y)=>x-y),med=s[Math.floor(s.length/2)];
 const idx=R.map((o,i)=>i).filter(i=>R[i].t>=F0);const rs=idx.map(i=>{const e=Eall[i];if(!e)return{p:0,w:0};const w=e.edge>=med?2:1;return{p:exitPnl(e,.4)*w,w,e};});
 const nb=rs.filter(r=>r.w).length,mw=rs.reduce((s,r)=>s+r.w,0)/(nb||1)||1;const d=ms(idx.map((i,j)=>rs[j].p/mw-(Elive[i]?Elive[i].pnl:0)));
 const pk=rs.filter(r=>r.e).map(r=>({t:r.e.t,pnl:exitPnl(r.e,.4),won:r.e.won,ask:r.e.ask,exited:exitPnl(r.e,.4)!==r.e.hold}));
 out.A={rounds:idx.length,medEdge:+med.toFixed(2),pkgBets:nb,liveBets:idx.filter(i=>Elive[i]).length,diff:+d.m.toFixed(3),se:+d.se.toFixed(3),pkg:stat(pk),live:stat(idx.map(i=>Elive[i]).filter(Boolean)),
  bets:pk.map(b=>`${new Date(b.t).toISOString().slice(5,16)} ${b.ask}¢ ${b.won?'W':'L'}${b.exited?' exit':''} ${b.pnl.toFixed(1)}`)};
 console.log(`A frozen package forward: ${J(out.A)}`);}
// ---- B second-chance entry
const SC={none:[],'+5:00':[300],'+5–6':[300,360],'+5–7':[300,360,420],'+5–8':[300,360,420,480],'+6:00':[360],'+8:00':[480]};
for(const allH of[false,true]){const sn=allH?'all hours':'live 12–24';
 const E=Object.fromEntries(Object.entries(SC).map(([k,T])=>[k,R.map(o=>{if(!allH&&hr(o)<12)return null;const b=at(o,240);if(b)return b;for(const s of T){const x=at(o,s);if(x)return x;}return null;})]));
 const base=allH?E.none:Elive;
 const D=(k,lo,hi)=>{const X=[];for(let i=lo;i<hi;i++){const e=E[k][i],l=base[i];X.push((e?e.pnl:0)-(l?l.pnl:0));}return X;};
 const whole={};for(const k of Object.keys(SC).slice(1)){const add=E[k].filter((e,i)=>e&&!base[i]);const d=ms(D(k,0,n));
  const q=[0,1,2,3].map(i=>{const[a,b]=Qs(i);return f(ms(D(k,a,b)).m,2);}).join('/');
  const fw=add.filter(e=>e.t>=Date.UTC(2026,10,3,12));whole[k]={d:`${f(d.m)}±${d.se.toFixed(3)}`,added:stat(add),quarters:q,addedSinceNov3:stat(fw)};}
 const pooled=[],picks=[];let tb=0;for(let q=1;q<4;q++){const[a,b]=Qs(q);let best='none',bv=0;for(const k of Object.keys(SC)){const v=ms(D(k,0,a)).m;if(v>bv){bv=v;best=k;}}
  picks.push(`Q${q+1} ${best}`);pooled.push(...D(best,a,b));tb+=E[best].slice(a,b).filter(Boolean).length;}
 const p=ms(pooled);out.B[sn]={whole,WF:{m:+p.m.toFixed(3),se:+p.se.toFixed(3),picks,testBets:tb}};
 console.log(`\nB second chance, ${sn} (vs ${allH?'4:00-only all hours':'live'}):`);for(const[k,v]of Object.entries(whole))console.log(`   ${k}: Δ¢/round ${v.d} quarters ${v.quarters} | added ${J(v.added)} | added since Nov 3 12:00 ${J(v.addedSinceNov3)}`);
 console.log(`   WF ${picks.join(', ')} → ${f(p.m)}±${p.se.toFixed(3)} (${tb} test bets)`);}
// ---- C margin in 16–20 ET
const MC={live:3,m5:5,m8:8,m12:12,skip:null};
for(const[blk,h0,h1]of[['16–20',16,20],['16–18',16,18],['18–20',18,20]]){
 const E=Object.fromEntries(Object.entries(MC).map(([k,m])=>[k,R.map(o=>{const h=hr(o);if(h<12)return null;if(h>=h0&&h<h1){if(m==null)return null;return at(o,240,m);}return at(o,240);})]));
 const D=(k,lo,hi)=>{const X=[];for(let i=lo;i<hi;i++){const e=E[k][i],l=Elive[i];X.push((e?e.pnl:0)-(l?l.pnl:0));}return X;};
 const blockBets=stat(Elive.filter(e=>e&&hr(e.o)>=h0&&hr(e.o)<h1)),rest=stat(Elive.filter(e=>e&&!(hr(e.o)>=h0&&hr(e.o)<h1)));
 const whole={};for(const k of Object.keys(MC).slice(1)){const d=ms(D(k,0,n));const drop=Elive.filter((e,i)=>e&&!E[k][i]);whole[k]={d:`${f(d.m)}±${d.se.toFixed(3)}`,dropped:stat(drop)};}
 const pooled=[],picks=[];let tb=0;for(let q=1;q<4;q++){const[a,b]=Qs(q);let best='live',bv=0;for(const k of Object.keys(MC)){const v=ms(D(k,0,a)).m;if(v>bv){bv=v;best=k;}}
  picks.push(`Q${q+1} ${best}`);pooled.push(...D(best,a,b));tb+=E[best].slice(a,b).filter(Boolean).length;}
 const p=ms(pooled);out.C[blk]={blockBets,rest,whole,WF:{m:+p.m.toFixed(3),se:+p.se.toFixed(3),picks,testBets:tb}};
 console.log(`\nC margin in ${blk} ET: block live bets ${J(blockBets)} vs rest ${J(rest)}`);for(const[k,v]of Object.entries(whole))console.log(`   ${k}: Δ¢/round ${v.d} | dropped ${J(v.dropped)}`);
 console.log(`   WF ${picks.join(', ')} → ${f(p.m)}±${p.se.toFixed(3)} (${tb} test bets)`);}
fs.writeFileSync(process.env.OUT||'/tmp/claude-0/t1117eve.json',J(out));
