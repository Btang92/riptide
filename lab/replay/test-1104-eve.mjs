// Nov 4 evening: two untested state families at the 4:00 lock, aimed at calls that turn against after entry and late flips.
// (A) fat tails / jumpiness before the round: largest 1-min move in the last 60 min, count of >3σ minutes and kurtosis over
//     the last 240 min (σ = rms 1-min return over 240 min). Normal-ish pricing may under-rate reversal risk when moves come in jumps.
// (B) clock-seasonal forward volatility: typical rms 1-min return at the SAME ET clock minutes as this round's remaining
//     minutes (4:00–15:00) over the previous 14 days (no look-ahead). Compared with trailing 60-min vol (sv/rv60, log2) and
//     with Kalshi-implied vol at 4:00 (iv/sv, log2): is the market too confident when the coming minutes are usually busy?
// Walk-forward: thresholds chosen on older 75%, scored on newest 25% + quarters; paired ¢/round vs unfiltered rule;
// log-loss gain over Kalshi's own 4:00 mid.
import fs from 'fs';import {R,feeP,stat,paired} from './sim.mjs';import {et} from './lib.mjs';const J=JSON.stringify;
const M=JSON.parse(fs.readFileSync('lab/data/candles.json'));const cb=t=>M[t]?.[4];
function ninv(p){const a=[-39.69683028665376,220.9460984245205,-275.9285104469687,138.357751867269,-30.66479806614716,2.506628277459239],b=[-54.47609879822406,161.5853275888792,-155.6989798598866,66.80131188771972,-13.28068155288572],c=[-0.007784894002430293,-0.3223964580411365,-2.400758277161838,-2.549732539343734,4.374664141464968,2.938163982698783],d=[0.007784695709041462,0.3224671290700398,2.445134137142996,3.754408661907416];
 const pl=0.02425;let q,r;if(p<pl){q=Math.sqrt(-2*Math.log(p));return(((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5])/((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1);}
 if(p>1-pl){q=Math.sqrt(-2*Math.log(1-p));return-(((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5])/((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1);}
 q=p-0.5;r=q*q;return(((((a[0]*r+a[1])*r+a[2])*r+a[3])*r+a[4])*r+a[5])*q/(((((b[0]*r+b[1])*r+b[2])*r+b[3])*r+b[4])*r+1);}
const ret=t=>{const x=cb(t),y=cb(t-60000);return x&&y?Math.log(x/y):null;};
// seasonal: rms of returns at clock minutes t+4..t+14 (candle starts) on previous 14 days
const DAY=864e5;
function seas(t){let s=0,n=0;for(let d=1;d<=14;d++)for(let k=4;k<15;k++){const r=ret(t-d*DAY+k*60000);if(r!=null){s+=r*r;n++;}}return n>=60?Math.sqrt(s/n):null;}
const F=R.map(o=>{const a=o.at[240];if(!a||a.ya==null||a.na==null)return null;const m=o.t+180000,px=cb(m);if(!px)return null;
 const rs=[];for(let i=0;i<240;i++){const r=ret(m-i*60000);if(r!=null)rs.push({i,r});}if(rs.length<180)return null;
 const s2=rs.reduce((s,x)=>s+x.r*x.r,0)/rs.length,sd=Math.sqrt(s2);const r60=rs.filter(x=>x.i<60);if(r60.length<40)return null;
 const rv60=Math.sqrt(r60.reduce((s,x)=>s+x.r*x.r,0)/r60.length);
 const jmax=Math.max(...r60.map(x=>Math.abs(x.r)))/sd,n3=rs.filter(x=>Math.abs(x.r)>3*sd).length,kurt=rs.reduce((s,x)=>s+x.r**4,0)/rs.length/(s2*s2);
 const sv=seas(o.t);const mid=Math.min(.97,Math.max(.03,(a.ya+100-a.na)/200)),z=ninv(mid),dd=Math.log(px/o.strike),tau=Math.max(.5,(900-240-40)/60);
 const iv=(Math.sign(z)===Math.sign(dd)&&Math.abs(z)>0.15)?Math.abs(dd)/(Math.abs(z)*Math.sqrt(tau)):null;
 return{jmax,n3,kurt:Math.log2(kurt),svr:sv?Math.log2(sv/rv60):null,ivs:sv&&iv?Math.log2(iv/sv):null};});
const idx=new Map(R.map((o,i)=>[o.t,i]));
const mk=(mode,allH,gate)=>(o)=>{const i=idx.get(o.t);if(!allH&&et(o.t).h<12)return null;const a=o.at[240];if(!a||a.ya==null||a.na==null)return null;let c,ask;
 if(mode==='live'){if(!a.f)return null;const pu=a.pu;c=pu>=.5?1:0;ask=c?a.ya:a.na;if(ask<75||ask>90||Math.max(pu,1-pu)*100<ask+feeP(ask)+3)return null;}
 else{c=a.ya>=a.na?1:0;ask=c?a.ya:a.na;if(ask<75||ask>90)return null;}
 if(gate&&!gate(F[i]))return null;const w=o.up===c;return{t:o.t,pnl:(w?100-ask:-ask)-feeP(ask),won:w,ask,F:F[i]};};
const go=(s,f)=>s.map(f).filter(Boolean);
const cut=Math.floor(R.length*.75),TR=R.slice(0,cut),TE=R.slice(cut),Q=i=>R.slice(Math.floor(R.length*i/4),Math.floor(R.length*(i+1)/4));
console.log('rounds',R.length,'test from',new Date(TE[0].t).toISOString(),'with features',F.filter(Boolean).length,'with seasonal',F.filter(x=>x&&x.svr!=null).length);
const KEYS=['jmax','n3','kurt','svr','ivs'];
const favAll=go(R,mk('fav',true,null)),favTr=go(TR,mk('fav',true,null));
const cuts={};for(const k of KEYS){const v=favTr.map(x=>x.F?.[k]).filter(x=>x!=null).sort((a,b)=>a-b);cuts[k]=[.2,.4,.6,.8].map(q=>v[Math.floor(v.length*q)]);}
console.log('\nfavourite 75–90 @4:00 all hours by quintile (cuts from train):');
for(const k of KEYS){const b=[-1e9,...cuts[k],1e9];const row=[];for(let j=0;j<5;j++){const s=stat(favAll.filter(x=>x.F?.[k]!=null&&x.F[k]>=b[j]&&x.F[k]<b[j+1]));row.push(`q${j+1} ${s.c}±${s.se} (${s.n},${s.win}%)`);}
 console.log(`  ${k.padEnd(5)} cuts ${cuts[k].map(x=>+x.toFixed(2)).join(' ')} | ${row.join(' | ')}`);}
const gates=[];for(const k of KEYS)for(const j of [0,1,2,3]){const t=cuts[k][j];gates.push([`skip ${k}<${+t.toFixed(2)}`,f=>!(f&&f[k]!=null&&f[k]<t)]);gates.push([`skip ${k}≥${+t.toFixed(2)}`,f=>!(f&&f[k]!=null&&f[k]>=t)]);}
for(const[mode,allH]of[['live',false],['live',true],['fav',true],['fav',false]]){const base=mk(mode,allH,null);
 console.log(`\n== ${mode} ${allH?'all hours':'12–24'} base train ${J(stat(go(TR,base)))} test ${J(stat(go(TE,base)))} whole ${J(stat(go(R,base)))}`);
 const res=gates.map(([k,g])=>{const f=mk(mode,allH,g);return{k,f,te:stat(go(TE,f)),ptr:paired(TR,go(TR,f),go(TR,base)),pte:paired(TE,go(TE,f),go(TE,base)),pw:paired(R,go(R,f),go(R,base))};});
 res.sort((x,y)=>y.ptr.perRound/(y.ptr.se||1)-x.ptr.perRound/(x.ptr.se||1));
 for(const r of res.slice(0,5))console.log(`  ${r.k.padEnd(18)} trainΔ ${r.ptr.perRound}±${r.ptr.se} | test ${J(r.te)} Δ${r.pte.perRound}±${r.pte.se} | whole Δ${r.pw.perRound}±${r.pw.se}`);
 const b=res[0];console.log('   train-best',b.k,'quarters Δ',[0,1,2,3].map(i=>{const p=paired(Q(i),go(Q(i),b.f),go(Q(i),base));return `${p.perRound}±${p.se}`;}).join(' / '));}
// log-loss gain over Kalshi mid at 4:00 (favourite frame, all prices)
const lg=p=>Math.log(p/(1-p)),sg=z=>1/(1+Math.exp(-z));
const fit=(X,y)=>{let w=new Array(X[0].length).fill(0);for(let it=0;it<600;it++){const g=w.map(()=>0);for(let i=0;i<X.length;i++){const p=sg(X[i].reduce((s,x,j)=>s+x*w[j],0));for(let j=0;j<w.length;j++)g[j]+=(p-y[i])*X[i][j];}w=w.map((v,j)=>v-0.5*g[j]/X.length);}return w;};
const rowsF=(S,k,inter)=>{const X=[],X0=[],y=[];for(const o of S){const i=idx.get(o.t),a=o.at[240];if(!a||a.ya==null||a.na==null||!F[i]||F[i][k]==null)continue;
 const c=a.ya>=a.na?1:0,mid=Math.min(.99,Math.max(.01,(a.ya+100-a.na)/200)),L=lg(c?mid:1-mid);let f=F[i][k];f=Math.max(-5,Math.min(k==='n3'?20:k==='jmax'?12:5,f));
 X0.push([1,L]);X.push(inter?[1,L,f,f*L]:[1,L,f]);y.push(o.up===c?1:0);}return{X,X0,y};};
const mu={};for(const k of KEYS){const v=favTr.map(x=>x.F?.[k]).filter(x=>x!=null);mu[k]=v.reduce((s,x)=>s+x,0)/v.length;}
console.log('\nlog-loss gain over Kalshi mid @4:00 (favourite frame, all prices), test:');
for(const k of KEYS)for(const inter of [0,1]){const a=rowsF(TR,k,inter),b=rowsF(TE,k,inter);
 const cen=X=>X.map(x=>{const y=x.slice();y[2]-=mu[k];if(inter)y[3]=y[2]*y[1];return y;});const A=cen(a.X),B=cen(b.X);
 const w=fit(A,a.y),w0=fit(a.X0,a.y);const d=B.map((x,i)=>{const p=sg(x.reduce((s,v,j)=>s+v*w[j],0)),p0=sg(b.X0[i].reduce((s,v,j)=>s+v*w0[j],0));return b.y[i]?Math.log(p/p0):Math.log((1-p)/(1-p0));});
 const m=d.reduce((s,x)=>s+x,0)/d.length,se=Math.sqrt(d.reduce((s,x)=>s+(x-m)**2,0)/(d.length-1)/d.length);
 console.log(`  ${k.padEnd(5)}${inter?' ×price':'       '} coef ${w.slice(2).map(x=>x.toFixed(3)).join(',')} test gain ${m.toFixed(4)} ±${se.toFixed(4)} (n ${d.length})`);}
