// Nov 8 morning (b): variance-ratio regime at the 4:00 lock. VR(k,n) = variance of k-minute returns ÷ (k × variance of 1-minute returns) over the last n minutes
// (closed candles only). VR>1 = trending tape (more movement ahead than 1-minute vol implies), VR<1 = mean-reverting. Lead from test-1108.mjs: top-tercile VR5(240) favourites −2.3±1.9.
// Thresholds chosen on older 75%, scored on newest 25% + quarters; also a forward check on everything since Nov 1 when the idea could not have been seen.
import fs from 'fs';import {R,feeP,stat,paired} from './sim.mjs';import {et} from './lib.mjs';const J=JSON.stringify;
const C=JSON.parse(fs.readFileSync('lab/data/candles.json'));const MIN=60000,S=240;
const rets=(w,n)=>{const r=[];for(let i=n-1;i>=0;i--){const a=C[w-i*MIN-MIN],b=C[w-i*MIN];if(a&&b)r.push(Math.log(b[4]/a[4]));}return r;};
const vr=(r,k)=>{const n=r.length;if(n<k*6)return null;const v1=r.reduce((s,x)=>s+x*x,0)/n;if(!v1)return null;let vk=0,c=0;for(let i=k;i<=n;i++){let s=0;for(let j=i-k;j<i;j++)s+=r[j];vk+=s*s;c++;}return vk/c/(k*v1);};
const CFG=[[5,60],[5,120],[5,240],[10,120],[10,240],[15,240],[3,60],[3,240]];const key=([k,n])=>`vr${k}_${n}`;
const ctx=R.map(o=>{const a=o.at[S];if(!a||a.ya==null||a.na==null)return null;const w=o.t+S*1000-MIN,r=rets(w,240);const x={};for(const c of CFG){const rr=r.slice(-c[1]);x[key(c)]=rr.length>=c[1]*.9?vr(rr,c[0]):null;}const m=(a.ya+100-a.na)/200,f=a.ya>=a.na?1:0;x.c=f;x.pf=f?m:1-m;return x;});
const KEYS=CFG.map(key);const idx=new Map(R.map((o,i)=>[o.t,i]));const side=(a,c)=>a?(c?a.ya:a.na):null;const go=(s,f)=>s.map(f).filter(Boolean);
const mk=(mode,allH,gate)=>o=>{const i=idx.get(o.t);if(!allH&&et(o.t).h<12)return null;const a=o.at[S];if(!a||a.ya==null||a.na==null)return null;let c,ask;
 if(mode==='live'){if(!a.f)return null;const pu=a.pu;c=pu>=.5?1:0;ask=side(a,c);if(ask<75||ask>90||Math.max(pu,1-pu)*100<ask+feeP(ask)+3)return null;}else{c=a.ya>=a.na?1:0;ask=side(a,c);if(ask<75||ask>90)return null;}
 if(gate&&!gate(i))return null;const w=o.up===c;return{t:o.t,pnl:(w?100-ask:-ask)-feeP(ask),won:w,ask};};
