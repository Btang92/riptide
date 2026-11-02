// Nov 2 evening: (A) :45 fade forward check (rounds after Nov 2 12:00 UTC = after the rule was written down), refreshed walk-forward;
// (B) 91–96¢ favourite lead recheck (first 2:00–4:00 check priced 91–96, stop if already >96), BTC only, all hours;
// (C) does the recent :45 slump spread to the live 4:00 lock band (75–90) or is it all 50–75¢?
import {R,feeP,stat,paired} from './sim.mjs';import {et} from './lib.mjs';const J=JSON.stringify;
const FWD=Date.UTC(2026,10,2,12,0),NB=Date.UTC(2026,10,1,23,15);
const qm=o=>new Date(o.t).getUTCMinutes();
const rows=R.map(o=>{const a=o.at[240];if(!a||a.ya==null||a.na==null)return null;const c=a.ya>=a.na?1:0;return{t:o.t,q:qm(o),h:et(o.t).h,up:o.up,c,fa:c?a.ya:a.na,ua:c?a.na:a.ya};}).filter(Boolean);
const fav=s=>s.map(r=>{const w=r.up===r.c;return{t:r.t,pnl:(w?100-r.fa:-r.fa)-feeP(r.fa),won:w,ask:r.fa};}),dog=s=>s.map(r=>{const w=r.up!==r.c;return{t:r.t,pnl:(w?100-r.ua:-r.ua)-feeP(r.ua),won:w,ask:r.ua};});
const fade=s=>dog(s.filter(r=>r.q===45&&r.fa>=60&&r.fa<70));
const cut=Math.floor(rows.length*.75);
console.log('rounds',R.length,'with 4:00 prices',rows.length,'last',new Date(R.at(-1).t).toISOString());
console.log('(A) fade :45 60–70 at 4:00: train',J(stat(fade(rows.slice(0,cut)))),'test',J(stat(fade(rows.slice(cut)))),'whole',J(stat(fade(rows))));
console.log('   quarters',[0,1,2,3].map(i=>{const s=stat(fade(rows.slice(Math.floor(rows.length*i/4),Math.floor(rows.length*(i+1)/4))));return `${s.c}±${s.se} (${s.n})`;}).join(' / '));
console.log('   since Nov 1 23:15',J(stat(fade(rows.filter(r=>r.t>NB)))),' FORWARD (after Nov 2 12:00)',J(stat(fade(rows.filter(r=>r.t>=FWD)))));
const fw=rows.filter(r=>r.t>=FWD&&r.q===45);console.log('   forward :45 rounds',fw.length,fw.map(r=>`${new Date(r.t).toISOString().slice(11,16)} fav${r.fa} ${r.up===r.c?'W':'L'}`).join(', '));
// weekly :45 favourite and fade
const wk=t=>Math.floor((t-Date.UTC(2026,8,20))/(7*864e5));const W={};for(const r of rows)if(r.q===45)(W[wk(r.t)]??=[]).push(r);
console.log('   by week: fav@4:00 :45 50–99 | fade 60–70:',Object.entries(W).map(([w,s])=>`w${w} ${stat(fav(s.filter(r=>r.fa>=50))).c}/${stat(fade(s)).c}(${fade(s).length})`).join('  '));
// (C) :45 favourites by band, since Nov 1 23:15 and whole
for(const[lo,hi]of[[50,60],[60,70],[70,75],[75,90],[90,100]]){const f=s=>fav(s.filter(r=>r.q===45&&r.fa>=lo&&r.fa<hi));
 console.log(`(C) :45 fav ${lo}-${hi}: whole ${J(stat(f(rows)))} since Nov1 eve ${J(stat(f(rows.filter(r=>r.t>NB))))}`);}
// (B) 91–96 lead
const hi=o=>{for(const s of [120,180,240]){const a=o.at[s];if(!a||a.ya==null||a.na==null)continue;const c=a.ya>=a.na?1:0,ask=c?a.ya:a.na;if(ask>96)return null;if(ask>=91){const w=o.up===c;return{t:o.t,pnl:(w?100-ask:-ask)-feeP(ask),won:w,ask,s};}}return null;};
const H=R.map(hi).filter(Boolean),hc=Math.floor(R.length*.75),Tt=R[hc].t;
console.log('(B) 91–96 first 2:00–4:00: whole',J(stat(H)),'train',J(stat(H.filter(x=>x.t<Tt))),'test',J(stat(H.filter(x=>x.t>=Tt))),'since Nov 2 11:15',J(stat(H.filter(x=>x.t>=Date.UTC(2026,10,2,11,15)))));
console.log('   by week',Object.entries(H.reduce((m,x)=>((m[wk(x.t)]??=[]).push(x),m),{})).map(([w,s])=>`w${w} ${stat(s).c}(${s.length})`).join(' '));
