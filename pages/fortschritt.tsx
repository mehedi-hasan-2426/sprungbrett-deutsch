import { useRef, useState } from "react";
import type { ChangeEvent } from "react";
import Link from "next/link";
import { protect } from "../src/server/protect.ts";
import { Layout } from "../src/components/Layout.tsx";
import { loadCourse, weekSummaries } from "../src/server/load.ts";
import type { WeekSummary } from "../src/lib/weeks.ts";
import { emptyProgress, groupScore, parseImport, MAX_IMPORT_BYTES } from "../src/lib/progress.ts";
import { CATEGORIES } from "../src/lib/tags.ts";
import { dayKey } from "../src/lib/leitner.ts";
import type { Category } from "../src/lib/types.ts";
import { useProgress } from "../src/state/ProgressContext.tsx";

interface Props {
  weeks: WeekSummary[];
  grammar: { slug: string; title: string; level: string; ids: string[] }[];
}

const COLUMNS: [string, string][] = [
  ["exercises", "Grammar"],
  ["retrieval", "Words"],
  ["reading", "Reading"],
  ["quiz", "Quiz"],
];

export default function ProgressPage({ weeks, grammar }: Props) {
  const { guest, progress, replace, legacyAvailable, importLegacy, syncStatus, conflict, syncNow, resolveSync, recoveryAvailable, restoreRecovery } = useProgress();
  const [message, setMessage] = useState<string | null>(null);
  const file = useRef<HTMLInputElement>(null);

  const cell = (ids: string[] | undefined) => {
    const s = groupScore(progress, ids ?? []);
    if (!s.total) return "–";
    if (!s.done) return "·";
    return `${Math.round((s.correct / s.done) * 100)} % (${s.done}/${s.total})`;
  };

  const counts = new Map<Category, number>();
  for (const m of progress.mistakes) counts.set(m.tag, (counts.get(m.tag) ?? 0) + 1);

  const exportJson = () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(progress, null, 2)], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `sprungbrett-progress-${dayKey(new Date())}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importJson = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (f.size > MAX_IMPORT_BYTES) {
      setMessage("The file is too large.");
      return;
    }
    try {
      const next = parseImport(await f.text());
      if (window.confirm("Replace your current progress with this file?")) {
        replace(next);
        setMessage("Progress imported.");
      }
    } catch (err) {
      setMessage("Import rejected: " + (err instanceof Error ? err.message : "invalid file"));
    }
  };

  const reset = () => {
    if (window.confirm(guest ? "Reset guest progress in this browser only? Export a backup first. Account progress will not change." : "Reset this account's current progress and sync the empty copy to other devices? Existing exports and recovery backups are kept. Export a backup first.")) {
      replace(emptyProgress());
      setMessage("Progress deleted.");
    }
  };

  return (
    <Layout title="Progress">
      <h1>Progress</h1>
      <p className="muted">Percent = correct on the first try. Self-assessment, not a certificate.</p>
      {guest ? <section className="sync-panel"><h2>Browser-only save</h2><p>Guest progress is kept only in this browser. No answers are sent to the server. Export a backup before clearing browser data or switching devices.</p></section> : <section className="sync-panel" aria-labelledby="sync-heading">
        <h2 id="sync-heading">Account save</h2>
        <p role="status">{syncStatus === "saved" ? "Saved to your account." : syncStatus === "conflict" ? "Device and cloud progress differ. Choose a copy; the other is kept as a recovery backup on this device." : syncStatus === "offline" ? "Cloud sync is unavailable. Your device copy is kept; retry when online." : "Progress sync is in progress."}</p>
        {conflict ? (
          <>
            <p>This device: {Object.keys(progress.items).length} exercise records. Cloud: {Object.keys(conflict.progress?.items ?? {}).length} exercise records.</p>
            <div className="row">
              {(["local", "cloud"] as const).map((side) => <button key={side} type="button" className={side === "cloud" ? "secondary" : undefined} onClick={async () => {
                if (!window.confirm(side === "local" ? "Replace the shown cloud version with this device's progress? The cloud copy will be backed up here first." : "Replace this device's progress with the shown cloud version? Your device copy will be backed up here first.")) return;
                try {
                  const done = await resolveSync(side);
                  setMessage(done ? "Progress choice saved." : "Progress changed again or sync failed. Both copies are still kept; review the current status.");
                } catch (error) {
                  setMessage(error instanceof Error ? error.message : "Unable to resolve progress.");
                }
              }}>{side === "local" ? "Keep Device Copy" : "Use Cloud Copy"}</button>)}
            </div>
          </>
        ) : <button type="button" className="secondary" disabled={syncStatus === "loading" || syncStatus === "saving"} onClick={async () => setMessage(await syncNow() ? "Progress synced." : "Sync did not finish. Your device copy is kept.")}>Sync Now</button>}
        {recoveryAvailable ? <button type="button" className="secondary" onClick={() => {
          if (!window.confirm("Restore the saved conflict backup on this device? It will be synced and may need another conflict decision.")) return;
          try { restoreRecovery(); setMessage("Recovery copy restored on this device."); }
          catch (error) { setMessage(error instanceof Error ? error.message : "Recovery failed."); }
        }}>Restore Recovery Copy</button> : null}
      </section>}
      <section className="card">
        <h2>Everyday topics</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th scope="col">Topic</th>
                {COLUMNS.map(([, label]) => (
                  <th key={label} scope="col">{label}</th>
                ))}
                <th scope="col">Writing</th>
                <th scope="col">Speaking</th>
              </tr>
            </thead>
            <tbody>
              {weeks.map((w) => {
                const writing = w.writing.map((id) => progress.writing[id]?.score ?? []).flat();
                const speaking = progress.speaking[`w${w.n}`] ?? [];
                return (
                  <tr key={w.n}>
                    <th scope="row">{w.n}</th>
                    {COLUMNS.map(([role]) => (
                      <td key={role}>{cell(w.ids[role])}</td>
                    ))}
                    <td>{writing.length ? `${writing.reduce((a, b) => a + b, 0)}/${w.writing.length * 8}` : "·"}</td>
                    <td>{speaking.length ? `${speaking.reduce((a, b) => a + b, 0)}/9` : "·"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card">
        <h2>Mistakes by category</h2>
        {counts.size ? (
          <ul>
            {[...counts.entries()].sort((a, b) => b[1] - a[1]).map(([tag, n]) => (
              <li key={tag}>
                {tag} – {CATEGORIES[tag].label}: {n}
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">No mistakes saved yet.</p>
        )}
        <p className="muted">Mistakes are information: they show what to practise next.</p>
      </section>

      <section>
        <h2>Extra practice</h2>
        <p className="muted">Extra practice is tracked separately and does not change your core checkpoint scores.</p>
        <div className="table-wrap">
          <table>
            <thead><tr><th scope="col">Topic</th><th scope="col">Easy</th><th scope="col">Medium</th><th scope="col">Hard</th></tr></thead>
            <tbody>{weeks.map((week) => (
              <tr key={week.n}>
                <th scope="row">{week.n}</th>
                {["easy", "medium", "hard"].map((level) => {
                  const score = groupScore(progress, week.practice?.[level] ?? []);
                  return <td key={level}>{score.done}/{score.total}</td>;
                })}
              </tr>
            ))}</tbody>
          </table>
        </div>
      </section>

      <section className="card">
        <h2>Back up and transfer</h2>
        <p>{guest ? "Export guest progress for a backup or transfer it manually. Importing replaces only this browser's guest copy; it never uploads to an account." : "Progress syncs to your Google-account identity when available. Export a file for an independent backup; importing replaces this account's device copy and will sync after any conflict is resolved."}</p>
        {legacyAvailable ? (
          <button type="button" className="secondary" onClick={() => {
            if (!window.confirm("Assign the previous anonymous browser progress to this Google account and replace this account's current progress? Export current progress first. The anonymous copy will be removed only after saving.")) return;
            try {
              importLegacy();
              setMessage("Previous browser progress assigned to this account.");
            } catch (error) {
              setMessage(error instanceof Error ? error.message : "Previous progress could not be imported.");
            }
          }}>Import previous browser progress</button>
        ) : null}
        <div className="row">
          <button type="button" onClick={exportJson}>Export</button>
          <button type="button" className="secondary" onClick={() => file.current?.click()}>Import</button>
          <input ref={file} type="file" accept="application/json,.json" className="sr-only" onChange={importJson} aria-label="Import a progress file" />
          <button type="button" className="danger" onClick={reset}>Reset Progress</button>
        </div>
        {message ? <p role="status">{message}</p> : null}
      </section>
      <section>
        <h2>Grammar topics</h2>
        <div className="table-wrap"><table>
          <thead><tr><th scope="col">Topic</th><th scope="col">Level</th><th scope="col">Done</th><th scope="col">Correct first try</th></tr></thead>
          <tbody>{grammar.map((topic) => {
            const score = groupScore(progress, topic.ids);
            return <tr key={topic.slug}>
              <th scope="row"><Link href={`/grammatik/${topic.slug}`}>{topic.title}</Link></th>
              <td>{topic.level}</td><td>{score.done}/{score.total}</td><td>{score.correct}/{score.total}</td>
            </tr>;
          })}</tbody>
        </table></div>
      </section>
    </Layout>
  );
}

export const getServerSideProps = protect<Props>(() => {
  const course = loadCourse();
  const grammar = (course.grammar ?? []).map(({ slug, title, level, items }) => ({ slug, title, level, ids: items.map((item) => item.id) }));
  return { props: { weeks: weekSummaries(course), grammar } };
});
