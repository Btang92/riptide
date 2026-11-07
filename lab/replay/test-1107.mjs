// Nov 7: futures positioning at the 4:00 lock (Binance USDT-M BTCUSDT 5-min metrics from lab/oi/metrics.json):
// open-interest change over 15/60 min (and its combination with the BTC move: OI up with the move = new positions behind the favourite,
// OI down with the move = short covering / liquidation), top-trader position long/short ratio (level vs 7-day median, 60-min change),
// all-account long/short ratio, taker buy/sell volume ratio of the last bar. All oriented toward the 4:00 Kalshi favourite.
// Uses the bar stamped ≥5 min before the call (conservative publish delay). Older 75% train, newest 25% test + quarters.
import fs from 'fs';import {R,feeP,stat,paired} from './sim.mjs';import {et} from './lib.mjs';const J=JSON.stringify;
const C=JSON.parse(fs.readFileSync('lab/data/candles.json'));const cd=ms=>C[ms];
const OI=JSON.parse(fs.readFileSync('lab/oi/metrics.json'));const FIVE=300000;
const bar=ms=>{let b=Math.floor(ms/FIVE)*FIVE;for(let k=0;k<3;k++){const v=OI[b-k*FIVE];if(v&&v[0]>0&&v[3]>0&&v[4]>0&&v[5]>0)return v;}return null;};
const side=(a,c)=>a?(c?a.ya:a.na):null;const med=a=>{const s=[...a].sort((x,y)=>x-y);return s[s.length>>1];};
const ctx=R.map(o=>{const a=o.at[240];if(!a||a.ya==null||a.na==null)return null;const c=a.ya>=a.na?1:0,sg=c?1:-1;
  const now=o.t+240000,ref=now-FIVE;const B=bar(ref),B15=bar(ref-15*60000),B60=bar(ref-60*60000);
  const mid=(a.ya+100-a.na)/200,pf=c?mid:1-mid;if(!B||!B15||!B60)return{c,pf};
  const k3=cd(o.t+180000),k15=cd(o.t+180000-15*60000),k60=cd(o.t+180000-60*60000);
  const mv15=k3&&k15?Math.log(k3[4]/k15[4])*sg:null,mv60=k3&&k60?Math.log(k3[4]/k60[4])*sg:null;
  const doi15=Math.log(B[0]/B15[0]),doi60=Math.log(B[0]/B60[0]);
  const wk=[];for(let h=1;h<=168;h++){const v=bar(ref-h*3600000);if(v)wk.push(v[3]);}
  return{c,pf,doi15,doi60,
    conv15:mv15==null?null:Math.sign(mv15)*doi15, // >0: OI rising while BTC moved toward fav (or falling while it moved against)
    conv60:mv60==null?null:Math.sign(mv60)*doi60,
    topLS:sg*Math.log(B[3]),topLSd60:sg*Math.log(B[3]/B60[3]),topLSwk:wk.length>100?sg*Math.log(B[3]/med(wk)):null,
    acctLS:sg*Math.log(B[4]),taker:sg*Math.log(B[5]),takerd:sg*Math.log(B[5]/B15[5])};});
const KEYS=['doi15','doi60','conv15','conv60','topLS','topLSd60','topLSwk','acctLS','taker','takerd'];
const idx=new Map(R.map((o,i)=>[o.t,i]));const go=(s,f)=>s.map(o=>f(o,idx.get(o.t))).filter(Boolean);const has=(i,k)=>ctx[i]&&ctx[i][k]!=null;
const mk=(mode,allH,gate)=>(o,i)=>{if(!allH&&et(o.t).h<12)return null;const a=o.at[240];if(!a||a.ya==null||a.na==null)return null;let c,ask;
  if(mode==='live'){if(!a.f)return null;const pu=a.pu;c=pu>=.5?1:0;ask=side(a,c);if(ask<75||ask>90||Math.max(pu,1-pu)*100<ask+feeP(ask)+3)return null;}
  else{c=a.ya>=a.na?1:0;ask=side(a,c);if(ask<75||ask>90)return null;}
  if(gate&&!gate(i,c))return null;const w=o.up===c;return{t:o.t,pnl:(w?100-ask:-ask)-feeP(ask),won:w,ask};};
const cut=Math.floor(R.length*.75),TR=R.slice(0,cut),TE=R.slice(cut),Q=i=>R.slice(Math.floor(R.length*i/4),Math.floor(R.length*(i+1)/4));
console.log('rounds',R.length,'test from',new Date(TE[0].t).toISOString(),'with metrics',ctx.filter(x=>x&&x.doi15!=null).length);
const qcuts=k=>{const v=TR.map(o=>ctx[idx.get(o.t)]).filter(x=>x&&x[k]!=null).map(x=>x[k]).sort((a,b)=>a-b);return[.2,.4,.6,.8].map(q=>v[Math.floor(q*v.length)]);};
const qs={};for(const k of KEYS)qs[k]=qcuts(k);
const favAll=mk('fav',true,null);const W=go(R,favAll),T=go(TE,favAll);
console.log('\nfavourite 75–90 @4:00 all hours by quintile (cuts on train) — whole | test');
for(const k of KEYS){const q=qs[k],b=x=>q.filter(c=>x>=c).length;console.log(' ',k,'cuts',q.map(x=>x.toFixed(4)).join('/'));
  for(let j=0;j<5;j++){const f=bb=>{const i=idx.get(bb.t);return has(i,k)&&b(ctx[i][k])===j;};const w=stat(W.filter(f)),t=stat(T.filter(f));console.log(`    q${j+1} whole ${w.c}±${w.se} (${w.n}, ${w.win}%) | test ${t.c}±${t.se} (${t.n})`);}}
