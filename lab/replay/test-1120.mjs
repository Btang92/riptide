// Nov 20 morning. Reference = pending proposal 2026-11-18a ("18a" = live rule at 4:00 (read ≥ ask+fee+3, 75–90¢), all hours,
// + 91–93¢ read-agreeing favourite add-on). Live = 2026-11-12c (same rule, 12–24 ET, no add-on).
// A) Forward score of 18a (fixed config) since Nov 18 12:00 UTC and since Nov 20 00:00 UTC.
// B) Which rounds get bet: skip hour blocks under all hours (16–20, 16–18, 18–20, 17–19 ET; applied to every 18a bet, or to the 75–90 part only).
// C) Price paid inside the 75–90 part under all hours: cap 85/86/88, skip the 80–85 / 75–85 sub-band, margin 5/8 only in 85–90 or 80–85.
// Paired ¢/round vs 18a (1 contract), quarter split, expanding walk-forward Q2–Q4 over a menu incl. 18a.
import {R,feeP,stat} from './sim.mjs';import {et} from './lib.mjs';
const J=JSON.stringify,f=(v,d=3)=>(v>=0?'+':'')+v.toFixed(d);
const ms=d=>{if(!d.length)return{m:0,se:0,n:0};const m=d.reduce((s,v)=>s+v,0)/d.length;return{m,se:d.length>1?Math.sqrt(d.reduce((s,v)=>s+(v-m)**2,0)/(d.length-1)/d.length):0,n:d.length};};
const side=(a,c)=>c?a.ya:a.na,hr=o=>et(o.t).h,n=R.length,Qs=i=>[Math.floor(n*i/4),Math.floor(n*(i+1)/4)];
function at(o,s,m=3,lo=75,hi=90){const a=o.at[s];if(!a||!a.f||a.ya==null||a.na==null||a.pu==null)return null;const c=a.pu>=.5?1:0,ask=side(a,c);
 if(ask<lo||ask>hi)return null;if(m!=null&&Math.max(a.pu,1-a.pu)*100<ask+feeP(ask)+m)return null;const won=o.up===c;return{t:o.t,o,c,ask,won,s,kind:'live',pnl:(won?100-ask:-ask)-feeP(ask)};}
function fav(o,s,lo,hi){const a=o.at[s];if(!a||a.ya==null||a.na==null)return null;const c=a.ya>=a.na?1:0,ask=side(a,c);if(ask<lo||ask>hi)return null;
 if(a.pu!=null&&(a.pu>=.5?1:0)!==c)return null;const won=o.up===c;return{t:o.t,o,c,ask,won,s,kind:'add',pnl:(won?100-ask:-ask)-feeP(ask)};}
const Elive=R.map(o=>hr(o)<12?null:at(o,240));
const E18=R.map(o=>at(o,240)||fav(o,240,91,93));
console.log(`${n} rounds ${new Date(R[0].t).toISOString().slice(0,10)} → ${new Date(R[n-1].t).toISOString().slice(0,16)}; 18a ${J(stat(E18.filter(Boolean)))} live ${J(stat(Elive.filter(Boolean)))}`);
// A
for(const[lab,T]of[['since Nov 18 12:00 UTC',Date.UTC(2026,10,18,12)],['since Nov 20 00:00 UTC',Date.UTC(2026,10,20)],['since Nov 19 12:00 UTC',Date.UTC(2026,10,19,12)]]){
 const idx=R.map((o,i)=>i).filter(i=>R[i].t>=T);const d=ms(idx.map(i=>(E18[i]?E18[i].pnl:0)-(Elive[i]?Elive[i].pnl:0)));
 console.log(`A 18a forward ${lab}: ${idx.length} rounds; 18a ${J(stat(idx.map(i=>E18[i]).filter(Boolean)))} live ${J(stat(idx.map(i=>Elive[i]).filter(Boolean)))} Δ ${f(d.m,2)}±${d.se.toFixed(2)} ¢/round; added ${J(stat(idx.filter(i=>E18[i]&&!Elive[i]).map(i=>E18[i])))}`);}
// diagnostics
{const g={};E18.forEach(e=>{if(!e)return;const h=hr(e.o),b=String(Math.floor(h/2)*2).padStart(2,'0');(g[b]=g[b]||[]).push(e);});
 console.log('18a bets by 2-h ET block:',Object.keys(g).sort().map(b=>`${b} ${J(stat(g[b]))}`).join(' | '));}
{const g={};E18.forEach(e=>{if(!e||e.kind!=='live')return;const b=e.ask<78?'75-77':e.ask<80?'78-79':e.ask<83?'80-82':e.ask<86?'83-85':e.ask<88?'86-87':'88-90';(g[b]=g[b]||[]).push(e);});
 console.log('18a 75–90 bets by ask:',Object.keys(g).sort().map(b=>`${b} ${J(stat(g[b]))}`).join(' | '));
 const h2=R[Math.floor(n/2)].t;console.log('  newer half:',Object.keys(g).sort().map(b=>`${b} ${J(stat(g[b].filter(e=>e.t>=h2)))}`).join(' | '));}
