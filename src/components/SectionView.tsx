import type { Section, Unit, WritingTask as WritingTaskData } from "../lib/types.ts";
import { Blocks } from "./Blocks.tsx";
import { ItemView } from "./ItemView.tsx";
import { ListeningSoon } from "./ListeningSoon.tsx";
import { Recorder } from "./Recorder.tsx";
import { Rubric, SPEAKING_CRITERIA } from "./Rubric.tsx";
import { WritingTask } from "./WritingTask.tsx";
import { useProgress } from "../state/ProgressContext.tsx";
import { useState } from "react";

export interface WritingRubric {
  criteria: string[];
  max: number;
  checklist: string[];
}

export function SectionView({ unit, section, rubric, idPrefix }: { unit: Unit; section: Section; rubric: WritingRubric; idPrefix?: string }) {
  const { progress, update } = useProgress();
  const [level, setLevel] = useState("all");
  const items = section.blocks.flatMap((block) => {
    const item = block.kind === "item" ? unit.items[block.itemId] : undefined;
    return item ? [item] : [];
  });
  const levels = ["all", "core", "easy", "medium", "hard"].filter((value) => value === "all" || items.some((item) => (item.difficulty ?? "core") === value));
  if (section.role === "listening") return <ListeningSoon />;
  return (
    <>
      {levels.length > 2 ? (
        <fieldset className="difficulty">
          <legend>Practice level</legend>
          {levels.map((value) => (
            <label key={value}>
              <input type="radio" name={`${unit.id}-${section.id}-level`} value={value} checked={level === value} onChange={() => setLevel(value)} />
              {value.charAt(0).toUpperCase() + value.slice(1)}
            </label>
          ))}
        </fieldset>
      ) : null}
      <div lang={section.role === "reading" || section.role === "writing" ? "de" : undefined}>
        <Blocks blocks={section.blocks} items={unit.items} renderItem={(item) => level === "all" || (item.difficulty ?? "core") === level ? <ItemView item={item} /> : null} idPrefix={idPrefix} />
      </div>
      {section.role === "speaking" ? (
        <>
          <Recorder />
          <Rubric
            title="Rate your own speaking task"
            criteria={SPEAKING_CRITERIA}
            max={3}
            value={progress.speaking[unit.id] ?? []}
            onChange={(v) => update((p) => ({ ...p, speaking: { ...p.speaking, [unit.id]: v } }))}
          />
          {unit.notes.speaking ? (
            <details>
              <summary>Suggested solutions</summary>
              <Blocks blocks={unit.notes.speaking} />
            </details>
          ) : null}
        </>
      ) : null}
      {section.role === "writing" && unit.writing.length ? <WritingTasks tasks={unit.writing} rubric={rubric} /> : null}
    </>
  );
}

function WritingTasks({ tasks, rubric }: { tasks: WritingTaskData[]; rubric: WritingRubric }) {
  const { progress } = useProgress();
  const [index, setIndex] = useState(0);
  const current = tasks[Math.min(index, tasks.length - 1)];
  if (!current) return null;
  return (
    <section className="writing-tasks" aria-label="Writing tasks">
      <nav className="task-picker" aria-label="Choose a writing task">
        {tasks.map((task, k) => {
          const done = progress.writing[task.id]?.submitted === true;
          return (
            <button key={task.id} type="button" className={k === index ? "option selected" : "option"} aria-current={k === index ? "step" : undefined} onClick={() => setIndex(k)}>
              {k + 1}{done ? " ✓" : ""}
              <span className="sr-only">{done ? " (submitted)" : ""}</span>
            </button>
          );
        })}
      </nav>
      <p className="muted">Task {index + 1} of {tasks.length}</p>
      <WritingTask key={current.id} task={current} criteria={rubric.criteria} max={rubric.max} checklist={rubric.checklist} />
      <div className="task-nav">
        <button type="button" className="secondary" disabled={index === 0} onClick={() => setIndex(index - 1)}>Previous task</button>
        <button type="button" className="secondary" disabled={index >= tasks.length - 1} onClick={() => setIndex(index + 1)}>Next task</button>
      </div>
    </section>
  );
}
