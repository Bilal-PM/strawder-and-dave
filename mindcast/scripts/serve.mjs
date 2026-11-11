// Tiny static server with SPA fallback for previewing `expo export -p web` output.
// Usage: node scripts/serve.mjs <dir> <port>
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
const [dir = "dist", port = "8081"] = process.argv.slice(2);
const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg", ".svg": "image/svg+xml", ".ttf": "font/ttf", ".woff2": "font/woff2", ".ico": "image/x-icon", ".map": "application/json" };
createServer(async (req, res) => {
  const url = decodeURIComponent((req.url || "/").split("?")[0]);
  let file = normalize(join(dir, url));
  try { if ((await stat(file)).isDirectory()) file = join(file, "index.html"); } catch { file = join(dir, "index.html"); }
  try { const body = await readFile(file); res.writeHead(200, { "content-type": types[extname(file)] || "application/octet-stream" }); res.end(body); }
  catch { res.writeHead(404); res.end("not found"); }
}).listen(Number(port), () => console.log(`serving ${dir} on http://localhost:${port}`));
