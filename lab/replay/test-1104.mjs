// Nov 4: two new which-rounds-to-bet filters at the 4:00 lock, plus log-loss value over Kalshi's own 4:00 price.
// (A) previous-round surprise: the previous round's 4:00 favourite (priced ≥70¢) lost. Does the next round's favourite then win less than its price?
//     Also the previous round's final move size (|settle proxy − strike| in 15-min vol units).
// (B) within-round extreme: where BTC sits at 4:00 inside its own 0:00–4:00 range, measured toward the favourite
//     (1 = at the round's best for the favourite, 0 = given it all back), and how much of the favourite's best distance
//     from the strike has been given back. Aimed at calls that turn against by 5:00 and at the entry price.
// Walk-forward: thresholds chosen on older 75%, scored on newest 25% + quarters. Paired ¢/round vs the unfiltered rule.
import fs from 'fs';import {R,feeP,stat,paired} from './sim.mjs';import {et} from './lib.mjs';const J=JSON.stringify;
const C=JSON.parse(fs.readFileSync('lab/data/candles.json'));const cd=ms=>C[ms];
const side=(a,c)=>a?(c?a.ya:a.na):null;
// per-round context
const ctx=R.map((o,i)=>{const a=o.at[240];if(!a||a.ya==null||a.na==null)return null;const c=a.ya>=a.na?1:0;
  const k=[0,1,2,3].map(m=>cd(o.t+m*60000));if(k.some(x=>!x))return{c};
  const hi=Math.max(...k.map(x=>x[2])),lo=Math.min(...k.map(x=>x[1])),now=k[3][4],rng=hi-lo;
  const pos=rng>0?(c?(now-lo)/rng:(hi-now)/rng):0.5;
  const bestFav=c?hi-o.strike:o.strike-lo,nowFav=c?now-o.strike:o.strike-now;const give=bestFav>0?(bestFav-nowFav)/bestFav:null;
  // 60-min vol for scaling
  let s2=0,n=0;for(let m=1;m<=60;m++){const p=cd(o.t-m*60000),q=cd(o.t-(m+1)*60000);if(p&&q){s2+=Math.log(p[4]/q[4])**2;n++;}}
  const vol15=n>20?Math.sqrt(s2/n*15)*now:null;
  return{c,pos,give,vol15,endMove:null};});
// previous round outcome info
const prev=R.map((o,i)=>{if(i===0||R[i-1].t!==o.t-9e5)return null;const p=R[i-1],a=p.at[240];if(!a||a.ya==null||a.na==null)return null;
  const c=a.ya>=a.na?1:0,ask=side(a,c),won=p.up===c;const end=cd(p.t+14*60000);const v=ctx[i-1]&&ctx[i-1].vol15;
  return{favAsk:ask,lost:!won,surprise:!won&&ask>=70,move:end&&v?Math.abs(end[4]-p.strike)/v:null};});
const mk=(mode,allH,gate)=>(o,i)=>{if(!allH&&et(o.t).h<12)return null;const a=o.at[240];if(!a||a.ya==null||a.na==null)return null;let c,ask;
  if(mode==='live'){if(!a.f)return null;const pu=a.pu;c=pu>=.5?1:0;ask=side(a,c);if(ask<75||ask>90||Math.max(pu,1-pu)*100<ask+feeP(ask)+3)return null;}
  else{c=a.ya>=a.na?1:0;ask=side(a,c);if(ask<75||ask>90)return null;}
  if(gate&&!gate(i,c))return null;const w=o.up===c;return{t:o.t,pnl:(w?100-ask:-ask)-feeP(ask),won:w,ask};};
