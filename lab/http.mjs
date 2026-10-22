// HTTP for the lab scripts. Uses curl (works through cloud proxies and follows Google's redirects);
// falls back to fetch where curl isn't available.
import { execFileSync } from "node:child_process";
const hasCurl = (() => { try { execFileSync("curl", ["--version"], { stdio: "ignore" }); return true; } catch { return false; } })();
const parse = (t, url) => { try { return JSON.parse(t); } catch { throw new Error("server sent a non-JSON reply from " + url.split("?")[0] + ": " + t.slice(0, 120)); } };
// Google's web-app replies are flaky now and then (a 404 page or a stalled redirect), so every call retries.
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function retry(what, fn, tries = 5) {
  for (let i = 1; ; i++) { try { return await fn(); } catch (e) { if (i >= tries) throw e; console.error(`${what}: attempt ${i} failed (${String(e.message).split("\n")[0].slice(0, 100)}), retrying`); await sleep(5000 * i); } }
}
export async function getJSON(url) {
  return retry("download " + (url.match(/action=(\w+)/) || [, "status"])[1], async () => {
    if (hasCurl) return parse(execFileSync("curl", ["-sSL", "--fail", "-m", "240", url], { maxBuffer: 512 * 1024 * 1024, stdio: ["ignore", "pipe", "pipe"] }).toString(), url);
    const r = await fetch(url, { redirect: "follow" }); return parse(await r.text(), url);
  });
}
export async function postJSON(url, body) {
  const data = JSON.stringify(body);
  return retry("upload", async () => {
  // no -X POST: after Google's 302 the reply must be fetched with GET, which curl does by default
  if (hasCurl) return parse(execFileSync("curl", ["-sSL", "--fail", "-m", "120", "-H", "Content-Type: text/plain", "--data-binary", "@-", url], { input: data, maxBuffer: 16 * 1024 * 1024, stdio: ["pipe", "pipe", "pipe"] }).toString(), url);
  const r = await fetch(url, { method: "POST", body: data, redirect: "follow" }); return parse(await r.text(), url);
  }, 3);
}
