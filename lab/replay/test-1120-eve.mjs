// Nov 20 evening. Reference = pending proposal 2026-11-18a ("18a" = live rule at 4:00 (read ≥ ask+fee+3, 75–90¢), all hours,
// + 91–93¢ read-agreeing favourite add-on). Live = 2026-11-12c (same rule, 12–24 ET, no add-on).
// A) Forward: 18a since Nov 18 12:00 UTC; frozen lead package (Nov 16 eve: all hours, read<.4 exit at bid−1, x2 stake on edge ≥ median) since Nov 17.
// B) The 91–93 add-on itself (untested items from the NEXT list): read margin on adds (read ≥ ask+fee+m, m = −3/0/+3),
//    weekend-only / weekday-only adds, adds only 00–12 or only 12–24 ET. Paired vs 18a and vs all-hours-without-adds.
// C) Aimed at calls that turn against us by 5:00: sell-at-bid exit (bid−1, both fees) when read on our side < th at 5:00–10:00,
//    applied on top of 18a (th .3/.4/.45; to all bets, or 75–90 bets only / adds only). Expanding WF Q2–Q4.
import {R,feeP,stat} from './sim.mjs';import {et} from './lib.mjs';
const J=JSON.stringify,f=(v,d=3)=>(v>=0?'+':'')+v.toFixed(d);
const ms=d=>{if(!d.length)return{m:0,se:0,n:0};const m=d.reduce((s,v)=>s+v,0)/d.length;return{m,se:d.length>1?Math.sqrt(d.reduce((s,v)=>s+(v-m)**2,0)/(d.length-1)/d.length):0,n:d.length};};
const side=(a,c)=>c?a.ya:a.na,hr=o=>et(o.t).h,n=R.length,Qs=i=>[Math.floor(n*i/4),Math.floor(n*(i+1)/4)],EX=[300,360,420,480,600];
const wkend=o=>{const d=new Date(o.t-5*3600e3).getUTCDay();return d===0||d===6;};
function at(o,s,m=3,lo=75,hi=90){const a=o.at[s];if(!a||!a.f||a.ya==null||a.na==null||a.pu==null)return null;const c=a.pu>=.5?1:0,ask=side(a,c);
 if(ask<lo||ask>hi)return null;if(Math.max(a.pu,1-a.pu)*100<ask+feeP(ask)+m)return null;const won=o.up===c;
 return{t:o.t,o,c,ask,won,kind:'live',edge:Math.max(a.pu,1-a.pu)*100-ask-feeP(ask),pnl:(won?100-ask:-ask)-feeP(ask)};}
function fav(o,s,lo,hi,m=null){const a=o.at[s];if(!a||a.ya==null||a.na==null)return null;const c=a.ya>=a.na?1:0,ask=side(a,c);if(ask<lo||ask>hi)return null;
 if(a.pu!=null&&(a.pu>=.5?1:0)!==c)return null;if(m!=null&&(a.pu==null||Math.max(a.pu,1-a.pu)*100<ask+feeP(ask)+m))return null;
 const won=o.up===c;return{t:o.t,o,c,ask,won,kind:'add',pnl:(won?100-ask:-ask)-feeP(ask)};}
const exitP=(e,th)=>{if(!e)return e;const o=e.o;for(const s of EX){const a=o.at[s];if(!a||a.ya==null||a.na==null||a.pu==null)continue;const bid=100-side(a,1-e.c)-1;if(bid<1)continue;
 const ps=e.c?a.pu:1-a.pu;if(ps<th)return{...e,pnl:bid-e.ask-feeP(e.ask)-feeP(bid),exited:1};}return e;};
const Elive=R.map(o=>hr(o)<12?null:at(o,240));
const Eall=R.map(o=>at(o,240));
const E18=R.map(o=>at(o,240)||fav(o,240,91,93));
console.log(`${n} rounds ${new Date(R[0].t).toISOString().slice(0,10)} → ${new Date(R[n-1].t).toISOString().slice(0,16)}; 18a ${J(stat(E18.filter(Boolean)))} live ${J(stat(Elive.filter(Boolean)))}`);
// ---- A
for(const[lab,T]of[['since Nov 18 12:00 UTC',Date.UTC(2026,10,18,12)],['since Nov 20 12:00 UTC',Date.UTC(2026,10,20,12)]]){
 const idx=R.map((o,i)=>i).filter(i=>R[i].t>=T);const d=ms(idx.map(i=>(E18[i]?E18[i].pnl:0)-(Elive[i]?Elive[i].pnl:0)));
 console.log(`A 18a forward ${lab}: ${idx.length} rounds; 18a ${J(stat(idx.map(i=>E18[i]).filter(Boolean)))} live ${J(stat(idx.map(i=>Elive[i]).filter(Boolean)))} Δ ${f(d.m,2)}±${d.se.toFixed(2)} ¢/round; added ${J(stat(idx.filter(i=>E18[i]&&!Elive[i]).map(i=>E18[i])))}`);
 console.log('   bets:',idx.filter(i=>E18[i]).map(i=>{const e=E18[i];return `${new Date(e.t).toISOString().slice(5,16)} ${e.kind} ${e.ask}¢ ${e.won?'W':'L'}`;}).join('; '));}
{const F0=Date.UTC(2026,10,17);const s=Eall.filter(e=>e&&e.t<F0).map(e=>e.edge).sort((x,y)=>x-y),med=s[Math.floor(s.length/2)];
 const idx=R.map((o,i)=>i).filter(i=>R[i].t>=F0);const rs=idx.map(i=>{const e=Eall[i];if(!e)return{p:0,w:0};const w=e.edge>=med?2:1;return{p:exitP(e,.4).pnl*w,w,e};});
 const nb=rs.filter(r=>r.w).length,mw=rs.reduce((s,r)=>s+r.w,0)/(nb||1)||1;const d=ms(idx.map((i,j)=>rs[j].p/mw-(Elive[i]?Elive[i].pnl:0)));
 const pk=rs.filter(r=>r.e).map(r=>exitP(r.e,.4));
 console.log(`A package forward since Nov 17 00:00 UTC: ${idx.length} rounds, pkg ${nb} bets ${J(stat(pk))} exits ${pk.filter(x=>x.exited).length}; live ${J(stat(idx.map(i=>Elive[i]).filter(Boolean)))}; Δ ${f(d.m)}±${d.se.toFixed(3)} ¢/round`);}
