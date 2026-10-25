// Oct 25: favourite no-gate entry window 2:00–3:00 vs 2:00–5:00, by quarter; and the 4:00–5:00-only entries alone.
import {R,run,stat,paired,LIVE} from './sim.mjs';
const J=JSON.stringify,live={margin:3,p:a=>a.pu},ng={margin:-100,p:a=>a.pu};
for(const[nm,hs,he]of[['12–24 ET',12,24],['all hours',0,24]])for(let i=0;i<4;i++){const te=R.slice(Math.floor(R.length*i/4),Math.floor(R.length*(i+1)/4));
 const a=run(te,ng,{...LIVE,hs,he,times:[120,180]}),b=run(te,ng,{...LIVE,hs,he}),late=b.filter(x=>x.s>=240),L=run(te,live,LIVE);
 console.log(`${nm} Q${i+1}: to3 ${J(stat(a))} to5 ${J(stat(b))} late-only(4–5:00) ${J(stat(late))} paired to3−to5 ${J(paired(te,a,b))} to3−live ${J(paired(te,a,L))}`);}
