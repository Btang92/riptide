// Nov 8 morning. (A) The read's volatility input at the 4:00 lock: the live read uses 60 one-minute returns (root-mean-square) as σ. Does a different
// estimator (shorter/longer window, EWMA, high–low range, variance-ratio scaling for mean reversion or trend, fat-tail mixture) price rounds better and pick better bets?
// Changes WHICH rounds clear read ≥ ask+fee+3. (B) Coinbase USDT-USD premium (stablecoin demand, lab/usdt/minutes.json) at 4:00 toward the favourite.
// Older 75% train, newest 25% test + quarters. Uses only candles closed by the 4:00 check.
import fs from 'fs';import {R,feeP,stat,paired} from './sim.mjs';import {et,pUp} from './lib.mjs';const J=JSON.stringify;
const C=JSON.parse(fs.readFileSync('lab/data/candles.json')),U=JSON.parse(fs.readFileSync('lab/usdt/minutes.json'));const MIN=60000;
const cl=p=>Math.min(.999,Math.max(.001,p));
const rets=(w,n)=>{const r=[];for(let i=n-1;i>=0;i--){const a=C[w-i*MIN-MIN],b=C[w-i*MIN];if(a&&b)r.push(Math.log(b[4]/a[4]));}return r;};
const rms=r=>Math.sqrt(r.reduce((s,x)=>s+x*x,0)/r.length);
const vr=(r,k)=>{const n=r.length;if(n<k*6)return null;const v1=r.reduce((s,x)=>s+x*x,0)/n;let vk=0,c=0;for(let i=k;i<=n;i++){let s=0;for(let j=i-k;j<i;j++)s+=r[j];vk+=s*s;c++;}return vk/c/(k*v1);};
const parkinson=(w,n)=>{let s=0,c=0;for(let i=1;i<=n;i++){const x=C[w-i*MIN];if(x&&x[1]>0){s+=Math.log(x[2]/x[1])**2;c++;}}return c<n*.7?null:Math.sqrt(s/c/(4*Math.LN2));};
const VAR={
  'σ15':r=>r.length>=15?rms(r.slice(-15)):null,'σ30':r=>r.length>=30?rms(r.slice(-30)):null,'σ120':r=>r.length>=100?rms(r.slice(-120)):null,'σ240':r=>r.length>=200?rms(r):null,
  'blend15+60':r=>r.length>=60?Math.sqrt(.5*rms(r.slice(-15))**2+.5*rms(r.slice(-60))**2):null,
  'blend60+240':r=>r.length>=200?Math.sqrt(.5*rms(r.slice(-60))**2+.5*rms(r)**2):null,
  'ewma.94':r=>{if(r.length<60)return null;let v=rms(r.slice(0,30))**2;for(const x of r.slice(30))v=.94*v+.06*x*x;return Math.sqrt(v);},
  'ewma.97':r=>{if(r.length<60)return null;let v=rms(r.slice(0,30))**2;for(const x of r.slice(30))v=.97*v+.03*x*x;return Math.sqrt(v);},
  'σ60×0.85':r=>rms(r.slice(-60))*.85,'σ60×1.15':r=>rms(r.slice(-60))*1.15,
  'VR5(60)':r=>{const s=rms(r.slice(-60)),v=vr(r.slice(-60),5);return v==null?null:s*Math.sqrt(Math.max(.4,Math.min(1.6,v)));},
  'VR5(240)':r=>{const s=rms(r.slice(-60)),v=vr(r,5);return v==null?null:s*Math.sqrt(Math.max(.4,Math.min(1.6,v)));},
  'VR10(240)':r=>{const s=rms(r.slice(-60)),v=vr(r,10);return v==null?null:s*Math.sqrt(Math.max(.4,Math.min(1.6,v)));},
};
const S=240,LEFT=660;
const reads=R.map(o=>{const a=o.at[S];if(!a||a.ya==null||a.na==null)return null;const w=o.t+S*1000-MIN,cc=C[w];if(!cc)return null;const r=rets(w,240);if(r.length<60)return null;
  const spot=cc[4],base=rms(r.slice(-60))/Math.sqrt(60),Pu=sig=>cl(pUp(spot,o.strike,LEFT,sig));const p={};
  // base (rebuilt) read; a.pu is the same but from build.mjs window
  p.base=Pu(base);
  for(const[k,f]of Object.entries(VAR)){const s=f(r);p[k]=s?Pu(s/Math.sqrt(60)):null;}
  const pk=parkinson(w,60);p['range60']=pk?Pu(pk/Math.sqrt(60)):null;
  // fat-tail mixture: 85% σ×0.8, 15% σ×1.8 (variance-matched ≈1.0)
  {const s=base;p['fat']=cl(.85*Pu(s*.8)+.15*Pu(s*1.8));}
  return p;});
