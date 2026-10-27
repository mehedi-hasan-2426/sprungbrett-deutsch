import { parseSnapshot } from "./progress-sync.ts";
import type { SyncTransport } from "./progress-sync.ts";

export function createProgressTransport(parent: AbortSignal): SyncTransport {
  const request = async (body?: unknown) => {
    const controller = new AbortController();
    const abort = () => controller.abort();
    if (parent.aborted) controller.abort();
    parent.addEventListener("abort", abort, { once: true });
    const timeout = setTimeout(abort, 15_000);
    try {
      const response = await fetch("/api/progress", {
        method: body === undefined ? "GET" : "PUT",
        credentials: "same-origin",
        cache: "no-store",
        signal: controller.signal,
        ...(body === undefined ? {} : { headers: { "content-type": "application/json", "x-sprungbrett-sync": "1" }, body: JSON.stringify(body) }),
      });
      if (!response.ok && response.status !== 409) throw new Error("Cloud progress is unavailable");
      const value: unknown = await response.json();
      if (response.status === 409) {
        if (!value || typeof value !== "object" || !("snapshot" in value)) throw new Error("Invalid conflict response");
        return { saved: false, snapshot: parseSnapshot(value.snapshot) };
      }
      return { saved: true, snapshot: parseSnapshot(value) };
    } finally {
      clearTimeout(timeout);
      parent.removeEventListener("abort", abort);
    }
  };
  return {
    async read() { return (await request()).snapshot; },
    async write(revision, progress) { return request({ revision, progress }); },
  };
}