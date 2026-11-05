// Independent price check of the :45 fade lead on Kalshi 1-min candle closes (lab/xhour/data): at 4:00 in :45 rounds, when the favourite is 60–70¢, buy the underdog at its ask.
import fs from 'fs';const R=JSON.parse(fs.readFileSync('lab/xhour/data/rounds.json'));const feeP=a=>0.07*a*(100-a)/100;
const st=b=>{const n=b.length;if(!n)return{n:0};const m=b.reduce((s,x)=>s+x,0)/n,sd=Math.sqrt(b.reduce((s,x)=>s+(x-m)**2,0)/Math.max(1,n-1));return`${m.toFixed(1)}±${(sd/Math.sqrt(n)).toFixed(1)} (${n})`;};
const cut=R[Math.floor(R.length*.75)].t;
for(const m45 of[true,false]){const b=R.map(r=>{if((new Date(r.t).getUTCMinutes()===45)!==m45)return null;const x=r.at&&r.at[240];if(!x||x.ya==null||x.na==null)return null;
  const c=x.ya>=x.na?1:0,fa=c?x.ya:x.na;if(fa<60||fa>70)return null;const u=1-c,ask=u?x.ya:x.na;if(ask<=0||ask>=100)return null;const w=r.up===u;return{t:r.t,p:(w?100-ask:-ask)-feeP(ask)};}).filter(Boolean);
  console.log(m45?':45':'other',`whole ${st(b.map(o=>o.p))} train ${st(b.filter(o=>o.t<cut).map(o=>o.p))} test ${st(b.filter(o=>o.t>=cut).map(o=>o.p))} after Nov 2 12:00 ${st(b.filter(o=>o.t>=Date.parse('2026-11-02T12:00Z')).map(o=>o.p))}`);}
