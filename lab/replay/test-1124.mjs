// Nov 24 morning. Live = 2026-11-18a.
// A) The app's CALIBRATION ADJUSTMENT (learner().decide: prob = raw read + bin adj (5-pt bins, shrink K=25) + momentum adj).
//    The server uses the adjusted prob in the bet rule; every lab test (18a included) used the RAW read. Rebuild the live
//    adjustment causally from calls.json (prob − rawProb of the latest earlier call with the same bin and momentum flag)
//    and score 18a raw vs 18a with the live adjustment (paired ¢/round, quarters, rounds since Oct 21 only, where the
//    adjustment is known). Also: is the raw read at 4:00 calibrated (lab rounds and live calls)?
// B) Real-live reconstruction: 18a + adjustment + learned blocks vs 18a raw (what Brandon is actually running vs tested).
import fs from 'node:fs';import {R,feeP,stat} from './sim.mjs';import {et} from './lib.mjs';
const C=JSON.parse(fs.readFileSync('lab/data/calls.json'));
const J=JSON.stringify,f=(v,d=3)=>(v>=0?'+':'')+v.toFixed(d);
const ms=d=>{if(!d.length)return{m:0,se:0,n:0};const m=d.reduce((s,v)=>s+v,0)/d.length;return{m,se:d.length>1?Math.sqrt(d.reduce((s,v)=>s+(v-m)**2,0)/(d.length-1)/d.length):0,n:d.length};};
const side=(a,c)=>c?a.ya:a.na,binOf=p=>Math.min(95,Math.floor(p*100/5)*5);
// adjustment lookup from live calls
const A=C.filter(z=>!z.flipped&&!z.brain&&!z.blend&&z.rawProb!=null&&z.prob!=null&&z.mom!=null).map(z=>({ts:z.ts,b:binOf(z.rawProb),m:!!z.mom,adj:z.prob-z.rawProb})).sort((a,b)=>a.ts-b.ts);
const T0=A[0].ts+86400000;
function adjAt(T,b,m,which='both'){let x=null,y=null;for(const r of A){if(r.ts>T)break;if(r.b===b&&r.m===m)x=r;if(r.b===b)y=r;}const r=x||y;return r?r.adj:0;}
// cache per round
const ADJ=R.map(o=>{const a=o.at[240];if(!a||a.pu==null||o.t<T0)return null;const c=a.pu>=.5?1:0,rp=Math.max(a.pu,1-a.pu),mom=a.mom5===0?c===0:(a.mom5>0)===(c===1);return adjAt(o.t+240000,binOf(rp),mom);});
function live(o,i,mode){const a=o.at[240];if(!a||!a.f||a.ya==null||a.na==null||a.pu==null)return null;const c=a.pu>=.5?1:0,ask=side(a,c);
 let p=Math.max(a.pu,1-a.pu);if(mode==='cal'){if(ADJ[i]==null)return null;p=Math.min(.99,Math.max(.01,p+ADJ[i]));}
 const won=o.up===c;
 if(ask>=75&&ask<=90&&p*100>=ask+feeP(ask)+3)return{t:o.t,c,ask,won,kind:'live',pnl:(won?100-ask:-ask)-feeP(ask)};
 const fa=a.ya>=a.na?1:0,fask=side(a,fa);if(fa===c&&fask>=91&&fask<=93)return{t:o.t,c,ask:fask,won,kind:'add',pnl:(won?100-fask:-fask)-feeP(fask)};
 return null;}
const idx=R.map((o,i)=>i).filter(i=>ADJ[i]!=null);const n=idx.length;
const Eraw=R.map((o,i)=>live(o,i,'raw')),Ecal=R.map((o,i)=>live(o,i,'cal'));
console.log(`${R.length} rounds; adjustment known for ${n} rounds since ${new Date(R[idx[0]].t).toISOString().slice(0,10)}; ${A.length} live calls with adj`);
{const ad=idx.map(i=>ADJ[i]);const by={};idx.forEach(i=>{const a=R[i].at[240];const b=binOf(Math.max(a.pu,1-a.pu));(by[b]??=[]).push(ADJ[i]);});
 console.log('   mean live adj by raw-read bin:',Object.entries(by).sort((a,b)=>a[0]-b[0]).map(([b,v])=>`${b}:${f(ms(v).m*100,1)}`).join(' '),'pts');}
