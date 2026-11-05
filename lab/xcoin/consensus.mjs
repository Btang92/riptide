// Nov 5: cross-coin Kalshi consensus and Kalshi-to-Kalshi lag for BTC 15-min rounds.
// Do Kalshi's ETH and XRP 15-minute markets (same open/close times) tell us something BTC's own Kalshi price hasn't priced?
// (A) level: logit of ETH/XRP YES mid at 4:00 on top of logit(BTC mid) → test log-loss gain.
// (B) lag: change in ETH/XRP mid logit over the last 1 / 2 min on top of BTC mid and BTC's own change.
// (C) which-rounds rules, chosen on older 75%, scored on newest 25% + quarters:
//     - BTC favourite 75–90 @4:00 (all hours / 12–24) and live 4:00 lock: skip when ETH/XRP disagree or are weak;
//     - "catch-up" bet: BTC side priced 50–75¢ when ETH and XRP are both ≥X the same way;
//     - "lag" bet: BTC side whose ETH+XRP mid moved toward it ≥d logit in the last minute more than BTC did.
// All prices are Kalshi 1-min candle closes (simultaneous across the three markets). Fee 0.07·P·(1−P).
// Usage: node lab/xcoin/dl.mjs 34 (first), then node lab/xcoin/consensus.mjs
import fs from 'fs';import {et} from '../replay/lib.mjs';
const D='lab/xcoin/data/',J=JSON.stringify,feeP=a=>0.07*a*(100-a)/100,lg=p=>Math.log(p/(1-p)),sg=z=>1/(1+Math.exp(-z));
const ld=c=>{const m=new Map();for(const r of JSON.parse(fs.readFileSync(D+c+'-rounds.json')))if(r.at)m.set(r.t,r);return m;};
const B=ld('BTC'),E=ld('ETH'),X=ld('XRP');
const RR=JSON.parse(fs.readFileSync('lab/data/rounds.json'));const RM=new Map(RR.map(o=>[o.t,o]));
const mid=q=>q&&q.ya!=null&&q.na!=null&&q.ya>0&&q.ya<100&&q.na>0&&q.na<100?Math.min(.98,Math.max(.02,(q.ya+100-q.na)/200)):null;
const rows=[];
for(const[t,b]of B){const e=E.get(t),x=X.get(t);if(!e||!x)continue;const q=b.at[240];const mb=mid(q),me=mid(e.at[240]),mx=mid(x.at[240]);if(mb==null||me==null||mx==null)continue;
 const d=(r,s)=>{const a=mid(r.at[240]),p=mid(r.at[240-s]);return a!=null&&p!=null?lg(a)-lg(p):null;};
 const o=RM.get(t),la=o?.at?.[240];
 rows.push({t,up:b.up,h:et(t).h,ya:q.ya,na:q.na,lb:lg(mb),le:lg(me),lx:lg(mx),db1:d(b,60),de1:d(e,60),dx1:d(x,60),db2:d(b,120),de2:d(e,120),dx2:d(x,120),
  agree:(e.up===b.up)&&(x.up===b.up),pu:la&&la.f?la.pu:null,lya:la?.ya,lna:la?.na});}
rows.sort((a,b)=>a.t-b.t);
const cut=Math.floor(rows.length*.75),TR=rows.slice(0,cut),TE=rows.slice(cut),Q=i=>rows.slice(Math.floor(rows.length*i/4),Math.floor(rows.length*(i+1)/4));
console.log('rounds with all three at 4:00',rows.length,'from',new Date(rows[0].t).toISOString(),'test from',new Date(TE[0].t).toISOString(),'to',new Date(rows.at(-1).t).toISOString());
console.log('settle same way: ETH',(rows.filter(r=>E.get(r.t).up===r.up).length/rows.length*100).toFixed(1)+'%','XRP',(rows.filter(r=>X.get(r.t).up===r.up).length/rows.length*100).toFixed(1)+'%','all three',(rows.filter(r=>r.agree).length/rows.length*100).toFixed(1)+'%');
const cor=(a,b)=>{const n=a.length,ma=a.reduce((s,x)=>s+x,0)/n,mb=b.reduce((s,x)=>s+x,0)/n;let c=0,va=0,vb=0;for(let i=0;i<n;i++){c+=(a[i]-ma)*(b[i]-mb);va+=(a[i]-ma)**2;vb+=(b[i]-mb)**2;}return c/Math.sqrt(va*vb);};
console.log('corr of 4:00 mid logits BTC–ETH',cor(rows.map(r=>r.lb),rows.map(r=>r.le)).toFixed(3),'BTC–XRP',cor(rows.map(r=>r.lb),rows.map(r=>r.lx)).toFixed(3));
// ---- (A)(B) log-loss
const fit=(Xs,y)=>{let w=new Array(Xs[0].length).fill(0);for(let it=0;it<1500;it++){const g=w.map(()=>0);for(let i=0;i<Xs.length;i++){const p=sg(Xs[i].reduce((s,x,j)=>s+x*w[j],0));for(let j=0;j<w.length;j++)g[j]+=(p-y[i])*Xs[i][j];}w=w.map((v,j)=>v-0.8*g[j]/Xs.length);}return w;};
const SETS={
 'BTC mid only':r=>[1,r.lb],
 '+ETH level':r=>[1,r.lb,r.le],'+XRP level':r=>[1,r.lb,r.lx],'+ETH+XRP level':r=>[1,r.lb,r.le,r.lx],
 '+lag 1m (ETH,XRP,BTC Δ)':r=>r.de1==null||r.dx1==null||r.db1==null?null:[1,r.lb,r.de1,r.dx1,r.db1],
 '+lag 2m':r=>r.de2==null||r.dx2==null||r.db2==null?null:[1,r.lb,r.de2,r.dx2,r.db2],
 '+level+lag 1m':r=>r.de1==null||r.dx1==null||r.db1==null?null:[1,r.lb,r.le,r.lx,r.de1,r.dx1,r.db1]};
