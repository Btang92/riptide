// Nov 6: strike chop as a which-rounds-to-bet filter at the 4:00 lock / 75–90¢ favourite.
// (A) in-round: minutes 0:00–4:00 whose 1-min candle straddled the strike (touches), minute closes on the underdog side,
//     touched in the last minute (3:00–4:00), path efficiency |net move| / total path of minute closes.
// (B) congestion: share of the 30 / 60 one-minute candles BEFORE the round that straddled the strike
//     (is the strike a level BTC has been chopping around?), and minutes since BTC last traded on the underdog side (cap 60).
// Aimed at calls that turn against by 3:00–5:00 and late flips. Thresholds chosen on older 75%, scored on newest 25% + quarters.
import fs from 'fs';import {R,feeP,stat,paired} from './sim.mjs';import {et} from './lib.mjs';const J=JSON.stringify;
const C=JSON.parse(fs.readFileSync('lab/data/candles.json'));const cd=ms=>C[ms];
const side=(a,c)=>a?(c?a.ya:a.na):null;
const ctx=R.map(o=>{const a=o.at[240];if(!a||a.ya==null||a.na==null)return null;const c=a.ya>=a.na?1:0,K=o.strike;
  const k=[0,1,2,3].map(m=>cd(o.t+m*60000));if(k.some(x=>!x)||K==null)return{c};
  const str=x=>x[1]<=K&&x[2]>=K;const touch=k.filter(str).length,last=str(k[3])?1:0;
  const dogSide=x=>c?x[4]<K:x[4]>K;const dogCl=k.filter(dogSide).length;
  let path=Math.abs(k[0][4]-k[0][3]);for(let i=1;i<4;i++)path+=Math.abs(k[i][4]-k[i-1][4]);const eff=path>0?Math.abs(k[3][4]-k[0][3])/path:1;
  let s30=0,n30=0,s60=0,n60=0,since=null;for(let m=1;m<=60;m++){const x=cd(o.t-m*60000);if(!x)continue;const s=str(x)?1:0;if(m<=30){s30+=s;n30++;}s60+=s;n60++;}
  // minutes since BTC was last on the underdog side (look back from minute 3 through 60 min before the open)
  for(let m=3;m>=-60;m--){const x=cd(o.t+m*60000);if(!x)continue;const dog=c?x[1]<K:x[2]>K;if(dog){since=3-m;break;}}if(since==null)since=64;
  return{c,touch,last,dogCl,eff,c30:n30>20?s30/n30:null,c60:n60>40?s60/n60:null,since};});
const idx=new Map(R.map((o,i)=>[o.t,i]));const go=(s,f)=>s.map(o=>f(o,idx.get(o.t))).filter(Boolean);
const mk=(mode,allH,gate)=>(o,i)=>{if(!allH&&et(o.t).h<12)return null;const a=o.at[240];if(!a||a.ya==null||a.na==null)return null;let c,ask;
  if(mode==='live'){if(!a.f)return null;const pu=a.pu;c=pu>=.5?1:0;ask=side(a,c);if(ask<75||ask>90||Math.max(pu,1-pu)*100<ask+feeP(ask)+3)return null;}
  else{c=a.ya>=a.na?1:0;ask=side(a,c);if(ask<75||ask>90)return null;}
  if(gate&&!gate(i,c))return null;const w=o.up===c;return{t:o.t,pnl:(w?100-ask:-ask)-feeP(ask),won:w,ask};};
