// Nov 2: end-of-hour (:45 round) deep dive at the 4:00 read. Why does the favourite underperform, and can RIPTIDE's read do better there?
import fs from 'fs';import {R,feeP,stat} from './sim.mjs';import {et} from './lib.mjs';
const M=JSON.parse(fs.readFileSync('lab/data/candles.json'));const J=JSON.stringify;
const q=o=>new Date(o.t).getUTCMinutes();const lg=p=>Math.log(p/(1-p));const cl=p=>Math.min(.99,Math.max(.01,p));
const px=t=>M[t]?.[4];
const rows=[];
for(const o of R){const a=o.at[240];if(!a||a.ya==null||a.na==null||!a.f)continue;const mid=cl((a.ya+100-a.na)/200);
 const e=o.t+180000;const c=[];for(let i=60;i>=0;i--){const x=px(e-i*60000);if(x)c.push(x);}if(c.length<45)continue;
 let v=0;for(let i=1;i<c.length;i++)v+=Math.log(c[i]/c[i-1])**2;const sd=Math.sqrt(v/(c.length-1));
 const p0=px(o.t-60000)??px(o.t),p4=px(e);if(!p0||!p4)continue;const mv=Math.log(p4/p0)/(sd*2);// open→4:00 move in 4-min sd units
 const z60=Math.log(c.at(-1)/c[0])/Math.sqrt(v);const a10=o.at[600];
 rows.push({o,t:o.t,q:q(o),h:et(o.t).h,up:o.up,mid,pu:cl(a.pu),ya:a.ya,na:a.na,mv,z60,dist:Math.log(p4/o.strike)/(sd*Math.sqrt(11)),mid10:a10&&a10.ya!=null?(a10.ya+100-a10.na)/200:null});}
console.log('rows',rows.length);
const ll=(p,y)=>-(y?Math.log(p):Math.log(1-p));
const grp=(n,s)=>{const L=s.length;if(!L)return;const fav=s.map(r=>{const c=r.mid>=.5?1:0,ask=c?r.ya:r.na,won=r.up===c;return{pnl:(won?100-ask:-ask)-feeP(ask),won,ask};});
 const st=stat(fav);console.log(`${n.padEnd(34)} n=${L} favWin ${st.win}% at ${st.ask}¢ ${st.c}±${st.se}¢/ct | LL kalshi ${(s.reduce((a,r)=>a+ll(r.mid,r.up),0)/L).toFixed(4)} raw ${(s.reduce((a,r)=>a+ll(r.pu,r.up),0)/L).toFixed(4)} | read agrees w fav ${(s.filter(r=>(r.pu>=.5)===(r.mid>=.5)).length/L*100).toFixed(0)}%`);};
console.log('\n1) by round start minute');for(const m of [0,15,30,45])grp(':'+m,rows.filter(r=>r.q===m));
console.log('\n2) :45 vs other by open→4:00 move direction relative to favourite (continuation vs reversal setups)');
for(const [n,f] of [['fav WITH open→4:00 move > 1sd',r=>Math.sign(r.mv)===(r.mid>=.5?1:-1)&&Math.abs(r.mv)>1],['small move |mv|≤1',r=>Math.abs(r.mv)<=1],['fav AGAINST move',r=>Math.sign(r.mv)!==(r.mid>=.5?1:-1)&&Math.abs(r.mv)>1]]){grp(':45 '+n,rows.filter(r=>r.q===45&&f(r)));grp('oth '+n,rows.filter(r=>r.q!==45&&f(r)));}
console.log('\n3) :45 by ET hour block');for(const h of [0,4,8,12,16,20])grp(`:45 ET ${h}-${h+4}`,rows.filter(r=>r.q===45&&r.h>=h&&r.h<h+4));
console.log('\n4) :45 by favourite price');for(const [a,b] of [[50,60],[60,70],[70,80],[80,90],[90,100]]){grp(`:45 fav ${a}-${b}`,rows.filter(r=>r.q===45&&Math.max(r.ya,r.na)>=a&&Math.max(r.ya,r.na)<b));grp(`oth fav ${a}-${b}`,rows.filter(r=>r.q!==45&&Math.max(r.ya,r.na)>=a&&Math.max(r.ya,r.na)<b));}
console.log('\n5) when does the :45 favourite lose? (favourite at 4:00 still favourite at 10:00?)');
for(const k of [true,false]){const s=rows.filter(r=>(r.q===45)===k&&r.mid10!=null);const lost=s.filter(r=>(r.mid>=.5?1:0)!==r.up);const early=lost.filter(r=>(r.mid10>=.5)!==(r.mid>=.5));
 console.log(`  ${k?':45':'oth'} lost ${lost.length}/${s.length} (${(lost.length/s.length*100).toFixed(1)}%), already flipped by 10:00 ${early.length}, flipped in last 5 min ${lost.length-early.length}`);}
