// Nov 13 morning: which-rounds-to-bet filters under the 4:00 lock.
// A) weekday / weekend (last weekday test Oct 24 predates the lock)
// B) :45 rounds and :45 in a 60-min downtrend/uptrend (lead from Nov 1; forward check on rounds after Nov 1 13:00 only)
// C) BTC direction streak: previous 1/2/3 rounds settled the same way as our side vs the other way
// Paired ¢/round vs the unfiltered set, whole, quarters, since Nov 1, and expanding walk-forward choice Q2–Q4.
import fs from 'fs';import {R,feeP,stat} from './sim.mjs';import {et} from './lib.mjs';
const J=JSON.stringify,f=(v,d=3)=>(v>=0?'+':'')+v.toFixed(d);
const M=JSON.parse(fs.readFileSync('lab/data/candles.json'));
const UP=new Map(R.map(o=>[o.t,o.up]));
const n=R.length,Qs=i=>[Math.floor(n*i/4),Math.floor(n*(i+1)/4)];const NOV1=Date.UTC(2026,10,1,17,0);
// trend: 60-min BTC move into 4:00 in units of its normal 60-min swing (σ1m·√60)
function trend(o){const e=o.t+240000-60000;const c=[];for(let i=60;i>=0;i--){const x=M[e-i*60000];if(x)c.push(x[4]);}if(c.length<45)return null;
 let v=0;for(let i=1;i<c.length;i++){const z=Math.log(c[i]/c[i-1]);v+=z*z;}const sg=Math.sqrt(v/(c.length-1));return Math.log(c[c.length-1]/c[0])/(sg*Math.sqrt(60));}
// bet sets
function bet(o,set){const a=o.at[240];if(!a||!a.f||a.ya==null||a.na==null||a.pu==null)return null;const h=et(o.t).h;
 let c,ask;if(set==='fav'){c=a.ya>=a.na?1:0;ask=c?a.ya:a.na;if(ask<75||ask>90)return null;}
 else{if(set==='live'&&h<12)return null;c=a.pu>=.5?1:0;ask=c?a.ya:a.na;if(ask<75||ask>90)return null;if(Math.max(a.pu,1-a.pu)*100<ask+feeP(ask)+3)return null;}
 const won=o.up===c;return{t:o.t,c,ask,won,pnl:(won?100-ask:-ask)-feeP(ask)};}
