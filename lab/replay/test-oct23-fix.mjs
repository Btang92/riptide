import {R,feeP,stat,paired} from './sim.mjs';import {et} from './lib.mjs';
const J=JSON.stringify;
function go(set,{hrs,live,times=[120,180,240,300],lo=75,hi=90,maxEdge}){const out=[];for(const o of set){if(hrs&&et(o.t).h<12)continue;
 for(const s of times){const a=o.at[s];if(!a)continue;let c=0,ask,pr;
  if(live){if(!a.f)continue;const pu=a.pu;c=pu>=.5?1:-1;pr=Math.max(pu,1-pu);ask=c>0?a.ya:a.na;if(ask==null||ask<lo||ask>hi)continue;if(pr*100<ask+feeP(ask)+3)continue;if(maxEdge!=null&&pr*100-ask>maxEdge)break;}
  else{if(a.ya>=lo&&a.ya<=hi){c=1;ask=a.ya}else if(a.na>=lo&&a.na<=hi){c=-1;ask=a.na}if(!c)continue;}
  const won=(o.up===1)===(c===1);out.push({t:o.t,pnl:(won?100-ask:-ask)-feeP(ask),won,ask,s});break;}}return out;}
const d=(m,dd,h=0)=>Date.UTC(2026,9,dd,h);
const P={'Sep20–Oct23 (history)':R.filter(o=>o.t<d(0,23,22)),'Oct23–27 (recent A)':R.filter(o=>o.t>=d(0,23,22)&&o.t<d(0,27,12)),'Oct27–30 (recent B)':R.filter(o=>o.t>=d(0,27,12))};
for(const k in P)console.log(k,P[k].length,'rounds');
const BASES=[['fav all hours',{}],['fav 12–24',{hrs:1}],['live rule 12–24 (live)',{hrs:1,live:1}],['live rule all hours',{live:1}]];
const VARS=[['cutoff 2:00',{times:[120]}],['cutoff 3:00',{times:[120,180]}],['cutoff 4:00',{times:[120,180,240]}],['no 80–85¢',null],['live edge cap 15',{maxEdge:15}],['live edge cap 10',{maxEdge:10}]];
for(const[bn,b]of BASES){console.log(`\n== ${bn}`);for(const k in P){const S=P[k],g=go(S,b);console.log(`  ${k.padEnd(24)} base ${J(stat(g))}`);
 for(const[vn,v]of VARS){if(vn.includes('edge')&&!b.live)continue;let f;if(v)f=go(S,{...b,...v});else f=g.filter(x=>!(x.ask>=80&&x.ask<85));
  const p=paired(S,f,g);console.log(`     ${vn.padEnd(16)} ${J(stat(f))} paired ${p.perRound}±${p.se} ¢/round`);}}}