const cut=Math.floor(R.length*.75),TR=R.slice(0,cut),TE=R.slice(cut),Q=i=>R.slice(Math.floor(R.length*i/4),Math.floor(R.length*(i+1)/4));
const FWD=Date.UTC(2026,10,1,23,15),F=R.filter(o=>o.t>=FWD);
console.log('rounds',R.length,'test from',new Date(TE[0].t).toISOString(),'forward from Nov 1 23:15 UTC rounds',F.length);
const fav=mk('fav',true,null),W=go(R,fav),T=go(TE,fav),Tr=go(TR,fav);
const qcut=(k,qq)=>{const v=TR.map(o=>ctx[idx.get(o.t)]).filter(x=>x&&x[k]!=null).map(x=>x[k]).sort((a,b)=>a-b);return qq.map(q=>v[Math.floor(q*v.length)]);};
console.log('\nfavourite 75–90 @4:00 all hours by VR tercile (cuts on train): train | test | whole');
for(const k of KEYS){const q=qcut(k,[1/3,2/3]),b=x=>q.filter(c=>x>=c).length;console.log(' ',k,'cuts',q.map(x=>x.toFixed(3)).join('/'),[0,1,2].map(j=>{const f=bb=>{const x=ctx[idx.get(bb.t)];return x&&x[k]!=null&&b(x[k])===j;};const tr=stat(Tr.filter(f)),t=stat(T.filter(f)),w=stat(W.filter(f));return `t${j+1} ${tr.c}±${tr.se}(${tr.n}) | ${t.c}±${t.se}(${t.n}) | ${w.c}±${w.se}(${w.n})`;}).join('   '));}
// gates: skip when VR ≥ a train quantile (trending tape) or ≤ (reverting tape)
const gates=[];for(const k of KEYS)for(const q of[.5,.6,.67,.75,.85]){const c=qcut(k,[q])[0];gates.push([`skip ${k}≥p${Math.round(q*100)}`,i=>!(ctx[i]&&ctx[i][k]!=null&&ctx[i][k]>=c)]);}
for(const k of KEYS)for(const q of[.15,.25,.33]){const c=qcut(k,[q])[0];gates.push([`skip ${k}<p${Math.round(q*100)}`,i=>!(ctx[i]&&ctx[i][k]!=null&&ctx[i][k]<c)]);}
for(const[mode,allH]of[['live',false],['live',true],['fav',true],['fav',false]]){const base=mk(mode,allH,null);const nm=`${mode} ${allH?'all hours':'12–24'}`;
 console.log(`\n== ${nm} base train ${J(stat(go(TR,base)))} test ${J(stat(go(TE,base)))} whole ${J(stat(go(R,base)))} forward ${J(stat(go(F,base)))}`);
 const res=gates.map(([k,g])=>{const f=mk(mode,allH,g);return{k,f,te:stat(go(TE,f)),ptr:paired(TR,go(TR,f),go(TR,base)),pte:paired(TE,go(TE,f),go(TE,base)),pw:paired(R,go(R,f),go(R,base)),pf:paired(F,go(F,f),go(F,base))};});
 res.sort((x,y)=>y.ptr.perRound-x.ptr.perRound);
 for(const r of res.slice(0,5))console.log(`  ${r.k.padEnd(20)} trainΔ ${r.ptr.perRound}±${r.ptr.se} | test ${J(r.te)} Δ${r.pte.perRound}±${r.pte.se} | whole Δ${r.pw.perRound}±${r.pw.se} | forward Δ${r.pf.perRound}±${r.pf.se}`);
 const b=res[0];console.log('   train-best',b.k,'quarters Δ',[0,1,2,3].map(i=>{const p=paired(Q(i),go(Q(i),b.f),go(Q(i),base));return `${p.perRound}±${p.se}`;}).join(' / '),'removed test bets',J(stat(go(TE,base).filter(x=>!go(TE,b.f).some(y=>y.t===x.t)))));}
const lg=p=>Math.log(p/(1-p)),sg=z=>1/(1+Math.exp(-z)),cl=p=>Math.min(.99,Math.max(.01,p));
const fit=(X,y)=>{let w=new Array(X[0].length).fill(0);for(let it=0;it<800;it++){const g=w.map(()=>0);for(let i=0;i<X.length;i++){const p=sg(X[i].reduce((s,x,j)=>s+x*w[j],0));for(let j=0;j<w.length;j++)g[j]+=(p-y[i])*X[i][j];}w=w.map((v,j)=>v-0.5*g[j]/X.length);}return w;};
const sd={};for(const k of KEYS){const v=TR.map(o=>ctx[idx.get(o.t)]).filter(x=>x&&x[k]!=null).map(x=>x[k]);const m=v.reduce((s,x)=>s+x,0)/v.length;sd[k]={m,s:Math.sqrt(v.reduce((s,x)=>s+(x-m)**2,0)/v.length)||1};}
const rowsF=(S0,ks,fbandOnly)=>{const X=[],X0=[],y=[];for(const o of S0){const x=ctx[idx.get(o.t)];if(!x||x.pf==null||ks.some(k=>x[k]==null))continue;const fa=side(o.at[S],x.c);if(fbandOnly&&(fa<75||fa>90))continue;const l=lg(cl(x.pf));X0.push([1,l]);const v=ks.map(k=>(x[k]-sd[k].m)/sd[k].s);X.push([1,l,...v,...v.map(u=>u*l)]);y.push(o.up===x.c?1:0);}return{X,X0,y};};
console.log('\nlog-loss gain over Kalshi mid @4:00 (favourite frame: main effect + interaction with logit), fit older 75%, scored newest 25%:');
for(const band of[false,true])for(const ks of [...KEYS.map(k=>[k])]){const a=rowsF(TR,ks,band),b=rowsF(TE,ks,band);const w=fit(a.X,a.y),w0=fit(a.X0,a.y);const d=b.X.map((x,i)=>{const p=sg(x.reduce((s,v,j)=>s+v*w[j],0)),p0=sg(b.X0[i].reduce((s,v,j)=>s+v*w0[j],0));return b.y[i]?Math.log(p/p0):Math.log((1-p)/(1-p0));});const m=d.reduce((s,x)=>s+x,0)/d.length,se=Math.sqrt(d.reduce((s,x)=>s+(x-m)**2,0)/(d.length-1)/d.length);console.log(`  ${band?'band75-90':'all rounds'} ${ks.join('+').padEnd(12)} coefs ${w.slice(2).map(v=>v.toFixed(3)).join(',')} test gain ${m.toFixed(4)} ±${se.toFixed(4)} (n ${b.y.length})`);}
