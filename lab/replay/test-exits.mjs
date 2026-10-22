import {R,brain,split,run,stat,paired,LIVE,feeP} from './sim.mjs';
const ALL={lo:1,hi:99,hs:null,times:[120],add:-100}; // buy model side at 2:00 every round
const BAND={...LIVE,hs:null};
const EX={
 'early: ps<.5 at 3-5':{exitTimes:[180,240,300],exit:(ps)=>ps<.5},
 'early: ps<.4 at 3-5':{exitTimes:[180,240,300],exit:(ps)=>ps<.4},
 'any: ps<.5 to 10:00':{exitTimes:[180,240,300,360,420,480,600],exit:(ps)=>ps<.5},
 'value: bid-fee>ps to 10:00':{exitTimes:[180,240,300,360,420,480,600],exit:(ps,bid)=>bid-feeP(bid)>ps*100},
 'value+5: bid-fee>ps+5':{exitTimes:[180,240,300,360,420,480,600],exit:(ps,bid)=>bid-feeP(bid)>ps*100+5},
 'late: bid>=90 at 10:00':{exitTimes:[600],exit:(ps,bid)=>bid>=90},
 'late: bid>=95 at 10:00':{exitTimes:[600],exit:(ps,bid)=>bid>=95},
 'late: bid>=95 at 8:00+':{exitTimes:[480,600],exit:(ps,bid)=>bid>=95},
 'late: ps<bid at 8-10':{exitTimes:[480,600],exit:(ps,bid)=>bid-feeP(bid)>ps*100},
};
for(const f0 of [.5,.75]){const {tr}=split(f0);const te=f0==.5?R.slice(Math.floor(R.length*.5),Math.floor(R.length*.75)):split(.75).te;const B=brain(tr);
 console.log(`\n== fold ${f0} (test ${te.length}, rounds with 10:00 price: ${te.filter(o=>o.at[600]).length})`);
 for(const[bn,base]of Object.entries({'every round @2:00':ALL,'band 75-90 all h':BAND,'live':LIVE})){const h=run(te,B,base);console.log(' ',bn,'HOLD',JSON.stringify(stat(h)));
  for(const[k,e]of Object.entries(EX)){const b=run(te,B,{...base,...e});console.log('    ',k.padEnd(28),JSON.stringify(stat(b)),JSON.stringify(paired(te,b,h)));}}}