const ok=r=>r.de2!=null&&r.dx2!=null&&r.db2!=null&&r.de1!=null&&r.dx1!=null&&r.db1!=null;
const tr=TR.filter(ok),te=TE.filter(ok);const w0=fit(tr.map(SETS['BTC mid only']),tr.map(r=>r.up));
console.log('\n(A/B) test log-loss gain over BTC mid (refit), n test',te.length);
for(const[k,f]of Object.entries(SETS)){const w=fit(tr.map(f),tr.map(r=>r.up));
 const d=te.map(r=>{const p=sg(f(r).reduce((s,v,j)=>s+v*w[j],0)),p0=sg(SETS['BTC mid only'](r).reduce((s,v,j)=>s+v*w0[j],0));return r.up?Math.log(p/p0):Math.log((1-p)/(1-p0));});
 const m=d.reduce((s,x)=>s+x,0)/d.length,se=Math.sqrt(d.reduce((s,x)=>s+(x-m)**2,0)/(d.length-1)/d.length);
 const ll=-te.reduce((s,r)=>{const p=sg(f(r).reduce((s2,v,j)=>s2+v*w[j],0));return s+(r.up?Math.log(p):Math.log(1-p));},0)/te.length;
 console.log(`  ${k.padEnd(26)} coef ${w.map(x=>x.toFixed(3)).join(',')}  test ll ${ll.toFixed(4)}  gain ${m.toFixed(4)}±${se.toFixed(4)}`);}
// ---- (C) rules
const stat=b=>{const n=b.length;if(!n)return{n:0};const m=b.reduce((s,x)=>s+x.pnl,0)/n,sd=Math.sqrt(b.reduce((s,x)=>s+(x.pnl-m)**2,0)/Math.max(1,n-1));return{n,c:+m.toFixed(1),se:+(sd/Math.sqrt(n)).toFixed(1),win:Math.round(b.filter(x=>x.won).length/n*100),ask:Math.round(b.reduce((s,x)=>s+x.ask,0)/n)};};
const paired=(S,a,b)=>{const A=new Map(a.map(x=>[x.t,x.pnl])),Bm=new Map(b.map(x=>[x.t,x.pnl]));const d=S.map(o=>(A.get(o.t)||0)-(Bm.get(o.t)||0));const n=d.length,m=d.reduce((s,x)=>s+x,0)/n,sd=Math.sqrt(d.reduce((s,x)=>s+(x-m)**2,0)/(n-1));return{perRound:+m.toFixed(2),se:+(sd/Math.sqrt(n)).toFixed(2)};};
const bet=(r,c,ask)=>{const w=r.up===c;return{t:r.t,pnl:(w?100-ask:-ask)-feeP(ask),won:w,ask};};
// side-signed consensus strength: logit of ETH/XRP mid toward side c
const sgn=(r,c,k)=>c?r[k]:-r[k];
const base={
 'fav 75–90 all hours':r=>{const c=r.ya>=r.na?1:0,a=c?r.ya:r.na;return a>=75&&a<=90?{c,a}:null;},
 'fav 75–90 12–24':r=>{if(r.h<12)return null;const c=r.ya>=r.na?1:0,a=c?r.ya:r.na;return a>=75&&a<=90?{c,a}:null;},
 'live 4:00 lock':r=>{if(r.h<12||r.pu==null||r.lya==null)return null;const c=r.pu>=.5?1:0,a=c?r.lya:r.lna;return a>=75&&a<=90&&Math.max(r.pu,1-r.pu)*100>=a+feeP(a)+3?{c,a}:null;}};