// 6) walk-forward model: y ~ logit(mid) + logit(raw) + q45 + q45*logit(mid) + q45*mv-with-fav; fit on older 75%
function fit(X,y,it=400,lr=.5,l2=1e-3){const d=X[0].length;let w=Array(d).fill(0);for(let k=0;k<it;k++){const g=Array(d).fill(0);for(let i=0;i<X.length;i++){const z=X[i].reduce((s,x,j)=>s+x*w[j],0),p=1/(1+Math.exp(-z));for(let j=0;j<d;j++)g[j]+=(p-y[i])*X[i][j];}for(let j=0;j<d;j++)w[j]-=lr*(g[j]/X.length+l2*w[j]);}return w;}
const pr=(w,x)=>1/(1+Math.exp(-x.reduce((s,v,j)=>s+v*w[j],0)));
const F={base:r=>[1,lg(r.mid)],raw:r=>[1,lg(r.mid),lg(r.pu)],eoh:r=>{const e=r.q===45?1:0;return[1,lg(r.mid),lg(r.pu),e,e*lg(r.mid)];},eohMv:r=>{const e=r.q===45?1:0,s=r.mid>=.5?1:-1;return[1,lg(r.mid),lg(r.pu),e,e*lg(r.mid),e*Math.max(-3,Math.min(3,r.mv)),r.mv];},
 eohZ:r=>{const e=r.q===45?1:0;return[1,lg(r.mid),lg(r.pu),e,e*lg(r.mid),e*Math.max(-3,Math.min(3,r.z60))];}};
const cut=Math.floor(rows.length*.75),TR=rows.slice(0,cut),TE=rows.slice(cut);
console.log(`\n6) walk-forward models (train ${TR.length}, test ${TE.length}); test log-loss all / :45 only, and bet rule on test (prob ≥ ask+fee+m, any side 50–95¢, all hours)`);
const W={};for(const[k,f]of Object.entries(F)){W[k]=fit(TR.map(f),TR.map(r=>r.up));}
const betsOf=(s,p,m)=>s.flatMap(r=>{const pu=p(r);const out=[];for(const c of [1,0]){const pr_=c?pu:1-pu,ask=c?r.ya:r.na;if(ask<50||ask>95)continue;if(pr_*100>=ask+feeP(ask)+m){const won=r.up===c;out.push({t:r.t,pnl:(won?100-ask:-ask)-feeP(ask),won,ask});}}return out;});
for(const[k,f]of Object.entries(F)){const p=r=>pr(W[k],f(r));const L=s=>(s.reduce((a,r)=>a+ll(p(r),r.up),0)/s.length).toFixed(4);
 const e45=TE.filter(r=>r.q===45);
 console.log(`  ${k.padEnd(6)} w=${W[k].map(x=>x.toFixed(2)).join(',')} | LL test ${L(TE)} :45 ${L(e45)} other ${L(TE.filter(r=>r.q!==45))} | bets m=2 test ${J(stat(betsOf(TE,p,2)))} :45 only ${J(stat(betsOf(e45,p,2)))}`);}
// paired log-loss SE for eoh vs base on :45 test
for(const k of ['raw','eoh','eohMv','eohZ']){const e45=TE.filter(r=>r.q===45);const d=e45.map(r=>ll(pr(W.base,F.base(r)),r.up)-ll(pr(W[k],F[k](r)),r.up));const m=d.reduce((a,b)=>a+b,0)/d.length,sd=Math.sqrt(d.reduce((a,b)=>a+(b-m)**2,0)/(d.length-1));
 console.log(`  ${k} vs kalshi-only on :45 test: LL gain ${m.toFixed(4)}±${(sd/Math.sqrt(d.length)).toFixed(4)} (n ${d.length})`);}
// 7) simple fixes on :45 rounds only, chosen on train: shrink favourite toward 50 (fade by k), or skip; scored on test via the favourite-buy and live rule
console.log('\n7) fair price of the :45 favourite: actual win rate − price paid, train vs test');
for(const[n,s]of[['train',TR],['test',TE],['quarter4 only',rows.slice(Math.floor(rows.length*.75))]]){const f=s.filter(r=>r.q===45).map(r=>{const c=r.mid>=.5?1:0,ask=c?r.ya:r.na;return{won:r.up===c,ask};});
 const w=f.filter(x=>x.won).length/f.length*100,a=f.reduce((s,x)=>s+x.ask,0)/f.length;console.log(`  ${n}: :45 fav win ${w.toFixed(1)}% vs price ${a.toFixed(1)}¢ → gap ${(w-a).toFixed(1)} (n ${f.length})`);}
