// Nov 7 evening: (A) Kalshi price path into the 4:00 lock — fading favourites (priced higher at 2:00/3:00 than at 4:00)
// vs late risers, aimed at calls that turn against by 3:00–5:00 and at entry price; (B) weekend vs weekday at the 4:00 lock
// (Sat/Sun ET, and Friday-evening/Sunday-evening edges), aimed at which rounds to bet. Older 75% train, newest 25% test + quarters.
import {R,feeP,stat,paired} from './sim.mjs';import {et} from './lib.mjs';const J=JSON.stringify;
const side=(a,c)=>a?(c?a.ya:a.na):null;const mid=(a,c)=>a&&a.ya!=null&&a.na!=null?(c?(a.ya+100-a.na)/2:(a.na+100-a.ya)/2):null;
const WD={Sun:0,Mon:1,Tue:2,Wed:3,Thu:4,Fri:5,Sat:6};const etDow=t=>WD[et(t).wd];
const ctx=R.map(o=>{const a=o.at[240];if(!a||a.ya==null||a.na==null)return null;const c=a.ya>=a.na?1:0;
  const m4=mid(a,c),m3=mid(o.at[180],c),m2=mid(o.at[120],c);const x={c,m4,dw:etDow(o.t)};
  if(m3!=null&&m2!=null){x.gb=Math.max(m2,m3)-m4;x.d1=m4-m3;x.d2=m4-m2;}
  // after-call path for the autopsy angle: did the favourite turn by 5:00?
  const m5=mid(o.at[300],c);if(m5!=null)x.turn5=m5<50?1:0;return x;});
const idx=new Map(R.map((o,i)=>[o.t,i]));const go=(s,f)=>s.map(o=>f(o,idx.get(o.t))).filter(Boolean);const has=(i,k)=>ctx[i]&&ctx[i][k]!=null;
const mk=(mode,allH,gate)=>(o,i)=>{if(!allH&&et(o.t).h<12)return null;const a=o.at[240];if(!a||a.ya==null||a.na==null)return null;let c,ask;
  if(mode==='live'){if(!a.f)return null;const pu=a.pu;c=pu>=.5?1:0;ask=side(a,c);if(ask<75||ask>90||Math.max(pu,1-pu)*100<ask+feeP(ask)+3)return null;}
  else{c=a.ya>=a.na?1:0;ask=side(a,c);if(ask<75||ask>90)return null;}
  if(gate&&!gate(i,c))return null;const w=o.up===c;return{t:o.t,pnl:(w?100-ask:-ask)-feeP(ask),won:w,ask};};
