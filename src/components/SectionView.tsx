import type { Section, Unit } from "../lib/types.ts";
import { Blocks } from "./Blocks.tsx";
import { ItemView } from "./ItemView.tsx";
import { ListeningSoon } from "./ListeningSoon.tsx";
import { Recorder } from "./Recorder.tsx";
import { Rubric, SPEAKING_CRITERIA } from "./Rubric.tsx";
import { WritingTask } from "./WritingTask.tsx";
import { useProgress } from "../state/ProgressContext.tsx";

export interface WritingRubric {
  criteria: string[];
  max: number;
  checklist: string[];
}

export function SectionView({ unit, section, rubric, idPrefix }: { unit: Unit; section: Section; rubric: WritingRubric; idPrefix?: string }) {
  const { progress, update } = useProgress();
  if (section.role === "listening") return <ListeningSoon />;
  return (
    <>
      <Blocks blocks={section.blocks} items={unit.items} renderItem={(item) => <ItemView item={item} />} idPrefix={idPrefix} />
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
