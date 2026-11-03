// Nov 3 evening (2): rolling-calibration gate. Bet the 4:00 lock (or the 75–90 favourite) only when the trailing N settled rounds'
// 75–90¢ favourites at 4:00 made money (or won at least their price). Tests whether "overpriced favourite" spells persist long enough
// to sit them out (the Oct 23→ slump). Also the overpriced-favourite watch recheck.
import {R,feeP,stat,paired} from './sim.mjs';import {et} from './lib.mjs';const J=JSON.stringify;
const side=(a,c)=>a?(c?a.ya:a.na):null;
// per-round favourite 75–90 at 4:00 outcome (pnl) for the trailing signal
const F=R.map(o=>{const a=o.at[240];if(!a||a.ya==null||a.na==null)return null;const c=a.ya>=a.na?1:0,ask=side(a,c);if(ask<75||ask>90)return null;const w=o.up===c;return{pnl:(w?100-ask:-ask)-feeP(ask),ex:(w?100:0)-ask};});
const trail=(i,N)=>{let s=0,n=0;for(let j=Math.max(0,i-N);j<i;j++)if(F[j]){s+=F[j].ex;n++;}return n>=20?s/n:null;}; // excess win% over price
const mk=(mode,allH,N,thr)=>{const fn=(o,i)=>{if(!allH&&et(o.t).h<12)return null;const a=o.at[240];if(!a||a.ya==null||a.na==null)return null;let c,ask;
 if(mode==='live'){if(!a.f)return null;const pu=a.pu;c=pu>=.5?1:0;ask=side(a,c);if(ask<75||ask>90||Math.max(pu,1-pu)*100<ask+feeP(ask)+3)return null;}
 else{c=a.ya>=a.na?1:0;ask=side(a,c);if(ask<75||ask>90)return null;}
 if(N){const tr=trail(i,N);if(tr!=null&&tr<thr)return null;}
 const w=o.up===c;return{t:o.t,pnl:(w?100-ask:-ask)-feeP(ask),won:w,ask};};return fn;};
const idx=new Map(R.map((o,i)=>[o.t,i]));const go=(s,f)=>s.map(o=>f(o,idx.get(o.t))).filter(Boolean);
const cut=Math.floor(R.length*.75),TR=R.slice(0,cut),TE=R.slice(cut),Q=i=>R.slice(Math.floor(R.length*i/4),Math.floor(R.length*(i+1)/4));
console.log('rounds',R.length,'test from',new Date(TE[0].t).toISOString());
const G=[];for(const N of [48,96,192,384,672])for(const thr of [-6,-3,0,3])G.push([N,thr]);
for(const[mode,allH]of[['live',false],['live',true],['fav',true],['fav',false]]){const base=mk(mode,allH,0,0);
 console.log(`\n== ${mode} ${allH?'all hours':'12–24'} base train ${J(stat(go(TR,base)))} test ${J(stat(go(TE,base)))}`);
 const res=G.map(([N,thr])=>{const f=mk(mode,allH,N,thr);return{k:`N${N} ≥${thr}`,f,tr:stat(go(TR,f)),te:stat(go(TE,f)),ptr:paired(TR,go(TR,f),go(TR,base)),pte:paired(TE,go(TE,f),go(TE,base)),pw:paired(R,go(R,f),go(R,base))};});
 res.sort((x,y)=>y.ptr.perRound-x.ptr.perRound);
 for(const r of res.slice(0,4))console.log(`  ${r.k.padEnd(9)} train ${J(r.tr)} Δ${r.ptr.perRound}±${r.ptr.se} | test ${J(r.te)} Δ${r.pte.perRound}±${r.pte.se} | whole Δ${r.pw.perRound}±${r.pw.se}`);
 const b=res[0];console.log('   train-best quarters Δ',[0,1,2,3].map(i=>{const p=paired(Q(i),go(Q(i),b.f),go(Q(i),base));return `${p.perRound}±${p.se}`;}).join(' / '));}
// persistence check: correlation of trailing-N excess with next-day excess (non-overlapping 96-round blocks)
const blocks=[];for(let i=0;i+96<=R.length;i+=96){const s=F.slice(i,i+96).filter(Boolean);blocks.push(s.reduce((a,x)=>a+x.ex,0)/Math.max(1,s.length));}
const corr=(x,y)=>{const n=x.length,mx=x.reduce((a,b)=>a+b)/n,my=y.reduce((a,b)=>a+b)/n;let sxy=0,sx=0,sy=0;for(let i=0;i<n;i++){sxy+=(x[i]-mx)*(y[i]-my);sx+=(x[i]-mx)**2;sy+=(y[i]-my)**2;}return sxy/Math.sqrt(sx*sy);};
console.log('\nday-to-day corr of 75–90 fav excess (96-round blocks, n',blocks.length,')',corr(blocks.slice(0,-1),blocks.slice(1)).toFixed(3),' 3-day→next-day',(()=>{const x=[],y=[];for(let i=3;i<blocks.length;i++){x.push((blocks[i-1]+blocks[i-2]+blocks[i-3])/3);y.push(blocks[i]);}return corr(x,y).toFixed(3);})(),' 2SE≈',(2/Math.sqrt(blocks.length)).toFixed(2));
// watch recheck
const fav=mk('fav',true,0,0);const S=Date.UTC(2026,9,23,22),A31=Date.UTC(2026,9,31,13,25),L=Date.UTC(2026,10,1,13);
console.log('watch: fav 75–90 @4:00 all hours: before Oct 23 22:00',J(stat(go(R.filter(o=>o.t<S),fav))),'since',J(stat(go(R.filter(o=>o.t>=S),fav))),'since Oct 31 13:25',J(stat(go(R.filter(o=>o.t>=A31),fav))),'since Nov 1 13:00',J(stat(go(R.filter(o=>o.t>=L),fav))));
const live=mk('live',false,0,0);console.log('live lock since Nov 1 13:00',J(stat(go(R.filter(o=>o.t>=L),live))),'since Nov 3 11:15',J(stat(go(R.filter(o=>o.t>=Date.UTC(2026,10,3,11,15)),live))));