const D=(X,Y,ix)=>ix.map(i=>(X[i]?X[i].pnl:0)-(Y[i]?Y[i].pnl:0));
const rep=(name,X,Y=Eraw)=>{const d=ms(D(X,Y,idx)),q=[0,1,2,3].map(k=>{const ix=idx.slice(Math.floor(n*k/4),Math.floor(n*(k+1)/4));return f(ms(D(X,Y,ix)).m,2);}).join('/');
 const ix4=idx.slice(Math.floor(n*.75)),d4=ms(D(X,Y,ix4));
 const gone=idx.filter(i=>Y[i]&&!X[i]).map(i=>Y[i]),added=idx.filter(i=>X[i]&&!Y[i]).map(i=>X[i]);
 console.log(`   ${name.padEnd(26)} Δ ${f(d.m)}±${d.se.toFixed(3)} (${(d.m/(d.se||1)).toFixed(1)} SE) | Q ${q} | newest 25% ${f(d4.m)}±${d4.se.toFixed(3)}\n      bets ${J(stat(idx.map(i=>X[i]).filter(Boolean)))} vs ${J(stat(idx.map(i=>Y[i]).filter(Boolean)))}; removed ${J(stat(gone))}; added ${J(stat(added))}`);};
console.log('\nA) 18a with the live calibration adjustment vs 18a raw (lab), ¢/round paired:');rep('18a + live adj',Ecal);
{const live75=idx.filter(i=>Eraw[i]&&Eraw[i].kind==='live');console.log(`   raw 75–90 bets: ${live75.length}; still bet with adj ${live75.filter(i=>Ecal[i]).length}`);}
// calibration of the raw read at 4:00 in the 75–93 favourite zone (lab rounds)
{const by={};for(const o of R){const a=o.at[240];if(!a||a.pu==null)continue;const c=a.pu>=.5?1:0,p=Math.max(a.pu,1-a.pu),b=binOf(p);const x=(by[b]??={n:0,w:0,p:0});x.n++;x.w+=o.up===c;x.p+=p;}
 console.log('\n   lab raw read at 4:00, said→won by bin:',Object.entries(by).filter(([b])=>b>=70).map(([b,x])=>`${b}: ${(x.p/x.n*100).toFixed(1)}→${(x.w/x.n*100).toFixed(1)}% (${x.n})`).join('; '));}
{const z=C.filter(z=>z.winner&&z.rawProb!=null&&z.start>=Date.UTC(2026,10,1)&&!z.flipped);const ll=(p,y)=>-(y*Math.log(p)+(1-y)*Math.log(1-p));
 let a=0,b=0;const by={};for(const c of z){const y=c.winner===c.rawCall?1:0;a+=ll(c.rawProb,y);b+=ll(Math.min(.99,Math.max(.01,c.prob)),y);const k=binOf(c.rawProb);const x=(by[k]??={n:0,w:0,p:0,q:0});x.n++;x.w+=y;x.p+=c.rawProb;x.q+=c.prob;}
 console.log(`   live calls since Nov 1 (4:00 era, ${z.length}): log-loss raw ${(a/z.length).toFixed(4)} vs adjusted ${(b/z.length).toFixed(4)}`);
 console.log('   by bin raw→adj→won:',Object.entries(by).filter(([k])=>k>=70).map(([k,x])=>`${k}: ${(x.p/x.n*100).toFixed(1)}→${(x.q/x.n*100).toFixed(1)}→${(x.w/x.n*100).toFixed(1)}% (${x.n})`).join('; '));}
