import type { Unit } from "../lib/types.ts";
import { Blocks } from "./Blocks.tsx";
import { SectionView } from "./SectionView.tsx";
import type { WritingRubric } from "./SectionView.tsx";

export type { WritingRubric };

export function UnitView({ unit, rubric }: { unit: Unit; rubric: WritingRubric }) {
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
          <SectionView unit={unit} section={s} rubric={rubric} />
        </section>
      ))}
    </>
  );
}
