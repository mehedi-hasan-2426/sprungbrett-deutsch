import Link from "next/link";
import { Layout } from "../src/components/Layout.tsx";

export default function Info() {
  return (
    <Layout title="Privacy and licences">
      <h1>Privacy and licences</h1>
      <section className="card">
        <h2>Privacy</h2>
        <ul>
          <li>No accounts, no cookies, no tracking, no ads, no analytics services.</li>
          <li>Your progress and your texts are stored only in this browser's local storage. They only leave your device if you export them yourself.</li>
          <li>Recordings stay only in the open tab and are never saved or uploaded.</li>
          <li>
            The read-aloud feature uses your device's or browser's voices. Some browsers use their vendor's online voices for this; only the exercise text is sent, never anything you
            type.
          </li>
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
