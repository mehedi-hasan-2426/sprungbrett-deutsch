import type { Unit } from "../lib/types.ts";
import { Blocks, InlineText } from "./Blocks.tsx";
import { ItemView } from "./ItemView.tsx";
import { ListeningPlayer } from "./ListeningPlayer.tsx";
import { Recorder } from "./Recorder.tsx";
import { Rubric, SPEAKING_CRITERIA } from "./Rubric.tsx";
import { WritingTask } from "./WritingTask.tsx";
import { useProgress } from "../state/ProgressContext.tsx";

export interface WritingRubric {
  criteria: string[];
  max: number;
  checklist: string[];
}

export function UnitView({ unit, rubric }: { unit: Unit; rubric: WritingRubric }) {
  const { progress, update } = useProgress();
  const itemIds = (sectionId: string) =>
    unit.sections.find((s) => s.id === sectionId)?.blocks.flatMap((b) => (b.kind === "item" ? [b.itemId] : [])) ?? [];

  return (
    <>
      <nav className="toc" aria-label="Sections">
        {unit.sections.map((s) => (
          <a key={s.id} href={`#${s.id}`}>
            {s.title.replace(/\s*\(.*\)$/, "")}
          </a>
        ))}
      </nav>
      <Blocks blocks={unit.intro} />
      {unit.sections.map((s) => (
        <section key={s.id} id={s.id} className={`card role-${s.role}`}>
          <h2>{s.title}</h2>
          {s.role === "listening" ? <ListeningPlayer parts={unit.script} itemIds={itemIds(s.id)} /> : null}
          <Blocks blocks={s.blocks} items={unit.items} renderItem={(item) => <ItemView item={item} />} />
          {s.role === "speaking" ? (
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
          {s.role === "writing"
            ? unit.writing.map((task) => <WritingTask key={task.id} task={task} criteria={rubric.criteria} max={rubric.max} checklist={rubric.checklist} />)
            : null}
        </section>
      ))}
      {unit.shortDay.length ? (
        <section className="card" id="kurztag">
          <h2>Short day (15 min)</h2>
          <p>
            <InlineText segs={unit.shortDay} />
          </p>
        </section>
      ) : null}
    </>
  );
}
