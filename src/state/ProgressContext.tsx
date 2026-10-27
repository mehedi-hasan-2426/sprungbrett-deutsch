import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { claimLegacyProgress, emptyProgress, markDay, parseImport, progressStorageKey, save, STORAGE_KEY, validateProgress } from "../lib/progress.ts";
import type { Progress } from "../lib/progress.ts";
import { dayKey } from "../lib/leitner.ts";
import { parseSnapshot, ProgressSync } from "../lib/progress-sync.ts";
import type { ProgressSnapshot, SyncStatus } from "../lib/progress-sync.ts";
import { createProgressTransport } from "../lib/progress-client.ts";

interface ProgressApi {
  progress: Progress;
  ready: boolean;
  saved: boolean;
  update: (fn: (p: Progress) => Progress) => void;
  replace: (p: Progress) => void;
  legacyAvailable: boolean;
  importLegacy: () => void;
  syncStatus: SyncStatus;
  conflict: ProgressSnapshot | null;
  cacheInvalid: boolean;
  recoveryAvailable: boolean;
  restoreRecovery: () => void;
  syncNow: () => Promise<boolean>;
  resolveSync: (side: "local" | "cloud") => Promise<boolean>;
}

const ProgressContext = createContext<ProgressApi | null>(null);

function storage(): Storage | undefined {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

export function ProgressProvider({ children, accountKey }: { children: ReactNode; accountKey: string }) {
  const key = progressStorageKey(accountKey);
  const [progress, setProgress] = useState<Progress>(emptyProgress);
  const [ready, setReady] = useState(false);
  const [saved, setSaved] = useState(true);
  const [legacyAvailable, setLegacyAvailable] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("loading");
  const [conflict, setConflict] = useState<ProgressSnapshot | null>(null);
  const [cacheInvalid, setCacheInvalid] = useState(false);
  const [recoveryAvailable, setRecoveryAvailable] = useState(false);
  const current = useRef(progress);
  const readable = useRef(true);
  const controller = useRef<ProgressSync | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let active = true;
    const abort = new AbortController();
    Promise.resolve().then(() => {
      if (!active) return;
      const localStorage = storage();
      let initial = emptyProgress();
      let base: ProgressSnapshot | null = null;
      try {
        const raw = localStorage?.getItem(key);
        if (raw) initial = parseImport(raw);
      } catch {
        readable.current = false;
        setCacheInvalid(true);
      }
      try {
        const raw = localStorage?.getItem(key + ".sync");
        if (raw && readable.current) base = parseSnapshot(JSON.parse(raw));
        setLegacyAvailable(Boolean(localStorage?.getItem(STORAGE_KEY)));
        setRecoveryAvailable(Boolean(localStorage?.getItem(key + ".recovery")));
      } catch {
        base = null;
      }
      current.current = initial;
      setProgress(initial);
      const sync = new ProgressSync({
        local: () => current.current,
        base,
        transport: createProgressTransport(abort.signal),
        adopt: (next) => {
          current.current = next;
          setProgress(next);
          setSaved(save(storage(), next, key));
        },
        acknowledge: (snapshot) => {
          try {
            storage()?.setItem(key + ".sync", JSON.stringify(snapshot));
          } catch {
            setSaved(false);
          }
        },
        status: (status, snapshot) => {
          setSyncStatus(status);
          setConflict(snapshot);
        },
      });
      controller.current = sync;
      setReady(true);
      if (readable.current) void sync.sync();
      else setSyncStatus("offline");
    });
    const refresh = () => {
      if (readable.current && document.visibilityState === "visible") void controller.current?.sync();
    };
    window.addEventListener("online", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      active = false;
      controller.current?.close();
      controller.current = null;
      abort.abort();
      if (timer.current) clearTimeout(timer.current);
      window.removeEventListener("online", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, [key]);

  const commit = useCallback((next: Progress, explicitReplacement = false) => {
    current.current = next;
    setProgress(next);
    if (explicitReplacement) {
      readable.current = true;
      setCacheInvalid(false);
    }
    if (!readable.current) return;
    setSaved(save(storage(), next, key));
    controller.current?.changed();
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => { void controller.current?.sync(); }, 1500);
  }, [key]);

  const update = useCallback((fn: (p: Progress) => Progress) => {
    commit(markDay(fn(current.current), dayKey(new Date())));
  }, [commit]);

  const replace = useCallback((next: Progress) => commit(validateProgress(next), true), [commit]);

  const syncNow = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    return readable.current ? controller.current?.sync() ?? Promise.resolve(false) : Promise.resolve(false);
  }, []);

  const resolveSync = useCallback(async (side: "local" | "cloud") => {
    if (!conflict) return false;
    const backup = side === "cloud" ? current.current : conflict.progress ?? emptyProgress();
    if (!save(storage(), backup, key + ".recovery")) throw new Error("Cannot preserve the other copy on this device. Export a backup and free browser storage before resolving.");
    setRecoveryAvailable(true);
    return controller.current?.resolve(side) ?? false;
  }, [conflict, key]);

  const restoreRecovery = useCallback(() => {
    const raw = storage()?.getItem(key + ".recovery");
    if (!raw) throw new Error("No recovery copy is available");
    replace(parseImport(raw));
  }, [key, replace]);

  const importLegacy = useCallback(() => {
    replace(claimLegacyProgress(storage(), accountKey));
    setLegacyAvailable(false);
  }, [accountKey, replace]);
  const value = useMemo(() => ({ progress, ready, saved, update, replace, legacyAvailable, importLegacy, syncStatus, conflict, cacheInvalid, recoveryAvailable, restoreRecovery, syncNow, resolveSync }), [progress, ready, saved, update, replace, legacyAvailable, importLegacy, syncStatus, conflict, cacheInvalid, recoveryAvailable, restoreRecovery, syncNow, resolveSync]);
  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>;
}

export function useProgress(): ProgressApi {
  const api = useContext(ProgressContext);
  if (!api) throw new Error("useProgress must be used inside ProgressProvider");
  return api;
}
