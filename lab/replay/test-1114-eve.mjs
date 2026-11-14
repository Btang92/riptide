// Nov 14 evening, under the 4:00 lock.
// A) stake by entry price (live stakes a fixed $ per bet, so cheaper contracts get more of them). Dollar stake ∝ ask^k (k = −2, −1, 0 live, +1 = fixed
//    contracts, +2) and step tilts (75–80¢ ×1.5 / 81–90¢ ×0.5 and the reverse, ≥85¢ ×1.5). Each scheme rescaled so its average dollar stake on the
//    set's earlier bets equals live's. Δ = $ P&L per round per $1 average stake (i.e. ¢ per round per $1), paired vs live, expanding walk-forward Q2–Q4.
//    Prompted by the autopsy: 75–85¢ −2.9¢/ct vs 85¢+ −0.8¢/ct.
// B) watch rechecks: hour windows added to 12–24 ET (04–08, 00–08, all hours), high-σ15 favourites, Tuesday favourites, forward since Nov 13 12:00 UTC.
// C) fee rounding: Kalshi rounds each order's fee up to the cent; cost at the live $25 stake vs the formula used in the bet rule.
import fs from 'fs';import {R,feeP,stat} from './sim.mjs';import {et} from './lib.mjs';
const J=JSON.stringify,f=(v,d=3)=>(v>=0?'+':'')+v.toFixed(d);
const M=JSON.parse(fs.readFileSync('lab/data/candles.json'));
const n=R.length,Qs=i=>[Math.floor(n*i/4),Math.floor(n*(i+1)/4)];const NOV1=Date.UTC(2026,10,1,17,0),FWD=Date.UTC(2026,10,13,12,0);
const ms=d=>{if(!d.length)return{m:0,se:0};const m=d.reduce((s,v)=>s+v,0)/d.length;return{m,se:d.length>1?Math.sqrt(d.reduce((s,v)=>s+(v-m)**2,0)/(d.length-1)/d.length):0};};
function bet(o,set,hours){const a=o.at[240];if(!a||!a.f||a.ya==null||a.na==null||a.pu==null)return null;const h=et(o.t).h;
 let c,ask;if(set==='fav'){c=a.ya>=a.na?1:0;ask=c?a.ya:a.na;if(ask<75||ask>90)return null;}
 else{if(hours&&!hours(h))return null;c=a.pu>=.5?1:0;ask=c?a.ya:a.na;if(ask<75||ask>90)return null;if(Math.max(a.pu,1-a.pu)*100<ask+feeP(ask)+3)return null;}
 const won=o.up===c;return{t:o.t,c,ask,won,pnl:(won?100-ask:-ask)-feeP(ask),h,wd:new Date(o.t-5*3600e3).getUTCDay()};}
const live=h=>h>=12;
const SETS={'live 12–24':['live',live],'live all hours':['all',null],'fav 75–90 all hours':['fav',null]};
console.log(`${n} rounds ${new Date(R[0].t).toISOString().slice(0,10)} → ${new Date(R[n-1].t).toISOString().slice(0,16)}`);
// ---------- A
const SCH={'live (fixed $)':a=>1,'$∝ask^-2':a=>(a/80)**-2,'$∝ask^-1':a=>(a/80)**-1,'fixed contracts ($∝ask)':a=>a/80,'$∝ask^2':a=>(a/80)**2,
 '75–80 ×1.5, 81–90 ×0.5':a=>a<=80?1.5:.5,'75–80 ×0.5, 81–90 ×1.5':a=>a<=80?.5:1.5,'≥85 ×1.5':a=>a>=85?1.5:1,'≥85 ×0.5':a=>a>=85?.5:1};
