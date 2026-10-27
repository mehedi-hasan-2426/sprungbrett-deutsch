import Link from "next/link";
import { protect } from "../src/server/protect.ts";
import type { Doc } from "../src/lib/types.ts";
import { Layout } from "../src/components/Layout.tsx";
import { Blocks } from "../src/components/Blocks.tsx";
import { loadCourse } from "../src/server/load.ts";

const MATERIAL: [string, string][] = [
  ["/einstufung", "Placement test"],
  ["/material/grammatik", "Grammar overview"],
  ["/material/wortschatz", "Vocabulary and review (incl. Austrian words)"],
  ["/material/hoeren-lesen", "Listening and reading: free resources"],
  ["/material/sprechen", "Speaking and pronunciation"],
  ["/material/schreiben", "Writing: rubric and useful phrases"],
  ["/checkpoint/1", "Checkpoint 1"],
  ["/checkpoint/2", "Checkpoint 2"],
  ["/checkpoint/3", "Checkpoint 3"],
];

export default function Plan({ doc }: { doc: Doc }) {
  return (
    <Layout title="Study plan">
      <h1>{doc.title}</h1>
      <section className="card">
        <h2>Material</h2>
        <ul>
          {MATERIAL.map(([href, label]) => (
            <li key={href}>
              <Link href={href}>{label}</Link>
            </li>
          ))}
        </ul>
      </section>
      <article className="card doc">
        <Blocks blocks={doc.blocks} />
      </article>
    </Layout>
  );
}

export const getServerSideProps = protect<{ doc: Doc }>(() => {
  const doc = loadCourse().docs.find((d) => d.slug === "plan");
  return doc ? { props: { doc } } : { notFound: true };
});
