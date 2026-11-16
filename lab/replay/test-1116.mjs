// Nov 16 morning, under the 4:00 lock (one check at 4:00, live read gate read ≥ ask + fee + 3, 75–90¢, 12–24 ET).
// A) Implied-vs-realized volatility at the lock (Oct 30 watch: 60–74¢ favourites did well when Kalshi's implied vol IV was well ABOVE
//    BTC's realized vol RV60). IV from the 4:00 YES mid, distance to strike, time left − 40 s; r60 = log2(IV/RV60).
//    A1 forward check of the watch on rounds after Oct 30 12:00 UTC (never used to set it), 4:00 only.
//    A2 band extension: live read gate at 60–74¢ when r60 ≥ t, added to the live rule; paired ¢/round, expanding walk-forward Q2–Q4 choosing t.
//    A3 skip rule inside the live 75–90 band: skip when r60 < t (market more confident than realized vol), expanding walk-forward.
// B) read<th exit recheck (sell at bid−1 when read on our side < th at any check 5:00–10:00), expanding walk-forward.
// C) trading hours forward (00–12 ET added bets since Nov 13 12:00 UTC) and stake by read edge (double when edge ≥ median of earlier bets).
import fs from 'fs';import {R,feeP,stat} from './sim.mjs';import {et} from './lib.mjs';
const J=JSON.stringify,f=(v,d=3)=>(v>=0?'+':'')+v.toFixed(d);
const M=JSON.parse(fs.readFileSync('lab/data/candles.json'));const cb=t=>M[t]?.[4];
const n=R.length,Qs=i=>[Math.floor(n*i/4),Math.floor(n*(i+1)/4)];
const ms=d=>{if(!d.length)return{m:0,se:0,n:0};const m=d.reduce((s,v)=>s+v,0)/d.length;return{m,se:d.length>1?Math.sqrt(d.reduce((s,v)=>s+(v-m)**2,0)/(d.length-1)/d.length):0,n:d.length};};
const side=(a,c)=>c?a.ya:a.na,EX=[300,360,420,480,600];
function ninv(p){const a=[-39.69683028665376,220.9460984245205,-275.9285104469687,138.357751867269,-30.66479806614716,2.506628277459239],b=[-54.47609879822406,161.5853275888792,-155.6989798598866,66.80131188771972,-13.28068155288572],c=[-0.007784894002430293,-0.3223964580411365,-2.400758277161838,-2.549732539343734,4.374664141464968,2.938163982698783],d=[0.007784695709041462,0.3224671290700398,2.445134137142996,3.754408661907416];
 const pl=0.02425;let q,r;if(p<pl){q=Math.sqrt(-2*Math.log(p));return(((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5])/((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1);}
 if(p>1-pl){q=Math.sqrt(-2*Math.log(1-p));return-(((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5])/((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1);}
 q=p-0.5;r=q*q;return(((((a[0]*r+a[1])*r+a[2])*r+a[3])*r+a[4])*r+a[5])*q/(((((b[0]*r+b[1])*r+b[2])*r+b[3])*r+b[4])*r+1);}
function ivrv(o){const s=240,a=o.at[s],m=o.t+s*1000-60000,px=cb(m);if(!a||!px||a.ya==null||a.na==null)return null;
 let v=0,k=0;for(let i=0;i<60;i++){const x=cb(m-i*60000),y=cb(m-(i+1)*60000);if(x&&y){v+=Math.log(x/y)**2;k++;}}if(k<40)return null;
 const rv=Math.sqrt(v/k),mid=Math.min(.97,Math.max(.03,(a.ya+100-a.na)/200)),z=ninv(mid),d=Math.log(px/o.strike),tau=(900-s-40)/60;
 if(Math.sign(z)!==Math.sign(d)||Math.abs(z)<=0.15)return{mis:true,r60:null};return{mis:false,r60:Math.log2(Math.abs(d)/(Math.abs(z)*Math.sqrt(tau))/rv)};}
const V=new Map(R.map(o=>[o.t,ivrv(o)]));
// entry at the 4:00 lock. set: live (12–24 gate), all (gate all hours), fav (Kalshi favourite). lo/hi band.
function entry(o,set,lo=75,hi=90){const a=o.at[240];if(!a||!a.f||a.ya==null||a.na==null||a.pu==null)return null;const h=et(o.t).h;let c,ask;
 if(set==='fav'){c=a.ya>=a.na?1:0;ask=side(a,c);if(ask<lo||ask>hi)return null;}
 else{if(set==='live'&&h<12)return null;c=a.pu>=.5?1:0;ask=side(a,c);if(ask<lo||ask>hi)return null;if(Math.max(a.pu,1-a.pu)*100<ask+feeP(ask)+3)return null;}
 const won=o.up===c;return{t:o.t,c,ask,won,h,edge:Math.max(a.pu,1-a.pu)*100-ask-feeP(ask),hold:(won?100-ask:-ask)-feeP(ask),pnl:(won?100-ask:-ask)-feeP(ask)};}
console.log(`${n} rounds ${new Date(R[0].t).toISOString().slice(0,10)} → ${new Date(R[n-1].t).toISOString().slice(0,16)}`);
const out={A:{},B:{},C:{}};const SETS={'live 12–24':'live','live all hours':'all','fav all hours':'fav'};
// ---- A1 forward check of the Oct 30 watch
const W0=Date.UTC(2026,9,30,12);
for(const[sn,set]of[['fav 60–74 all hours','fav'],['fav 60–74 12–24','fav12'],['read gate 60–74 all hours','all'],['read gate 60–74 12–24','live']]){
 const E=R.map(o=>{if(set==='fav12'&&et(o.t).h<12)return null;return entry(o,set==='fav12'?'fav':set,60,74);}).filter(Boolean);
 const row={};for(const t of[0,0.5,0.75,1]){const sel=E.filter(e=>{const v=V.get(e.t);return v&&v.r60!=null&&v.r60>=t;});row[`r60≥${t}`]={before:stat(sel.filter(e=>e.t<W0)),after:stat(sel.filter(e=>e.t>=W0))};}
 row.all={before:stat(E.filter(e=>e.t<W0)),after:stat(E.filter(e=>e.t>=W0))};out.A[sn]=row;
 console.log(`A1 ${sn}: all before ${J(row.all.before)} after ${J(row.all.after)}`);for(const t of[0,0.5,0.75,1]){const x=row[`r60≥${t}`];console.log(`    r60≥${t}: before ${J(x.before)} | after Oct 30 ${J(x.after)}`);}}
// ---- A2 band extension, paired vs live (per round)
const TS=[0,0.25,0.5,0.75,1];
for(const[sn,set]of[['live 12–24','live'],['live all hours','all']]){
 const base=R.map(o=>entry(o,set)),ext=R.map(o=>entry(o,set,60,74.99));
 const D=(t,lo,hi)=>{const X=[];for(let i=lo;i<hi;i++){const e=ext[i];const v=e&&V.get(e.t);X.push(!base[i]&&e&&t!=null&&v&&v.r60!=null&&v.r60>=t?e.pnl:0);}return X;};
 const whole=Object.fromEntries(TS.map(t=>{const d=ms(D(t,0,n));const add=ext.filter((e,i)=>!base[i]&&e&&V.get(e.t)?.r60>=t);return[`r60≥${t}`,{m:+d.m.toFixed(3),se:+d.se.toFixed(3),added:stat(add)}];}));
 const pooled=[],picks=[];let tb=0;for(let i=1;i<4;i++){const[a,b]=Qs(i);let best=null,bv=0;for(const t of TS){const v=ms(D(t,0,a)).m;if(v>bv){bv=v;best=t;}}
  picks.push(`Q${i+1} ${best==null?'none':'≥'+best}`);pooled.push(...D(best,a,b));tb+=base.slice(a,b).filter(Boolean).length+(best==null?0:ext.slice(a,b).filter((e,j)=>!base[a+j]&&e&&V.get(e.t)?.r60>=best).length);}
 const p=ms(pooled);out.A['A2 '+sn]={whole,WF:{m:+p.m.toFixed(3),se:+p.se.toFixed(3),picks,testBets:tb}};
 console.log(`\nA2 ${sn} + 60–74 when r60≥t: base ${J(stat(base.filter(Boolean)))}`);for(const[k,v]of Object.entries(whole))console.log(`    ${k} Δ ${f(v.m)}±${v.se} added ${J(v.added)}`);
 console.log(`    WF ${picks.join(', ')} → ${f(p.m)}±${p.se.toFixed(3)} (${tb} test bets)`);}
// ---- A3 skip inside the band when r60 < t
const SK=[-1,-0.75,-0.5,-0.25,0];
for(const[sn,set]of Object.entries(SETS)){const E=R.map(o=>entry(o,set));const B=E.filter(Boolean);
 const qc=(()=>{const v=B.slice(0,Math.floor(B.length*.75)).map(e=>V.get(e.t)?.r60).filter(x=>x!=null).sort((a,b)=>a-b);return[.25,.5,.75].map(q=>+v[Math.floor(v.length*q)].toFixed(2));})();
 const bk=[-9,...qc,9],buck=[0,1,2,3].map(i=>stat(B.filter(e=>{const v=V.get(e.t)?.r60;return v!=null&&v>=bk[i]&&v<bk[i+1];})));const mis=stat(B.filter(e=>V.get(e.t)?.mis));
 const D=(t,lo,hi)=>{const X=[];for(let i=lo;i<hi;i++){const e=E[i];const v=e&&V.get(e.t);X.push(e&&t!=null&&v&&v.r60!=null&&v.r60<t?-e.pnl:0);}return X;};
 const whole=SK.map(t=>{const d=ms(D(t,0,n));return`<${t} ${f(d.m)}±${d.se.toFixed(3)}`;});
 const pooled=[],picks=[];let tb=0;for(let i=1;i<4;i++){const[a,b]=Qs(i);let best=null,bv=0;for(const t of SK){const v=ms(D(t,0,a)).m;if(v>bv){bv=v;best=t;}}
  picks.push(`Q${i+1} ${best==null?'live':'<'+best}`);pooled.push(...D(best,a,b));tb+=E.slice(a,b).filter(Boolean).length;}
 const p=ms(pooled);out.A['A3 '+sn]={base:stat(B),quartileCuts:qc,buckets:buck,mismatch:mis,whole,WF:{m:+p.m.toFixed(3),se:+p.se.toFixed(3),picks,testBets:tb}};
 console.log(`\nA3 ${sn}: base ${J(stat(B))}; r60 quartiles (cuts ${qc.join('/')}) ${buck.map(x=>`${x.c}±${x.se} (${x.n})`).join(' | ')}; mismatch ${mis.c}±${mis.se} (${mis.n})`);
 console.log(`    skip whole Δ¢/round ${whole.join(' | ')}; WF ${picks.join(', ')} → ${f(p.m)}±${p.se.toFixed(3)} (${tb} test bets)`);}
// ---- B read<th exit
function exitD(o,e,th){if(th==null)return 0;for(const s of EX){const a=o.at[s];if(!a||a.ya==null||a.na==null||a.pu==null)continue;const bid=100-side(a,1-e.c)-1;if(bid<1)continue;const ps=e.c?a.pu:1-a.pu;
 if(ps<th)return (bid-e.ask-feeP(e.ask)-feeP(bid))-e.hold;}return 0;}
const THS=[null,.3,.35,.4,.45,.5];
for(const [sn,set] of Object.entries(SETS)){const E=R.map(o=>{const e=entry(o,set);return e?{o,e}:null;});
 const D=(th,lo,hi)=>{const X=[];for(let i=lo;i<hi;i++){const x=E[i];X.push(x?exitD(x.o,x.e,th):0);}return X;};
 const whole=THS.slice(1).map(th=>{const d=ms(D(th,0,n));return`<${th} ${f(d.m,3)}±${d.se.toFixed(3)}`;});
 const pooled=[],picks=[];let tb=0;for(let i=1;i<4;i++){const[a,b]=Qs(i);let best=null,bv=0;for(const th of THS.slice(1)){const v=ms(D(th,0,a)).m;if(v>bv){bv=v;best=th;}}
  picks.push(`Q${i+1} ${best??'hold'}`);pooled.push(...D(best,a,b));tb+=E.slice(a,b).filter(Boolean).length;}
 const p=ms(pooled);const nb=E.filter(Boolean).length;const exits=E.filter(x=>x&&exitD(x.o,x.e,.4)!==0);
 out.B[sn]={bets:nb,whole,WF:{m:+p.m.toFixed(3),se:+p.se.toFixed(3),picks,testBets:tb},exits04:exits.length,exitsWon:exits.filter(x=>x.e.won).length,newest:exits.slice(-3).map(x=>new Date(x.e.t).toISOString().slice(0,16))};
 console.log(`\nB ${sn}: ${nb} bets; whole Δ¢/round ${whole.join(' | ')}; WF ${picks.join(', ')} → ${f(p.m)}±${p.se.toFixed(3)} (${tb} test bets); <.4 exits ${exits.length}, would have won ${exits.filter(x=>x.e.won).length}; newest ${out.B[sn].newest.join(', ')}`);}
// ---- C hours forward + stake by edge
const C0=Date.UTC(2026,10,13,12);const addAll=R.map(o=>{const e=entry(o,'all');return e&&e.h<12?e:null;}).filter(Boolean);
out.C.hours={since:stat(addAll.filter(e=>e.t>=C0)),whole:stat(addAll)};console.log(`\nC hours: 00–12 ET added bets since Nov 13 12:00 ${J(out.C.hours.since)}; whole ${J(out.C.hours.whole)}`);
for(const[sn,set]of[['live 12–24','live'],['live all hours','all']]){const B=R.map(o=>entry(o,set)).filter(Boolean);const nb=B.length,pooled=[],base=[];
 for(let i=1;i<4;i++){const a=Math.floor(nb*i/4),b=Math.floor(nb*(i+1)/4);const ed=B.slice(0,a).map(e=>e.edge).sort((x,y)=>x-y),med=ed[Math.floor(ed.length/2)];
  const T=B.slice(a,b),w=T.map(e=>e.edge>=med?2:1),mw=w.reduce((s,x)=>s+x,0)/w.length;T.forEach((e,j)=>{pooled.push(e.pnl*w[j]/mw);base.push(e.pnl);});}
 const d=ms(pooled.map((v,i)=>v-base[i])),pm=ms(pooled),bm=ms(base);out.C['stake '+sn]={WF:{m:+pm.m.toFixed(2),se:+pm.se.toFixed(2),base:+bm.m.toFixed(2),diff:+d.m.toFixed(2),diffSe:+d.se.toFixed(2),testBets:pooled.length}};
 console.log(`C stake by edge ${sn}: WF Q2–Q4 ${f(pm.m,2)} vs flat ${f(bm.m,2)} ¢/bet → Δ ${f(d.m,2)}±${d.se.toFixed(2)} (${pooled.length} test bets)`);}
fs.writeFileSync('/tmp/claude-0/t1116.json',J(out));
