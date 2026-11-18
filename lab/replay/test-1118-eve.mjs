// Nov 18 evening, under the 4:00 lock (live 2026-11-12c: one check at 4:00, read ≥ ask + fee + 3, 75–90¢, 12–24 ET).
// A) Forward scores of open leads: 18–20 ET skip (from Nov 18 00:00 UTC), all-hours extension (added 00–12 ET bets from
//    Nov 12 12:00 and Nov 17 00:00 UTC), 91–93 favourite add-on at 4:00 (from Nov 8 12:00 and Nov 18 12:00 UTC).
// B) New combined candidate: the two strongest single leads together — all hours + buy the 91–93¢ (or 91–96 read≥ask+fee)
//    favourite at 4:00 when the live rule doesn't bet. Menu chosen by expanding walk-forward Q2–Q4 (incl. live), paired
//    ¢/round vs live; also the fixed combo with no selection by quarter and by week.
// C) New: entry price by side-specific spread — at 4:00 our side's ask vs (100 − other side's ask) i.e. bid; rounds where our
//    side's bid–ask is wider than 1¢ (stale/thin book) — skip or not. Aimed at the real-fill gap (~0.7¢) seen Nov 18.
import {R,feeP,stat} from './sim.mjs';import {et} from './lib.mjs';
const J=JSON.stringify,f=(v,d=3)=>(v>=0?'+':'')+v.toFixed(d);
const ms=d=>{if(!d.length)return{m:0,se:0,n:0};const m=d.reduce((s,v)=>s+v,0)/d.length;return{m,se:d.length>1?Math.sqrt(d.reduce((s,v)=>s+(v-m)**2,0)/(d.length-1)/d.length):0,n:d.length};};
const side=(a,c)=>c?a.ya:a.na,hr=o=>et(o.t).h,n=R.length,Qs=i=>[Math.floor(n*i/4),Math.floor(n*(i+1)/4)];
function at(o,s,m=3,lo=75,hi=90){const a=o.at[s];if(!a||!a.f||a.ya==null||a.na==null||a.pu==null)return null;const c=a.pu>=.5?1:0,ask=side(a,c);
 if(ask<lo||ask>hi)return null;if(m!=null&&Math.max(a.pu,1-a.pu)*100<ask+feeP(ask)+m)return null;const won=o.up===c;return{t:o.t,o,c,ask,won,pnl:(won?100-ask:-ask)-feeP(ask)};}
function fav(o,s,lo,hi){const a=o.at[s];if(!a||a.ya==null||a.na==null)return null;const c=a.ya>=a.na?1:0,ask=side(a,c);if(ask<lo||ask>hi)return null;const won=o.up===c;return{t:o.t,o,c,ask,won,pnl:(won?100-ask:-ask)-feeP(ask)};}
const live=o=>hr(o)<12?null:at(o,240);const Elive=R.map(live);
console.log(`${n} rounds ${new Date(R[0].t).toISOString().slice(0,10)} → ${new Date(R[n-1].t).toISOString().slice(0,16)}`);
// A
const N18=Date.UTC(2026,10,18),N17=Date.UTC(2026,10,17),N12=Date.UTC(2026,10,12,12),N8=Date.UTC(2026,10,8,12),N18m=Date.UTC(2026,10,18,12);
const b1820=Elive.filter(e=>e&&hr(e.o)>=18&&hr(e.o)<20);
console.log('A 18–20 ET live bets all',J(stat(b1820)),'since Nov 18 00:00',J(stat(b1820.filter(e=>e.t>=N18))),'since Nov 17 00:00',J(stat(b1820.filter(e=>e.t>=N17))));
const add00=R.map(o=>hr(o)<12?at(o,240):null).filter(Boolean);
console.log('A all-hours added 00–12 bets: all',J(stat(add00)),'since Nov 12 12:00',J(stat(add00.filter(e=>e.t>=N12))),'since Nov 17',J(stat(add00.filter(e=>e.t>=N17))));
const addF=R.map((o,i)=>!Elive[i]&&hr(o)>=12?fav(o,240,91,93):null).filter(Boolean),addFa=R.map((o,i)=>{if(hr(o)>=12&&Elive[i])return null;if(hr(o)<12&&at(o,240))return null;return fav(o,240,91,93);}).filter(Boolean);
console.log('A 91–93 fav add-on live hrs: since Nov 8',J(stat(addF.filter(e=>e.t>=N8))),'since Nov 18 12:00',J(stat(addF.filter(e=>e.t>=N18m))),'| all hrs since Nov 8',J(stat(addFa.filter(e=>e.t>=N8))));
// B
const MENU={
 live:(o,i)=>Elive[i],
 all:(o,i)=>at(o,240),
 'live+f93':(o,i)=>hr(o)<12?null:(at(o,240)||fav(o,240,91,93)),
 'all+f93':(o,i)=>at(o,240)||fav(o,240,91,93),
 'all+f96m0':(o,i)=>at(o,240)||at(o,240,0,91,96),
 'all+f96':(o,i)=>at(o,240)||fav(o,240,91,96)};
