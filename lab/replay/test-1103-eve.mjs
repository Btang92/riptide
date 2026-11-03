// Nov 3 evening: Kalshi book width (overround = YES ask + NO ask − 100) at the 4:00 check as a which-rounds-to-bet filter.
// A wide book means thin/uncertain quotes; the favourite ask sits further above the mid, so the entry price paid is worse.
// Aimed at entry price and at calls that turn against by 5:00 (uncertain books may precede reversals).
import {R,feeP,stat,paired} from './sim.mjs';import {et} from './lib.mjs';const J=JSON.stringify;
const side=(a,c)=>a?(c?a.ya:a.na):null;const ov=a=>a.ya+a.na-100;
const cut=Math.floor(R.length*.75),TR=R.slice(0,cut),TE=R.slice(cut),Q=i=>R.slice(Math.floor(R.length*i/4),Math.floor(R.length*(i+1)/4));
const go=(s,f)=>s.map(f).filter(Boolean);
// distribution
const D={};for(const o of R){const a=o.at[240];if(!a||a.ya==null||a.na==null)continue;const k=Math.max(-2,Math.min(6,ov(a)));D[k]=(D[k]||0)+1;}
console.log('rounds',R.length,'test from',new Date(TE[0].t).toISOString(),'overround@4:00 dist',J(D));
// by source era (khist vs RIPTIDE checkpoints)
for(const src of [...new Set(R.map(o=>o.src))]){const v=R.filter(o=>o.src===src&&o.at[240]&&o.at[240].ya!=null).map(o=>ov(o.at[240]));console.log(' src',src,'n',v.length,'mean ov',(v.reduce((s,x)=>s+x,0)/v.length).toFixed(2));}
const mk=(mode,allH,lo,hi,omin,omax)=>o=>{if(!allH&&et(o.t).h<12)return null;const a=o.at[240];if(!a||a.ya==null||a.na==null)return null;
 const O=ov(a);if(O<omin||O>omax)return null;let c,ask;
 if(mode==='live'){if(!a.f)return null;const pu=a.pu;c=pu>=.5?1:0;ask=side(a,c);if(ask<lo||ask>hi||Math.max(pu,1-pu)*100<ask+feeP(ask)+3)return null;}
 else if(mode==='fav'){c=a.ya>=a.na?1:0;ask=side(a,c);if(ask<lo||ask>hi)return null;}
 else {c=a.ya>=a.na?0:1;ask=side(a,c);if(ask<lo||ask>hi)return null;} // dog
 const w=o.up===c;return{t:o.t,pnl:(w?100-ask:-ask)-feeP(ask),won:w,ask,O};};
// (1) descriptive: favourite at 4:00 by overround bucket, several bands, whole + halves
console.log('\n(1) Kalshi favourite at 4:00 by overround (whole | train | test)');
for(const[lo,hi]of[[50,75],[75,90],[90,97]])for(const[a,b]of[[-9,0],[1,1],[2,2],[3,4],[5,99]]){const f=mk('fav',true,lo,hi,a,b);
 console.log(` fav ${lo}-${hi} ov ${a}..${b}: ${J(stat(go(R,f)))} | ${J(stat(go(TR,f)))} | ${J(stat(go(TE,f)))}`);}
// (2) filters vs base (train-chosen)
const G=[];for(const omax of [0,1,2,3,4])G.push([-9,omax]);for(const omin of [1,2,3])G.push([omin,99]);
for(const[mode,allH,lo,hi]of[['live',false,75,90],['live',true,75,90],['fav',true,75,90],['fav',false,75,90],['dog',true,10,40]]){
 const base=mk(mode,allH,lo,hi,-99,99);console.log(`\n(2) ${mode} ${allH?'all hours':'12–24'} ${lo}-${hi} base train ${J(stat(go(TR,base)))} test ${J(stat(go(TE,base)))} whole ${J(stat(go(R,base)))}`);
 const res=G.map(([a,b])=>{const f=mk(mode,allH,lo,hi,a,b);return{k:`ov ${a}..${b}`,f,tr:stat(go(TR,f)),te:stat(go(TE,f)),ptr:paired(TR,go(TR,f),go(TR,base)),pte:paired(TE,go(TE,f),go(TE,base)),pw:paired(R,go(R,f),go(R,base))};});
 res.sort((x,y)=>y.ptr.perRound-x.ptr.perRound);
 for(const r of res.slice(0,4))console.log(`  ${r.k.padEnd(9)} train ${J(r.tr)} Δ${r.ptr.perRound}±${r.ptr.se} | test ${J(r.te)} Δ${r.pte.perRound}±${r.pte.se} | whole Δ${r.pw.perRound}±${r.pw.se}`);
 const b=res[0];console.log('   train-best quarters Δ',[0,1,2,3].map(i=>{const p=paired(Q(i),go(Q(i),b.f),go(Q(i),base));return `${p.perRound}±${p.se}`;}).join(' / '));}
// (3) does overround predict a turn against the 4:00 favourite by 5:00/6:00 (aimed at turned-early losses)?
console.log('\n(3) 75–90 favourite at 4:00 (all hours): share whose side is <50¢ at 5:00 / 6:00, by overround');
for(const[a,b]of[[-9,0],[1,1],[2,2],[3,99]]){let n=0,t5=0,t6=0,l=0;for(const o of R){const x=o.at[240];if(!x||x.ya==null||x.na==null)continue;const O=ov(x);if(O<a||O>b)continue;const c=x.ya>=x.na?1:0,ask=side(x,c);if(ask<75||ask>90)continue;n++;
 const p5=side(o.at[300],c),p6=side(o.at[360],c);if(p5!=null&&p5<50)t5++;if(p6!=null&&p6<50)t6++;if(o.up!==c)l++;}
 console.log(`  ov ${a}..${b}: n ${n} turned@5:00 ${(t5/n*100).toFixed(1)}% @6:00 ${(t6/n*100).toFixed(1)}% lost ${(l/n*100).toFixed(1)}%`);}