// $ P&L per round per $1 average stake = w·pnl/ask (pnl in ¢ per contract, contracts per $ = 100/ask → ¢ per $ = pnl·100/ask ... per $1 stake in ¢)
const val=(b,w)=>w(b.ask)*b.pnl*100/b.ask; // ¢ per $1 of stake
function norm(bets,w){const s=bets.reduce((x,b)=>x+w(b.ask),0)/Math.max(1,bets.length);return a=>w(a)/s;}
console.log('\n##### A stake by entry price (Δ = ¢ per round per $1 average stake, paired vs live fixed-$)');
const outA={};
for(const [sn,[set,hrs]] of Object.entries(SETS)){const B=R.map(o=>bet(o,set,hrs));const allB=B.filter(Boolean);
 const base=ms(R.map((o,i)=>B[i]?val(B[i],SCH['live (fixed $)']):0));
 console.log(`\n=== ${sn}: ${allB.length} bets ${J(stat(allB))}, live ${f(base.m)}±${base.se.toFixed(3)} ¢/round per $1`);outA[sn]={};
 const byB={};for(const b of allB){const k=b.ask<=80?'75–80':b.ask<85?'81–84':'85–90';(byB[k]??=[]).push(b);}
 console.log('  by price:',Object.entries(byB).map(([k,v])=>`${k} ${J(stat(v))}`).join(' | '));
 const delta=(lo,hi,w)=>{const W=norm(allB.filter(b=>b.t<R[lo].t),w)||w;const X=[];for(let i=lo;i<hi;i++){const b=B[i];X.push(b?val(b,W)-val(b,SCH['live (fixed $)']):0);}return X;};
 for(const k of Object.keys(SCH)){if(k.startsWith('live'))continue;const W=norm(allB,SCH[k]);const d=ms(R.map((o,i)=>B[i]?val(B[i],W)-val(B[i],SCH['live (fixed $)']):0));
  const q=[0,1,2,3].map(i=>{const[a,b]=Qs(i);const Wq=norm(allB,SCH[k]);return ms(R.slice(a,b).map((o,j)=>{const x=B[a+j];return x?val(x,Wq)-val(x,SCH['live (fixed $)']):0;})).m;});
  outA[sn][k]={m:+d.m.toFixed(3),se:+d.se.toFixed(3)};
  console.log(`  ${k.padEnd(26)} Δ ${f(d.m)}±${d.se.toFixed(3)} (${(d.m/(d.se||1)).toFixed(1)} SE) | Q ${q.map(v=>f(v,2)).join(' / ')}`);}
 // walk-forward: choose scheme on rounds before each quarter (normalising on those bets), score on the quarter
 const pooled=[],picks=[];let tb=0;
 for(let i=1;i<4;i++){const[a,b]=Qs(i);let best='live (fixed $)',bv=0;
  for(const k of Object.keys(SCH)){if(k.startsWith('live'))continue;const tr=allB.filter(x=>x.t<R[a].t);const W=norm(tr,SCH[k]);const v=ms(R.slice(0,a).map((o,j)=>B[j]?val(B[j],W)-val(B[j],SCH['live (fixed $)']):0)).m;if(v>bv){bv=v;best=k;}}
  picks.push(`Q${i+1} ${best} (train ${f(bv)})`);pooled.push(...(best.startsWith('live')?R.slice(a,b).map(()=>0):delta(a,b,SCH[best])));tb+=B.slice(a,b).filter(Boolean).length;}
 const p=ms(pooled);outA[sn].WF={m:+p.m.toFixed(3),se:+p.se.toFixed(3),picks,testBets:tb};
 console.log(`  WF: ${picks.join('; ')} → pooled Δ ${f(p.m)}±${p.se.toFixed(3)} ¢/round per $1 (${tb} test bets)`);}
