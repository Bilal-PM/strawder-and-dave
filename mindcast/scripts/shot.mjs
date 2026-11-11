// Screenshot routes of a served web build at iPhone size, light and dark, and report console errors.
// Usage: node scripts/shot.mjs <baseUrl> <outDir> <route> [route...]
// Example: node scripts/shot.mjs http://localhost:8081 /tmp/shots /trains /train/c66
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { chromium, devices } = require("playwright");
const [base, out, ...routes] = process.argv.slice(2);
const b = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
for (const scheme of ["light", "dark"]) {
  const ctx = await b.newContext({ ...devices["iPhone 13"], colorScheme: scheme });
  // Skip onboarding for screenshots of inner screens.
  await ctx.addInitScript(() => { try { const k = "groundwork-v1"; if (!localStorage.getItem(k)) localStorage.setItem(k, JSON.stringify({ state: { onboarded: true }, version: 1 })); } catch {} });
  const p = await ctx.newPage(); const errs = [];
  p.on("pageerror", (e) => errs.push(e.message)); p.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });
  for (const r of routes) {
    await p.goto(base + r, { waitUntil: "networkidle" }).catch(() => {}); await p.waitForTimeout(2500);
    const name = `${out}/${scheme}${r.replace(/[\/\[\]]/g, "_") || "_home"}.png`;
    await p.screenshot({ path: name, fullPage: true });
    console.log(scheme, r, "->", name);
  }
  console.log(scheme, "errors:", JSON.stringify(errs.slice(0, 10)));
  await ctx.close();
}
await b.close();
