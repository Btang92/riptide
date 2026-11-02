// Nov 2: :45 follow-up. (a) :45 by ET hour; (b) fade rule: at 4:00 in :45 rounds buy the underdog when the favourite is priced lo–hi; walk-forward + quarters.
import {R,feeP,stat} from './sim.mjs';import {et} from './lib.mjs';const J=JSON.stringify;
const q=o=>new Date(o.t).getUTCMinutes();
const rows=R.map(o=>{const a=o.at[240];if(!a||a.ya==null||a.na==null)return null;const c=a.ya>=a.na?1:0;return{t:o.t,q:q(o),h:et(o.t).h,up:o.up,c,fa:c?a.ya:a.na,ua:c?a.na:a.ya};}).filter(Boolean);
const fav=s=>s.map(r=>{const w=r.up===r.c;return{pnl:(w?100-r.fa:-r.fa)-feeP(r.fa),won:w,ask:r.fa};}),dog=s=>s.map(r=>{const w=r.up!==r.c;return{pnl:(w?100-r.ua:-r.ua)-feeP(r.ua),won:w,ask:r.ua};});
console.log('(a) :45 favourite at 4:00 by ET hour (the round that ends at the top of that hour+1):');
for(let h=0;h<24;h++){const s=rows.filter(r=>r.q===45&&r.h===h);const st=stat(fav(s));process.stdout.write(`${h}:45 ${st.c}±${st.se} (${st.n})  `);if(h%4==3)console.log();}
const cut=Math.floor(rows.length*.75),TR=rows.slice(0,cut),TE=rows.slice(cut),Q=i=>rows.slice(Math.floor(rows.length*i/4),Math.floor(rows.length*(i+1)/4));
console.log('\n(b) fade at :45 (buy underdog when favourite priced in [lo,hi)) — grid chosen on train:');
const G=[];for(const lo of [55,58,60,62])for(const hi of [66,68,70,72,75])if(hi>lo)for(const qq of [45,'all'])G.push({lo,hi,qq});
const pick=(s,g)=>s.filter(r=>(g.qq==='all'||r.q===g.qq)&&r.fa>=g.lo&&r.fa<g.hi);
const res=G.map(g=>({g,tr:stat(dog(pick(TR,g))),te:stat(dog(pick(TE,g)))}));
for(const r of res.filter(r=>r.g.qq===45).sort((a,b)=>b.tr.c-a.tr.c).slice(0,6))console.log(' ',J(r.g),'train',J(r.tr),'test',J(r.te));
const fixed={lo:60,hi:70,qq:45};
console.log(' fixed 60–70 :45: quarters',[0,1,2,3].map(i=>{const s=stat(dog(pick(Q(i),fixed)));return `${s.c}±${s.se} (${s.n})`;}).join(' / '),'| same rule in other rounds',J(stat(dog(rows.filter(r=>r.q!==45&&r.fa>=60&&r.fa<70)))));
console.log(' whole',J(stat(dog(pick(rows,fixed)))),'since Nov 1 23:15',J(stat(dog(pick(rows.filter(r=>r.t>Date.UTC(2026,10,1,23,15)),fixed)))));