const SETS={'live 12–24':'live','live all hours':'all','fav 75–90 all hours':'fav'};
const ctx=o=>{const e=et(o.t),b=[1,2,3].map(k=>UP.get(o.t-k*900000));return{wd:e.wd,mi:e.mi,tr:trend(o),prev:b};};
const C=new Map(R.map(o=>[o.t,ctx(o)]));
// filters: return true = SKIP
const F={none:()=>false};
for(const d of['Mon','Tue','Wed','Thu','Fri','Sat','Sun'])F['skip '+d]=(x)=>x.wd===d;
F['skip weekend']=x=>x.wd==='Sat'||x.wd==='Sun';F['weekend only']=x=>!(x.wd==='Sat'||x.wd==='Sun');
F['skip :45']=x=>x.mi===45;
F['skip :45 downtrend']=(x,b)=>x.mi===45&&x.tr!=null&&x.tr< -1;
F['skip :45 trend vs bet']=(x,b)=>x.mi===45&&x.tr!=null&&(b.c?x.tr< -1:x.tr>1);
F['skip trend vs bet']=(x,b)=>x.tr!=null&&(b.c?x.tr< -1:x.tr>1);
F['skip prev1 opposite']=(x,b)=>x.prev[0]!=null&&x.prev[0]!==b.c;
F['skip prev1 same']=(x,b)=>x.prev[0]!=null&&x.prev[0]===b.c;
F['skip prev2 opposite']=(x,b)=>x.prev.slice(0,2).every(v=>v!=null&&v!==b.c);
F['skip prev3 opposite']=(x,b)=>x.prev.every(v=>v!=null&&v!==b.c);
F['skip prev3 same']=(x,b)=>x.prev.every(v=>v!=null&&v===b.c);
const delta=(S,set,fk)=>S.map(o=>{const b=bet(o,set);if(!b)return 0;return F[fk](C.get(o.t),b)?-b.pnl:0;});
const ms=d=>{const m=d.reduce((s,v)=>s+v,0)/d.length;return{m,se:Math.sqrt(d.reduce((s,v)=>s+(v-m)**2,0)/(d.length-1)/d.length)};};
console.log(`${n} rounds ${new Date(R[0].t).toISOString().slice(0,10)} → ${new Date(R[n-1].t).toISOString().slice(0,16)}`);
const out={};
for(const [sn,set] of Object.entries(SETS)){console.log(`\n=== ${sn}: base ${J(stat(R.map(o=>bet(o,set)).filter(Boolean)))}`);out[sn]={};
 for(const fk of Object.keys(F)){if(fk==='none')continue;const d=ms(delta(R,set,fk));const dropped=R.map(o=>{const b=bet(o,set);return b&&F[fk](C.get(o.t),b)?b:null;}).filter(Boolean);
  const q=[0,1,2,3].map(i=>{const[a,b]=Qs(i);return ms(delta(R.slice(a,b),set,fk)).m;});const nv=ms(delta(R.filter(o=>o.t>=NOV1),set,fk));
  out[sn][fk]={whole:+d.m.toFixed(3),se:+d.se.toFixed(3)};
  console.log(`  ${fk.padEnd(22)} Δ ${f(d.m)}±${d.se.toFixed(3)} (${(d.m/d.se).toFixed(1)} SE) dropped ${J(stat(dropped))} | Q ${q.map(v=>f(v,2)).join(' / ')} | Nov1+ ${f(nv.m)}±${nv.se.toFixed(3)}`);}
 // expanding walk-forward: choose filter on rounds before each quarter, score on that quarter
 const pooled=[];let picks=[];const kept=[];
 for(let i=1;i<4;i++){const[a,b]=Qs(i);const tr=R.slice(0,a),te=R.slice(a,b);let best='none',bv=0;
  for(const fk of Object.keys(F)){if(fk==='none')continue;const v=ms(delta(tr,set,fk)).m;if(v>bv){bv=v;best=fk;}}
  picks.push(`Q${i+1} ${best} (train ${f(bv)})`);pooled.push(...(best==='none'?te.map(()=>0):delta(te,set,best)));
  for(const o of te){const b=bet(o,set);if(b&&!(best!=='none'&&F[best](C.get(o.t),b)))kept.push(b);}}
 const p=ms(pooled);console.log(`  WF picks: ${picks.join('; ')} → pooled Δ ${f(p.m)}±${p.se.toFixed(3)} ¢/round, kept test bets ${J(stat(kept))}`);out[sn].WF={m:+p.m.toFixed(3),se:+p.se.toFixed(3),picks};}
// :45 favourite lead (Nov 1): Kalshi favourite at 4:00, all prices 55–96, :45 vs other rounds, before/after Nov 1 13:00
console.log('\n=== :45 lead forward check (favourite at 4:00, any 55–96¢ price)');
const fav=(o,lo,hi)=>{const a=o.at[240];if(!a||a.ya==null||a.na==null)return null;const c=a.ya>=a.na?1:0,ask=c?a.ya:a.na;if(ask<lo||ask>hi)return null;const won=o.up===c;return{c,ask,won,pnl:(won?100-ask:-ask)-feeP(ask)};};
for(const [lo,hi] of[[55,96],[60,70],[75,90]])for(const [nm,S] of[['before Nov 1',R.filter(o=>o.t<NOV1)],['since Nov 1',R.filter(o=>o.t>=NOV1)]]){
 const g=k=>S.filter(o=>(C.get(o.t).mi===45)===k).map(o=>{const b=fav(o,lo,hi);if(!b)return null;const tr=C.get(o.t).tr;return{...b,down:tr!=null&&tr< -1};}).filter(Boolean);
 console.log(`  ${lo}–${hi}¢ ${nm.padEnd(13)} :45 ${J(stat(g(true)))} | :45 downtrend ${J(stat(g(true).filter(x=>x.down)))} | other ${J(stat(g(false)))}`);}
fs.writeFileSync('/tmp/claude-0/t1113.json',J(out));
