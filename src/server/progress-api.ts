import type { NextApiRequest, NextApiResponse } from "next";
import { parseSaveRequest } from "../lib/progress-sync.ts";
import type { ProgressStore } from "./progress-store.ts";

interface Dependencies {
  authorize: (request: NextApiRequest, response: NextApiResponse) => Promise<string | null>;
  configured: () => boolean;
  store: () => ProgressStore;
  origin: () => string;
}

export function createProgressHandler(dependencies: Dependencies) {
  return async (request: NextApiRequest, response: NextApiResponse) => {
    response.setHeader("Cache-Control", "private, no-store, max-age=0");
    response.setHeader("Vary", "Cookie");
    if (request.method !== "GET" && request.method !== "PUT") {
      response.setHeader("Allow", "GET, PUT");
      response.status(405).json({ error: "Method not allowed" });
      return;
    }
    if (Object.keys(request.query).length) {
      response.status(400).json({ error: "Progress is selected only by your signed-in account" });
      return;
    }
    if (request.headers["sec-fetch-site"] === "cross-site") {
      response.status(403).json({ error: "Cross-site progress requests are not allowed" });
      return;
    }
    try {
      if (request.method === "PUT" && (request.headers.origin !== dependencies.origin() || request.headers["x-sprungbrett-sync"] !== "1")) {
        response.status(403).json({ error: "A same-origin save request is required" });
        return;
      }
      const accountKey = await dependencies.authorize(request, response);
      if (!accountKey || !/^[a-f0-9]{64}$/.test(accountKey)) {
        response.status(401).json({ error: "Sign in again before syncing progress" });
        return;
      }
      if (!dependencies.configured()) {
        response.status(503).json({ error: "Cloud progress is unavailable. Your browser copy is kept." });
        return;
      }
      if (request.method === "GET") {
        response.status(200).json(await dependencies.store().read(accountKey));
        return;
      }
      if (!request.headers["content-type"]?.startsWith("application/json")) {
        response.status(415).json({ error: "Progress saves require JSON" });
        return;
      }
      let save;
      try {
        save = parseSaveRequest(request.body);
      } catch {
        response.status(400).json({ error: "Invalid progress or revision. Your browser copy is kept." });
        return;
      }
      const store = dependencies.store();
      const result = await store.write(accountKey, save.revision, save.progress);
      if (!result) {
        response.status(409).json({ error: "Progress changed on another device", snapshot: await store.read(accountKey) });
        return;
      }
      response.status(200).json(result);
    } catch {
      console.error("Progress storage request failed; no learner data or credentials logged.");
      response.status(503).json({ error: "Cloud progress could not be saved or loaded. Your browser copy is kept." });
    }
  };
}