// ---- menu
const MENU={'18a':(o,i)=>E18[i],'all hours, no adds':(o,i)=>Eall[i]};
for(const m of [-3,0,3])MENU[`add m${m}`]=(o,i)=>Eall[i]||fav(o,240,91,93,m);
MENU['add weekend only']=(o,i)=>Eall[i]||(wkend(o)?fav(o,240,91,93):null);
MENU['add weekday only']=(o,i)=>Eall[i]||(!wkend(o)?fav(o,240,91,93):null);
MENU['add 00-12 only']=(o,i)=>Eall[i]||(hr(o)<12?fav(o,240,91,93):null);
MENU['add 12-24 only']=(o,i)=>Eall[i]||(hr(o)>=12?fav(o,240,91,93):null);
for(const th of [.3,.4,.45]){
 MENU[`exit<${th} all`]=(o,i)=>exitP(E18[i],th);
 MENU[`exit<${th} 75-90`]=(o,i)=>E18[i]&&E18[i].kind==='live'?exitP(E18[i],th):E18[i];
 MENU[`exit<${th} adds`]=(o,i)=>E18[i]&&E18[i].kind==='add'?exitP(E18[i],th):E18[i];}
const E=Object.fromEntries(Object.entries(MENU).map(([k,fn])=>[k,R.map((o,i)=>fn(o,i))]));
const D=(k,ref,lo,hi)=>{const X=[];for(let i=lo;i<hi;i++){const e=E[k][i],l=E[ref][i];X.push((e?e.pnl:0)-(l?l.pnl:0));}return X;};
{const adds=E18.filter(e=>e&&e.kind==='add');const h2=R[Math.floor(n/2)].t;
 console.log(`\n91–93 adds: all ${J(stat(adds))} older ${J(stat(adds.filter(e=>e.t<h2)))} newer ${J(stat(adds.filter(e=>e.t>=h2)))} weekend ${J(stat(adds.filter(e=>wkend(e.o))))} weekday ${J(stat(adds.filter(e=>!wkend(e.o))))}`);
 const g={};adds.forEach(e=>{const a=e.o.at[240],ed=Math.max(a.pu,1-a.pu)*100-e.ask-feeP(e.ask),b=ed<-3?'<-3':ed<0?'-3..0':ed<3?'0..3':'>=3';(g[b]=g[b]||[]).push(e);});
 console.log('   by read edge:',Object.keys(g).map(b=>`${b} ${J(stat(g[b]))}`).join(' | '));}
console.log('\nvariants vs 18a (Δ¢/round):');
for(const k of Object.keys(MENU).slice(1)){const d=ms(D(k,'18a',0,n));const q=[0,1,2,3].map(i=>{const[a,b]=Qs(i);return f(ms(D(k,'18a',a,b)).m,2);}).join('/');
 const h2=ms(D(k,'18a',Math.floor(n/2),n));const nb=E[k].filter(Boolean).length,ex=E[k].filter(e=>e&&e.exited).length;
 console.log(`  ${k}: ${f(d.m)}±${d.se.toFixed(3)} (${(d.m/(d.se||1)).toFixed(1)} SE) Q ${q} newer half ${f(h2.m)}±${h2.se.toFixed(3)} | bets ${nb}${ex?` exits ${ex}`:''}`);}
function wf(keys,ref){const pooled=[],picks=[];let tb=0;for(let q=1;q<4;q++){const[a,b]=Qs(q);let best=ref,bv=0;for(const k of keys){const v=ms(D(k,ref,0,a)).m;if(v>bv){bv=v;best=k;}}
 picks.push(`Q${q+1} ${best}`);pooled.push(...D(best,ref,a,b));tb+=E[best].slice(a,b).filter(Boolean).length;}
 const p=ms(pooled);return `${picks.join(', ')} → ${f(p.m)}±${p.se.toFixed(3)} (${(p.m/(p.se||1)).toFixed(1)} SE; ${tb} test bets)`;}
const K=Object.keys(MENU);
console.log('\nWF B (add-on variants):',wf(K.filter(k=>k==='18a'||k.startsWith('add')||k.startsWith('all hours')),'18a'));
console.log('WF C (exits on 18a):',wf(K.filter(k=>k==='18a'||k.startsWith('exit')),'18a'));
// vs live too
{const L=E;L.live=Elive;const d=k=>{const x=ms(R.map((o,i)=>(E[k][i]?E[k][i].pnl:0)-(Elive[i]?Elive[i].pnl:0)));const[a,b]=Qs(3);const y=ms(R.slice(a,b).map((o,j)=>{const i=a+j;return (E[k][i]?E[k][i].pnl:0)-(Elive[i]?Elive[i].pnl:0);}));return `${f(x.m)}±${x.se.toFixed(3)}, newest 25% ${f(y.m)}±${y.se.toFixed(3)}`;};
 console.log('\nvs live 12c: 18a',d('18a'),'| exit<0.4 all',d('exit<0.4 all'),'| add m0',d('add m0'));}