const cut=Math.floor(R.length*.75),TR=R.slice(0,cut),TE=R.slice(cut),Q=i=>R.slice(Math.floor(R.length*i/4),Math.floor(R.length*(i+1)/4));
console.log('rounds',R.length,'test from',new Date(TE[0].t).toISOString(),'last',new Date(R[R.length-1].t).toISOString());
// sanity on dow
{const c={};for(const x of ctx)if(x)c[x.dw]=(c[x.dw]||0)+1;console.log('rounds by ET weekday (0=Sun)',J(c));}
const favAll=mk('fav',true,null),W=go(R,favAll),T=go(TE,favAll),TRb=go(TR,favAll);
const show=(lab,f)=>{const w=stat(W.filter(f)),tr=stat(TRb.filter(f)),t=stat(T.filter(f));console.log(`  ${lab.padEnd(26)} whole ${w.c}±${w.se} (${w.n}, ${w.win}% @${w.ask}) | train ${tr.c}±${tr.se} (${tr.n}) | test ${t.c}±${t.se} (${t.n})`);};
const G=b=>ctx[idx.get(b.t)];
console.log('\n(A) favourite 75–90 @4:00 all hours by give-back (max(2:00,3:00) fav mid − 4:00 fav mid, ¢):');
for(const[l,lo,hi]of[['risen/flat (≤0)',-99,0],['gave back 0.5–4',0.5,4],['gave back 4.5–9',4.5,9],['gave back ≥9.5',9.5,99]])show(l,b=>{const x=G(b);return x&&x.gb!=null&&x.gb>=lo&&x.gb<=hi;});
console.log(' by last-minute change (4:00 − 3:00 fav mid):');
for(const[l,lo,hi]of[['fell ≥5',-99,-5],['fell 0.5–4.5',-4.5,-0.5],['flat',0,0],['rose 0.5–9.5',0.5,9.5],['rose 10–19.5',10,19.5],['rose ≥20',20,99]])show(l,b=>{const x=G(b);return x&&x.d1!=null&&x.d1>=lo&&x.d1<=hi;});
console.log(' by 2:00→4:00 change:');
for(const[l,lo,hi]of[['fell',-99,-0.5],['0–9.5',0,9.5],['10–19.5',10,19.5],['20–29.5',20,29.5],['≥30',30,99]])show(l,b=>{const x=G(b);return x&&x.d2!=null&&x.d2>=lo&&x.d2<=hi;});
console.log('\n(B) favourite 75–90 @4:00 all hours by ET weekday:');
for(let d=0;d<7;d++)show(['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d],b=>G(b).dw===d);
show('weekend (Sat+Sun)',b=>{const d=G(b).dw;return d===0||d===6;});show('weekday',b=>{const d=G(b).dw;return d>0&&d<6;});
// live lock by weekend
{const L=go(R,mk('live',false,null));const f=b=>{const d=G(b).dw;return d===0||d===6;};console.log('  live lock 12–24 weekend',J(stat(L.filter(f))),'weekday',J(stat(L.filter(b=>!f(b)))));}
// gates
const gates=[];
for(const t of[2,4,6,8,10,15])gates.push([`skip gb≥${t}`,i=>!(has(i,'gb')&&ctx[i].gb>=t)]);
for(const t of[-2,-5,-10])gates.push([`skip d1≤${t}`,i=>!(has(i,'d1')&&ctx[i].d1<=t)]);
for(const t of[10,15,20,25,30])gates.push([`skip d1≥${t}`,i=>!(has(i,'d1')&&ctx[i].d1>=t)]);
for(const t of[20,30,40])gates.push([`skip d2≥${t}`,i=>!(has(i,'d2')&&ctx[i].d2>=t)]);
gates.push(['skip weekend',i=>!(ctx[i]&&(ctx[i].dw===0||ctx[i].dw===6))]);gates.push(['skip Sat',i=>!(ctx[i]&&ctx[i].dw===6)]);gates.push(['skip Sun',i=>!(ctx[i]&&ctx[i].dw===0)]);
gates.push(['weekend only',i=>!!(ctx[i]&&(ctx[i].dw===0||ctx[i].dw===6))]);
for(const[mode,allH]of[['live',false],['live',true],['fav',true],['fav',false]]){const base=mk(mode,allH,null);const nm=`${mode} ${allH?'all hours':'12–24'}`;
  console.log(`\n== ${nm} base train ${J(stat(go(TR,base)))} test ${J(stat(go(TE,base)))} whole ${J(stat(go(R,base)))}`);
  const res=gates.map(([k,g])=>{const f=mk(mode,allH,g);return{k,f,te:stat(go(TE,f)),ptr:paired(TR,go(TR,f),go(TR,base)),pte:paired(TE,go(TE,f),go(TE,base)),pw:paired(R,go(R,f),go(R,base))};});
  res.sort((x,y)=>y.ptr.perRound-x.ptr.perRound);
  for(const r of res.slice(0,6))console.log(`  ${r.k.padEnd(16)} trainΔ ${r.ptr.perRound}±${r.ptr.se} | test ${J(r.te)} Δ${r.pte.perRound}±${r.pte.se} | whole Δ${r.pw.perRound}±${r.pw.se}`);
  const b=res[0];console.log('   train-best',b.k,'quarters Δ',[0,1,2,3].map(i=>{const p=paired(Q(i),go(Q(i),b.f),go(Q(i),base));return `${p.perRound}±${p.se}`;}).join(' / '));}
// autopsy angle: does give-back predict the favourite turning by 5:00 beyond its 4:00 price? (fav 75–90 all hours)
console.log('\nturned-by-5:00 rate (fav mid <50 at 5:00), fav 75–90 @4:00 all hours:');
for(const[l,f]of[['risen/flat',x=>x.gb<=0],['gave back 0.5–4',x=>x.gb>0&&x.gb<=4],['gave back ≥4.5',x=>x.gb>4]]){const s=W.map(G).filter(x=>x&&x.gb!=null&&x.turn5!=null&&f(x));
  const n=s.length,r=s.reduce((a,x)=>a+x.turn5,0)/n,m4=s.reduce((a,x)=>a+x.m4,0)/n;console.log(`  ${l.padEnd(18)} n ${n} turned ${(r*100).toFixed(1)}% ±${(Math.sqrt(r*(1-r)/n)*100).toFixed(1)} (avg 4:00 mid ${m4.toFixed(1)})`);}
