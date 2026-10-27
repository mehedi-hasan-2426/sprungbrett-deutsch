import Link from "next/link";
import Head from "next/head";
import { useRouter } from "next/router";
import type { ReactNode } from "react";
import { useProgress } from "../state/ProgressContext.tsx";
import { Sidebar } from "./Sidebar.tsx";
import { signOut } from "next-auth/react";

const NAV = [
  { href: "/", label: "Today" },
  { href: "/plan", label: "Plan" },
  { href: "/karten", label: "Flashcards" },
  { href: "/artikel", label: "der/die/das" },
  { href: "/material/grammatik", label: "Grammar" },
  { href: "/fortschritt", label: "Progress" },
];

export function Layout({ children, title }: { children: ReactNode; title?: string }) {
  const { pathname } = useRouter();
  const { saved, ready } = useProgress();
  return (
    <>
      <Head>
        <title>{title ? `${title} · Sprungbrett` : "Sprungbrett · German A1 → A2"}</title>
      </Head>
      <a className="skip" href="#main">
        Skip to content
      </a>
      <header className="top">
        <Link href="/" className="brand">
          Sprungbrett <span className="brand-tag">A1 → A2</span>
        </Link>
        <nav aria-label="Main navigation">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} aria-current={pathname === n.href ? "page" : undefined}>
              {n.label}
            </Link>
          ))}
        </nav>
        <button type="button" className="link" onClick={() => signOut({ callbackUrl: "/signin" })}>Sign out</button>
      </header>
      {ready && !saved ? (
        <p className="feedback bad banner" role="alert">
          Your progress can't be saved in this browser (private mode or storage full). Export it on the Progress page.
        </p>
      ) : null}
      <div className="shell">
        <Sidebar />
        <main id="main">{children}</main>
      </div>
      <footer>
        <p>
          Progress stays in this browser, separated by Google account. No learning data is uploaded. <Link href="/info">Privacy and licences</Link>
        </p>
      </footer>
    </>
  );
}
