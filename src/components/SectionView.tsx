import type { Section, Unit } from "../lib/types.ts";
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
      {section.role === "writing"
        ? unit.writing.map((task) => <WritingTask key={task.id} task={task} criteria={rubric.criteria} max={rubric.max} checklist={rubric.checklist} />)
        : null}
    </>
  );
}
