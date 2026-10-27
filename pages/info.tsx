import Link from "next/link";
import { Layout } from "../src/components/Layout.tsx";
import { protect } from "../src/server/protect.ts";

export default function Info() {
  return (
    <Layout title="Privacy and licences">
      <h1>Privacy and licences</h1>
      <section className="card">
        <h2>Privacy</h2>
        <ul>
          <li>Access is restricted to two approved Google accounts. Google handles sign-in; an encrypted, HTTP-only session cookie expires after at most eight hours. No ads or analytics are used.</li>
          <li>Your progress and your texts are stored only in this browser's local storage. They only leave your device if you export them yourself.</li>
          <li>Recordings stay only in the open tab and are never saved or uploaded.</li>
          <li>Listening is coming soon and is not scored. No audio is uploaded or played by a remote service.</li>
          <li>Progress is separated by account in local storage, not encrypted against other people using the same browser profile. Use separate browser profiles on shared devices.</li>
          <li>The hosting provider may process technical access data (e.g. IP address) to run the site.</li>
        </ul>
      </section>
      <section className="card">
        <h2>Important</h2>
        <p>
          The checkpoints are self-assessment. They don't replace an official exam. The exercises are our own and not official exam tasks. No plan can guarantee a
          language level.
        </p>
      </section>
      <section className="card">
        <h2>Licences</h2>
        <p>Code: MIT. Course content: all rights reserved by the author. Details are in the LICENSE and NOTICE files in the source code.</p>
        <p>
          <Link href="/">Back to Today</Link>
        </p>
      </section>
    </Layout>
  );
}

export const getServerSideProps = protect(() => ({ props: {} }));
