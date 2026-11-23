// Nov 23 evening. Live = 2026-11-18a (approved Nov 23 13:49 UTC).
// A) Live check: server calls since approval (hours, fav93 add-on honoured?).
// B) The app's LEARNED BLOCKS (learner(): 3-h ET hour buckets, entry bands 0–54/55–64/65–74/75–84/85–99, regime) — a bucket is
//    blocked when >=30 priced calls, mean ¢/ct after fees < −2 and mean+se < 0, using every settled live call (calls.json, side
//    bought at the call's ask). The lab has always replayed the rule WITHOUT these blocks. Rebuild them causally (only calls settled
//    before each round's 4:00), validate against the blocks live shows now, and score 18a with vs without blocks (paired ¢/round).
// C) Scale-in at 5:00 on top of 18a: +1 contract at the 5:00 ask (+1¢ slippage) if the live rule still clears at 5:00 / our side
//    still favourite ≤93 and read agrees / 5:00 ask ≥ or ≤ the 4:00 ask. Paired ¢/round, quarters, expanding WF Q2–Q4.
import fs from 'node:fs';import {R,feeP,stat} from './sim.mjs';import {et} from './lib.mjs';
const M=JSON.parse(fs.readFileSync('lab/data/candles.json')),C=JSON.parse(fs.readFileSync('lab/data/calls.json'));
const J=JSON.stringify,f=(v,d=3)=>(v>=0?'+':'')+v.toFixed(d);
const ms=d=>{if(!d.length)return{m:0,se:0,n:0};const m=d.reduce((s,v)=>s+v,0)/d.length;return{m,se:d.length>1?Math.sqrt(d.reduce((s,v)=>s+(v-m)**2,0)/(d.length-1)/d.length):0,n:d.length};};
const side=(a,c)=>c?a.ya:a.na,hr=o=>et(o.t).h,n=R.length,Qs=(i,N=n)=>[Math.floor(N*i/4),Math.floor(N*(i+1)/4)];
function at(o,s,m=3,lo=75,hi=90){const a=o.at[s];if(!a||!a.f||a.ya==null||a.na==null||a.pu==null)return null;const c=a.pu>=.5?1:0,ask=side(a,c);
 if(ask<lo||ask>hi)return null;if(Math.max(a.pu,1-a.pu)*100<ask+feeP(ask)+m)return null;const won=o.up===c;
 return{t:o.t,o,c,ask,won,kind:'live',pnl:(won?100-ask:-ask)-feeP(ask)};}
function fav(o,s,lo,hi){const a=o.at[s];if(!a||a.ya==null||a.na==null)return null;const c=a.ya>=a.na?1:0,ask=side(a,c);if(ask<lo||ask>hi)return null;
 if(a.pu!=null&&(a.pu>=.5?1:0)!==c)return null;const won=o.up===c;return{t:o.t,o,c,ask,won,kind:'add',pnl:(won?100-ask:-ask)-feeP(ask)};}
const Eall=R.map(o=>at(o,240)),Eadd=R.map((o,i)=>Eall[i]?null:fav(o,240,91,93)),E18=R.map((o,i)=>Eall[i]||Eadd[i]);
console.log(`${n} rounds → ${new Date(R[n-1].t).toISOString().slice(0,16)}; 18a ${J(stat(E18.filter(Boolean)))}`);
// ---- A
{const T=Date.UTC(2026,10,23,13,49);const x=C.filter(z=>z.start+240000>=T);
 console.log(`\nA) server calls since approval: ${x.length}; not skipped ${x.filter(z=>!z.skip).length}; hour-skips ${x.filter(z=>/hour \d/.test(z.skipWhy||'')).length}; 91–93 favourite the read agreed with: ${x.filter(z=>z.ask>=91&&z.ask<=93&&z.ask===Math.max(z.ya,z.na)).map(z=>new Date(z.start).toISOString().slice(11,16)+' '+z.ask+'¢ '+(z.skip?'SKIPPED('+z.skipWhy+')':'bet')).join('; ')||'none'}`);
 const lb=x.filter(z=>/learned block/.test(z.skipWhy||''));console.log(`   learned-block skips ${lb.length}; blocked ONLY by learning: ${x.filter(z=>z.skipWhy&&z.skipWhy.split('; ').every(s=>/^learned block/.test(s))).map(z=>new Date(z.start).toISOString().slice(11,16)+' '+z.side+' '+z.ask+'¢ '+(z.result||'open')+' ['+z.skipWhy.replace('learned block: ','')+']').join('; ')}`);}
