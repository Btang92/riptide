// Nov 2 evening: "settled favourite" filter under the 4:00 lock. Bet at 4:00 only if the same side was already priced ≥X at 2:00 (and 3:00).
// Aimed at: losses sit in favourites that first reach the band late (Oct 31 diagnosis) and calls that turn against by 3:00–5:00.
import {R,feeP,stat,paired} from './sim.mjs';import {et} from './lib.mjs';const J=JSON.stringify;
const side=(a,c)=>a?(c?a.ya:a.na):null;
const mk=(mode,X,allH)=>o=>{if(!allH&&et(o.t).h<12)return null;const a=o.at[240];if(!a||a.ya==null||a.na==null)return null;
 let c,ask;if(mode==='live'){if(!a.f)return null;const pu=a.pu;c=pu>=.5?1:0;ask=side(a,c);if(ask==null||ask<75||ask>90||Math.max(pu,1-pu)*100<ask+feeP(ask)+3)return null;}
 else{c=a.ya>=a.na?1:0;ask=side(a,c);if(ask<75||ask>90)return null;}
 if(X){for(const s of X.at){const p=side(o.at[s],c);if(p==null||p<X.min)return null;}}
 const w=o.up===c;return{t:o.t,pnl:(w?100-ask:-ask)-feeP(ask),won:w,ask};};
const cut=Math.floor(R.length*.75),TR=R.slice(0,cut),TE=R.slice(cut),Q=i=>R.slice(Math.floor(R.length*i/4),Math.floor(R.length*(i+1)/4));
const G=[null];for(const min of [50,55,60,65,70,75])for(const at of [[120],[180],[120,180]])G.push({min,at});
const go=(s,f)=>s.map(f).filter(Boolean);
for(const[mode,allH]of[['live',false],['live',true],['fav',true],['fav',false]]){
 console.log(`\n== ${mode} 4:00 75–90 ${allH?'all hours':'12–24 ET'}`);const base=mk(mode,null,allH);
 const res=G.slice(1).map(X=>{const f=mk(mode,X,allH);return{X,tr:stat(go(TR,f)),te:stat(go(TE,f)),ptr:paired(TR,go(TR,f),go(TR,base)),pte:paired(TE,go(TE,f),go(TE,base))};});
 console.log(' base train',J(stat(go(TR,base))),'test',J(stat(go(TE,base))));
 res.sort((a,b)=>b.ptr.perRound-a.ptr.perRound);for(const r of res.slice(0,5))console.log(' ',`≥${r.X.min}@${r.X.at.join('+')}`,'train',J(r.tr),`Δ${r.ptr.perRound}±${r.ptr.se}`,'| test',J(r.te),`Δ${r.pte.perRound}±${r.pte.se}`);
 const b=res[0].X,f=mk(mode,b,allH);console.log('  train-best quarters Δ¢/round',[0,1,2,3].map(i=>{const p=paired(Q(i),go(Q(i),f),go(Q(i),base));return `${p.perRound}±${p.se}`;}).join(' / '));
 // what does the filter remove? excluded bets
 const ex=s=>{const k=new Set(go(s,f).map(x=>x.t));return go(s,base).filter(x=>!k.has(x.t));};console.log('  removed bets train',J(stat(ex(TR))),'test',J(stat(ex(TE))));
}
// whole-history paired for the live lock with ≥65@2:00
{const b=mk('live',null,false),f=mk('live',{min:65,at:[120]},false),p=paired(R,go(R,f),go(R,b)),rm=go(R,b).filter(x=>!new Set(go(R,f).map(y=>y.t)).has(x.t));
 console.log('\nWHOLE live lock ≥65@2:00 vs lock',`${p.perRound}±${p.se} ¢/round`,'kept',J(stat(go(R,f))),'removed',J(stat(rm)),'since Nov 1 lock (t>Nov 1 13:00)',J(stat(go(R.filter(o=>o.t>Date.UTC(2026,10,1,13)),b))));}
