// Nov 13 evening: which-rounds-to-bet filters under the 4:00 lock, aimed at late flips.
// A) dollar cushion at 4:00: |Coinbase spot − Kalshi strike| in $ (small cushions are where the Coinbase-vs-BRTI gap and
//    last-minute noise can flip a round the price thinks is safe). Skip if cushion < $X.
// B) absolute BTC volatility level at 4:00: σ of 1-min moves in $ over the last 15 / 60 min (terciles fixed on older rounds).
// Paired ¢/round vs the unfiltered set, whole, quarters, since Nov 1, expanding walk-forward choice Q2–Q4.
import fs from 'fs';import {R,feeP,stat} from './sim.mjs';import {et} from './lib.mjs';
const J=JSON.stringify,f=(v,d=3)=>(v>=0?'+':'')+v.toFixed(d);
const M=JSON.parse(fs.readFileSync('lab/data/candles.json'));
const n=R.length,Qs=i=>[Math.floor(n*i/4),Math.floor(n*(i+1)/4)];const NOV1=Date.UTC(2026,10,1,17,0);
function ctx(o){const e=o.t+180000;const x=M[e];if(!x||o.strike==null)return null;const spot=x[4];
 const sd=w=>{const c=[];for(let i=w;i>=0;i--){const y=M[e-i*60000];if(y)c.push(y[4]);}if(c.length<w*.75)return null;let v=0;for(let i=1;i<c.length;i++)v+=(c[i]-c[i-1])**2;return Math.sqrt(v/(c.length-1));};
 return{cush:Math.abs(spot-o.strike),s15:sd(15),s60:sd(60)};}
const C=new Map(R.map(o=>[o.t,ctx(o)]));
function bet(o,set){const a=o.at[240];if(!a||!a.f||a.ya==null||a.na==null||a.pu==null)return null;const h=et(o.t).h;
 let c,ask;if(set==='fav'){c=a.ya>=a.na?1:0;ask=c?a.ya:a.na;if(ask<75||ask>90)return null;}
 else{if(set==='live'&&h<12)return null;c=a.pu>=.5?1:0;ask=c?a.ya:a.na;if(ask<75||ask>90)return null;if(Math.max(a.pu,1-a.pu)*100<ask+feeP(ask)+3)return null;}
 const won=o.up===c;return{t:o.t,c,ask,won,pnl:(won?100-ask:-ask)-feeP(ask)};}
const SETS={'live 12–24':'live','live all hours':'all','fav 75–90 all hours':'fav'};
// terciles of σ on the oldest 75% (fixed, no peeking)
const old=R.slice(0,Math.floor(n*.75)).map(o=>C.get(o.t)).filter(Boolean);
const terc=k=>{const v=old.map(x=>x[k]).filter(x=>x!=null).sort((a,b)=>a-b);return[v[Math.floor(v.length/3)],v[Math.floor(v.length*2/3)]];};
const T15=terc('s15'),T60=terc('s60');console.log('σ15 terciles $',T15.map(v=>v.toFixed(1)),'σ60',T60.map(v=>v.toFixed(1)));
const F={none:()=>false};
for(const X of[15,25,35,50,75])F[`skip cushion<$${X}`]=x=>x&&x.cush<X;
for(const k of['s15','s60']){const T=k==='s15'?T15:T60;F[`skip low ${k}`]=x=>x&&x[k]!=null&&x[k]<T[0];F[`skip high ${k}`]=x=>x&&x[k]!=null&&x[k]>=T[1];}
F['skip cushion<1.5σ15·√11 ']=x=>x&&x.s15&&x.cush<1.5*x.s15*Math.sqrt(11);
F['skip vol rising s15>1.5·s60']=x=>x&&x.s15&&x.s60&&x.s15>1.5*x.s60;
F['skip vol falling s15<0.67·s60']=x=>x&&x.s15&&x.s60&&x.s15<0.67*x.s60;
const delta=(S,set,fk)=>S.map(o=>{const b=bet(o,set);if(!b)return 0;return F[fk](C.get(o.t),b)?-b.pnl:0;});
const ms=d=>{const m=d.reduce((s,v)=>s+v,0)/d.length;return{m,se:Math.sqrt(d.reduce((s,v)=>s+(v-m)**2,0)/(d.length-1)/d.length)};};
console.log(`${n} rounds ${new Date(R[0].t).toISOString().slice(0,10)} → ${new Date(R[n-1].t).toISOString().slice(0,16)}`);
// diagnostics: late flip rate by cushion bucket for 75–90 favourites that still led at 10:00
const B=[0,15,25,35,50,75,1e9];console.log('\nfav 75–90 @4:00 by cushion bucket: stat | led at 10:00 → lost');
for(let i=0;i<B.length-1;i++){const g=R.map(o=>{const b=bet(o,'fav');const x=C.get(o.t);if(!b||!x||x.cush<B[i]||x.cush>=B[i+1])return null;const a=o.at[600];const led=a&&a.ya!=null?((a.ya>=a.na?1:0)===b.c):null;return{...b,led};}).filter(Boolean);
 const L=g.filter(x=>x.led);console.log(`  $${B[i]}–${B[i+1]>1e8?'∞':B[i+1]}: ${J(stat(g))} | led@10 ${L.length}, late flip ${(L.filter(x=>!x.won).length/Math.max(1,L.length)*100).toFixed(1)}%`);}
const out={};
for(const [sn,set] of Object.entries(SETS)){console.log(`\n=== ${sn}: base ${J(stat(R.map(o=>bet(o,set)).filter(Boolean)))}`);out[sn]={};
 for(const fk of Object.keys(F)){if(fk==='none')continue;const d=ms(delta(R,set,fk));const dropped=R.map(o=>{const b=bet(o,set);return b&&F[fk](C.get(o.t),b)?b:null;}).filter(Boolean);
  const q=[0,1,2,3].map(i=>{const[a,b]=Qs(i);return ms(delta(R.slice(a,b),set,fk)).m;});const nv=ms(delta(R.filter(o=>o.t>=NOV1),set,fk));
  out[sn][fk]={whole:+d.m.toFixed(3),se:+d.se.toFixed(3),dropped:stat(dropped)};
  console.log(`  ${fk.padEnd(30)} Δ ${f(d.m)}±${d.se.toFixed(3)} (${(d.m/d.se).toFixed(1)} SE) dropped ${J(stat(dropped))} | Q ${q.map(v=>f(v,2)).join(' / ')} | Nov1+ ${f(nv.m)}±${nv.se.toFixed(3)}`);}
 const pooled=[];let picks=[];const kept=[];
 for(let i=1;i<4;i++){const[a,b]=Qs(i);const tr=R.slice(0,a),te=R.slice(a,b);let best='none',bv=0;
  for(const fk of Object.keys(F)){if(fk==='none')continue;const v=ms(delta(tr,set,fk)).m;if(v>bv){bv=v;best=fk;}}
  picks.push(`Q${i+1} ${best} (train ${f(bv)})`);pooled.push(...(best==='none'?te.map(()=>0):delta(te,set,best)));
  for(const o of te){const b=bet(o,set);if(b&&!(best!=='none'&&F[best](C.get(o.t),b)))kept.push(b);}}
 const p=ms(pooled);console.log(`  WF picks: ${picks.join('; ')} → pooled Δ ${f(p.m)}±${p.se.toFixed(3)} ¢/round, kept test bets ${J(stat(kept))}`);out[sn].WF={m:+p.m.toFixed(3),se:+p.se.toFixed(3),picks};}
fs.writeFileSync('/tmp/claude-0/t1113e.json',J(out));
