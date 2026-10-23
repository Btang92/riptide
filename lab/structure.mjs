// Market structure from candles: swing highs/lows (HH, HL, LH, LL) and break of structure.
// candles: [{t, o, h, l, c}] oldest first. A swing high/low needs `k` candles on each side.
export function swings(candles, k = 3) {
  const out = [];
  for (let i = k; i < candles.length - k; i++) {
    const w = candles.slice(i - k, i + k + 1), c = candles[i];
    if (c.h === Math.max(...w.map(x => x.h))) out.push({ i, t: c.t, type: "H", p: c.h });
    if (c.l === Math.min(...w.map(x => x.l))) out.push({ i, t: c.t, type: "L", p: c.l });
  }
  let lastH = null, lastL = null;
  for (const s of out) { if (s.type === "H") { s.label = lastH == null ? "H" : s.p > lastH ? "HH" : "LH"; lastH = s.p; } else { s.label = lastL == null ? "L" : s.p > lastL ? "HL" : "LL"; lastL = s.p; } }
  return out;
}
// Features at the last candle (only swings already confirmed, i.e. at least k candles old):
// trend: +1 (HH+HL), -1 (LH+LL), 0 mixed; bos: +1 broke above last swing high, -1 broke below last swing low, 0 none;
// strikeVsSwing: where the strike sits relative to the last swing high/low (+1 above high, -1 below low, 0 between).
export function structureFeatures(candles, strike, k = 3) {
  const sw = swings(candles, k), H = sw.filter(s => s.type === "H"), L = sw.filter(s => s.type === "L"), last = candles[candles.length - 1];
  const h = H.at(-1), l = L.at(-1), trend = h && l ? (h.label === "HH" && l.label === "HL" ? 1 : h.label === "LH" && l.label === "LL" ? -1 : 0) : 0;
  const bos = h && last.c > h.p ? 1 : l && last.c < l.p ? -1 : 0;
  const strikeVsSwing = strike == null || !h || !l ? 0 : strike > h.p ? 1 : strike < l.p ? -1 : 0;
  return { trend, bos, strikeVsSwing, lastHigh: h ? h.p : null, lastLow: l ? l.p : null };
}
