import { createServer } from "node:http";
import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, extname, join, normalize, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "out");
const PORT = Number(process.env.PORT ?? 4173);
const HEADERS = JSON.parse(readFileSync(join(ROOT, "vercel.json"), "utf8")).headers.flatMap((r) => r.headers);
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".txt": "text/plain", ".ico": "image/x-icon", ".svg": "image/svg+xml" };

function resolveFile(urlPath) {
  const clean = normalize(decodeURIComponent(urlPath.split("?")[0] ?? "/")).replace(/^([/\\])+/, "");
  for (const candidate of [clean, clean + ".html", join(clean, "index.html")]) {
    const full = resolve(OUT, candidate);
    if (!full.startsWith(OUT + sep) && full !== OUT) return null;
    if (existsSync(full) && statSync(full).isFile()) return full;
  }
  return null;
}

createServer((req, res) => {
  for (const h of HEADERS) if (h.key !== "Strict-Transport-Security") res.setHeader(h.key, h.value.replace("; upgrade-insecure-requests", ""));
  let file;
  try {
    file = resolveFile(req.url ?? "/");
  } catch {
    file = null;
  }
  const status = file ? 200 : 404;
  file ??= join(OUT, "404.html");
  res.writeHead(status, { "Content-Type": TYPES[extname(file)] ?? "application/octet-stream" });
  res.end(readFileSync(file));
}).listen(PORT, "127.0.0.1", () => console.log(`preview with production headers: http://127.0.0.1:${PORT}`));
