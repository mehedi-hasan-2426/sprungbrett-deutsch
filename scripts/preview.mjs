import { createServer } from "node:http";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "out");
const PORT = Number(process.env.PORT ?? 4173);
const HEADERS = JSON.parse(readFileSync(join(ROOT, "vercel.json"), "utf8")).headers.flatMap((r) => r.headers);
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".txt": "text/plain", ".ico": "image/x-icon", ".svg": "image/svg+xml" };

export function buildRoutes(root) {
  const routes = new Map();
  const visit = (directory, segments) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const file = join(directory, entry.name);
      if (entry.isDirectory()) {
        visit(file, [...segments, entry.name]);
      } else if (entry.isFile()) {
        const route = "/" + [...segments, entry.name].join("/");
        routes.set(route, file);
        if (entry.name.endsWith(".html")) routes.set(route.slice(0, -5), file);
        if (entry.name === "index.html") routes.set("/" + segments.join("/"), file);
      }
    }
  };
  visit(root, []);
  return routes;
}

export function resolveRoute(routes, requestUrl) {
  try {
    const pathname = decodeURIComponent(new URL(requestUrl, "http://127.0.0.1").pathname);
    return routes.get(pathname);
  } catch {
    return undefined;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const routes = buildRoutes(OUT);
  createServer((req, res) => {
    for (const h of HEADERS) if (h.key !== "Strict-Transport-Security") res.setHeader(h.key, h.value.replace("; upgrade-insecure-requests", ""));
    const matched = resolveRoute(routes, req.url ?? "/");
    const file = matched ?? join(OUT, "404.html");
    try {
      const body = readFileSync(file);
      res.writeHead(matched ? 200 : 404, { "Content-Type": TYPES[extname(file)] ?? "application/octet-stream" });
      res.end(body);
    } catch {
      res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Preview file unavailable. Rebuild the application.");
    }
  }).listen(PORT, "127.0.0.1", () => console.log(`preview with production headers: http://127.0.0.1:${PORT}`));
}
