import Link from "next/link";
import Head from "next/head";
import { useRouter } from "next/router";
import type { ReactNode } from "react";
import { useProgress } from "../state/ProgressContext.tsx";
import { Sidebar } from "./Sidebar.tsx";
import { signOut } from "next-auth/react";
import { useState } from "react";
import { AppearancePicker } from "./AppearancePicker.tsx";

const SYNC_LABEL = {
  loading: "Loading progress...", pending: "Save pending", saving: "Saving...",
  saved: "Saved to cloud", offline: "Cloud unavailable", conflict: "Progress conflict",
};

const NAV = [
  { href: "/", label: "Today" },
  { href: "/plan", label: "Topics" },
  { href: "/karten", label: "Flashcards" },
  { href: "/artikel", label: "der/die/das" },
  { href: "/material/grammatik", label: "Grammar" },
  { href: "/fortschritt", label: "Progress" },
];

export function Layout({ children, title }: { children: ReactNode; title?: string }) {
  const { pathname } = useRouter();
  const { saved, ready, syncStatus, syncNow, cacheInvalid } = useProgress();
  const [leaving, setLeaving] = useState(false);
  const [logoutError, setLogoutError] = useState(false);
  const leave = async () => {
    setLeaving(true);
    setLogoutError(false);
    try {
      const synced = await syncNow();
      if (!synced && !window.confirm("Cloud sync is not complete. Progress may still be only on this device. Sign out anyway?")) {
        setLeaving(false);
        return;
      }
      await signOut({ callbackUrl: "/signin" });
    } catch {
      setLogoutError(true);
      setLeaving(false);
    }
  };
  return (
    <>
      <Head>
        <title>{title ? `${title} · Sprungbrett` : "Sprungbrett · Deutsch lernen"}</title>
      </Head>
      <a className="skip" href="#main">
        Skip to content
      </a>
      <header className="top">
        <Link href="/" className="brand">
          Sprungbrett <span className="brand-tag">Deutsch</span>
        </Link>
        <nav aria-label="Main navigation">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} aria-current={pathname === n.href ? "page" : undefined}>
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="account-actions">
          <AppearancePicker />
          <Link className="save-state" href="/fortschritt" aria-live="polite">{SYNC_LABEL[syncStatus]}</Link>
          <button type="button" className="link" onClick={leave} disabled={leaving}>{leaving ? "Signing out..." : "Sign out"}</button>
        </div>
      </header>
      {logoutError ? <p className="feedback bad banner" role="alert">Sign-out failed. Please try again; your progress has not been deleted.</p> : null}
      {cacheInvalid ? <p className="feedback bad banner" role="alert">This device's saved progress could not be validated. Cloud sync is paused to protect it. Import a trusted backup on Progress, or recover the cloud copy from another browser.</p> : null}
      {syncStatus === "conflict" ? <p className="feedback hint banner" role="alert">Progress changed on another device. Both copies are kept. <Link href="/fortschritt">Choose which copy to continue.</Link></p> : null}
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
          Progress syncs privately to your account; this device keeps a local copy. <Link href="/info">Privacy and licences</Link>
        </p>
      </footer>
    </>
  );
}
