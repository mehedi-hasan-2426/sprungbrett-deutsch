import Link from "next/link";
import { Layout } from "../src/components/Layout.tsx";

export default function NotFound() {
  return (
    <Layout title="Not found">
      <h1>Page not found</h1>
      <p>
        <Link href="/">Back to Today</Link>
      </p>
    </Layout>
  );
}