// ---- B: learned blocks
const pad=v=>String(v).padStart(2,'0'),hb=ts=>Math.floor(et(ts).h/3)*3,band=a=>a<55?'0–54¢':a<65?'55–64¢':a<75?'65–74¢':a<85?'75–84¢':'85–99¢';
const P=C.filter(z=>z.result&&z.ask!=null).map(z=>({ts:z.ts,end:z.start+900000,v:(z.result==='WIN'?100-z.ask:-z.ask)-feeP(z.ask),keys:['h'+pad(hb(z.ts)),'p'+band(z.ask),...(z.regime?['r'+z.regime]:[])]})).sort((a,b)=>a.end-b.end);
function blocksAt(T){const B={};for(const r of P){if(r.end>T)break;for(const k of r.keys){const x=(B[k]??={n:0,s:0,q:0});x.n++;x.s+=r.v;x.q+=r.v*r.v;}}
 const out=new Set();for(const[k,x]of Object.entries(B)){const m=x.s/x.n,se=Math.sqrt(Math.max(0,x.q/x.n-m*m)/x.n);if(x.n>=30&&m<-2&&m+se<0)out.add(k);}return out;}
console.log(`\nB) blocks now (rebuilt from ${P.length} priced calls): ${[...blocksAt(Date.now())].join(', ')}  | live shows: p65–74¢, p75–84¢, rTRENDING UP, h15, h18`);
// regime: call's own if a call exists, else from candles (30 one-min bars up to 4:00)
const callBy=new Map(C.map(z=>[z.start,z]));
function regime(o){const z=callBy.get(o.t);if(z&&z.regime)return z.regime;const c=[];for(let i=29;i>=0;i--){const x=M[o.t+180000-i*60000];if(x)c.push(x);}if(c.length<20)return null;
 const cl=c.map(x=>x[4]),N=cl.length,xm=(N-1)/2,ym=cl.reduce((a,b)=>a+b)/N;let nu=0,de=0;cl.forEach((y,i)=>{nu+=(i-xm)*(y-ym);de+=(i-xm)**2;});
 const sl=nu/de,atr=c.reduce((s,x)=>s+(x[2]-x[1]),0)/N,st=Math.abs(sl*N)/atr;return st>4?(sl>0?'TRENDING UP':'TRENDING DOWN'):'CONSOLIDATION';}
{let ag=0,tot=0;for(const o of R.slice(-1500)){const z=callBy.get(o.t);if(!z||!z.regime)continue;const r0=z.regime;z.regime=null;const r1=regime(o);z.regime=r0;tot++;ag+=r1===r0;}console.log(`   candle-rebuilt regime agrees with live call regime ${(ag/tot*100).toFixed(1)}% (${tot})`);}
const T0=Date.UTC(2026,9,24);const idx=R.map((o,i)=>i).filter(i=>R[i].t>=T0);let cache={},ck=-1;
const why=[];const EB=R.map((o,i)=>{const e=E18[i];if(!e||o.t<T0)return e;const day=Math.floor((o.t+240000)/3600000);if(day!==ck){cache=blocksAt(o.t+240000);ck=day;}
 const k=['h'+pad(hb(o.t+240000)),'p'+band(e.ask),'r'+regime(o)].filter(x=>cache.has(x));if(k.length){why[i]=k;return null;}return e;});
const D=(A,B,ix)=>ix.map(i=>(A[i]?A[i].pnl:0)-(B[i]?B[i].pnl:0));
{const d=ms(D(EB,E18,idx)),blk=idx.filter(i=>E18[i]&&!EB[i]);console.log(`   since Oct 24: ${idx.length} rounds; 18a ${J(stat(idx.map(i=>E18[i]).filter(Boolean)))}; 18a+blocks ${J(stat(idx.map(i=>EB[i]).filter(Boolean)))}`);
 console.log(`   blocks vs no blocks Δ ${f(d.m)}±${d.se.toFixed(3)} ¢/round (${(d.m/d.se).toFixed(1)} SE); bets removed ${J(stat(blk.map(i=>E18[i])))}`);
 const by={};for(const i of blk)for(const k of why[i])(by[k]??=[]).push(E18[i]);for(const[k,v]of Object.entries(by))console.log(`     removed by ${k}: ${J(stat(v))}`);
 const N=idx.length;console.log('   quarters (Δ ¢/round, removed bets):',[0,1,2,3].map(q=>{const[a,b]=Qs(q,N),ix=idx.slice(a,b);const dd=ms(D(EB,E18,ix));return `${new Date(R[ix[0]].t).toISOString().slice(5,10)} ${f(dd.m,2)}±${dd.se.toFixed(2)} [${J(stat(ix.filter(i=>E18[i]&&!EB[i]).map(i=>E18[i])))}]`;}).join(' | '));
 const T1=Date.UTC(2026,10,18,12),ix=idx.filter(i=>R[i].t>=T1),dd=ms(D(EB,E18,ix));console.log(`   since Nov 18 12:00: Δ ${f(dd.m,2)}±${dd.se.toFixed(2)}; removed ${J(stat(ix.filter(i=>E18[i]&&!EB[i]).map(i=>E18[i])))}`);}
