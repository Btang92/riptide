// Nov 19 morning. Baseline = live 2026-11-12c (4:00 lock, read ≥ ask+fee+3, 75–90¢, 12–24 ET); pending proposal 2026-11-18a
// = all hours + buy the 91–93¢ favourite at 4:00 when the live rule doesn't bet ("all+f93").
// A) Forward score of 18a (fixed config) from Nov 19 00:00 UTC, and since Nov 18 12:00 UTC.
// B) Second-chance 91–93¢ favourite: if nothing bets at 4:00, buy our side when it is the 91–93 (or 91–96 read-gated)
//    favourite at the first of 5:00 / 6:00 (cutoff variants). Changes which rounds get bet.
// C) Upper-band seam on top of 18a: favourite 89–93 / 90–93 without the read gate, 91–94, and read margin 0 at 86–90¢.
// Every variant scored as paired ¢/round vs 18a and vs live; expanding walk-forward Q2–Q4 over a menu including 18a.
import {R,feeP,stat} from './sim.mjs';import {et} from './lib.mjs';
const J=JSON.stringify,f=(v,d=3)=>(v>=0?'+':'')+v.toFixed(d);
const ms=d=>{if(!d.length)return{m:0,se:0,n:0};const m=d.reduce((s,v)=>s+v,0)/d.length;return{m,se:d.length>1?Math.sqrt(d.reduce((s,v)=>s+(v-m)**2,0)/(d.length-1)/d.length):0,n:d.length};};
const side=(a,c)=>c?a.ya:a.na,hr=o=>et(o.t).h,n=R.length,Qs=i=>[Math.floor(n*i/4),Math.floor(n*(i+1)/4)];
function at(o,s,m=3,lo=75,hi=90){const a=o.at[s];if(!a||!a.f||a.ya==null||a.na==null||a.pu==null)return null;const c=a.pu>=.5?1:0,ask=side(a,c);
 if(ask<lo||ask>hi)return null;if(m!=null&&Math.max(a.pu,1-a.pu)*100<ask+feeP(ask)+m)return null;const won=o.up===c;return{t:o.t,o,c,ask,won,s,pnl:(won?100-ask:-ask)-feeP(ask)};}
function fav(o,s,lo,hi,needRead=true){const a=o.at[s];if(!a||a.ya==null||a.na==null)return null;const c=a.ya>=a.na?1:0,ask=side(a,c);if(ask<lo||ask>hi)return null;
 if(needRead&&a.pu!=null&&(a.pu>=.5?1:0)!==c)return null;const won=o.up===c;return{t:o.t,o,c,ask,won,s,pnl:(won?100-ask:-ask)-feeP(ask)};}
const live=o=>hr(o)<12?null:at(o,240);const Elive=R.map(live);
const base=o=>at(o,240)||fav(o,240,91,93);const Ebase=R.map(base);
console.log(`${n} rounds ${new Date(R[0].t).toISOString().slice(0,10)} → ${new Date(R[n-1].t).toISOString().slice(0,16)}`);
// A forward
const N19=Date.UTC(2026,10,19),N18m=Date.UTC(2026,10,18,12);
for(const[lab,T]of[['since Nov 19 00:00 UTC',N19],['since Nov 18 12:00 UTC',N18m]]){const idx=R.map((o,i)=>i).filter(i=>R[i].t>=T);
 const d=ms(idx.map(i=>(Ebase[i]?Ebase[i].pnl:0)-(Elive[i]?Elive[i].pnl:0)));
 console.log(`A 18a forward ${lab}: ${idx.length} rounds; 18a ${J(stat(idx.map(i=>Ebase[i]).filter(Boolean)))} live ${J(stat(idx.map(i=>Elive[i]).filter(Boolean)))} Δ ${f(d.m,2)}±${d.se.toFixed(2)} ¢/round; added ${J(stat(idx.filter(i=>Ebase[i]&&!Elive[i]).map(i=>Ebase[i])))}`);}