// B) learned blocks on top (rebuilt as in test-1123-eve)
const M=JSON.parse(fs.readFileSync('lab/data/candles.json'));const pad=v=>String(v).padStart(2,'0'),hb=ts=>Math.floor(et(ts).h/3)*3,band=a=>a<55?'0–54¢':a<65?'55–64¢':a<75?'65–74¢':a<85?'75–84¢':'85–99¢';
const P=C.filter(z=>z.result&&z.ask!=null).map(z=>({end:z.start+900000,v:(z.result==='WIN'?100-z.ask:-z.ask)-feeP(z.ask),keys:['h'+pad(hb(z.ts)),'p'+band(z.ask),...(z.regime?['r'+z.regime]:[])]})).sort((a,b)=>a.end-b.end);
function blocksAt(T){const B={};for(const r of P){if(r.end>T)break;for(const k of r.keys){const x=(B[k]??={n:0,s:0,q:0});x.n++;x.s+=r.v;x.q+=r.v*r.v;}}const out=new Set();for(const[k,x]of Object.entries(B)){const m=x.s/x.n,se=Math.sqrt(Math.max(0,x.q/x.n-m*m)/x.n);if(x.n>=30&&m<-2&&m+se<0)out.add(k);}return out;}
const callBy=new Map(C.map(z=>[z.start,z]));
function regime(o){const z=callBy.get(o.t);if(z&&z.regime)return z.regime;const c=[];for(let i=29;i>=0;i--){const x=M[o.t+180000-i*60000];if(x)c.push(x);}if(c.length<20)return null;
 const cl=c.map(x=>x[4]),N=cl.length,xm=(N-1)/2,ym=cl.reduce((a,b)=>a+b)/N;let nu=0,de=0;cl.forEach((y,i)=>{nu+=(i-xm)*(y-ym);de+=(i-xm)**2;});const sl=nu/de,atr=c.reduce((s,x)=>s+(x[2]-x[1]),0)/N,st=Math.abs(sl*N)/atr;return st>4?(sl>0?'TRENDING UP':'TRENDING DOWN'):'CONSOLIDATION';}
let ck=-1,cache;const blk=(E)=>R.map((o,i)=>{const e=E[i];if(!e||o.t<Date.UTC(2026,9,24))return e;const h=Math.floor((o.t+240000)/3600000);if(h!==ck){cache=blocksAt(o.t+240000);ck=h;}
 return['h'+pad(hb(o.t+240000)),'p'+band(e.ask),'r'+regime(o)].some(x=>cache.has(x))?null:e;});
const EcalB=blk(Ecal);ck=-1;const ErawB=blk(Eraw);
console.log('\nB) what is actually running vs what was tested:');rep('18a raw + blocks',ErawB);rep('18a + adj + blocks (LIVE)',EcalB);
console.log('   and fix candidates vs real live (18a+adj+blocks):');rep('no adj (keep blocks)',ErawB,EcalB);rep('no adj, no blocks',Eraw,EcalB);
// real check: live calls since Nov 1 where raw read passed the 75–90 rule at the call's own ask but adjusted did not
{const z=C.filter(z=>z.winner&&z.rawProb!=null&&z.ask!=null&&z.start>=Date.UTC(2026,10,1)&&!z.flipped&&z.side===z.rawCall&&z.ask>=75&&z.ask<=90);
 const pass=p=>c=>p(c)*100>=c.ask+feeP(c.ask)+3;const pr=pass(c=>c.rawProb),pa=pass(c=>c.prob);const v=c=>({pnl:(c.winner===c.side?100-c.ask:-c.ask)-feeP(c.ask),won:c.winner===c.side,ask:c.ask});
 console.log(`   REAL live calls since Nov 1 (75–90¢, ${z.length}): raw-pass ${J(stat(z.filter(pr).map(v)))}; adj-pass ${J(stat(z.filter(pa).map(v)))}; raw-pass but adj-fail ${J(stat(z.filter(c=>pr(c)&&!pa(c)).map(v)))}; adj-pass but raw-fail ${J(stat(z.filter(c=>pa(c)&&!pr(c)).map(v)))}`);}