const KS=Object.keys(reads.find(Boolean));
const idx=new Map(R.map((o,i)=>[o.t,i]));
const side=(a,c)=>a?(c?a.ya:a.na):null;
const cut=Math.floor(R.length*.75),TR=R.slice(0,cut),TE=R.slice(cut),Q=i=>R.slice(Math.floor(R.length*i/4),Math.floor(R.length*(i+1)/4));
console.log('rounds',R.length,'test from',new Date(TE[0].t).toISOString(),'with reads',reads.filter(Boolean).length,'(need 240 prior min; candles start ~2h before first round so earliest rounds missing σ240 use null)');
// (A1) log-loss of each read at 4:00, plus the Kalshi mid
const ll=(p,y)=>y?-Math.log(p):-Math.log(1-p);
const LL=(S0,f)=>{let s=0,n=0;for(const o of S0){const v=f(o);if(v==null)continue;s+=ll(cl(v),o.up);n++;}return{ll:+(s/n).toFixed(4),n};};
const mid=o=>{const a=o.at[S];return a&&a.ya!=null&&a.na!=null?(a.ya+100-a.na)/200:null;};
console.log('\n(A1) log-loss @4:00 — train | test');
console.log('  Kalshi mid'.padEnd(16),J(LL(TR,mid)),J(LL(TE,mid)));
for(const k of KS)console.log(('  '+k).padEnd(16),J(LL(TR,o=>{const p=reads[idx.get(o.t)];return p?p[k]:null;})),J(LL(TE,o=>{const p=reads[idx.get(o.t)];return p?p[k]:null;})));
// (A2) live rule with each read
const mkV=(k,allH,m)=>(o)=>{if(!allH&&et(o.t).h<12)return null;const a=o.at[S],i=idx.get(o.t);if(!a||a.ya==null||a.na==null||!reads[i])return null;const pu=k==='live'?a.pu:reads[i][k];if(pu==null)return null;const c=pu>=.5?1:0,ask=side(a,c);if(ask<75||ask>90||Math.max(pu,1-pu)*100<ask+feeP(ask)+m)return null;const w=o.up===c;return{t:o.t,pnl:(w?100-ask:-ask)-feeP(ask),won:w,ask};};
const go=(s,f)=>s.map(f).filter(Boolean);
for(const allH of[false,true]){const base=mkV('live',allH,3);console.log(`\n(A2) ${allH?'all hours':'12–24 ET'} live rule base train ${J(stat(go(TR,base)))} test ${J(stat(go(TE,base)))} whole ${J(stat(go(R,base)))}`);
  const res=KS.flatMap(k=>[0,3,5].map(m=>{const f=mkV(k,allH,m);return{k:`${k} m${m}`,f,tr:stat(go(TR,f)),te:stat(go(TE,f)),ptr:paired(TR,go(TR,f),go(TR,base)),pte:paired(TE,go(TE,f),go(TE,base)),pw:paired(R,go(R,f),go(R,base))};}));
  res.sort((a,b)=>b.ptr.perRound-a.ptr.perRound);
  for(const r of res.slice(0,7))console.log(`  ${r.k.padEnd(16)} train ${r.tr.c}±${r.tr.se} (${r.tr.n}) Δ${r.ptr.perRound}±${r.ptr.se} | test ${r.te.c}±${r.te.se} (${r.te.n}) Δ${r.pte.perRound}±${r.pte.se} | whole Δ${r.pw.perRound}±${r.pw.se}`);
  const b=res[0];console.log('   train-best',b.k,'quarters Δ',[0,1,2,3].map(i=>{const p=paired(Q(i),go(Q(i),b.f),go(Q(i),base));return `${p.perRound}±${p.se}`;}).join(' / '));
  // the base read (a.pu reproduction check)
  const reb=mkV('base',allH,3);console.log('   rebuilt base (should match live): test',J(stat(go(TE,reb))));}
