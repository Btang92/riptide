// Nov 14 morning: which-rounds-to-bet filters under the 4:00 lock.
// A) bet side (UP/YES vs DOWN/NO) and side vs 60-min trend (autopsy: trending-up calls −2.0¢ vs trending-down +2.2¢; Oct side test predates the lock)
// B) Kalshi BIG-TICKET taker flow in the minute before the lock (3:00–4:00, and 3:30–4:00): contracts bought by takers on our side vs the other side,
//    counting only trades of ≥250 / ≥1000 / ≥3000 contracts; skip when the big flow is against us (net < 0, or against-share ≥ 60/75%).
//    The Nov 2 Kalshi taker-flow test used all trade sizes on 952 rounds; this is the sharper "whale" form on every round with trades.
// Paired ¢/round vs the unfiltered set, whole, quarters, since Nov 1, and expanding walk-forward choice Q2–Q4.
// Usage: node lab/replay/test-1114.mjs [kt.json]   (kt.json from lab/kslag/ktrades330.mjs: rows [ms, yes¢, takerYes, count])
import fs from 'fs';import {R,feeP,stat} from './sim.mjs';import {et} from './lib.mjs';
const J=JSON.stringify,f=(v,d=3)=>(v>=0?'+':'')+v.toFixed(d);
const M=JSON.parse(fs.readFileSync('lab/data/candles.json'));
const T=process.argv[2]?JSON.parse(fs.readFileSync(process.argv[2])):null;
function trend(o){const e=o.t+240000-60000;const c=[];for(let i=60;i>=0;i--){const x=M[e-i*60000];if(x)c.push(x[4]);}if(c.length<45)return null;
 let v=0;for(let i=1;i<c.length;i++){const z=Math.log(c[i]/c[i-1]);v+=z*z;}const sg=Math.sqrt(v/(c.length-1));return Math.log(c[c.length-1]/c[0])/(sg*Math.sqrt(60));}
function flow(o,from,minQ){if(!T||!T[o.t])return null;let y=0,n=0;for(const r of T[o.t]){const s=(r[0]-o.t)/1000;if(s<from||s>=240)continue;if(r[3]<minQ)continue;if(r[2])y+=r[3];else n+=r[3];}return{y,n};}
function bet(o,set){const a=o.at[240];if(!a||!a.f||a.ya==null||a.na==null||a.pu==null)return null;const h=et(o.t).h;
 let c,ask;if(set==='fav'){c=a.ya>=a.na?1:0;ask=c?a.ya:a.na;if(ask<75||ask>90)return null;}
 else{if(set==='live'&&h<12)return null;c=a.pu>=.5?1:0;ask=c?a.ya:a.na;if(ask<75||ask>90)return null;if(Math.max(a.pu,1-a.pu)*100<ask+feeP(ask)+3)return null;}
 const won=o.up===c;return{t:o.t,c,ask,won,pnl:(won?100-ask:-ask)-feeP(ask)};}
const SETS={'live 12–24':'live','live all hours':'all','fav 75–90 all hours':'fav'};
const QS=[250,1000,3000];
const ctx=o=>{const x={tr:trend(o),fl:{}};for(const from of[180,210])for(const q of QS)x.fl[from+'_'+q]=flow(o,from,q);return x;};
const C=new Map(R.map(o=>[o.t,ctx(o)]));
const FA={none:()=>false,
 'skip UP bets':(x,b)=>b.c===1,'skip DOWN bets':(x,b)=>b.c===0,
 'skip UP in uptrend':(x,b)=>b.c===1&&x.tr!=null&&x.tr>1,'skip DOWN in downtrend':(x,b)=>b.c===0&&x.tr!=null&&x.tr< -1,
 'skip with-trend bets':(x,b)=>x.tr!=null&&(b.c?x.tr>1:x.tr< -1),'skip UP unless uptrend':(x,b)=>b.c===1&&!(x.tr!=null&&x.tr>1)};
const FB={none:()=>false};
for(const from of[180,210])for(const q of QS){const k=from+'_'+q,lab=`${from===180?'3:00':'3:30'}–4:00 ≥${q}`;
 const ag=(x,b)=>{const v=x.fl[k];if(!v)return null;const us=b.c?v.y:v.n,th=b.c?v.n:v.y;return{us,th};};
 FB[`skip ${lab} net against`]=(x,b)=>{const v=ag(x,b);return v!=null&&v.th>v.us;};
 FB[`skip ${lab} against ≥60%`]=(x,b)=>{const v=ag(x,b);return v!=null&&v.us+v.th>0&&v.th/(v.us+v.th)>=.6;};
 FB[`skip ${lab} against ≥75%`]=(x,b)=>{const v=ag(x,b);return v!=null&&v.us+v.th>0&&v.th/(v.us+v.th)>=.75;};
 FB[`skip ${lab} no big buy on our side`]=(x,b)=>{const v=ag(x,b);return v!=null&&v.us===0;};}
