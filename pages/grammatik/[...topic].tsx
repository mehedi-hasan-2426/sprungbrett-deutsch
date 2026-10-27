import Link from "next/link";
import type { GrammarTopic } from "../../src/lib/types.ts";
import { Layout } from "../../src/components/Layout.tsx";
import { GrammarPractice } from "../../src/components/GrammarPractice.tsx";
import { protect } from "../../src/server/protect.ts";
import { loadCourse } from "../../src/server/load.ts";

interface Props {
  topic: GrammarTopic;
  previous: { slug: string; title: string } | null;
  next: { slug: string; title: string } | null;
}

export default function GrammarPage({ topic, previous, next }: Props) {
  return <Layout title={topic.title}>
    <nav className="crumbs" aria-label="Breadcrumb"><Link href="/material/grammatik">Grammar</Link> / <span>{topic.group}</span> / <span>{topic.title}</span></nav>
    <p className="eyebrow">{topic.level} · {topic.items.length} exercises</p>
    <h1>{topic.title}</h1>
    <p className="lede">{topic.summary}</p>
    {topic.level === "Extension" ? <p className="feedback neutral">Optional extension. This topic goes beyond the core A2 learning path and is not presented as an official A2 examination requirement.</p> : null}
    <section className="grammar-rule" aria-labelledby="rule-heading"><h2 id="rule-heading">Grammar in context</h2><p>{topic.rule}</p></section>
    <GrammarPractice key={topic.slug} topic={topic} />
    {topic.source ? <p><a href={topic.source} target="_blank" rel="noopener noreferrer">Further practice on StudyGerman</a></p> : null}
    <nav className="pager" aria-label="Grammar topics">
      {previous ? <Link href={`/grammatik/${previous.slug}`}>← {previous.title}</Link> : <Link href="/material/grammatik">← Grammar</Link>}
      {next ? <Link href={`/grammatik/${next.slug}`}>{next.title} →</Link> : <Link href="/material/grammatik">All grammar topics →</Link>}
    </nav>
  </Layout>;
}

export const getServerSideProps = protect<Props>(({ params }) => {
  const grammar = loadCourse().grammar ?? [];
  const parts = params?.topic;
  if (!Array.isArray(parts)) return { notFound: true };
  const index = grammar.findIndex((topic) => topic.slug === parts.join("/"));
  const topic = grammar[index];
  if (!topic) return { notFound: true };
  const neighbor = (offset: number) => {
    const entry = grammar[index + offset];
    return entry ? { slug: entry.slug, title: entry.title } : null;
  };
  return { props: { topic, previous: neighbor(-1), next: neighbor(1) } };
});