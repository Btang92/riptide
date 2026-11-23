// Nov 23 morning. Reference = pending proposal 2026-11-18a (live rule at 4:00, all hours, + 91–93¢ read-agreeing favourite add-on).
// A) Forward: 18a since Nov 18 12:00 UTC and since last evening's data (Nov 22 23:15 UTC); adds forward; add losses vs top-decile 15-min vol lead.
// B) Limit-at-ask (no chase) entry with REAL Kalshi trades 0–60 s after the 4:00 checkpoint. Baseline "chase" = 18a re-priced at the first
//    taker buy of our side within 30 s (no trade → ask+1), i.e. what a market order really pays. Limit variants: post a buy at
//    checkpoint ask + k (k = 0/1/2), live 2 s after the check, rests W = 10/30/60 s. Fills: a taker buy of our side at q ≤ limit → filled at q;
//    a trade of our side at q < limit with the other side as taker → our resting bid filled at the limit (strictly through, for queue);
//    nothing → no bet. Applied to the 75–90 part only or to both parts. Paired ¢/round vs chase, quarters, expanding WF Q2–Q4.
//    Cache lab/data/entry-trades60.json (local).
import {execFileSync} from 'node:child_process';import fs from 'node:fs';
import {R,feeP,stat} from './sim.mjs';import {et} from './lib.mjs';
const M=JSON.parse(fs.readFileSync('lab/data/candles.json'));
const J=JSON.stringify,f=(v,d=3)=>(v>=0?'+':'')+v.toFixed(d);
const ms=d=>{if(!d.length)return{m:0,se:0,n:0};const m=d.reduce((s,v)=>s+v,0)/d.length;return{m,se:d.length>1?Math.sqrt(d.reduce((s,v)=>s+(v-m)**2,0)/(d.length-1)/d.length):0,n:d.length};};
const side=(a,c)=>c?a.ya:a.na,hr=o=>et(o.t).h,n=R.length,Qs=i=>[Math.floor(n*i/4),Math.floor(n*(i+1)/4)];
function at(o,s,m=3,lo=75,hi=90){const a=o.at[s];if(!a||!a.f||a.ya==null||a.na==null||a.pu==null)return null;const c=a.pu>=.5?1:0,ask=side(a,c);
 if(ask<lo||ask>hi)return null;if(Math.max(a.pu,1-a.pu)*100<ask+feeP(ask)+m)return null;const won=o.up===c;
 return{t:o.t,o,c,ask,won,kind:'live',edge:Math.max(a.pu,1-a.pu)*100-ask-feeP(ask),pnl:(won?100-ask:-ask)-feeP(ask)};}
function fav(o,s,lo,hi){const a=o.at[s];if(!a||a.ya==null||a.na==null)return null;const c=a.ya>=a.na?1:0,ask=side(a,c);if(ask<lo||ask>hi)return null;
 if(a.pu!=null&&(a.pu>=.5?1:0)!==c)return null;const won=o.up===c;return{t:o.t,o,c,ask,won,kind:'add',pnl:(won?100-ask:-ask)-feeP(ask)};}
const Elive=R.map(o=>hr(o)<12?null:at(o,240)),Eall=R.map(o=>at(o,240)),Eadd=R.map((o,i)=>Eall[i]?null:fav(o,240,91,93));
const E18=R.map((o,i)=>Eall[i]||Eadd[i]);
console.log(`${n} rounds ${new Date(R[0].t).toISOString().slice(0,10)} → ${new Date(R[n-1].t).toISOString().slice(0,16)}; 18a ${J(stat(E18.filter(Boolean)))} live ${J(stat(Elive.filter(Boolean)))} adds ${J(stat(Eadd.filter(Boolean)))}`);
const diff=(A,B,idx)=>ms(idx.map(i=>(A[i]?A[i].pnl:0)-(B[i]?B[i].pnl:0)));
// ---- A
for(const[lab,T]of[['since Nov 18 12:00 UTC',Date.UTC(2026,10,18,12)],['since Nov 22 23:15 UTC (new this run)',Date.UTC(2026,10,22,23,15)]]){
 const idx=R.map((o,i)=>i).filter(i=>R[i].t>=T);const d=diff(E18,Elive,idx);
 console.log(`A 18a forward ${lab}: ${idx.length} rounds; 18a ${J(stat(idx.map(i=>E18[i]).filter(Boolean)))} live ${J(stat(idx.map(i=>Elive[i]).filter(Boolean)))} Δ ${f(d.m,2)}±${d.se.toFixed(2)} ¢/round; adds ${J(stat(idx.map(i=>Eadd[i]).filter(Boolean)))}; 75–90 all-hours part ${J(stat(idx.map(i=>Eall[i]).filter(Boolean)))}`);
 if(T>Date.UTC(2026,10,22))console.log('   bets:',idx.filter(i=>E18[i]).map(i=>{const e=E18[i];return `${new Date(e.t).toISOString().slice(5,16)} ${e.kind} ${e.ask}¢ ${e.won?'W':'L'}`;}).join('; '));}