// real live: what fraction of rounds where the plain rule (live read) cleared were blocked
// ---- C: scale-in at 5:00
const q5=(e,mode)=>{const a=e.o.at[300];if(!a||a.ya==null||a.na==null)return null;const ask=side(a,e.c);if(ask==null||ask<1||ask>98)return null;
 const pc=a.pu==null?null:(e.c?a.pu:1-a.pu);
 if(mode==='rule'){if(pc==null||ask<75||ask>90||pc*100<ask+feeP(ask)+3)return null;}
 else if(mode==='fav'){if(pc==null||pc<.5||ask<75||ask>93)return null;}
 else if(mode==='up'){if(pc==null||pc<.5||ask<e.ask||ask>93)return null;}
 else if(mode==='down'){if(pc==null||pc<.5||ask>e.ask)return null;}
 const px=Math.min(99,ask+1);return(e.won?100-px:-px)-feeP(px);};
const V={none:E18};for(const mode of ['rule','fav','up','down'])for(const part of ['live','both']){
 V[`+1@5:00 ${mode} ${part}`]=E18.map(e=>{if(!e)return null;if(part==='live'&&e.kind!=='live')return e;const x=q5(e,mode);return x==null?e:{...e,pnl:e.pnl+x,x};});}
console.log('\nC) scale-in at 5:00 vs 18a (Δ ¢/round): whole | quarters | newer half; added contracts');
const DD=(A,B,a,b)=>{const X=[];for(let i=a;i<b;i++)X.push((A[i]?A[i].pnl:0)-(B[i]?B[i].pnl:0));return X;};
for(const k of Object.keys(V).slice(1)){const A=V[k],d=ms(DD(A,E18,0,n)),h=ms(DD(A,E18,Math.floor(n/2),n));const q=[0,1,2,3].map(i=>{const[a,b]=Qs(i);return f(ms(DD(A,E18,a,b)).m,2);}).join('/');
 const add=A.filter(e=>e&&e.x!=null).map(e=>({pnl:e.x,won:e.won,ask:0}));console.log(`   ${k.padEnd(22)} ${f(d.m)}±${d.se.toFixed(3)} (${(d.m/(d.se||1)).toFixed(1)} SE) | ${q} | ${f(h.m)}±${h.se.toFixed(3)}; added ${J(stat(add))}`);}
{const pooled=[],picks=[];let tb=0;for(let qq=1;qq<4;qq++){const[a,b]=Qs(qq);let best='none',bv=0;for(const k of Object.keys(V)){const v=ms(DD(V[k],E18,0,a)).m;if(v>bv){bv=v;best=k;}}
 picks.push(`Q${qq+1} ${best}`);pooled.push(...DD(V[best],E18,a,b));tb+=V[best].slice(a,b).filter(e=>e&&e.x!=null).length;}
 const p=ms(pooled);console.log(`   WF: ${picks.join(', ')} → ${f(p.m)}±${p.se.toFixed(3)} (${(p.m/(p.se||1)).toFixed(1)} SE; ${tb} added test contracts)`);}
// ---- B2: does a learned block predict anything? All 4:00 Kalshi favourites 75–93¢ the read agrees with (no edge gate), since Oct 24
{const F=R.map(o=>{if(o.t<T0)return null;const e=fav(o,240,75,93);if(!e||e.o.at[240].pu==null)return null;return e;});let ck2=-1,c2;
 const bl=[],ok=[],byK={};F.forEach((e,i)=>{if(!e)return;const o=R[i],day=Math.floor((o.t+240000)/3600000);if(day!==ck2){c2=blocksAt(o.t+240000);ck2=day;}
  const k=['h'+pad(hb(o.t+240000)),'p'+band(e.ask),'r'+regime(o)].filter(x=>c2.has(x));(k.length?bl:ok).push(e);for(const x of k)(byK[x]??=[]).push(e);});
 const d=ms(bl.map(e=>e.pnl)),g=ms(ok.map(e=>e.pnl));
 console.log(`\nB2) all 75–93¢ read-agreeing favourites at 4:00 since Oct 24: blocked ${J(stat(bl))} vs not blocked ${J(stat(ok))}; diff ${f(d.m-g.m,2)}±${Math.hypot(d.se,g.se).toFixed(2)} ¢/ct`);
 for(const[k,v]of Object.entries(byK))console.log(`     ${k}: ${J(stat(v))}`);
 // same with the price-band blocks removed from the comparison (band-matched): blocked by hour/regime only, vs not blocked, within 75–84 and 85–93
 for(const[lo,hi]of[[75,84],[85,93]]){const b=bl.filter(e=>e.ask>=lo&&e.ask<=hi),u=ok.filter(e=>e.ask>=lo&&e.ask<=hi);console.log(`     band ${lo}–${hi}: blocked ${J(stat(b))} vs not ${J(stat(u))}`);}}
