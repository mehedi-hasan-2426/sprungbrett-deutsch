import Link from "next/link";
import type { GetStaticPaths, GetStaticProps } from "next";
import type { Checkpoint, WritingTask as Task } from "../../src/lib/types.ts";
import { Layout } from "../../src/components/Layout.tsx";
import { InlineText } from "../../src/components/Blocks.tsx";
import { Recorder } from "../../src/components/Recorder.tsx";
import { Rubric, SPEAKING_CRITERIA } from "../../src/components/Rubric.tsx";
import { WritingTask } from "../../src/components/WritingTask.tsx";
import { loadCourse, weekSummaries } from "../../src/server/load.ts";
import type { WeekSummary } from "../../src/lib/weeks.ts";
import { groupScore } from "../../src/lib/progress.ts";
import { ADVICE_TEXT, advise, percent } from "../../src/lib/checkpoint.ts";
import { useProgress } from "../../src/state/ProgressContext.tsx";

interface Props {
  cp: Checkpoint;
  week: WeekSummary;
  tasks: Task[];
  speakingKey: string;
  criteria: string[];
  checklist: string[];
}

const AREAS = ["Review quiz", "Reading", "Writing", "Speaking"];

export default function CheckpointPage({ cp, week, tasks, speakingKey, criteria, checklist }: Props) {
  const { progress, update } = useProgress();
  const firstTry = (ids: string[]) => {
    const s = groupScore(progress, ids);
    return s.done < s.total ? null : percent(s.correct, s.total);
  };
  const writingScores = tasks.map((t) => progress.writing[t.id]?.score ?? []);
  const writing = writingScores.every((s) => s.length === criteria.length)
    ? percent(writingScores.flat().reduce((a, b) => a + b, 0), tasks.length * criteria.length * 2)
    : null;
  const speakingScore = progress.speaking[speakingKey] ?? [];
  const speaking = speakingScore.length === SPEAKING_CRITERIA.length ? percent(speakingScore.reduce((a, b) => a + b, 0), 9) : null;
  const areas = [firstTry(week.ids.quiz ?? []), firstTry(week.ids.reading ?? []), writing, speaking];
  const { advice, below } = advise(areas);
  const canDo = progress.canDo[`cp${cp.n}`] ?? [];

  return (
    <Layout title={`Checkpoint ${cp.n}`}>
      <h1>
        Checkpoint {cp.n} (end of week {cp.week})
      </h1>
      <p className="feedback neutral">
        <strong>Self-assessment, not a certificate.</strong> You only get an official A2 certificate by passing an official exam.
      </p>

      <section className="card">
        <h2>Part 1: Results from week {cp.week}</h2>
        <p className="muted">Only answers that were correct on the first try count. Finish any open areas in the week first.</p>
        <table>
          <tbody>
            {AREAS.map((a, k) => (
              <tr key={a}>
                <th scope="row">{a}</th>
                <td>{areas[k] === null ? "not done yet" : `${areas[k]} %`}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p>
          <Link href={`/woche/${cp.week}`}>Go to week {cp.week}</Link>
        </p>
      </section>

      <section className="card">
        <h2>Part 2: Writing</h2>
        {cp.writing ? null : <p className="muted">Checkpoint 3 uses the two writing tasks from week 12.</p>}
        {tasks.map((t) => (
          <WritingTask key={t.id} task={t} criteria={criteria} max={2} checklist={checklist} />
        ))}
      </section>

      <section className="card">
        <h2>Part 3: Speaking</h2>
        {cp.speaking ? (
          <p>
            <InlineText segs={cp.speaking} />
          </p>
        ) : (
          <p>Use your recording from week 12 (speaking parts 1–3) and compare it with your first recording.</p>
        )}
        <Recorder />
        <Rubric
          title="Rate your speaking"
          criteria={SPEAKING_CRITERIA}
          max={3}
          value={speakingScore}
          onChange={(v) => update((p) => ({ ...p, speaking: { ...p.speaking, [speakingKey]: v } }))}
        />
      </section>

      <section className="card">
        <h2>Part 4: I can …</h2>
        <p className="muted">1 = not yet · 2 = with help · 3 = confidently</p>
        {cp.canDo.map((c, k) => (
          <div key={c} className="rubric-row">
            <span>… {c}</span>
            <div className="options" role="radiogroup" aria-label={c}>
              {[1, 2, 3].map((n) => (
                <button
                  key={n}
                  type="button"
                  role="radio"
                  aria-checked={canDo[k] === n}
                  className={canDo[k] === n ? "option selected" : "option"}
                  onClick={() => update((p) => ({ ...p, canDo: { ...p.canDo, [`cp${cp.n}`]: cp.canDo.map((_, j) => (j === k ? n : canDo[j] ?? 0)) } }))}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        ))}
      </section>

      <section className="card" aria-live="polite">
        <h2>What now?</h2>
        <p className={advice === "incomplete" ? "muted" : "feedback neutral"}>{ADVICE_TEXT[advice]}</p>
        {below.length ? <p>Below 60 %: {below.map((k) => AREAS[k]).join(", ")}</p> : null}
        {canDo.some((v) => v === 1) ? <p>Statements rated "1": practise that situation as a role-play once next week.</p> : null}
        {cp.n === 3 && advice !== "incomplete" ? (
          <p>
            Next step: take the free official practice test under exam conditions (see <Link href="/material/hoeren-lesen">Listening and reading</Link>), then decide: exam or B1.
          </p>
        ) : null}
      </section>
    </Layout>
  );
}

export const getStaticPaths: GetStaticPaths = () => ({ paths: ["1", "2", "3"].map((n) => ({ params: { n } })), fallback: false });

export const getStaticProps: GetStaticProps<Props> = ({ params }) => {
  const course = loadCourse();
  const cp = course.checkpoints.find((c) => c.n === Number(params?.n));
  const week = cp ? weekSummaries(course)[cp.week - 1] : undefined;
  if (!cp || !week) return { notFound: true };
  const tasks = cp.writing ? [cp.writing] : course.weeks[cp.week - 1]?.writing ?? [];
  return {
    props: { cp, week, tasks, speakingKey: cp.speaking ? `cp${cp.n}` : `w${cp.week}`, criteria: course.rubric.writing, checklist: course.rubric.checklist },
  };
};