const idx=new Map(R.map((o,i)=>[o.t,i]));const go=(s,f)=>s.map(o=>f(o,idx.get(o.t))).filter(Boolean);
const cut=Math.floor(R.length*.75),TR=R.slice(0,cut),TE=R.slice(cut),Q=i=>R.slice(Math.floor(R.length*i/4),Math.floor(R.length*(i+1)/4));
console.log('rounds',R.length,'test from',new Date(TE[0].t).toISOString(),'ctx with candles',ctx.filter(x=>x&&x.pos!=null).length);
// descriptive: favourite 75–90 all hours by group
const favAll=mk('fav',true,null);
const grp=(name,g)=>{const s=go(R,favAll).filter(b=>{const i=idx.get(b.t);return g(i);});return `${name} ${J(stat(s))}`;};
console.log('\n(A) favourite 75–90 @4:00 all hours, by previous round:');
console.log(' ',grp('prev fav≥70 lost',i=>prev[i]&&prev[i].surprise),'|',grp('prev fav won',i=>prev[i]&&!prev[i].lost),'|',grp('prev fav<70 lost',i=>prev[i]&&prev[i].lost&&!prev[i].surprise));
for(const[lo,hi]of[[0,.5],[.5,1],[1,1.5],[1.5,99]])console.log('  prev end move',lo,'-',hi,'vol:',grp('',i=>prev[i]&&prev[i].move!=null&&prev[i].move>=lo&&prev[i].move<hi));
console.log('\n(B) favourite 75–90 @4:00 all hours, by position in own 0–4 min range (toward favourite):');
for(const[lo,hi]of[[0,.25],[.25,.5],[.5,.75],[.75,.95],[.95,1.01]])console.log(`  pos ${lo}-${hi}:`,grp('',i=>ctx[i]&&ctx[i].pos!=null&&ctx[i].pos>=lo&&ctx[i].pos<hi));
for(const[lo,hi]of[[-9,0.05],[.05,.25],[.25,.5],[.5,9]])console.log(`  gave back ${lo}-${hi} of best distance:`,grp('',i=>ctx[i]&&ctx[i].give!=null&&ctx[i].give>=lo&&ctx[i].give<hi));
// gates
const gates=[];
gates.push(['skip after surprise',()=>i=>!(prev[i]&&prev[i].surprise)]);
for(const t of [0.75,1,1.5])gates.push([`skip prev move>${t}vol`,()=>i=>!(prev[i]&&prev[i].move!=null&&prev[i].move>t)]);
for(const t of [.25,.4,.5,.6])gates.push([`skip pos<${t}`,()=>i=>!(ctx[i]&&ctx[i].pos!=null&&ctx[i].pos<t)]);
for(const t of [.9,.95])gates.push([`skip pos≥${t}`,()=>i=>!(ctx[i]&&ctx[i].pos!=null&&ctx[i].pos>=t)]);
for(const t of [.25,.4,.5])gates.push([`skip gave back>${t}`,()=>i=>!(ctx[i]&&ctx[i].give!=null&&ctx[i].give>t)]);
for(const[mode,allH]of[['live',false],['live',true],['fav',true],['fav',false]]){const base=mk(mode,allH,null);
  console.log(`\n== ${mode} ${allH?'all hours':'12–24'} base train ${J(stat(go(TR,base)))} test ${J(stat(go(TE,base)))} whole ${J(stat(go(R,base)))}`);
  const res=gates.map(([k,g])=>{const f=mk(mode,allH,g());return{k,f,te:stat(go(TE,f)),ptr:paired(TR,go(TR,f),go(TR,base)),pte:paired(TE,go(TE,f),go(TE,base)),pw:paired(R,go(R,f),go(R,base))};});
  res.sort((x,y)=>y.ptr.perRound-x.ptr.perRound);
  for(const r of res)console.log(`  ${r.k.padEnd(22)} trainΔ ${r.ptr.perRound}±${r.ptr.se} | test ${J(r.te)} Δ${r.pte.perRound}±${r.pte.se} | whole Δ${r.pw.perRound}±${r.pw.se}`);
  const b=res[0];console.log('   train-best',b.k,'quarters Δ',[0,1,2,3].map(i=>{const p=paired(Q(i),go(Q(i),b.f),go(Q(i),base));return `${p.perRound}±${p.se}`;}).join(' / '));}
// log-loss value over Kalshi mid at 4:00 (logistic on logit(mid) + feature), fit train, score test
const lg=p=>Math.log(p/(1-p)),sg=z=>1/(1+Math.exp(-z));
const fit=(X,y)=>{let w=new Array(X[0].length).fill(0);for(let it=0;it<400;it++){const g=w.map(()=>0);for(let i=0;i<X.length;i++){const p=sg(X[i].reduce((s,x,j)=>s+x*w[j],0));for(let j=0;j<w.length;j++)g[j]+=(p-y[i])*X[i][j];}w=w.map((v,j)=>v-0.5*g[j]/X.length);}return w;};
const ll=(X,y,w)=>X.reduce((s,x,i)=>{const p=Math.min(1-1e-6,Math.max(1e-6,sg(x.reduce((a,v,j)=>a+v*w[j],0))));return s-(y[i]?Math.log(p):Math.log(1-p));},0)/X.length;
const rowsF=(S,feat)=>{const X=[],X0=[],y=[];for(const o of S){const i=idx.get(o.t),a=o.at[240];if(!a||a.ya==null||a.na==null)continue;const f=feat(i);if(f==null)continue;
  const c=a.ya>=a.na?1:0,mid=Math.min(.99,Math.max(.01,(a.ya+100-a.na)/200)),pf=c?mid:1-mid;X0.push([1,lg(pf)]);X.push([1,lg(pf),f]);y.push(o.up===c?1:0);}return{X,X0,y};};
console.log('\nlog-loss gain over Kalshi mid @4:00 (favourite frame), test:');
for(const[name,feat]of[['prev surprise',i=>prev[i]?(prev[i].surprise?1:0):null],['prev move vol',i=>prev[i]&&prev[i].move!=null?Math.min(3,prev[i].move):null],['pos in range',i=>ctx[i]&&ctx[i].pos!=null?ctx[i].pos-.5:null],['gave back',i=>ctx[i]&&ctx[i].give!=null?Math.max(-1,Math.min(1.5,ctx[i].give)):null]]){
  const a=rowsF(TR,feat),b=rowsF(TE,feat);const w=fit(a.X,a.y),w0=fit(a.X0,a.y);
  const g=ll(b.X0,b.y,w0)-ll(b.X,b.y,w);
  // bootstrap-ish SE of per-row ll difference
  const d=b.X.map((x,i)=>{const p=sg(x.reduce((s,v,j)=>s+v*w[j],0)),p0=sg(b.X0[i].reduce((s,v,j)=>s+v*w0[j],0));return (b.y[i]?Math.log(p/p0):Math.log((1-p)/(1-p0)));});
  const m=d.reduce((s,x)=>s+x,0)/d.length,se=Math.sqrt(d.reduce((s,x)=>s+(x-m)**2,0)/(d.length-1)/d.length);
  console.log(`  ${name.padEnd(14)} coef ${w[2].toFixed(3)} test gain ${g.toFixed(4)} ±${se.toFixed(4)} (n ${b.y.length})`);}