// adds lead: 15-min σ at 4:00 in the top 10% of add history before Nov 18 12:00
{const T=Date.UTC(2026,10,18,12);const s15=o=>{const end=o.t+180000;const cl=[];for(let i=15;i>=0;i--){const x=M[end-i*60000];if(x)cl.push(x[4]);}if(cl.length<12)return null;const r=[];for(let i=1;i<cl.length;i++)r.push(cl[i]-cl[i-1]);return Math.sqrt(r.reduce((a,v)=>a+v*v,0)/r.length);};
 const hist=Eadd.filter(e=>e&&e.t<T).map(e=>s15(e.o)).filter(v=>v!=null).sort((a,b)=>a-b),p90=hist[Math.floor(.9*hist.length)];
 const fw=Eadd.filter(e=>e&&e.t>=T).map(e=>({e,v:s15(e.o)}));const hi=fw.filter(x=>x.v!=null&&x.v>=p90),lo=fw.filter(x=>!(x.v!=null&&x.v>=p90));
 console.log(`A adds forward vs 15-min σ p90 ($${p90?.toFixed(1)}/min from history): top-decile ${J(stat(hi.map(x=>x.e)))} rest ${J(stat(lo.map(x=>x.e)))}`);}
// ---- B
const K='https://api.elections.kalshi.com/trade-api/v2',CF='lab/data/entry-trades60.json',C=fs.existsSync(CF)?JSON.parse(fs.readFileSync(CF)):{};
const sleep=s=>execFileSync('sleep',[String(s)]);
const get=u=>{for(let a=0;a<5;a++){try{return JSON.parse(execFileSync('curl',['-sS','--fail','-m','30',u],{maxBuffer:64<<20,stdio:['ignore','pipe','ignore']}).toString());}catch(e){sleep(1.5*(a+1));}}return null;};
const MO=['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
function ticker(t){const d=new Date(t+900000),p=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',year:'2-digit',month:'numeric',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(d).map(x=>[x.type,x.value]));
 return `KXBTC15M-${p.year}${MO[+p.month-1]}${p.day}${p.hour}${p.minute}-${p.minute}`;}
const need=E18.filter(e=>e&&!(e.t in C));console.log(`\nB) entry trades 0–60 s: ${E18.filter(Boolean).length} 18a bets, downloading ${need.length}`);
let k=0;for(const e of need){const lo=Math.floor((e.t+240000)/1000);let cur='',out=[],ok=true;
 for(let pg=0;pg<10;pg++){const d=get(`${K}/markets/trades?ticker=${ticker(e.t)}&min_ts=${lo}&max_ts=${lo+60}&limit=1000${cur?'&cursor='+cur:''}`);if(!d){ok=false;break;}
  out.push(...(d.trades||[]).map(x=>[Date.parse(x.created_time),Math.round(+x.yes_price_dollars*100),x.taker_side==='yes'?1:0,+x.count_fp]));if(!d.cursor||!(d.trades||[]).length)break;cur=d.cursor;}
 C[e.t]=ok?out:null;sleep(.15);if(++k%100===0){fs.writeFileSync(CF,JSON.stringify(C));console.log('  ',k);}}
fs.writeFileSync(CF,JSON.stringify(C));
const tr=e=>{const x=C[e.t];return x?[...x].sort((a,b)=>a[0]-b[0]):null;};
const our=(e,z)=>e.c?z[1]:100-z[1];
function chase(e){const x=tr(e);if(!x)return null;const t0=e.t+240000;const y=x.find(z=>z[0]>=t0&&z[0]<t0+30000&&z[2]===e.c);return y?our(e,y):Math.min(99,e.ask+1);}
function limit(e,kk,W,dl=2){const x=tr(e);if(!x)return undefined;const t0=e.t+240000+dl*1000,L=e.ask+kk;
 for(const z of x){if(z[0]<t0||z[0]>=e.t+240000+W*1000)continue;const q=our(e,z);if(z[2]===e.c&&q<=L)return q;if(z[2]!==e.c&&q<L)return L;}return null;}
const book=(e,px)=>({...e,ask:px,pnl:(e.won?100-px:-px)-feeP(px)});
const CH=E18.map(e=>{if(!e)return null;const p=chase(e);return p==null?book(e,Math.min(99,e.ask+1)):book(e,p);});
const nofetch=E18.filter(e=>e&&!C[e.t]).length;
console.log(`   fetch failed ${nofetch}; chase (real market-order) ${J(stat(CH.filter(Boolean)))} vs checkpoint ask ${J(stat(E18.filter(Boolean)))}`);
const V={};
for(const kk of [0,1,2])for(const W of [10,30,60])for(const part of ['live','both']){
 V[`limit ask+${kk} ${W}s ${part}`]=E18.map((e,i)=>{if(!e)return null;if(part==='live'&&e.kind!=='live')return CH[i];const p=limit(e,kk,W);if(p===undefined)return CH[i];return p==null?null:book(e,p);});}
const D=(A,B,lo,hi)=>{const X=[];for(let i=lo;i<hi;i++)X.push((A[i]?A[i].pnl:0)-(B[i]?B[i].pnl:0));return X;};
console.log('   variant vs chase (Δ¢/round): whole | quarters | newer half; fills; missed bets as chased');
const rows=[];for(const kname of Object.keys(V)){const A=V[kname],d=ms(D(A,CH,0,n)),h2=ms(D(A,CH,Math.floor(n/2),n));const q=[0,1,2,3].map(i=>{const[a,b]=Qs(i);return f(ms(D(A,CH,a,b)).m,2);}).join('/');
 const miss=CH.filter((e,i)=>e&&!A[i]),fil=A.filter(Boolean);rows.push(kname);
 console.log(`   ${kname.padEnd(24)} ${f(d.m)}±${d.se.toFixed(3)} (${(d.m/(d.se||1)).toFixed(1)} SE) | ${q} | ${f(h2.m)}±${h2.se.toFixed(3)}; filled ${J(stat(fil))}; missed ${J(stat(miss))}`);}
{const MENU={chase:CH,...V};const pooled=[],picks=[];let tb=0;for(let qq=1;qq<4;qq++){const[a,b]=Qs(qq);let best='chase',bv=0;for(const kk of Object.keys(MENU)){const v=ms(D(MENU[kk],CH,0,a)).m;if(v>bv){bv=v;best=kk;}}
 picks.push(`Q${qq+1} ${best}`);pooled.push(...D(MENU[best],CH,a,b));tb+=MENU[best].slice(a,b).filter(Boolean).length;}
 const p=ms(pooled);console.log(`   WF: ${picks.join(', ')} → ${f(p.m)}±${p.se.toFixed(3)} (${(p.m/(p.se||1)).toFixed(1)} SE; ${tb} test bets)`);}
// missed-bet profile: did the ask run away toward us (winners)?
{const A=V['limit ask+0 30s live'];const miss=CH.map((e,i)=>e&&e.kind==='live'&&!A[i]?{e,raw:E18[i]}:null).filter(Boolean);
 console.log(`   ask+0 30s: missed 75–90 bets won ${J(stat(miss.map(x=>x.raw)))} at checkpoint ask; chase paid ${f(ms(miss.map(x=>x.e.ask-x.raw.ask)).m,2)}¢ over ask`);}