// ---------- B watches
console.log('\n##### B watches');
const HW={'12–24 (live)':h=>h>=12,'12–24 + 04–08':h=>h>=12||(h>=4&&h<8),'12–24 + 00–08':h=>h>=12||h<8,'04–24':h=>h>=4,'all hours':h=>true};
const outB={hours:{}};
const pr=(label,X,ref)=>{const d=ms(X.map((o)=>{const a=ref(o),b=o.__;return 0;}));};
for(const [k,fn] of Object.entries(HW)){if(k.startsWith('12–24 (live)'))continue;
 const D=(S)=>ms(S.map(o=>{const a=bet(o,'x',fn),b=bet(o,'x',live);return (a?a.pnl:0)-(b?b.pnl:0);}));
 const w=D(R),q=[0,1,2,3].map(i=>{const[a,b]=Qs(i);return D(R.slice(a,b)).m;}),nv=D(R.filter(o=>o.t>=NOV1)),fw=D(R.filter(o=>o.t>=FWD));
 const add=R.map(o=>{const a=bet(o,'x',fn);return a&&!live(a.h)?a:null;}).filter(Boolean);const addF=add.filter(b=>b.t>=FWD);
 outB.hours[k]={whole:+w.m.toFixed(3),se:+w.se.toFixed(3),q:q.map(v=>+v.toFixed(3)),nov1:+nv.m.toFixed(3),fwd:+fw.m.toFixed(3),fwdSe:+fw.se.toFixed(3),added:stat(add),addedFwd:stat(addF)};
 console.log(`  vs live: ${k.padEnd(16)} whole ${f(w.m)}±${w.se.toFixed(3)} (${(w.m/w.se).toFixed(1)} SE) | Q ${q.map(v=>f(v,2)).join(' / ')} | Nov1+ ${f(nv.m)}±${nv.se.toFixed(3)} | fwd since Nov13 12:00 ${f(fw.m)}±${fw.se.toFixed(3)} | added bets ${J(stat(add))} fwd ${J(stat(addF))}`);}
// σ15 high tercile favourites and Tuesday favourites
function s15(o){const e=o.t+180000;const c=[];for(let i=15;i>=0;i--){const y=M[e-i*60000];if(y)c.push(y[4]);}if(c.length<12)return null;let v=0;for(let i=1;i<c.length;i++)v+=(c[i]-c[i-1])**2;return Math.sqrt(v/(c.length-1));}
const old=R.slice(0,Math.floor(n*.75)).map(s15).filter(x=>x!=null).sort((a,b)=>a-b);const hiT=old[Math.floor(old.length*2/3)];
const FAV=R.map(o=>{const b=bet(o,'fav');if(!b)return null;b.s=s15(o);return b;}).filter(Boolean);
const sl=(lab,X)=>{const s=stat(X);console.log(`  ${lab.padEnd(44)} ${J(s)}`);return s;};
outB.fav={hiT:+hiT.toFixed(1)};console.log(`  fav 75–90 (σ15 high tercile ≥ $${hiT.toFixed(1)}):`);
outB.fav.hiAll=sl('high σ15 all',FAV.filter(b=>b.s>=hiT));outB.fav.restAll=sl('rest all',FAV.filter(b=>b.s!=null&&b.s<hiT));
outB.fav.hiNov=sl('high σ15 since Nov 1',FAV.filter(b=>b.s>=hiT&&b.t>=NOV1));outB.fav.restNov=sl('rest since Nov 1',FAV.filter(b=>b.s<hiT&&b.t>=NOV1));
outB.fav.hiFwd=sl('high σ15 since Nov 13 12:00',FAV.filter(b=>b.s>=hiT&&b.t>=FWD));
outB.fav.tue=sl('Tuesday (ET) all',FAV.filter(b=>b.wd===2));outB.fav.notTue=sl('not Tuesday all',FAV.filter(b=>b.wd!==2));
outB.fav.tueNov=sl('Tuesday since Nov 1',FAV.filter(b=>b.wd===2&&b.t>=NOV1));
const LV=R.map(o=>bet(o,'live',live)).filter(Boolean);outB.liveFwd=sl('live 12–24 since Nov 13 12:00',LV.filter(b=>b.t>=FWD));outB.liveNov=sl('live 12–24 since Nov 1',LV.filter(b=>b.t>=NOV1));
// ---------- C fee rounding at $25
console.log('\n##### C fee rounding (whole order rounded up to the cent) at a $25 stake');
const outC={};for(const a of[75,78,80,82,85,88,90]){const c=Math.floor(2500/a),exact=0.07*c*(a/100)*(1-a/100)*100,round=Math.ceil(exact);outC[a]={c,exact:+(exact/c).toFixed(3),rounded:+(round/c).toFixed(3),extra:+((round-exact)/c).toFixed(3)};}
console.log(J(outC));
fs.writeFileSync(process.env.OUT||'/tmp/claude-0/t1114eve.json',J({A:outA,B:outB,C:outC}));
