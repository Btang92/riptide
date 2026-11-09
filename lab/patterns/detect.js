// Copied from the page (v/2026-11-07b): RIPTIDE's named-pattern detector.
const PAT={
  "Morning Star":1,"Evening Star":-1,"Three White Soldiers":1,"Three Black Crows":-1,
  "Bullish Engulfing":1,"Bearish Engulfing":-1,"Piercing Line":1,"Dark Cloud Cover":-1,
  "Bullish Harami":1,"Bearish Harami":-1,"Tweezer Bottom":1,"Tweezer Top":-1,
  "Hammer":1,"Hanging Man":-1,"Inverted Hammer":1,"Shooting Star":-1,"Dragonfly Doji":1,"Gravestone Doji":-1,"Doji":0};
function namedPattern(O,H,L,C,i){
  if(i<6)return null;const rng=k=>H[k]-L[k],body=k=>Math.abs(C[k]-O[k]),grn=k=>C[k]>O[k],red=k=>C[k]<O[k];
  const up=k=>H[k]-Math.max(O[k],C[k]),lo=k=>Math.min(O[k],C[k])-L[k],r=rng(i);if(!(r>0))return null;
  let ab=0;for(let k=i-6;k<i;k++)ab+=body(k);ab=ab/6||r;                                      // typical body size
  const tr=C[i-1]-C[i-6],down=tr<-ab,upT=tr>ab;                                                 // trend before this candle
  const mid=k=>(O[k]+C[k])/2,big=k=>body(k)>=ab*1.1,b=body(i);
  // three-candle
  if(big(i-2)&&red(i-2)&&body(i-1)<=ab*0.5&&grn(i)&&C[i]>mid(i-2)&&down)return"Morning Star";
  if(big(i-2)&&grn(i-2)&&body(i-1)<=ab*0.5&&red(i)&&C[i]<mid(i-2)&&upT)return"Evening Star";
  const solid=k=>body(k)>=0.6*rng(k)&&body(k)>=ab*0.8;
  if([i-2,i-1,i].every(k=>grn(k)&&solid(k))&&C[i]>C[i-1]&&C[i-1]>C[i-2])return"Three White Soldiers";
  if([i-2,i-1,i].every(k=>red(k)&&solid(k))&&C[i]<C[i-1]&&C[i-1]<C[i-2])return"Three Black Crows";
  // two-candle
  const p=i-1;
  if(red(p)&&grn(i)&&C[i]>=O[p]&&O[i]<=C[p]&&b>body(p)&&b>=ab*0.8)return"Bullish Engulfing";
  if(grn(p)&&red(i)&&C[i]<=O[p]&&O[i]>=C[p]&&b>body(p)&&b>=ab*0.8)return"Bearish Engulfing";
  if(red(p)&&big(p)&&grn(i)&&O[i]<=C[p]&&C[i]>mid(p)&&C[i]<O[p]&&down)return"Piercing Line";
  if(grn(p)&&big(p)&&red(i)&&O[i]>=C[p]&&C[i]<mid(p)&&C[i]>O[p]&&upT)return"Dark Cloud Cover";
  if(red(p)&&big(p)&&grn(i)&&b<=body(p)*0.5&&Math.max(O[i],C[i])<=O[p]&&Math.min(O[i],C[i])>=C[p]&&down)return"Bullish Harami";
  if(grn(p)&&big(p)&&red(i)&&b<=body(p)*0.5&&Math.max(O[i],C[i])<=C[p]&&Math.min(O[i],C[i])>=O[p]&&upT)return"Bearish Harami";
  // one-candle
  if(b<=0.05*r){if(lo(i)>=0.65*r&&up(i)<=0.1*r)return"Dragonfly Doji";if(up(i)>=0.65*r&&lo(i)<=0.1*r)return"Gravestone Doji";return r>=ab*0.8?"Doji":null;}
  if(b>=0.05*r&&lo(i)>=2*b&&up(i)<=0.25*r){if(down)return"Hammer";if(upT)return"Hanging Man";}
  if(b>=0.05*r&&up(i)>=2*b&&lo(i)<=0.25*r){if(down)return"Inverted Hammer";if(upT)return"Shooting Star";}
  const tol=Math.max(ab*0.15,r*0.05);
  if(down&&red(p)&&grn(i)&&Math.abs(L[i]-L[p])<=tol&&body(p)>=ab*0.6)return"Tweezer Bottom";
  if(upT&&grn(p)&&red(i)&&Math.abs(H[i]-H[p])<=tol&&body(p)>=ab*0.6)return"Tweezer Top";
  return null;}

module.exports={PAT,namedPattern};
