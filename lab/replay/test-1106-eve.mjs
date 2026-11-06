// Nov 6 evening: options-implied volatility (Binance BTCBVOLUSDT, 30-day implied vol, from lab/bvol/minutes.json) at the 4:00 lock.
// (A) BVOL-implied P(favourite) = Φ(dist / (S·σ_bvol·√t_eff)), t_eff = 11 min − 40 s, vs Kalshi favourite mid -> gap (information? disagreement bets?)
// (B) BVOL / RV60 (options vs realized), BVOL 60-min and 240-min change (options market repricing risk), BVOL vs its 7-day median
// as which-rounds-to-bet filters for the live lock / 75–90¢ favourite, and as late-flip warning at 10:00. Older 75% train, newest 25% test + quarters.
import fs from 'fs';import {R,feeP,stat,paired} from './sim.mjs';import {et} from './lib.mjs';const J=JSON.stringify;
const C=JSON.parse(fs.readFileSync('lab/data/candles.json'));const cd=ms=>C[ms];
const BV=JSON.parse(fs.readFileSync('lab/bvol/minutes.json'));const bv=ms=>{for(let k=0;k<3;k++){const v=BV[ms-k*60000];if(v)return v;}return null;};
const side=(a,c)=>a?(c?a.ya:a.na):null;
const Phi=x=>{const t=1/(1+0.2316419*Math.abs(x)),d=0.3989423*Math.exp(-x*x/2),p=d*t*(0.3193815+t*(-0.3565638+t*(1.781478+t*(-1.821256+t*1.330274))));return x>0?1-p:p;};
const MINYR=525600;
const med=a=>{const s=[...a].sort((x,y)=>x-y);return s[s.length>>1];};
const ctx=R.map(o=>{const a=o.at[240];if(!a||a.ya==null||a.na==null)return null;const c=a.ya>=a.na?1:0,K=o.strike;
  const k3=cd(o.t+3*60000),now=o.t+4*60000;const B=bv(now-60000);if(!k3||K==null||!B)return{c};
  const S=k3[4],sig=B/100/Math.sqrt(MINYR),teff=11-40/60;const pUp=Phi(Math.log(S/K)/(sig*Math.sqrt(teff)));const pB=c?pUp:1-pUp;
  const mid=(a.ya+100-a.na)/200,pf=c?mid:1-mid;
  // realized 60-min vol
  let r=[];for(let m=-60;m<4;m++){const x=cd(o.t+m*60000),y=cd(o.t+(m-1)*60000);if(x&&y)r.push(Math.log(x[4]/y[4]));}
  const rv=r.length>40?Math.sqrt(r.reduce((s,v)=>s+v*v,0)/r.length)*Math.sqrt(MINYR)*100:null;
  const B60=bv(now-61*60000),B240=bv(now-241*60000);
  const wk=[];for(let h=1;h<=168;h+=1){const v=bv(now-h*3600000);if(v)wk.push(v);}
  // 10:00 late-flip frame
  const a10=o.at[600];let p10=null;if(a10&&a10.ya!=null&&a10.na!=null){const k9=cd(o.t+9*60000),B10=bv(o.t+9*60000);if(k9&&B10){const pu=Phi(Math.log(k9[4]/K)/(B10/100/Math.sqrt(MINYR)*Math.sqrt(5-40/60)));p10={c:a10.ya>=a10.na?1:0,pu};}}
  return{c,pB,pf,gap:pB-pf,ratio:rv?B/rv:null,d60:B60?Math.log(B/B60):null,d240:B240?Math.log(B/B240):null,wk:wk.length>100?B/med(wk):null,p10};});
const idx=new Map(R.map((o,i)=>[o.t,i]));const go=(s,f)=>s.map(o=>f(o,idx.get(o.t))).filter(Boolean);
const has=(i,k)=>ctx[i]&&ctx[i][k]!=null;
const mk=(mode,allH,gate)=>(o,i)=>{if(!allH&&et(o.t).h<12)return null;const a=o.at[240];if(!a||a.ya==null||a.na==null)return null;let c,ask;
  if(mode==='live'){if(!a.f)return null;const pu=a.pu;c=pu>=.5?1:0;ask=side(a,c);if(ask<75||ask>90||Math.max(pu,1-pu)*100<ask+feeP(ask)+3)return null;}
  else{c=a.ya>=a.na?1:0;ask=side(a,c);if(ask<75||ask>90)return null;}
  if(gate&&!gate(i,c))return null;const w=o.up===c;return{t:o.t,pnl:(w?100-ask:-ask)-feeP(ask),won:w,ask};};