const gates=[];for(const k of KEYS)for(const j of[0,1,2,3]){gates.push([`skip ${k}<q${j+1}`,i=>!(has(i,k)&&ctx[i][k]<qs[k][j])]);gates.push([`skip ${k}≥q${j+1}`,i=>!(has(i,k)&&ctx[i][k]>=qs[k][j])]);}
const best={};
for(const[mode,allH]of[['live',false],['live',true],['fav',true],['fav',false]]){const base=mk(mode,allH,null);const nm=`${mode} ${allH?'all hours':'12–24'}`;
  console.log(`\n== ${nm} base train ${J(stat(go(TR,base)))} test ${J(stat(go(TE,base)))} whole ${J(stat(go(R,base)))}`);
  const res=gates.map(([k,g])=>{const f=mk(mode,allH,g);return{k,f,te:stat(go(TE,f)),ptr:paired(TR,go(TR,f),go(TR,base)),pte:paired(TE,go(TE,f),go(TE,base)),pw:paired(R,go(R,f),go(R,base))};});
  res.sort((x,y)=>y.ptr.perRound-x.ptr.perRound);
  for(const r of res.slice(0,5))console.log(`  ${r.k.padEnd(18)} trainΔ ${r.ptr.perRound}±${r.ptr.se} | test ${J(r.te)} Δ${r.pte.perRound}±${r.pte.se} | whole Δ${r.pw.perRound}±${r.pw.se}`);
  const b=res[0];best[nm]=b;console.log('   train-best',b.k,'quarters Δ',[0,1,2,3].map(i=>{const p=paired(Q(i),go(Q(i),b.f),go(Q(i),base));return `${p.perRound}±${p.se}`;}).join(' / '));}
// log-loss gain over Kalshi 4:00 mid
const lg=p=>Math.log(p/(1-p)),sg=z=>1/(1+Math.exp(-z)),cl=p=>Math.min(.99,Math.max(.01,p));
const fit=(X,y)=>{let w=new Array(X[0].length).fill(0);for(let it=0;it<800;it++){const g=w.map(()=>0);for(let i=0;i<X.length;i++){const p=sg(X[i].reduce((s,x,j)=>s+x*w[j],0));for(let j=0;j<w.length;j++)g[j]+=(p-y[i])*X[i][j];}w=w.map((v,j)=>v-0.5*g[j]/X.length);}return w;};
const sd={};for(const k of KEYS){const v=TR.map(o=>ctx[idx.get(o.t)]).filter(x=>x&&x[k]!=null).map(x=>x[k]);const m=v.reduce((s,x)=>s+x,0)/v.length;sd[k]=Math.sqrt(v.reduce((s,x)=>s+(x-m)**2,0)/v.length)||1;}
const rowsF=(S,ks)=>{const X=[],X0=[],y=[];for(const o of S){const i=idx.get(o.t),x=ctx[i];if(!x||x.pf==null||ks.some(k=>x[k]==null))continue;
  X0.push([1,lg(cl(x.pf))]);X.push([1,lg(cl(x.pf)),...ks.map(k=>Math.max(-4,Math.min(4,x[k]/sd[k])))]);y.push(o.up===x.c?1:0);}return{X,X0,y};};
console.log('\nlog-loss gain over Kalshi mid @4:00 (favourite frame), fit older 75%, scored newest 25%:');
for(const ks of [...KEYS.map(k=>[k]),['doi15','conv15','topLS','taker'],KEYS]){const a=rowsF(TR,ks),b=rowsF(TE,ks);const w=fit(a.X,a.y),w0=fit(a.X0,a.y);
  const d=b.X.map((x,i)=>{const p=sg(x.reduce((s,v,j)=>s+v*w[j],0)),p0=sg(b.X0[i].reduce((s,v,j)=>s+v*w0[j],0));return b.y[i]?Math.log(p/p0):Math.log((1-p)/(1-p0));});
  const m=d.reduce((s,x)=>s+x,0)/d.length,se=Math.sqrt(d.reduce((s,x)=>s+(x-m)**2,0)/(d.length-1)/d.length);
  console.log(`  ${ks.join('+').padEnd(40)} coefs ${w.slice(2).map(v=>v.toFixed(3)).join(',')} test gain ${m.toFixed(4)} ±${se.toFixed(4)} (n ${b.y.length})`);}
// positioning-value bets: underdog/favourite whenever model(mid+features) says side ≥ ask+fee+th at 4:00, 20–90¢
console.log('\nfeature-model value bets @4:00 (all features, any side 20–90¢), fit on train:');
{const a=rowsF(TR,KEYS);const w=fit(a.X,a.y);for(const th of[2,4,6]){const f=(o,i)=>{const x=ctx[i];if(!x||KEYS.some(k=>x[k]==null))return null;const z=[1,lg(cl(x.pf)),...KEYS.map(k=>Math.max(-4,Math.min(4,x[k]/sd[k])))];const pf=sg(z.reduce((s,v,j)=>s+v*w[j],0));const pUp=x.c?pf:1-pf;const A=o.at[240];
  for(const c of[1,0]){const ask=side(A,c),p=c?pUp:1-pUp;if(ask<20||ask>90)continue;if(p*100>=ask+feeP(ask)+th){const won=o.up===c;return{t:o.t,pnl:(won?100-ask:-ask)-feeP(ask),won,ask};}}return null;};
  console.log(`  th ${th}: train ${J(stat(go(TR,f)))} test ${J(stat(go(TE,f)))}`);}}
