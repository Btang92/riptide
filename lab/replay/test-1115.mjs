// Nov 15, under the 4:00 lock.
// A) short-term momentum against the bet at the lock (autopsy: "last 5 min momentum against the call" −5.4¢/ct on 137 calls).
//    Skip the bet when BTC's move toward our side over the last 1 / 2 / 5 / 15 min (in 60-min-vol units over that window) is below a threshold.
// B) risk limits under the lock (last tested Oct 24, before the lock): streak pause (after K straight losses skip the next L bets of the set)
//    and daily loss cap (stop for the ET day after N losses).
// C) weekday vs weekend under the lock (skip weekends / weekends only at all hours).
// Paired ¢/round vs the live lock, whole history, quarters, expanding walk-forward Q2–Q4 (rule chosen on rounds before each quarter).
import fs from 'fs';import {R,feeP,stat} from './sim.mjs';import {et} from './lib.mjs';
const J=JSON.stringify,f=(v,d=3)=>(v>=0?'+':'')+v.toFixed(d);
const M=JSON.parse(fs.readFileSync('lab/data/candles.json'));
const n=R.length,Qs=i=>[Math.floor(n*i/4),Math.floor(n*(i+1)/4)];const NOV1=Date.UTC(2026,10,1,17,0);
const ms=d=>{if(!d.length)return{m:0,se:0};const m=d.reduce((s,v)=>s+v,0)/d.length;return{m,se:d.length>1?Math.sqrt(d.reduce((s,v)=>s+(v-m)**2,0)/(d.length-1)/d.length):0};};
// momentum toward side c at 4:00, using closed 1-min Coinbase candles (close of minute 3:00–4:00 = spot proxy)
function mom(o,c,w){const e=o.t+180000;const cl=[];for(let i=60;i>=0;i--){const y=M[e-i*60000];cl.push(y?y[4]:null);}
 if(cl.some(v=>v==null))return null;let v=0;for(let i=1;i<cl.length;i++)v+=Math.log(cl[i]/cl[i-1])**2;const s=Math.sqrt(v/60);if(!s)return null;
 const m=Math.log(cl[60]/cl[60-w])/(s*Math.sqrt(w));return c?m:-m;}
function bet(o,set){const a=o.at[240];if(!a||!a.f||a.ya==null||a.na==null||a.pu==null)return null;const p=et(o.t),h=p.h;
 let c,ask;if(set==='fav'){c=a.ya>=a.na?1:0;ask=c?a.ya:a.na;if(ask<75||ask>90)return null;}
 else{if(set==='live'&&h<12)return null;c=a.pu>=.5?1:0;ask=c?a.ya:a.na;if(ask<75||ask>90)return null;if(Math.max(a.pu,1-a.pu)*100<ask+feeP(ask)+3)return null;}
 const won=o.up===c;const b={t:o.t,c,ask,won,pnl:(won?100-ask:-ask)-feeP(ask),h,wd:p.wd,day:`${p.y}-${p.mo}-${p.d}`};
 for(const w of[1,2,5,15])b['m'+w]=mom(o,c,w);return b;}
const SETS={'live 12–24':'live','live all hours':'all','fav 75–90 all hours':'fav'};
console.log(`${n} rounds ${new Date(R[0].t).toISOString().slice(0,10)} → ${new Date(R[n-1].t).toISOString().slice(0,16)}`);
// rules: functions over the list of bets (chronological) returning a Set of kept bet times
const RULES={};
for(const w of[1,2,5,15])for(const th of[-1.5,-1,-0.5,0])RULES[`skip m${w}<${th}`]=B=>new Set(B.filter(b=>b['m'+w]==null||b['m'+w]>=th).map(b=>b.t));
for(const K of[2,3])for(const L of[1,2,4])RULES[`pause ${L} after ${K}L`]=B=>{const keep=new Set();let streak=0,skip=0;
 for(const b of B){if(skip>0){skip--;continue;}keep.add(b.t);if(b.won)streak=0;else{streak++;if(streak>=K){skip=L;streak=0;}}}return keep;};