const cut=Math.floor(R.length*.75),TR=R.slice(0,cut),TE=R.slice(cut),Q=i=>R.slice(Math.floor(R.length*i/4),Math.floor(R.length*(i+1)/4));
const okN=ctx.filter(x=>x&&x.pB!=null).length;
console.log('rounds',R.length,'test from',new Date(TE[0].t).toISOString(),'with BVOL',okN);
const vals=k=>ctx.filter(x=>x&&x[k]!=null).map(x=>x[k]);
for(const k of['gap','ratio','d60','d240','wk']){const v=vals(k).sort((a,b)=>a-b);console.log(k,'n',v.length,'q10/50/90',[.1,.5,.9].map(q=>v[Math.floor(q*v.length)].toFixed(3)).join(' '));}
const favAll=mk('fav',true,null);
// quintile cuts on train
const qcuts=k=>{const v=TR.map(o=>ctx[idx.get(o.t)]).filter(x=>x&&x[k]!=null).map(x=>x[k]).sort((a,b)=>a-b);return[.2,.4,.6,.8].map(q=>v[Math.floor(q*v.length)]);};
console.log('\nfavourite 75–90 @4:00 all hours by quintile (cuts on train): whole | test');
for(const k of['gap','ratio','d60','d240','wk']){const q=qcuts(k);const b=x=>q.filter(c=>x>=c).length;
  const W=go(R,favAll),T=go(TE,favAll);console.log(' ',k.padEnd(6),'cuts',q.map(x=>x.toFixed(3)).join('/'));
  for(let j=0;j<5;j++){const f=bb=>{const i=idx.get(bb.t);return has(i,k)&&b(ctx[i][k])===j;};console.log(`    q${j+1}`,J(stat(W.filter(f))),'|',J(stat(T.filter(f))));}}
// gates
const gates=[];const qs={};for(const k of['gap','ratio','d60','d240','wk'])qs[k]=qcuts(k);
for(const k of['gap','ratio','d60','d240','wk'])for(const j of[0,1,2,3]){gates.push([`skip ${k}<q${j+1}cut`,()=>i=>!(has(i,k)&&ctx[i][k]<qs[k][j])]);gates.push([`skip ${k}≥q${j+1}cut`,()=>i=>!(has(i,k)&&ctx[i][k]>=qs[k][j])]);}
for(const[mode,allH]of[['live',false],['live',true],['fav',true],['fav',false]]){const base=mk(mode,allH,null);
  console.log(`\n== ${mode} ${allH?'all hours':'12–24'} base train ${J(stat(go(TR,base)))} test ${J(stat(go(TE,base)))} whole ${J(stat(go(R,base)))}`);
  const res=gates.map(([k,g])=>{const f=mk(mode,allH,g());return{k,f,te:stat(go(TE,f)),ptr:paired(TR,go(TR,f),go(TR,base)),pte:paired(TE,go(TE,f),go(TE,base)),pw:paired(R,go(R,f),go(R,base))};});
  res.sort((x,y)=>y.ptr.perRound-x.ptr.perRound);
  for(const r of res.slice(0,6))console.log(`  ${r.k.padEnd(20)} trainΔ ${r.ptr.perRound}±${r.ptr.se} | test ${J(r.te)} Δ${r.pte.perRound}±${r.pte.se} | whole Δ${r.pw.perRound}±${r.pw.se}`);
  const b=res[0];console.log('   train-best',b.k,'quarters Δ',[0,1,2,3].map(i=>{const p=paired(Q(i),go(Q(i),b.f),go(Q(i),base));return `${p.perRound}±${p.se}`;}).join(' / '));}
