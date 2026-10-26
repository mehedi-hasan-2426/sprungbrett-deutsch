import type { GetStaticPaths, GetStaticProps } from "next";
import type { Doc } from "../../src/lib/types.ts";
import { Layout } from "../../src/components/Layout.tsx";
import { Blocks } from "../../src/components/Blocks.tsx";
import { loadCourse } from "../../src/server/load.ts";

export default function MaterialPage({ doc }: { doc: Doc }) {
  return (
    <Layout title={doc.title}>
      <h1>{doc.title}</h1>
      <article className="card doc">
        <Blocks blocks={doc.blocks} />
      </article>
    </Layout>
  );
}

export const getStaticPaths: GetStaticPaths = () => ({
  paths: loadCourse()
    .docs.filter((d) => d.slug !== "plan")
    .map((d) => ({ params: { slug: d.slug } })),
  fallback: false,
});

export const getStaticProps: GetStaticProps<{ doc: Doc }> = ({ params }) => {
  const doc = loadCourse().docs.find((d) => d.slug === params?.slug);
  return doc ? { props: { doc } } : { notFound: true };
};
