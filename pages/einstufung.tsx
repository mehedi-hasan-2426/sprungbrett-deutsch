import { protect } from "../src/server/protect.ts";
import type { Unit } from "../src/lib/types.ts";
import { Layout } from "../src/components/Layout.tsx";
import { UnitView } from "../src/components/UnitView.tsx";
import type { WritingRubric } from "../src/components/UnitView.tsx";
import { loadCourse } from "../src/server/load.ts";
import { useProgress } from "../src/state/ProgressContext.tsx";
import { SPEAKING_CRITERIA } from "../src/components/Rubric.tsx";

interface Props {
  unit: Unit;
  rubric: WritingRubric;
  parts: { teil: string; label: string; ids: string[]; points: number }[];
}

const MAX = 56;
const BANDS = [
  { min: 0.82, text: "A1 secure: review topic 1, then choose your next topic." },
  { min: 0.57, text: "A1 with gaps: follow the plan as it is. Watch the gaps on the Progress page." },
  { min: 0, text: "A1 not yet secure: revisit topics 1 and 2 until you feel comfortable. There is no deadline." },
];

export default function Placement({ unit, rubric, parts }: Props) {
  const { progress } = useProgress();
  const auto = parts.map((p) => {
    const correct = p.ids.reduce((sum, id) => {
      const r = progress.items[id];
      return sum + (r?.firstTry && (r.status === "solved") ? (id === "p-d3-10" ? 2 : 1) : 0);
    }, 0);
    const done = p.ids.every((id) => progress.items[id]?.status === "solved" || progress.items[id]?.status === "revealed");
    return { ...p, correct, done };
  });
  const writing = progress.writing[unit.writing[0]?.id ?? ""]?.score ?? [];
  const speaking = progress.speaking[unit.id] ?? [];
  const e = writing.length === 3 ? writing.reduce((a, b) => a + b, 0) : null;
  const f = speaking.length === SPEAKING_CRITERIA.length ? speaking.reduce((a, b) => a + b, 0) : null;
  const complete = auto.every((p) => p.done) && e !== null && f !== null;
  const total = auto.reduce((s, p) => s + p.correct, 0) + (e ?? 0) + (f ?? 0);
  const band = BANDS.find((b) => total >= b.min * MAX);

  return (
    <Layout title="Placement test">
      <h1>{unit.title}</h1>
      <UnitView unit={unit} rubric={rubric} />
      <section className="card" aria-live="polite">
        <h2>Your result</h2>
        <p className="muted">Only answers that were correct on the first try score a point. This is not an exam.</p>
        <ul>
          {auto.map((p) => (
            <li key={p.teil}>
              Part {p.teil} ({p.label}): {p.correct} / {p.points} {p.done ? "" : "– not finished yet"}
            </li>
          ))}
          <li>Part B (listening): coming soon, not scored</li>
          <li>Part E (writing): {e ?? "–"} / 12 {e === null ? "– submit your text and rate it" : ""}</li>
          <li>Part F (speaking): {f ?? "–"} / 9 {f === null ? "– self-rating missing" : ""}</li>
        </ul>
        <p>
          <strong>Total: {total} / {MAX}</strong>
        </p>
        {complete && band ? <p className="feedback neutral">{band.text}</p> : <p className="muted">The recommendation appears when all parts are finished.</p>}
      </section>
    </Layout>
  );
}

export const getServerSideProps = protect<Props>(() => {
  const course = loadCourse();
  const unit = course.placement;
  const labels: Record<string, [string, number]> = { A: ["reading", 5], C: ["vocabulary", 10], D: ["grammar", 20] };
  const parts = Object.entries(labels).map(([teil, [label, points]]) => ({
    teil,
    label,
    points,
    ids: Object.values(unit.items).filter((i) => i.id.startsWith(`p-${teil.toLowerCase()}`)).map((i) => i.id),
  }));
  return { props: { unit, rubric: { criteria: ["Content", "Grammar", "Vocabulary/format"], max: 4, checklist: course.rubric.checklist }, parts } };
});
