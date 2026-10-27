import { emptyProgress, MAX_IMPORT_BYTES, validateProgress } from "./progress.ts";
import type { Progress } from "./progress.ts";

export interface ProgressSnapshot {
  revision: number;
  progress: Progress | null;
}

export type SyncDecision = "adopt" | "upload" | "conflict";
export type SyncStatus = "loading" | "pending" | "saving" | "saved" | "offline" | "conflict";

export interface SyncTransport {
  read: () => Promise<ProgressSnapshot>;
  write: (revision: number, progress: Progress) => Promise<{ saved: boolean; snapshot: ProgressSnapshot }>;
}

interface SyncOptions {
  local: () => Progress;
  base: ProgressSnapshot | null;
  transport: SyncTransport;
  adopt: (progress: Progress) => void;
  acknowledge: (snapshot: ProgressSnapshot) => void;
  status: (status: SyncStatus, conflict: ProgressSnapshot | null) => void;
}

export class ProgressSync {
  private options: SyncOptions;
  private base: ProgressSnapshot | null;
  private conflict: ProgressSnapshot | null = null;
  private choice: { side: "local" | "cloud"; snapshot: ProgressSnapshot } | null = null;
  private running: Promise<boolean> | null = null;
  private queued = false;
  private closed = false;

  constructor(options: SyncOptions) {
    this.options = options;
    this.base = options.base;
  }

  close() {
    this.closed = true;
  }

  changed() {
    if (!this.closed && !this.conflict && !this.running) this.options.status("pending", null);
  }

  sync(): Promise<boolean> {
    if (this.closed || this.conflict) return Promise.resolve(false);
    this.queued = true;
    return this.start();
  }

  resolve(side: "local" | "cloud"): Promise<boolean> {
    if (this.closed || !this.conflict) return Promise.resolve(false);
    this.choice = { side, snapshot: this.conflict };
    this.conflict = null;
    this.queued = true;
    return this.start();
  }

  private start(): Promise<boolean> {
    this.running ??= this.drain().finally(() => { this.running = null; });
    return this.running;
  }

  private acknowledge(snapshot: ProgressSnapshot) {
    this.base = snapshot;
    this.options.acknowledge(snapshot);
  }

  private async drain(): Promise<boolean> {
    try {
      while (this.queued && !this.closed) {
        this.queued = false;
        const choice = this.choice;
        this.choice = null;
        this.options.status("loading", null);
        const cloud = choice?.snapshot ?? await this.options.transport.read();
        if (this.closed) return false;
        const local = this.options.local();
        const decision = choice ? (choice.side === "cloud" ? "adopt" : "upload") : syncDecision(local, this.base, cloud);
        if (decision === "conflict") {
          this.conflict = cloud;
          this.options.status("conflict", cloud);
          return false;
        }
        if (decision === "adopt") {
          const progress = cloud.progress ?? emptyProgress();
          if (!sameProgress(local, progress)) this.options.adopt(progress);
          this.acknowledge(cloud);
          this.options.status("saved", null);
          continue;
        }
        this.options.status("saving", null);
        const result = await this.options.transport.write(cloud.revision, local);
        if (this.closed) return false;
        if (!result.saved) {
          if (sameProgress(this.options.local(), result.snapshot.progress)) {
            this.acknowledge(result.snapshot);
            this.options.status("saved", null);
            continue;
          }
          this.conflict = result.snapshot;
          this.options.status("conflict", result.snapshot);
          return false;
        }
        this.acknowledge(result.snapshot);
        if (!sameProgress(this.options.local(), local)) this.queued = true;
        else this.options.status("saved", null);
      }
      return !this.closed;
    } catch {
      if (!this.closed) this.options.status("offline", null);
      return false;
    }
  }
}

export function parseSaveRequest(value: unknown): { revision: number; progress: Progress } {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid save request");
  const record = value as Record<string, unknown>;
  if (Object.keys(record).some((key) => key !== "revision" && key !== "progress")) throw new Error("Unexpected save fields");
  if (typeof record.revision !== "number" || !Number.isInteger(record.revision) || record.revision < 0 || record.revision >= 2_147_483_647) throw new Error("Invalid save revision");
  const parsed = parseSnapshot({ revision: 1, progress: record.progress });
  if (!parsed.progress) throw new Error("Missing progress");
  return { revision: record.revision, progress: parsed.progress };
}

export function parseSnapshot(value: unknown): ProgressSnapshot {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid cloud progress response");
  const record = value as Record<string, unknown>;
  if (!Number.isSafeInteger(record.revision) || typeof record.revision !== "number" || record.revision < 0) throw new Error("Invalid progress revision");
  if (record.revision === 0) {
    if (record.progress !== null) throw new Error("Unexpected progress without a revision");
    return { revision: 0, progress: null };
  }
  if (new TextEncoder().encode(JSON.stringify(record.progress)).byteLength > MAX_IMPORT_BYTES) throw new Error("Cloud progress is too large");
  return { revision: record.revision, progress: validateProgress(record.progress) };
}

function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).sort(([first], [second]) => first.localeCompare(second)).map(([key, entry]) => [key, canonical(entry)]));
  return value;
}

export function sameProgress(first: Progress | null, second: Progress | null): boolean {
  return JSON.stringify(canonical(first)) === JSON.stringify(canonical(second));
}

export function syncDecision(local: Progress, base: ProgressSnapshot | null, cloud: ProgressSnapshot): SyncDecision {
  if (!cloud.progress) return base?.progress ? "conflict" : "upload";
  if (sameProgress(local, cloud.progress)) return "adopt";
  if (base) {
    if (cloud.revision < base.revision) return "conflict";
    if (sameProgress(local, base.progress)) return "adopt";
    if (cloud.revision === base.revision && sameProgress(cloud.progress, base.progress)) return "upload";
    return "conflict";
  }
  return sameProgress(local, emptyProgress()) ? "adopt" : "conflict";
}