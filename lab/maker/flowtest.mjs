// Nov 2: does Kalshi's own taker order flow before a check predict the result beyond the price? (Kalshi research: skilled takers'
// price impact persists; Bartlett: one-sided flow predicts maker losses.) Usage: node lab/maker/flowtest.mjs <dir with rounds.json + trades.json>
// Trades are [ms, yesPrice¢, takerYes 1/0, contracts], from 0:00 to 4:00 into each round. Price at a check = last trade's YES price (± spread).
import fs from 'fs';const D=process.argv[2];const RR=JSON.parse(fs.readFileSync(D+'/rounds.json')),T=JSON.parse(fs.readFileSync(D+'/trades.json'));
const fee=p=>0.07*p*(100-p)/100,lg=p=>Math.log(p/(1-p)),cl=p=>Math.min(.99,Math.max(.01,p)),ll=(p,y)=>-(y?Math.log(p):Math.log(1-p));
const rows=[];for(const r of RR){const tr=T[r.t];if(!tr||tr.length<20)continue;const open=r.close-900000;
 for(const s of [120,240]){const e=open+s*1000;const pre=tr.filter(x=>x[0]<e);if(pre.length<10)continue;
  // last price: volume-weighted over the final 10 s before the check, else last trade
  const last=pre.filter(x=>x[0]>=e-10000);const px=last.length?last.reduce((a,x)=>a+x[1]*x[3],0)/last.reduce((a,x)=>a+x[3],0):pre.at(-1)[1];
  const win=(w,big=0)=>{const k=pre.filter(x=>x[0]>=e-w*1000&&x[3]>=big);const y=k.filter(x=>x[2]).reduce((a,x)=>a+x[3],0),n=k.filter(x=>!x[2]).reduce((a,x)=>a+x[3],0);return y+n>0?(y-n)/(y+n):0;};
  const vol=pre.filter(x=>x[0]>=e-60000).reduce((a,x)=>a+x[3],0);
  rows.push({t:r.t,open,s,up:r.up,p:cl(px/100),oi60:win(60),oi30:win(30),oi120:win(120),oiAll:win(s),big60:win(60,250),big120:win(120,250),vol});}}
console.log('round×check rows',rows.length,'rounds',new Set(rows.map(r=>r.t)).size);
function fit(X,y,it=800,lr=.5){const d=X[0].length;let w=Array(d).fill(0);for(let k=0;k<it;k++){const g=Array(d).fill(0);for(let i=0;i<X.length;i++){const z=X[i].reduce((s,x,j)=>s+x*w[j],0),p=1/(1+Math.exp(-z));for(let j=0;j<d;j++)g[j]+=(p-y[i])*X[i][j];}for(let j=0;j<d;j++)w[j]-=lr*(g[j]/X.length+1e-4*w[j]);}return w;}
const pr=(w,x)=>1/(1+Math.exp(-x.reduce((s,v,j)=>s+v*w[j],0)));
for(const s of [120,240]){const S=rows.filter(r=>r.s===s).sort((a,b)=>a.open-b.open);const c=Math.floor(S.length*.75),TR=S.slice(0,c),TE=S.slice(c);
 console.log(`\n${s/60}:00 (${S.length} rounds; train ${TR.length}, test ${TE.length})`);
 for(const k of ['oi30','oi60','oi120','oiAll','big60','big120']){
  const X0=r=>[1,lg(r.p)],X1=r=>[1,lg(r.p),r[k]];const w0=fit(TR.map(X0),TR.map(r=>r.up)),w1=fit(TR.map(X1),TR.map(r=>r.up));
  const d=TE.map(r=>ll(pr(w0,X0(r)),r.up)-ll(pr(w1,X1(r)),r.up)),m=d.reduce((a,b)=>a+b,0)/d.length,se=Math.sqrt(d.reduce((a,b)=>a+(b-m)**2,0)/(d.length-1)/d.length);
  const res=S.map(r=>r.up-r.p),F=S.map(r=>r[k]),mf=F.reduce((a,b)=>a+b,0)/F.length,mr=res.reduce((a,b)=>a+b,0)/res.length;const cor=F.reduce((a,x,i)=>a+(x-mf)*(res[i]-mr),0)/Math.sqrt(F.reduce((a,x)=>a+(x-mf)**2,0)*res.reduce((a,x)=>a+(x-mr)**2,0));
  // follow strong flow: buy the side takers were buying when |oi| > 0.5, at last price + 1¢
  const q=TR.map(r=>Math.abs(r[k])).sort((a,b)=>a-b)[Math.floor(TR.length*.8)];const bets=set=>set.filter(r=>Math.abs(r[k])>q).map(r=>{const side=r[k]>0?1:0,ask=Math.round((side?r.p:1-r.p)*100)+1;if(ask<5||ask>95)return null;const w=r.up===side;return (w?100-ask:-ask)-fee(ask);}).filter(x=>x!=null);
  const st=b=>{const n=b.length,m=b.reduce((a,x)=>a+x,0)/n,sd=Math.sqrt(b.reduce((a,x)=>a+(x-m)**2,0)/(n-1));return `${m.toFixed(1)}±${(sd/Math.sqrt(n)).toFixed(1)} (${n})`;};
  console.log(`  ${k.padEnd(7)} coef ${w1[2].toFixed(3)} | test LL gain ${m.toFixed(4)}±${se.toFixed(4)} | corr w/ outcome−price ${cor.toFixed(3)} (2SE ${(2/Math.sqrt(S.length)).toFixed(3)}) | follow top-20% |oi| (>${q.toFixed(2)}): train ${st(bets(TR))} test ${st(bets(TE))}`);}}
// fade: buy the side takers were NOT buying (top-20% |oi| set on train), at last price + 1¢
console.log('\nfade strong flow (buy against takers), ¢/ct after fee:');
for(const s of [120,240]){const S=rows.filter(r=>r.s===s).sort((a,b)=>a.open-b.open);const c=Math.floor(S.length*.75),TR=S.slice(0,c),TE=S.slice(c);
 for(const k of ['oi30','oi60','oi120','big120']){const q=TR.map(r=>Math.abs(r[k])).sort((a,b)=>a-b)[Math.floor(TR.length*.8)];
  const b=set=>set.filter(r=>Math.abs(r[k])>q).map(r=>{const side=r[k]>0?0:1,ask=Math.round((side?r.p:1-r.p)*100)+1;if(ask<5||ask>95)return null;const w=r.up===side;return (w?100-ask:-ask)-fee(ask);}).filter(x=>x!=null);
  const st=b=>{const n=b.length,m=b.reduce((a,x)=>a+x,0)/n,sd=Math.sqrt(b.reduce((a,x)=>a+(x-m)**2,0)/(n-1));return `${m.toFixed(1)}±${(sd/Math.sqrt(n)).toFixed(1)} (${n})`;};
  console.log(`  ${s/60}:00 ${k.padEnd(7)} train ${st(b(TR))} test ${st(b(TE))}`);}}
