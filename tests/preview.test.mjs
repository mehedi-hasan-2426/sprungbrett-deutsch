import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildRoutes, resolveRoute } from "../scripts/preview.mjs";

test("preview routes only select files from the built-file map", () => {
  const root = mkdtempSync(join(tmpdir(), "sprungbrett-routes-"));
  try {
    const output = join(root, "out");
    mkdirSync(join(output, "woche"), { recursive: true });
    writeFileSync(join(output, "index.html"), "Home");
    writeFileSync(join(output, "woche", "1.html"), "Week 1");
    writeFileSync(join(root, "private.txt"), "Must not be served");
    const routes = buildRoutes(output);
    assert.equal(resolveRoute(routes, "/"), join(output, "index.html"));
    assert.equal(resolveRoute(routes, "/woche/1?exercise=2"), join(output, "woche", "1.html"));
    assert.equal(resolveRoute(routes, "/woche/1.html"), join(output, "woche", "1.html"));
    for (const request of ["/../private.txt", "/%2e%2e/private.txt", "/%2e%2e%2fprivate.txt", "/..%5cprivate.txt", "/%252e%252e/private.txt", "/%", "/unknown"]) {
      assert.equal(resolveRoute(routes, request), undefined, request);
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});