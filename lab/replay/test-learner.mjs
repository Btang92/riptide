// Brandon (Oct 24): is RIPTIDE better off deciding purely on the fly (raw model from live price/volatility)
// instead of adjusting itself from past calls? Rolling replay of the live learner (v/2026-10-22e learner():
// per-5-point calibration with K=25, momentum correction, flips, auto-blocks on 3-hour block and entry band
// losing >2¢/ct beyond noise over 30+ calls), using ONLY rounds already settled at each call.
import {R,stat,paired,feeP} from './sim.mjs';import {et} from './lib.mjs';
const K=25,MIN_FLIP=60,MIN_BLOCK=30,BLOCK_AT=-2,BIN=5;
const binOf=p=>Math.min(95,Math.floor(p*100/BIN)*BIN);const hb=t=>Math.floor(et(t).h/3)*3;
const band=a=>a<55?'0–54':a<65?'55–64':a<75?'65–74':a<85?'75–84':'85–99';
const cal={},M={true:{n:0,res:0},false:{n:0,res:0}},B={};
const decide=(side,p,mom)=>{const x=cal[binOf(p)];if(!x)return{side,p};const adj=(x.w-x.ps)/(x.n+K);const madj=mom!=null?M[mom].res/(M[mom].n+K):0;
  let q=Math.min(.99,Math.max(.01,p+adj+madj));const said=x.ps/x.n,rate=x.w/x.n;
  if(x.n>=MIN_FLIP&&said+adj<.5&&(rate-.5)/Math.sqrt(.25/x.n)<-2)return{side:!side,p:1-q,flipped:true};return{side,p:q};};
const blocked=(t,ask)=>[B['h'+hb(t)],B['p'+band(ask)]].some(x=>x&&x.n>=MIN_BLOCK&&x.sum/x.n<BLOCK_AT&&x.sum/x.n+Math.sqrt(Math.max(0,x.sq/x.n-(x.sum/x.n)**2)/x.n)<0);
const V={raw:[],calibrated:[],'raw+blocks':[],'calibrated+blocks':[]},VA={raw:[],calibrated:[],'raw+blocks':[],'calibrated+blocks':[]};let ll={raw:0,cal:0,n:0},nBlk=0,nFlip=0;
for(const o of R){const h=et(o.t).h;
  // betting: live rule (75–90¢, 12–24 ET, first check 2:00–5:00 that clears prob ≥ ask+fee+3) and an all-hours, any-price version
  for(const[name,useCal,useBlk]of[['raw',0,0],['calibrated',1,0],['raw+blocks',0,1],['calibrated+blocks',1,1]])
   for(const[store,lo,hi,hs]of[[V,75,90,12],[VA,1,99,0]]){if(h<hs)continue;
    for(const s of[120,180,240,300]){const a=o.at[s];if(!a||!a.f)continue;let side=a.pu>=.5,p=Math.max(a.pu,1-a.pu);const mom=a.mom5?((a.mom5>0)===side):null;
     if(useCal){const d=decide(side,p,mom);side=d.side;p=d.p;}const ask=side?a.ya:a.na;if(!(ask>=lo&&ask<=hi&&ask>0&&ask<100))continue;if(p*100<ask+feeP(ask)+3)continue;
     if(useBlk&&blocked(o.t,ask))continue;const won=(o.up===1)===side;store[name].push({t:o.t,pnl:(won?100-ask:-ask)-feeP(ask),won,ask});break;}}
  // learn from this round once settled (call at 2:00, like RIPTIDE's every-round calls)
  const a=o.at[120];if(!a||!a.f)continue;const side=a.pu>=.5,p=Math.max(a.pu,1-a.pu),won=(o.up===1)===side?1:0,mom=a.mom5?((a.mom5>0)===side):null;
  const d=decide(side,p,mom);ll.raw-=Math.log(won?p:1-p);const wq=(o.up===1)===d.side?1:0;ll.cal-=Math.log(Math.min(.999,Math.max(.001,wq?d.p:1-d.p)));ll.n++;if(d.flipped)nFlip++;
  const x=(cal[binOf(p)]??={n:0,w:0,ps:0});x.n++;x.w+=won;x.ps+=p;
  if(mom!=null){const m=M[mom];m.n++;const adj=(x.w-x.ps)/(x.n+K);m.res+=won-(p+adj);}
  const ask=side?a.ya:a.na;if(ask>0&&ask<100){const v=(won?100-ask:-ask)-feeP(ask);for(const k of['h'+hb(o.t),'p'+band(ask)]){const b=(B[k]??={n:0,sum:0,sq:0});b.n++;b.sum+=v;b.sq+=v*v;}}}
console.log(`Rounds ${R.length}. Forecast quality at 2:00 (log-loss, lower = better): raw ${(ll.raw/ll.n).toFixed(4)}, learned-adjusted ${(ll.cal/ll.n).toFixed(4)}; flips ${nFlip}`);
console.log('Blocks at the end:',Object.entries(B).filter(([k,x])=>x.n>=MIN_BLOCK&&x.sum/x.n<BLOCK_AT&&x.sum/x.n+Math.sqrt(Math.max(0,x.sq/x.n-(x.sum/x.n)**2)/x.n)<0).map(([k,x])=>`${k} ${(x.sum/x.n).toFixed(1)}¢ n${x.n}`).join(', ')||'none');
const half=R[Math.floor(R.length/2)].t,q3=R[Math.floor(R.length*.75)].t;
for(const[title,S]of[['LIVE RULE (75–90¢, 12–24 ET)',V],['ALL HOURS, ANY PRICE',VA]]){console.log('\n'+title);
  for(const[nm,f]of[['all rounds',x=>true],['2nd half',x=>x.t>=half],['newest quarter',x=>x.t>=q3]]){const te=R.filter(o=>f(o));
   for(const k of Object.keys(S)){const b=S[k].filter(f);console.log(`  ${nm.padEnd(14)} ${k.padEnd(18)} ${JSON.stringify(stat(b))} ${k==='raw'?'':'vs raw '+JSON.stringify(paired(te,b,S.raw.filter(f)))}`);}}}