const E=Object.fromEntries(Object.entries(MENU).map(([k,fn])=>[k,R.map(fn)]));
const D=(k,lo,hi)=>{const X=[];for(let i=lo;i<hi;i++){const e=E[k][i],l=Elive[i];X.push((e?e.pnl:0)-(l?l.pnl:0));}return X;};
console.log('\nB combined candidates vs live (Δ¢/round):');
for(const k of Object.keys(MENU).slice(1)){const d=ms(D(k,0,n)),add=E[k].filter((e,i)=>e&&!Elive[i]);
 const q=[0,1,2,3].map(i=>{const[a,b]=Qs(i);const x=ms(D(k,a,b));return `${f(x.m,2)}±${x.se.toFixed(2)}`;}).join(' / ');
 const h2=ms(D(k,Math.floor(n/2),n));
 console.log(`  ${k}: whole ${f(d.m)}±${d.se.toFixed(3)} (${(d.m/d.se).toFixed(1)} SE) | quarters ${q} | newer half ${f(h2.m)}±${h2.se.toFixed(3)} | added ${J(stat(add))} | all bets ${J(stat(E[k].filter(Boolean)))} | added since Nov 12 12:00 ${J(stat(add.filter(e=>e.t>=N12)))}`);}
{const pooled=[],picks=[];let tb=0,ab=0;for(let q=1;q<4;q++){const[a,b]=Qs(q);let best='live',bv=0;for(const k of Object.keys(MENU)){const v=ms(D(k,0,a)).m;if(v>bv){bv=v;best=k;}}
 picks.push(`Q${q+1} ${best}`);pooled.push(...D(best,a,b));tb+=E[best].slice(a,b).filter(Boolean).length;ab+=E[best].slice(a,b).filter((e,j)=>e&&!Elive[a+j]).length;}
 const p=ms(pooled);console.log(`  WF ${picks.join(', ')} → ${f(p.m)}±${p.se.toFixed(3)} (${(p.m/p.se).toFixed(1)} SE; ${tb} test bets, ${ab} added)`);}
// weekly for fixed all+f93
{const wk={};R.forEach((o,i)=>{const w=new Date(o.t-((new Date(o.t).getUTCDay()+6)%7)*864e5).toISOString().slice(5,10);const e=E['all+f93'][i],l=Elive[i];(wk[w]=wk[w]||[]).push((e?e.pnl:0)-(l?l.pnl:0));});
 console.log('  all+f93 by week Δ¢/round:',Object.entries(wk).map(([k,v])=>`${k} ${f(ms(v).m,2)}`).join(', '));}
// C spread at 4:00 for live bets
{const g={};Elive.forEach((e,i)=>{if(!e)return;const a=R[i].at[240];const ov=a.ya+a.na-100;const k=ov<=0?'≤0':ov===1?'1':'≥2';(g[k]=g[k]||[]).push(e);});
 console.log('\nC live bets by overround at 4:00:',Object.entries(g).map(([k,v])=>`${k}: ${J(stat(v))}`).join(' | '));
 const ga={};R.forEach(o=>{const e=at(o,240);if(!e)return;const a=o.at[240];const ov=a.ya+a.na-100;const k=ov<=0?'≤0':ov===1?'1':'≥2';(ga[k]=ga[k]||[]).push(e);});
 console.log('C all-hours rule bets by overround:',Object.entries(ga).map(([k,v])=>`${k}: ${J(stat(v))}`).join(' | '));}
