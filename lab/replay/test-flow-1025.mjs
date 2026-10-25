// Oct 25: does 3/5/15-min aggressive buy share agreeing with the bet side help INSIDE the live band? (fav no-gate & live rule; skip bets when flow disagrees)
import fs from 'fs';import {R,run,stat,paired,LIVE} from './sim.mjs';
const F=JSON.parse(fs.readFileSync('lab/flowdata/minutes.json')).m;const J=JSON.stringify;
const sh=(t,n)=>{let b=0,s=0,ok=0;for(let i=1;i<=n;i++){const r=F[Math.floor(t/1000)-i*60];if(r){b+=r[0];s+=r[1];ok++;}}return ok>=n-1&&b+s>0?b/(b+s)-.5:null;};
const RF=R.filter(o=>sh(o.t+120000,15)!=null);console.log('rounds with flow',RF.length,new Date(RF[0].t).toISOString().slice(0,10),'→',new Date(RF.at(-1).t).toISOString().slice(0,10));
const halves=[RF.slice(0,RF.length>>1),RF.slice(RF.length>>1)];
const live={margin:3,p:a=>a.pu},ng={margin:-100,p:a=>a.pu};
for(const[nm,B,rule]of[['fav no-gate 12–24',ng,LIVE],['fav no-gate all hours',ng,{...LIVE,hs:0,he:24}],['live rule 12–24',live,LIVE]])for(const n of[3,5,15])for(const[h,te]of halves.entries()){
 const b=run(te,B,rule),ag=[],dis=[];for(const x of b){const f=sh(x.t+x.s*1000,n);const up=x.won===(R.find(o=>o.t===x.t).up===1);(f==null||(f>0)===up?ag:dis).push(x);}
 console.log(`${nm.padEnd(22)} ${String(n).padStart(2)}-min h${h+1}: agree ${J(stat(ag))} disagree ${J(stat(dis))} skip-disagree paired ${J(paired(te,ag,b))}`);}
