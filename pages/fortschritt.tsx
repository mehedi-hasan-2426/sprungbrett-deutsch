import { useRef, useState } from "react";
import type { ChangeEvent } from "react";
import type { GetStaticProps } from "next";
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
}

const COLUMNS: [string, string][] = [
  ["exercises", "Grammar"],
  ["retrieval", "Words"],
  ["reading", "Reading"],
  ["quiz", "Quiz"],
];

export default function ProgressPage({ weeks }: Props) {
  const { progress, replace } = useProgress();
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
    if (window.confirm("Really delete ALL progress in this browser? Export it first if you want to keep it.")) {
      replace(emptyProgress());
      setMessage("Progress deleted.");
    }
  };

  return (
    <Layout title="Progress">
      <h1>Progress</h1>
      <p className="muted">Percent = correct on the first try. Self-assessment, not a certificate.</p>
      <section className="card">
        <h2>Weeks</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th scope="col">Week</th>
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

      <section className="card">
        <h2>Back up and transfer</h2>
        <p>Your progress is stored only in this browser. Export it as a file to back it up or move it to another device.</p>
        <div className="row">
          <button type="button" onClick={exportJson}>Export</button>
          <button type="button" className="secondary" onClick={() => file.current?.click()}>Import</button>
          <input ref={file} type="file" accept="application/json,.json" className="sr-only" onChange={importJson} aria-label="Import a progress file" />
          <button type="button" className="danger" onClick={reset}>Delete everything</button>
        </div>
        {message ? <p role="status">{message}</p> : null}
      </section>
    </Layout>
  );
}

export const getStaticProps: GetStaticProps<Props> = () => ({ props: { weeks: weekSummaries(loadCourse()) } });