// (A3) VR regime: favourite 75–90 all hours by VR(240,5) tercile (cuts on train) — is a mean-reverting / trending tape priced?
{const v=R.map(o=>{const a=o.at[S];if(!a)return null;const w=o.t+S*1000-MIN;const r=rets(w,240);return r.length>=200?vr(r,5):null;});
 const trv=v.slice(0,cut).filter(x=>x!=null).sort((a,b)=>a-b),q=[trv[trv.length/3|0],trv[trv.length*2/3|0]];
 console.log('\n(A3) favourite 75–90 @4:00 all hours by VR5(240) tercile, cuts',q.map(x=>x.toFixed(3)).join('/'));
 const fav=(o)=>{const a=o.at[S];if(!a||a.ya==null||a.na==null)return null;const c=a.ya>=a.na?1:0,ask=side(a,c);if(ask<75||ask>90)return null;const w=o.up===c;return{t:o.t,pnl:(w?100-ask:-ask)-feeP(ask),won:w,ask};};
 for(let j=0;j<3;j++){const f=bb=>{const x=v[idx.get(bb.t)];return x!=null&&(q.filter(c=>x>=c).length===j);};const a=go(R,fav).filter(f),t=go(TE,fav).filter(f);console.log(`   t${j+1} whole ${J(stat(a))} test ${J(stat(t))}`);}}
// (B) USDT-USD premium at the 4:00 lock
const med=a=>{const s=[...a].sort((x,y)=>x-y);return s[s.length>>1];};
const usd=ms=>{for(let k=0;k<4;k++){const v=U[ms-k*MIN];if(v)return v;}return null;};
const ctx=R.map(o=>{const a=o.at[S];if(!a||a.ya==null||a.na==null)return null;const c=a.ya>=a.na?1:0,sg=c?1:-1,now=o.t+S*1000-MIN;const m0=(a.ya+100-a.na)/200,pf=c?m0:1-m0;
  const u=usd(now),u15=usd(now-15*MIN),u60=usd(now-60*MIN);if(!u||!u15||!u60)return{c,pf};
  const wk=[];for(let h=1;h<=168;h+=1){const v=usd(now-h*3600000);if(v)wk.push(v);}
  let h60=[];for(let i=1;i<=60;i++){const v=usd(now-i*MIN);if(v)h60.push(v);}
  return{c,pf,lvl:sg*(u-1)*1e4,d15:sg*Math.log(u/u15)*1e4,d60:sg*Math.log(u/u60)*1e4,v60:h60.length>30?sg*Math.log(u/(h60.reduce((s,x)=>s+x,0)/h60.length))*1e4:null,vwk:wk.length>100?sg*Math.log(u/med(wk))*1e4:null};});
const KEYS=['lvl','d15','d60','v60','vwk'];const has=(i,k)=>ctx[i]&&ctx[i][k]!=null;
console.log('\n(B) rounds with USDT data',ctx.filter(x=>x&&x.lvl!=null).length);
const qcuts=k=>{const v=TR.map(o=>ctx[idx.get(o.t)]).filter(x=>x&&x[k]!=null).map(x=>x[k]).sort((a,b)=>a-b);return[.2,.4,.6,.8].map(q=>v[Math.floor(q*v.length)]);};
const qs={};for(const k of KEYS)qs[k]=qcuts(k);
const mk=(mode,allH,gate)=>(o)=>{const i=idx.get(o.t);if(!allH&&et(o.t).h<12)return null;const a=o.at[S];if(!a||a.ya==null||a.na==null)return null;let c,ask;
  if(mode==='live'){if(!a.f)return null;const pu=a.pu;c=pu>=.5?1:0;ask=side(a,c);if(ask<75||ask>90||Math.max(pu,1-pu)*100<ask+feeP(ask)+3)return null;}
  else{c=a.ya>=a.na?1:0;ask=side(a,c);if(ask<75||ask>90)return null;}
  if(gate&&!gate(i))return null;const w=o.up===c;return{t:o.t,pnl:(w?100-ask:-ask)-feeP(ask),won:w,ask};};