const gates=[];for(const th of [-1,0,0.5,1,1.5,2]){gates.push([`skip if min(ETH,XRP)<${th}`,(r,c)=>Math.min(sgn(r,c,'le'),sgn(r,c,'lx'))>=th]);gates.push([`skip if ETH<${th}`,(r,c)=>sgn(r,c,'le')>=th]);gates.push([`skip if avg<${th}`,(r,c)=>(sgn(r,c,'le')+sgn(r,c,'lx'))/2>=th]);}
for(const th of [-0.6,-0.3,0,0.3])gates.push([`skip if ETH+XRP 1m Δ toward <${th}`,(r,c)=>r.de1==null||r.dx1==null||(sgn(r,c,'de1')+sgn(r,c,'dx1'))/2>=th]);
const mkb=(bf,g)=>S=>S.map(r=>{const x=bf(r);if(!x)return null;if(g&&!g(r,x.c))return null;return bet(r,x.c,x.a);}).filter(Boolean);
for(const[bn,bf]of Object.entries(base)){const B0=mkb(bf,null);
 console.log(`\n== ${bn}: train ${J(stat(B0(TR)))} test ${J(stat(B0(TE)))} whole ${J(stat(B0(rows)))}`);
 const res=gates.map(([k,g])=>{const f=mkb(bf,g);return{k,f,ptr:paired(TR,f(TR),B0(TR)),pte:paired(TE,f(TE),B0(TE)),pw:paired(rows,f(rows),B0(rows)),te:stat(f(TE)),rm:stat(B0(rows).filter(x=>!f(rows).some(y=>y.t===x.t)))};});
 res.sort((x,y)=>y.ptr.perRound/(y.ptr.se||1)-x.ptr.perRound/(x.ptr.se||1));
 for(const r of res.slice(0,4))console.log(`  ${r.k.padEnd(34)} trainΔ ${r.ptr.perRound}±${r.ptr.se} | test ${J(r.te)} Δ${r.pte.perRound}±${r.pte.se} | whole Δ${r.pw.perRound}±${r.pw.se} removed ${J(r.rm)}`);
 const b=res[0];console.log('   train-best quarters Δ',[0,1,2,3].map(i=>{const p=paired(Q(i),b.f(Q(i)),B0(Q(i)));return `${p.perRound}±${p.se}`;}).join(' / '));}
// catch-up: BTC side priced lo–hi when ETH and XRP both lean that way at ≥X¢ mid
console.log('\n== catch-up bets (BTC side lo–hi¢ when ETH & XRP mids both ≥X toward it), all hours');
const cu=[];for(const[lo,hi]of[[50,75],[50,65],[60,75],[25,50]])for(const X0 of [65,75,85]){const th=lg(X0/100);
 const f=S=>S.map(r=>{for(const c of [1,0]){const a=c?r.ya:r.na;if(a<lo||a>hi)continue;if(sgn(r,c,'le')>=th&&sgn(r,c,'lx')>=th)return bet(r,c,a);}return null;}).filter(Boolean);
 cu.push({k:`${lo}–${hi}¢ ETH&XRP≥${X0}`,tr:stat(f(TR)),te:stat(f(TE)),w:stat(f(rows))});}
cu.sort((a,b)=>(b.tr.c/(b.tr.se||9))-(a.tr.c/(a.tr.se||9)));for(const r of cu)console.log(`  ${r.k.padEnd(22)} train ${J(r.tr)} test ${J(r.te)} whole ${J(r.w)}`);
// lag bets: ETH+XRP avg 1-min logit change toward side minus BTC's own change ≥ d; BTC side priced 40–90
console.log('\n== lag bets (ETH/XRP moved toward a side over the last 1 / 2 min more than BTC did), all hours');
const lb=[];for(const m of [1,2])for(const d of [0.3,0.5,0.8,1.2])for(const[lo,hi]of[[40,90],[50,75],[75,90]]){
 const f=S=>S.map(r=>{const de=r['de'+m],dx=r['dx'+m],db=r['db'+m];if(de==null||dx==null||db==null)return null;const g=(de+dx)/2-db;if(Math.abs(g)<d)return null;const c=g>0?1:0,a=c?r.ya:r.na;if(a<lo||a>hi)return null;return bet(r,c,a);}).filter(Boolean);
 lb.push({k:`${m}m gap≥${d} ${lo}–${hi}¢`,tr:stat(f(TR)),te:stat(f(TE)),w:stat(f(rows))});}
lb.sort((a,b)=>(b.tr.c/(b.tr.se||9))-(a.tr.c/(a.tr.se||9)));for(const r of lb.slice(0,8))console.log(`  ${r.k.padEnd(22)} train ${J(r.tr)} test ${J(r.te)} whole ${J(r.w)}`);
console.log('  (all lag variants, test ¢/ct):',lb.map(r=>`${r.k} ${r.te.c}(${r.te.n})`).join('; '));
