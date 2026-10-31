import fs from 'fs';import {R,feeP,stat} from './sim.mjs';import {et} from './lib.mjs';
const J=JSON.stringify,W=Date.UTC(2026,9,23,22);const M=JSON.parse(fs.readFileSync('lab/data/candles.json'));const cb=t=>M[t]?.[4];
const fav=[];for(const o of R){for(const s of [120,180,240,300]){const a=o.at[s];if(!a)continue;let c=0,ask;if(a.ya>=75&&a.ya<=90){c=1;ask=a.ya}else if(a.na>=75&&a.na<=90){c=-1;ask=a.na}if(!c)continue;const won=(o.up===1)===(c===1);
 // path after entry: held-side mid at later checkpoints
 const mid=s2=>{const b=o.at[s2];if(!b||b.ya==null)return null;const m=(b.ya+100-b.na)/2;return c>0?m:100-m;};
 const m60=cb(o.t+s*1000-60000),m60b=cb(o.t+s*1000-60000-3600e3),m4h=cb(o.t+s*1000-60000-4*3600e3);
 const tr60=m60&&m60b?Math.log(m60/m60b)*100*c:null,tr4=m60&&m4h?Math.log(m60/m4h)*100*c:null;
 fav.push({t:o.t,pnl:(won?100-ask:-ask)-feeP(ask),won,ask,s,c,h:et(o.t).h,pu:a.pu,m300:mid(300),m480:mid(480),m600:mid(600),tr60,tr4,mdl:a.pu!=null?(c>0?a.pu:1-a.pu)*100:null});break;}}
const pre=fav.filter(x=>x.t<W),post=fav.filter(x=>x.t>=W);
const cmp=(nm,f)=>console.log(nm.padEnd(34),'before',J(stat(pre.filter(f))),' since',J(stat(post.filter(f))));
cmp('all',x=>1);
cmp('YES (up) side',x=>x.c>0);cmp('NO (down) side',x=>x.c<0);
for(const s of [120,180,240,300])cmp('entry '+s,x=>x.s===s);
for(const[a,b]of[[75,80],[80,85],[85,91]])cmp(`ask ${a}-${b}`,x=>x.ask>=a&&x.ask<b);
for(const[a,b]of[[0,4],[4,8],[8,12],[12,16],[16,20],[20,24]])cmp(`ET ${a}-${b}`,x=>x.h>=a&&x.h<b);
cmp('60m trend WITH fav >0.3%',x=>x.tr60>0.3);cmp('60m trend flat',x=>x.tr60!=null&&Math.abs(x.tr60)<=0.3);cmp('60m trend AGAINST fav >0.3%',x=>x.tr60<-0.3);
cmp('4h trend WITH >0.5%',x=>x.tr4>0.5);cmp('4h flat',x=>x.tr4!=null&&Math.abs(x.tr4)<=0.5);cmp('4h AGAINST >0.5%',x=>x.tr4<-0.5);
cmp('model agrees ≥ ask',x=>x.mdl!=null&&x.mdl>=x.ask);cmp('model below ask',x=>x.mdl!=null&&x.mdl<x.ask);
// how losses happen
const how=a=>{const L=a.filter(x=>!x.won);const e=L.filter(x=>x.m300!=null&&x.m300<50).length,l=L.filter(x=>x.m480!=null&&x.m480>=50&&x.m600!=null&&x.m600>=50).length;return `losses ${L.length}: turned by 5:00 ${e} (${(e/L.length*100).toFixed(0)}%), still winning at 8:00&10:00 ${l} (${(l/L.length*100).toFixed(0)}%)`;};
console.log('before',how(pre));console.log('since ',how(post));
// BTC context: daily move and realized vol
const day=d=>{const t=Date.UTC(2026,9,d,4);const a=cb(t),b=cb(t+864e5);let v=0,n=0;for(let i=0;i<1440;i++){const x=cb(t+i*6e4),y=cb(t+(i+1)*6e4);if(x&&y){v+=Math.log(y/x)**2;n++;}}return `${d}: ${a?.toFixed(0)}→${b?.toFixed(0)} rv/min ${(Math.sqrt(v/n)*1e4).toFixed(1)}bp`;};
for(let d=14;d<=30;d++)console.log(day(d));