const cut=Math.floor(R.length*.75),TR=R.slice(0,cut),TE=R.slice(cut),Q=i=>R.slice(Math.floor(R.length*i/4),Math.floor(R.length*(i+1)/4));
console.log('rounds',R.length,'test from',new Date(TE[0].t).toISOString(),'with candles',ctx.filter(x=>x&&x.touch!=null).length);
const favAll=mk('fav',true,null);const has=(i,k)=>ctx[i]&&ctx[i][k]!=null;
const grp=g=>J(stat(go(R,favAll).filter(b=>g(idx.get(b.t)))));
console.log('\nfavourite 75–90 @4:00 all hours (whole history):');
for(const v of [0,1,2,3,4])console.log(`  in-round touches ${v}:`,grp(i=>has(i,'touch')&&ctx[i].touch===v));
console.log('  touched 3:00–4:00 yes',grp(i=>has(i,'last')&&ctx[i].last===1),'no',grp(i=>has(i,'last')&&ctx[i].last===0));
for(const v of [0,1,2])console.log(`  minute closes on underdog side ${v}${v==2?'+':''}:`,grp(i=>has(i,'dogCl')&&(v<2?ctx[i].dogCl===v:ctx[i].dogCl>=2)));
for(const[lo,hi]of[[0,.3],[.3,.5],[.5,.7],[.7,.9],[.9,1.01]])console.log(`  path efficiency ${lo}-${hi}:`,grp(i=>has(i,'eff')&&ctx[i].eff>=lo&&ctx[i].eff<hi));
for(const[lo,hi]of[[0,.01],[.01,.1],[.1,.2],[.2,.35],[.35,1.01]])console.log(`  pre-round 30-min congestion ${lo}-${hi}:`,grp(i=>has(i,'c30')&&ctx[i].c30>=lo&&ctx[i].c30<hi));
for(const[lo,hi]of[[0,.05],[.05,.15],[.15,.3],[.3,1.01]])console.log(`  pre-round 60-min congestion ${lo}-${hi}:`,grp(i=>has(i,'c60')&&ctx[i].c60>=lo&&ctx[i].c60<hi));
for(const[lo,hi]of[[0,2],[2,4],[4,8],[8,20],[20,99]])console.log(`  minutes since underdog side ${lo}-${hi}:`,grp(i=>has(i,'since')&&ctx[i].since>=lo&&ctx[i].since<hi));
const gates=[];
for(const t of [2,3,4])gates.push([`skip touches≥${t}`,()=>i=>!(has(i,'touch')&&ctx[i].touch>=t)]);
gates.push(['skip touched 3–4',()=>i=>!(has(i,'last')&&ctx[i].last)]);
for(const t of [1,2])gates.push([`skip dog closes≥${t}`,()=>i=>!(has(i,'dogCl')&&ctx[i].dogCl>=t)]);
for(const t of [.3,.4,.5])gates.push([`skip eff<${t}`,()=>i=>!(has(i,'eff')&&ctx[i].eff<t)]);
for(const t of [.1,.2,.3])gates.push([`skip c30≥${t}`,()=>i=>!(has(i,'c30')&&ctx[i].c30>=t)]);
for(const t of [.15,.25])gates.push([`skip c60≥${t}`,()=>i=>!(has(i,'c60')&&ctx[i].c60>=t)]);
for(const t of [2,3,5])gates.push([`skip since<${t}`,()=>i=>!(has(i,'since')&&ctx[i].since<t)]);
for(const[mode,allH]of[['live',false],['live',true],['fav',true],['fav',false]]){const base=mk(mode,allH,null);
  console.log(`\n== ${mode} ${allH?'all hours':'12–24'} base train ${J(stat(go(TR,base)))} test ${J(stat(go(TE,base)))} whole ${J(stat(go(R,base)))}`);
  const res=gates.map(([k,g])=>{const f=mk(mode,allH,g());return{k,f,te:stat(go(TE,f)),ptr:paired(TR,go(TR,f),go(TR,base)),pte:paired(TE,go(TE,f),go(TE,base)),pw:paired(R,go(R,f),go(R,base))};});
  res.sort((x,y)=>y.ptr.perRound-x.ptr.perRound);
  for(const r of res)console.log(`  ${r.k.padEnd(20)} trainΔ ${r.ptr.perRound}±${r.ptr.se} | test ${J(r.te)} Δ${r.pte.perRound}±${r.pte.se} | whole Δ${r.pw.perRound}±${r.pw.se}`);
  const b=res[0];console.log('   train-best',b.k,'quarters Δ',[0,1,2,3].map(i=>{const p=paired(Q(i),go(Q(i),b.f),go(Q(i),base));return `${p.perRound}±${p.se}`;}).join(' / '));
  const ex=s=>{const kk=new Set(go(s,b.f).map(x=>x.t));return go(s,base).filter(x=>!kk.has(x.t));};console.log('   train-best removed: train',J(stat(ex(TR))),'test',J(stat(ex(TE))));}
// log-loss gain over Kalshi mid at 4:00 (favourite frame)
const lg=p=>Math.log(p/(1-p)),sg=z=>1/(1+Math.exp(-z));
const fit=(X,y)=>{let w=new Array(X[0].length).fill(0);for(let it=0;it<500;it++){const g=w.map(()=>0);for(let i=0;i<X.length;i++){const p=sg(X[i].reduce((s,x,j)=>s+x*w[j],0));for(let j=0;j<w.length;j++)g[j]+=(p-y[i])*X[i][j];}w=w.map((v,j)=>v-0.5*g[j]/X.length);}return w;};
const rowsF=(S,feat)=>{const X=[],X0=[],y=[];for(const o of S){const i=idx.get(o.t),a=o.at[240];if(!a||a.ya==null||a.na==null)continue;const f=feat(i);if(f==null)continue;
  const c=a.ya>=a.na?1:0,mid=Math.min(.99,Math.max(.01,(a.ya+100-a.na)/200)),pf=c?mid:1-mid;X0.push([1,lg(pf)]);X.push([1,lg(pf),f]);y.push(o.up===c?1:0);}return{X,X0,y};};
console.log('\nlog-loss gain over Kalshi mid @4:00 (favourite frame), fit older 75%, scored newest 25%:');
for(const[name,feat]of[['touches',i=>has(i,'touch')?ctx[i].touch/4:null],['touched 3–4',i=>has(i,'last')?ctx[i].last:null],['dog closes',i=>has(i,'dogCl')?ctx[i].dogCl/4:null],['path eff',i=>has(i,'eff')?ctx[i].eff-.5:null],['congestion 30',i=>has(i,'c30')?ctx[i].c30:null],['congestion 60',i=>has(i,'c60')?ctx[i].c60:null],['since dog side',i=>has(i,'since')?Math.log2(1+ctx[i].since)/6:null]]){
  const a=rowsF(TR,feat),b=rowsF(TE,feat);const w=fit(a.X,a.y),w0=fit(a.X0,a.y);
  const d=b.X.map((x,i)=>{const p=sg(x.reduce((s,v,j)=>s+v*w[j],0)),p0=sg(b.X0[i].reduce((s,v,j)=>s+v*w0[j],0));return b.y[i]?Math.log(p/p0):Math.log((1-p)/(1-p0));});
  const m=d.reduce((s,x)=>s+x,0)/d.length,se=Math.sqrt(d.reduce((s,x)=>s+(x-m)**2,0)/(d.length-1)/d.length);
  console.log(`  ${name.padEnd(15)} coef ${w[2].toFixed(3)} test gain ${m.toFixed(4)} ±${se.toFixed(4)} (n ${b.y.length})`);}
