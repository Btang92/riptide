// Pyth XAU/USD 1-minute candles (needs PYTH_KEY env; never commit the key). Usage: PYTH_KEY=... node pyth.mjs out.json fromUnix toUnix
import { execFileSync } from "node:child_process"; import { writeFileSync, readFileSync, existsSync } from "node:fs";
const [OUT, FROM, TO] = [process.argv[2], +process.argv[3], +process.argv[4]], M = existsSync(OUT) ? JSON.parse(readFileSync(OUT)) : {};
for (let t = FROM; t < TO; t += 86400) { const u = `https://pyth.dourolabs.app/v1/fixed_rate@200ms/history?symbol=Metal.XAU/USD&resolution=1&from=${t}&to=${Math.min(t + 86400, TO)}`;
  for (let a = 0; a < 4; a++) { try { const j = JSON.parse(execFileSync("curl", ["-sS", "-m", "60", "-H", "Authorization: Bearer " + process.env.PYTH_KEY, u], { maxBuffer: 64 << 20 }).toString()); if (j.s !== "ok" && j.s !== "no_data") throw new Error(JSON.stringify(j).slice(0, 200)); (j.t || []).forEach((x, i) => M[x] = [j.o[i], j.h[i], j.l[i], j.c[i]]); break; } catch (e) { if (a === 3) console.error(e.message); execFileSync("sleep", ["2"]); } } }
writeFileSync(OUT, JSON.stringify(M)); console.log(Object.keys(M).length, "candles");
