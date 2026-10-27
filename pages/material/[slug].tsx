import { protect } from "../../src/server/protect.ts";
import type { Doc } from "../../src/lib/types.ts";
import { Layout } from "../../src/components/Layout.tsx";
import { Blocks } from "../../src/components/Blocks.tsx";
import { loadCourse } from "../../src/server/load.ts";
import { GrammarCatalogue } from "../../src/components/GrammarCatalogue.tsx";
import type { GrammarSummary } from "../../src/components/GrammarCatalogue.tsx";

export default function MaterialPage({ doc, grammar }: { doc: Doc; grammar: GrammarSummary[] }) {
  return (
    <Layout title={doc.title}>
      <h1>{doc.title}</h1>
      <article className="doc">
        <Blocks blocks={doc.blocks} />
      </article>
      {doc.slug === "grammatik" ? <GrammarCatalogue topics={grammar} /> : null}
    </Layout>
  );
}

export const getServerSideProps = protect<{ doc: Doc; grammar: GrammarSummary[] }>(({ params }) => {
  const course = loadCourse();
  const doc = course.docs.find((d) => d.slug === params?.slug);
  const grammar = doc?.slug === "grammatik" ? (course.grammar ?? []).map(({ slug, title, group, level, summary, items }) => ({ slug, title, group, level, summary, ids: items.map((item) => item.id) })) : [];
  return doc ? { props: { doc, grammar } } : { notFound: true };
});
