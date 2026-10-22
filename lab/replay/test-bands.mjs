import {R,brain,split,run,stat,paired,LIVE} from './sim.mjs';
for(const f0 of [.5,.75]){const {tr,te}=split(f0);const te2=f0==.5?R.slice(Math.floor(R.length*.5),Math.floor(R.length*.75)):te;
const B=brain(tr);console.log(`\n== fold train<${f0} test n=${te2.length}  brain=${B.kind} margin=${B.margin.toFixed(1)}`,JSON.stringify(Object.fromEntries(Object.entries(B.sc).map(([k,v])=>[k,[+v.ll.toFixed(4),+v.acc.toFixed(3)]]))));
const live=run(te2,B,LIVE);
const V={live:LIVE,
 'band 75-90 all hours':{...LIVE,hs:null},
 'no band 12-24':{...LIVE,lo:1,hi:99},
 'no band all hours':{...LIVE,lo:1,hi:99,hs:null},
 'band <60 all h':{...LIVE,lo:1,hi:59,hs:null},'band 60-74 all h':{...LIVE,lo:60,hi:74,hs:null},'band 75-90 allh':{...LIVE,lo:75,hi:90,hs:null},'band 91-99 all h':{...LIVE,lo:91,hi:99,hs:null},
 'no band 2:00 only allh':{...LIVE,lo:1,hi:99,hs:null,times:[120]},
 'no band all h +3 margin':{...LIVE,lo:1,hi:99,hs:null,add:3},
 'no band all h +6 margin':{...LIVE,lo:1,hi:99,hs:null,add:6},
 'band 40-90 all h':{...LIVE,lo:40,hi:90,hs:null},
};
for(const[k,r]of Object.entries(V)){const b=run(te2,B,r);console.log(k.padEnd(26),JSON.stringify(stat(b)),k=='live'?'':JSON.stringify(paired(te2,b,live)));}}