for(const N of[1,2,3])RULES[`day cap ${N} losses`]=B=>{const keep=new Set();const lost={};for(const b of B){if((lost[b.day]||0)>=N)continue;keep.add(b.t);if(!b.won)lost[b.day]=(lost[b.day]||0)+1;}return keep;};
RULES['skip weekends']=B=>new Set(B.filter(b=>b.wd!=='Sat'&&b.wd!=='Sun').map(b=>b.t));
RULES['weekends only']=B=>new Set(B.filter(b=>b.wd==='Sat'||b.wd==='Sun').map(b=>b.t));
const out={};
for(const [sn,set] of Object.entries(SETS)){const Bm=new Map();const allB=[];for(const o of R){const b=bet(o,set);if(b){Bm.set(o.t,b);allB.push(b);}}
 console.log(`\n=== ${sn}: ${J(stat(allB))}`);out[sn]={base:stat(allB),rules:{}};
 // descriptive: momentum buckets
 for(const w of[1,5]){const g={};for(const b of allB){const v=b['m'+w];if(v==null)continue;const k=v<-1?'<−1':v<0?'−1..0':v<1?'0..1':'≥1';(g[k]??=[]).push(b);}
  console.log(`  m${w} toward bet:`,['<−1','−1..0','0..1','≥1'].map(k=>`${k} ${J(stat(g[k]||[]))}`).join(' | '));out[sn]['m'+w]=Object.fromEntries(Object.entries(g).map(([k,v])=>[k,stat(v)]));}
 const wk={we:allB.filter(b=>b.wd==='Sat'||b.wd==='Sun'),wd:allB.filter(b=>b.wd!=='Sat'&&b.wd!=='Sun')};console.log(`  weekend ${J(stat(wk.we))} | weekday ${J(stat(wk.wd))}`);out[sn].weekend=stat(wk.we);out[sn].weekday=stat(wk.wd);
 const D=(keep,lo,hi)=>{const X=[];for(let i=lo;i<hi;i++){const b=Bm.get(R[i].t);X.push(b&&!keep.has(b.t)?-b.pnl:0);}return X;};
 const kept={};for(const [k,fn] of Object.entries(RULES))kept[k]=fn(allB);
 for(const k of Object.keys(RULES)){const d=ms(D(kept[k],0,n)),q=[0,1,2,3].map(i=>{const[a,b]=Qs(i);return ms(D(kept[k],a,b)).m;}),nv=ms(D(kept[k],R.findIndex(o=>o.t>=NOV1),n));
  const drop=allB.filter(b=>!kept[k].has(b.t));out[sn].rules[k]={m:+d.m.toFixed(3),se:+d.se.toFixed(3),q:q.map(v=>+v.toFixed(3)),nov1:+nv.m.toFixed(3),dropped:stat(drop)};
  console.log(`  ${k.padEnd(22)} Δ ${f(d.m)}±${d.se.toFixed(3)} (${(d.m/(d.se||1)).toFixed(1)} SE) | Q ${q.map(v=>f(v,2)).join(' / ')} | Nov1+ ${f(nv.m)} | dropped ${J(stat(drop))}`);}
 // walk-forward (rule chosen on rounds before each quarter; streak/day rules evaluated on the full chronological bet list, which only uses past results)
 const pooled=[],picks=[];let tb=0;
 for(let i=1;i<4;i++){const[a,b]=Qs(i);let best=null,bv=0;for(const k of Object.keys(RULES)){const v=ms(D(kept[k],0,a)).m;if(v>bv){bv=v;best=k;}}
  picks.push(`Q${i+1} ${best||'live'} (train ${f(bv)})`);pooled.push(...(best?D(kept[best],a,b):Array(b-a).fill(0)));tb+=allB.filter(x=>x.t>=R[a].t&&x.t<R[Math.min(b,n-1)].t).length;}
 const p=ms(pooled);out[sn].WF={m:+p.m.toFixed(3),se:+p.se.toFixed(3),picks,testBets:tb};
 console.log(`  WF: ${picks.join('; ')} → pooled Δ ${f(p.m)}±${p.se.toFixed(3)} ¢/round (${tb} test bets)`);
 // classic split: choose on oldest 75%, score newest 25%
 const c=Math.floor(n*.75);let best=null,bv=0;for(const k of Object.keys(RULES)){const v=ms(D(kept[k],0,c)).m;if(v>bv){bv=v;best=k;}}
 const te=best?ms(D(kept[best],c,n)):{m:0,se:0};const teB=allB.filter(x=>x.t>=R[c].t);
 out[sn].split={best,train:+bv.toFixed(3),test:+te.m.toFixed(3),se:+te.se.toFixed(3),testBets:teB.length,liveTest:stat(teB)};
 console.log(`  split 75/25: train-best ${best} train ${f(bv)} → test ${f(te.m)}±${te.se.toFixed(3)} (${teB.length} test bets, live on test ${J(stat(teB))})`);}
fs.writeFileSync(process.env.OUT||'/tmp/claude-0/t1115.json',J(out));