// disagreement bets: buy the side where BVOL value ≥ ask+fee+th, at 4:00, ask 20–90, all hours
console.log('\nBVOL-value bets at 4:00 (side with pB*100 ≥ ask+fee+th, ask 20–90, all hours):');
for(const th of[0,3,6,10]){const f=(o,i)=>{const x=ctx[i];if(!x||x.pB==null)return null;const a=o.at[240];const pUp=x.c?x.pB:1-x.pB;
  for(const c of[1,0]){const ask=side(a,c),p=c?pUp:1-pUp;if(ask<20||ask>90)continue;if(p*100>=ask+feeP(ask)+th){const w=o.up===c;return{t:o.t,pnl:(w?100-ask:-ask)-feeP(ask),won:w,ask};}}return null;};
  console.log(`  th ${th}: train ${J(stat(go(TR,f)))} test ${J(stat(go(TE,f)))}`);}
// log-loss gain over Kalshi mid at 4:00
const lg=p=>Math.log(p/(1-p)),sg=z=>1/(1+Math.exp(-z));
const fit=(X,y)=>{let w=new Array(X[0].length).fill(0);for(let it=0;it<800;it++){const g=w.map(()=>0);for(let i=0;i<X.length;i++){const p=sg(X[i].reduce((s,x,j)=>s+x*w[j],0));for(let j=0;j<w.length;j++)g[j]+=(p-y[i])*X[i][j];}w=w.map((v,j)=>v-0.5*g[j]/X.length);}return w;};
const cl=p=>Math.min(.99,Math.max(.01,p));
const rowsF=(S,feat)=>{const X=[],X0=[],y=[];for(const o of S){const i=idx.get(o.t),x=ctx[i];if(!x||x.pf==null)continue;const f=feat(i);if(f==null)continue;
  X0.push([1,lg(cl(x.pf))]);X.push([1,lg(cl(x.pf)),f]);y.push(o.up===x.c?1:0);}return{X,X0,y};};
console.log('\nlog-loss gain over Kalshi mid @4:00 (favourite frame), fit older 75%, scored newest 25%:');
for(const[name,feat]of[['BVOL logit',i=>has(i,'pB')?lg(cl(ctx[i].pB))-lg(cl(ctx[i].pf)):null],['BVOL/RV60',i=>has(i,'ratio')?Math.log(ctx[i].ratio):null],['d60',i=>has(i,'d60')?ctx[i].d60*10:null],['d240',i=>has(i,'d240')?ctx[i].d240*5:null],['vs 7d median',i=>has(i,'wk')?Math.log(ctx[i].wk)*5:null]]){
  const a=rowsF(TR,feat),b=rowsF(TE,feat);const w=fit(a.X,a.y),w0=fit(a.X0,a.y);
  const d=b.X.map((x,i)=>{const p=sg(x.reduce((s,v,j)=>s+v*w[j],0)),p0=sg(b.X0[i].reduce((s,v,j)=>s+v*w0[j],0));return b.y[i]?Math.log(p/p0):Math.log((1-p)/(1-p0));});
  const m=d.reduce((s,x)=>s+x,0)/d.length,se=Math.sqrt(d.reduce((s,x)=>s+(x-m)**2,0)/(d.length-1)/d.length);
  console.log(`  ${name.padEnd(13)} coef ${w[2].toFixed(3)} test gain ${m.toFixed(4)} ±${se.toFixed(4)} (n ${b.y.length})`);}
// late flips at 10:00: favourite 80–97 lost rate by BVOL-implied P(fav) minus price
console.log('\n10:00 favourite 80–97 by BVOL value minus price (late-flip warning):');
const L=[];for(const o of R){const i=idx.get(o.t),x=ctx[i];if(!x||!x.p10)continue;const a=o.at[600],c=x.p10.c,ask=side(a,c);if(ask<80||ask>97)continue;const p=c?x.p10.pu:1-x.p10.pu;const w=o.up===c;L.push({t:o.t,g:p*100-ask,pnl:(w?100-ask:-ask)-feeP(ask),won:w,ask});}
for(const[lo,hi]of[[-99,-10],[-10,-3],[-3,3],[3,99]])console.log(`  gap ${lo}..${hi}:`,J(stat(L.filter(b=>b.g>=lo&&b.g<hi))));