const ms=d=>{const m=d.reduce((s,v)=>s+v,0)/d.length;return{m,se:Math.sqrt(d.reduce((s,v)=>s+(v-m)**2,0)/(d.length-1)/d.length)};};
const NOV1=Date.UTC(2026,10,1,17,0);
function part(name,S,F){const n=S.length,Qs=i=>[Math.floor(n*i/4),Math.floor(n*(i+1)/4)];const out={};
 console.log(`\n##### ${name}: ${n} rounds ${new Date(S[0].t).toISOString().slice(0,10)} → ${new Date(S[n-1].t).toISOString().slice(0,16)}`);
 const delta=(X,set,fk)=>X.map(o=>{const b=bet(o,set);if(!b)return 0;return F[fk](C.get(o.t),b)?-b.pnl:0;});
 for(const [sn,set] of Object.entries(SETS)){console.log(`\n=== ${sn}: base ${J(stat(S.map(o=>bet(o,set)).filter(Boolean)))}`);out[sn]={};
  for(const fk of Object.keys(F)){if(fk==='none')continue;const d=ms(delta(S,set,fk));const dropped=S.map(o=>{const b=bet(o,set);return b&&F[fk](C.get(o.t),b)?b:null;}).filter(Boolean);
   const q=[0,1,2,3].map(i=>{const[a,b]=Qs(i);return ms(delta(S.slice(a,b),set,fk)).m;});const nv=ms(delta(S.filter(o=>o.t>=NOV1),set,fk));
   out[sn][fk]={m:+d.m.toFixed(3),se:+d.se.toFixed(3),drop:stat(dropped)};
   console.log(`  ${fk.padEnd(40)} Δ ${f(d.m)}±${d.se.toFixed(3)} (${(d.m/d.se).toFixed(1)} SE) dropped ${J(stat(dropped))} | Q ${q.map(v=>f(v,2)).join(' / ')} | Nov1+ ${f(nv.m)}±${nv.se.toFixed(3)}`);}
  const pooled=[];const picks=[];const kept=[],base=[];
  for(let i=1;i<4;i++){const[a,b]=Qs(i);const tr=S.slice(0,a),te=S.slice(a,b);let best='none',bv=0;
   for(const fk of Object.keys(F)){if(fk==='none')continue;const v=ms(delta(tr,set,fk)).m;if(v>bv){bv=v;best=fk;}}
   picks.push(`Q${i+1} ${best} (train ${f(bv)})`);pooled.push(...(best==='none'?te.map(()=>0):delta(te,set,best)));
   for(const o of te){const b=bet(o,set);if(!b)continue;base.push(b);if(!(best!=='none'&&F[best](C.get(o.t),b)))kept.push(b);}}
  const p=ms(pooled);console.log(`  WF picks: ${picks.join('; ')} → pooled Δ ${f(p.m)}±${p.se.toFixed(3)} ¢/round | test bets base ${J(stat(base))} kept ${J(stat(kept))}`);out[sn].WF={m:+p.m.toFixed(3),se:+p.se.toFixed(3),picks,base:stat(base),kept:stat(kept)};}
 return out;}
const res={A:part('A side / trend',R,FA)};
if(T){const S=R.filter(o=>T[o.t]&&T[o.t].length>=5);
 // descriptive: big-flow agreement with the 4:00 favourite and how often the agreeing side won
 for(const q of QS){let agree=0,tot=0,wonA=0,wonD=0,nA=0,nD=0;for(const o of S){const a=o.at[240];if(!a||a.ya==null||a.na==null)continue;const fav=a.ya>=a.na?1:0;const v=C.get(o.t).fl['180_'+q];if(!v||v.y===v.n)continue;
   const side=v.y>v.n?1:0;tot++;if(side===fav){agree++;nA++;if(o.up===fav)wonA++;}else{nD++;if(o.up===fav)wonD++;}}
  console.log(`big flow ≥${q} 3:00–4:00: ${tot} rounds with a net side; agrees with the 4:00 favourite ${(agree/tot*100).toFixed(1)}%; favourite won ${(wonA/nA*100).toFixed(1)}% when flow agreed (${nA}), ${(wonD/nD*100).toFixed(1)}% when it disagreed (${nD})`);}
 res.B=part('B big-ticket Kalshi flow',S,FB);}
fs.writeFileSync('/tmp/claude-0/t1114.json',J(res));
// C) the reverse: DOUBLE the stake when big flow is against us (Part B showed those bets winning more), walk-forward choice of variant
if(T){const S=R.filter(o=>T[o.t]&&T[o.t].length>=5);const n=S.length,Qs=i=>[Math.floor(n*i/4),Math.floor(n*(i+1)/4)];
 console.log('\n##### C double the stake when big flow is against us (Δ = extra contract P&L per round)');
 const keys=Object.keys(FB).filter(k=>k!=='none'&&!/no big buy/.test(k));
 const dbl=(X,set,fk)=>X.map(o=>{const b=bet(o,set);if(!b)return 0;return FB[fk](C.get(o.t),b)?b.pnl:0;});
 for(const [sn,set] of Object.entries(SETS)){const pooled=[],picks=[];let nb=0;
  for(let i=1;i<4;i++){const[a,b]=Qs(i);const tr=S.slice(0,a),te=S.slice(a,b);let best=null,bv=0;
   for(const fk of keys){const v=ms(dbl(tr,set,fk)).m;if(v>bv){bv=v;best=fk;}}
   picks.push(`Q${i+1} ${best} (train ${f(bv)})`);const d=best?dbl(te,set,best):te.map(()=>0);pooled.push(...d);nb+=d.filter(v=>v!==0).length;}
  const p=ms(pooled);const base=[];for(let i=1;i<4;i++){const[a,b]=Qs(i);for(const o of S.slice(a,b)){const x=bet(o,set);if(x)base.push(x);}}
  const stakes=base.length+nb;console.log(`  ${sn}: WF ${picks.join('; ')} → extra ${f(p.m)}±${p.se.toFixed(3)} ¢/round (${(p.m/p.se).toFixed(1)} SE), ${nb} doubled of ${base.length} test bets; per staked contract base ${J(stat(base))}`);}}