const favAll=mk('fav',true,null),W=go(R,favAll),T=go(TE,favAll);
for(const k of KEYS){const q=qs[k],b=x=>q.filter(c=>x>=c).length;console.log(' ',k,'cuts',q.map(x=>x.toFixed(2)).join('/'),[0,1,2,3,4].map(j=>{const f=bb=>{const i=idx.get(bb.t);return has(i,k)&&b(ctx[i][k])===j;};const w=stat(W.filter(f)),t=stat(T.filter(f));return `q${j+1} ${w.c}±${w.se}(${w.n})|${t.c}(${t.n})`;}).join('  '));}
const gates=[];for(const k of KEYS)for(const j of[0,1,2,3]){gates.push([`skip ${k}<q${j+1}`,i=>!(has(i,k)&&ctx[i][k]<qs[k][j])]);gates.push([`skip ${k}≥q${j+1}`,i=>!(has(i,k)&&ctx[i][k]>=qs[k][j])]);}
for(const[mode,allH]of[['live',false],['live',true],['fav',true]]){const base=mk(mode,allH,null);const nm=`${mode} ${allH?'all hours':'12–24'}`;
  console.log(`\n== ${nm} base train ${J(stat(go(TR,base)))} test ${J(stat(go(TE,base)))}`);
  const res=gates.map(([k,g])=>{const f=mk(mode,allH,g);return{k,f,te:stat(go(TE,f)),ptr:paired(TR,go(TR,f),go(TR,base)),pte:paired(TE,go(TE,f),go(TE,base)),pw:paired(R,go(R,f),go(R,base))};});
  res.sort((x,y)=>y.ptr.perRound-x.ptr.perRound);
  for(const r of res.slice(0,4))console.log(`  ${r.k.padEnd(18)} trainΔ ${r.ptr.perRound}±${r.ptr.se} | test ${J(r.te)} Δ${r.pte.perRound}±${r.pte.se} | whole Δ${r.pw.perRound}±${r.pw.se}`);
  const b=res[0];console.log('   train-best',b.k,'quarters Δ',[0,1,2,3].map(i=>{const p=paired(Q(i),go(Q(i),b.f),go(Q(i),base));return `${p.perRound}±${p.se}`;}).join(' / '));}
const lg=p=>Math.log(p/(1-p)),sg=z=>1/(1+Math.exp(-z)),cl2=p=>Math.min(.99,Math.max(.01,p));
const fit=(X,y)=>{let w=new Array(X[0].length).fill(0);for(let it=0;it<800;it++){const g=w.map(()=>0);for(let i=0;i<X.length;i++){const p=sg(X[i].reduce((s,x,j)=>s+x*w[j],0));for(let j=0;j<w.length;j++)g[j]+=(p-y[i])*X[i][j];}w=w.map((v,j)=>v-0.5*g[j]/X.length);}return w;};
const sd={};for(const k of KEYS){const v=TR.map(o=>ctx[idx.get(o.t)]).filter(x=>x&&x[k]!=null).map(x=>x[k]);const m=v.reduce((s,x)=>s+x,0)/v.length;sd[k]=Math.sqrt(v.reduce((s,x)=>s+(x-m)**2,0)/v.length)||1;}
const rowsF=(S0,ks)=>{const X=[],X0=[],y=[];for(const o of S0){const x=ctx[idx.get(o.t)];if(!x||x.pf==null||ks.some(k=>x[k]==null))continue;X0.push([1,lg(cl2(x.pf))]);X.push([1,lg(cl2(x.pf)),...ks.map(k=>Math.max(-4,Math.min(4,x[k]/sd[k])))]);y.push(o.up===x.c?1:0);}return{X,X0,y};};
console.log('\nlog-loss gain over Kalshi mid @4:00 (favourite frame), fit older 75%, scored newest 25%:');
for(const ks of [...KEYS.map(k=>[k]),KEYS]){const a=rowsF(TR,ks),b=rowsF(TE,ks);const w=fit(a.X,a.y),w0=fit(a.X0,a.y);const d=b.X.map((x,i)=>{const p=sg(x.reduce((s,v,j)=>s+v*w[j],0)),p0=sg(b.X0[i].reduce((s,v,j)=>s+v*w0[j],0));return b.y[i]?Math.log(p/p0):Math.log((1-p)/(1-p0));});const m=d.reduce((s,x)=>s+x,0)/d.length,se=Math.sqrt(d.reduce((s,x)=>s+(x-m)**2,0)/(d.length-1)/d.length);console.log(`  ${ks.join('+').padEnd(24)} coefs ${w.slice(2).map(v=>v.toFixed(3)).join(',')} test gain ${m.toFixed(4)} ±${se.toFixed(4)} (n ${b.y.length})`);}