const MENU={'18a':(o,i)=>E18[i]};
const blocks={'16-20':[16,20],'16-18':[16,18],'18-20':[18,20],'17-19':[17,19]};
for(const[k,[a,b]]of Object.entries(blocks)){
 MENU[`skip ${k} all`]=(o,i)=>{const h=hr(o);return h>=a&&h<b?null:E18[i];};
 MENU[`skip ${k} 75-90`]=(o,i)=>{const e=E18[i],h=hr(o);return e&&e.kind==='live'&&h>=a&&h<b?null:e;};}
for(const hi of [85,86,88])MENU[`cap ${hi}`]=(o,i)=>at(o,240,3,75,hi)||fav(o,240,91,93);
MENU['skip 80-85']=(o,i)=>{const e=E18[i];return e&&e.kind==='live'&&e.ask>=80&&e.ask<=85?fav(o,240,91,93):e;};
MENU['skip 75-85 (=86-90 only)']=(o,i)=>at(o,240,3,86,90)||fav(o,240,91,93);
for(const m of [5,8]){
 MENU[`m${m} in 85-90`]=(o,i)=>{const e=E18[i];if(e&&e.kind==='live'&&e.ask>=85&&!at(o,240,m,85,90))return fav(o,240,91,93);return e;};
 MENU[`m${m} in 80-85`]=(o,i)=>{const e=E18[i];if(e&&e.kind==='live'&&e.ask>=80&&e.ask<=85&&!at(o,240,m,80,85))return fav(o,240,91,93);return e;};}
const E=Object.fromEntries(Object.entries(MENU).map(([k,fn])=>[k,R.map((o,i)=>fn(o,i))]));
const D=(k,ref,lo,hi)=>{const X=[];for(let i=lo;i<hi;i++){const e=E[k][i],l=E[ref][i];X.push((e?e.pnl:0)-(l?l.pnl:0));}return X;};
console.log('\nvariants vs 18a (Δ¢/round):');
for(const k of Object.keys(MENU).slice(1)){const d=ms(D(k,'18a',0,n));const q=[0,1,2,3].map(i=>{const[a,b]=Qs(i);return f(ms(D(k,'18a',a,b)).m,2);}).join('/');
 const h2=ms(D(k,'18a',Math.floor(n/2),n));const nb=E[k].filter(Boolean).length,dropped=E18.filter((e,i)=>e&&!E[k][i]);
 console.log(`  ${k}: ${f(d.m)}±${d.se.toFixed(3)} (${(d.m/(d.se||1)).toFixed(1)} SE) Q ${q} newer half ${f(h2.m)}±${h2.se.toFixed(3)} | bets ${nb} | dropped ${J(stat(dropped))}`);}
function wf(keys,ref){const pooled=[],picks=[];let tb=0;for(let q=1;q<4;q++){const[a,b]=Qs(q);let best=ref,bv=0;for(const k of keys){const v=ms(D(k,ref,0,a)).m;if(v>bv){bv=v;best=k;}}
 picks.push(`Q${q+1} ${best}`);pooled.push(...D(best,ref,a,b));tb+=E[best].slice(a,b).filter(Boolean).length;}
 const p=ms(pooled);return `${picks.join(', ')} → ${f(p.m)}±${p.se.toFixed(3)} (${(p.m/(p.se||1)).toFixed(1)} SE; ${tb} test bets)`;}
const K=Object.keys(MENU);
console.log('\nWF B (hour blocks):',wf(K.filter(k=>k==='18a'||k.startsWith('skip 1')),'18a'));
console.log('WF C (price paid in 75–90):',wf(K.filter(k=>k==='18a'||/^(cap|m\d|skip [78])/.test(k)),'18a'));
console.log('WF all:',wf(K,'18a'));
// last-25% test (simple split) for each, for the report's "newest 25%" framing
{const[a,b]=Qs(3);console.log('\nnewest 25% only vs 18a:');for(const k of K.slice(1)){const x=ms(D(k,'18a',a,b));console.log(`  ${k}: ${f(x.m)}±${x.se.toFixed(3)} bets ${E[k].slice(a,b).filter(Boolean).length}`);}}