// B + C menu (each on top of 18a)
const later=(o,ss,fn)=>{for(const s of ss){const e=fn(o,s);if(e)return e;}return null;};
const MENU={
 '18a':(o,i)=>Ebase[i],
 live:(o,i)=>Elive[i],
 '18a+sc93@5':(o,i)=>Ebase[i]||later(o,[300],(o,s)=>fav(o,s,91,93)),
 '18a+sc93@5-6':(o,i)=>Ebase[i]||later(o,[300,360],(o,s)=>fav(o,s,91,93)),
 '18a+sc96m0@5-6':(o,i)=>Ebase[i]||later(o,[300,360],(o,s)=>at(o,s,0,91,96)),
 '18a+sc93@5-8':(o,i)=>Ebase[i]||later(o,[300,360,420,480],(o,s)=>fav(o,s,91,93)),
 '18a+f90-93':(o,i)=>Ebase[i]||fav(o,240,90,93),
 '18a+f89-93':(o,i)=>Ebase[i]||fav(o,240,89,93),
 '18a+f94':(o,i)=>Ebase[i]||fav(o,240,94,94),
 '18a+m0@86-90':(o,i)=>Ebase[i]||at(o,240,0,86,90),
 '18a+m0@75-90':(o,i)=>Ebase[i]||at(o,240,0,75,90),
};
const E=Object.fromEntries(Object.entries(MENU).map(([k,fn])=>[k,R.map(fn)]));
const D=(k,ref,lo,hi)=>{const X=[];for(let i=lo;i<hi;i++){const e=E[k][i],l=E[ref][i];X.push((e?e.pnl:0)-(l?l.pnl:0));}return X;};
console.log('\nB/C variants vs 18a (Δ¢/round), and vs live:');
for(const k of Object.keys(MENU).slice(2)){const d=ms(D(k,'18a',0,n)),dl=ms(D(k,'live',0,n)),add=E[k].filter((e,i)=>e&&!Ebase[i]);
 const q=[0,1,2,3].map(i=>{const[a,b]=Qs(i);const x=ms(D(k,'18a',a,b));return `${f(x.m,2)}±${x.se.toFixed(2)}`;}).join(' / ');
 const h2=ms(D(k,'18a',Math.floor(n/2),n));
 console.log(`  ${k}: vs18a ${f(d.m)}±${d.se.toFixed(3)} (${(d.m/(d.se||1)).toFixed(1)} SE) | Q ${q} | newer half ${f(h2.m)}±${h2.se.toFixed(3)} | vs live ${f(dl.m)}±${dl.se.toFixed(3)} | added ${J(stat(add))} | added newer half ${J(stat(add.filter(e=>e.t>=R[Math.floor(n/2)].t)))}`);}
function wf(keys,ref){const pooled=[],picks=[];let tb=0,ab=0;for(let q=1;q<4;q++){const[a,b]=Qs(q);let best=ref,bv=0;for(const k of keys){const v=ms(D(k,ref,0,a)).m;if(v>bv){bv=v;best=k;}}
 picks.push(`Q${q+1} ${best}`);pooled.push(...D(best,ref,a,b));tb+=E[best].slice(a,b).filter(Boolean).length;ab+=E[best].slice(a,b).filter((e,j)=>e&&!E[ref][a+j]).length;}
 const p=ms(pooled);return `${picks.join(', ')} → ${f(p.m)}±${p.se.toFixed(3)} (${(p.m/(p.se||1)).toFixed(1)} SE; ${tb} test bets, ${ab} added vs ${ref})`;}
console.log('\nWF B (second chance) vs 18a:',wf(['18a','18a+sc93@5','18a+sc93@5-6','18a+sc96m0@5-6','18a+sc93@5-8'],'18a'));
console.log('WF C (seam) vs 18a:',wf(['18a','18a+f90-93','18a+f89-93','18a+f94','18a+m0@86-90','18a+m0@75-90'],'18a'));
console.log('WF all vs 18a:',wf(Object.keys(MENU).filter(k=>k!=='live'),'18a'));
// sanity: price-binned favourite at 5:00/6:00 for rounds where nothing bet at 4:00
{const g={};R.forEach((o,i)=>{if(Ebase[i])return;for(const s of [300,360,480]){const a=o.at[s];if(!a||a.ya==null)continue;const c=a.ya>=a.na?1:0,ask=side(a,c);
 const b=ask>=97?'97+':ask>=91?'91–96':ask>=85?'85–90':ask>=75?'75–84':'<75';const won=o.up===c;(g[s+' '+b]=g[s+' '+b]||[]).push({won,ask,pnl:(won?100-ask:-ask)-feeP(ask)});}});
 console.log('\nfavourite by later checkpoint when 18a skipped 4:00:');for(const k of Object.keys(g).sort())console.log('  ',k,J(stat(g[k])));}
