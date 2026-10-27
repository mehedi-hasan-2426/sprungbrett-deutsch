import type { WritingTask as Task } from "../lib/types.ts";
import { InlineText } from "./Blocks.tsx";
import { Rubric } from "./Rubric.tsx";
import { useProgress } from "../state/ProgressContext.tsx";

const MAX = 5000;

export function wordCount(text: string): number {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

export function WritingTask({ task, criteria, max, checklist }: { task: Task; criteria: string[]; max: number; checklist: string[] }) {
  const { progress, update } = useProgress();
  const saved = progress.writing[task.id];
  const text = saved?.text ?? "";
  const submitted = Boolean(saved) && saved?.submitted !== false;
  const words = wordCount(text);
  const inRange = words >= task.min && words <= task.max + 10;

  const submit = () => {
    update((p) => ({ ...p, writing: { ...p.writing, [task.id]: { text: text.slice(0, MAX), score: p.writing[task.id]?.score ?? [], at: Date.now(), submitted: true } } }));
  };

  const saveDraft = (value: string) => update((p) => ({ ...p, writing: { ...p.writing, [task.id]: { text: value.slice(0, MAX), score: [], at: Date.now(), submitted: false } } }));

  return (
    <div className="writing">
      <p className="task">
        <InlineText segs={task.prompt} />
      </p>
      <label htmlFor={task.id}>Your text (in German)</label>
      <textarea id={task.id} lang="de" rows={8} maxLength={MAX} value={text} readOnly={submitted} onChange={(e) => saveDraft(e.target.value)} />
      <p className={inRange ? "muted" : "muted warn"}>
        {words} words (target: {task.min}–{task.max})
      </p>
      {!submitted ? (
        <>
          <details>
            <summary>Checklist before submitting</summary>
            <ul className="checks">
              {checklist.map((c) => (
                <li key={c}>
                  <label>
                    <input type="checkbox" /> <InlineText segs={[{ t: c.replace(/\*/g, "") }]} />
                  </label>
                </li>
              ))}
            </ul>
          </details>
          <button type="button" onClick={submit} disabled={words === 0}>
            Submit and see the model text
          </button>
        </>
      ) : (
        <>
          <div className="model">
            <h4>Model text (don't copy it, just compare)</h4>
            <p className="pre" lang="de">{task.model}</p>
          </div>
          <Rubric
            title="Rate yourself"
            criteria={criteria}
            max={max}
            value={saved?.score ?? []}
            onChange={(score) => update((p) => {
              const prev = p.writing[task.id];
              return prev ? { ...p, writing: { ...p.writing, [task.id]: { ...prev, score } } } : p;
            })}
          />
          <button type="button" className="link" onClick={() => saveDraft(text)}>
            Write version 2 (improve it)
          </button>
        </>
      )}
    </div>
  );
}
