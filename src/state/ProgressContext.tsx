import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { emptyProgress, load, markDay, save } from "../lib/progress.ts";
import type { Progress } from "../lib/progress.ts";
import { dayKey } from "../lib/leitner.ts";

interface ProgressApi {
  progress: Progress;
  ready: boolean;
  saved: boolean;
  update: (fn: (p: Progress) => Progress) => void;
  replace: (p: Progress) => void;
}

const ProgressContext = createContext<ProgressApi | null>(null);

function storage(): Storage | undefined {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

export function ProgressProvider({ children }: { children: ReactNode }) {
  const [progress, setProgress] = useState<Progress>(emptyProgress);
  const [ready, setReady] = useState(false);
  const [saved, setSaved] = useState(true);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage is only readable after hydration
    setProgress(load(storage()));
    setReady(true);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reflects the storage write result
    if (ready) setSaved(save(storage(), progress));
  }, [progress, ready]);

  const update = useCallback((fn: (p: Progress) => Progress) => {
    setProgress((prev) => markDay(fn(prev), dayKey(new Date())));
  }, []);

  const value = useMemo(() => ({ progress, ready, saved, update, replace: setProgress }), [progress, ready, saved, update]);
  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>;
}

export function useProgress(): ProgressApi {
  const api = useContext(ProgressContext);
  if (!api) throw new Error("useProgress must be used inside ProgressProvider");
  return api;
}
