import Link from "next/link";
import Head from "next/head";
import { useRouter } from "next/router";
import type { ReactNode } from "react";
import { useProgress } from "../state/ProgressContext.tsx";
import { Sidebar } from "./Sidebar.tsx";
import { signOut } from "next-auth/react";
import { useState } from "react";
import { AppearancePicker } from "./AppearancePicker.tsx";
import { RoleIcon } from "./RoleIcon.tsx";
import type { SyncStatus } from "../lib/progress-sync.ts";

const NAV = [
  { href: "/", label: "Today", icon: "today" },
  { href: "/plan", label: "Topics", icon: "path" },
  { href: "/karten", label: "Flashcards", icon: "cards" },
  { href: "/artikel", label: "der/die/das", icon: "article" },
  { href: "/material/grammatik", label: "Grammar", icon: "grammar" },
  { href: "/fortschritt", label: "Progress", icon: "progress" },
];

function SyncIndicator({ status, retry }: { status: SyncStatus; retry: () => void }) {
  if (status === "offline") {
    return (
      <div className="sync-status is-warn" role="status">
        <RoleIcon role="cloud-alert" className="sync-icon" />
        <span>Couldn&rsquo;t sync</span>
        <button type="button" className="sync-retry" onClick={retry}>Retry</button>
      </div>
    );
  }
  if (status === "conflict") {
    return (
      <div className="sync-status is-warn" role="status">
        <RoleIcon role="cloud-alert" className="sync-icon" />
        <Link href="/fortschritt">Resolve sync conflict</Link>
      </div>
    );
  }
  const [icon, label] = status === "saved" ? ["cloud-check", "Saved to cloud"] : status === "loading" ? ["cloud", "Loading progress…"] : ["cloud-upload", "Saving…"];
  return (
    <div className="sync-status" role="status">
      <RoleIcon role={icon} className="sync-icon" />
      <span>{label}</span>
    </div>
  );
}

export function Layout({ children, title }: { children: ReactNode; title?: string }) {
  const { pathname } = useRouter();
  const { guest, saved, ready, syncStatus, syncNow, cacheInvalid } = useProgress();
  const [leaving, setLeaving] = useState(false);
  const [logoutError, setLogoutError] = useState(false);
  const leave = async () => {
    setLeaving(true);
    setLogoutError(false);
    try {
      if (guest) {
        const response = await fetch("/api/guest", { method: "DELETE", headers: { "x-sprungbrett-guest": "1" } });
        if (!response.ok) throw new Error("Could not leave guest mode");
        window.location.assign("/signin");
        return;
      }
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
              <RoleIcon role={n.icon} className="nav-icon" />
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="account-actions">
          <AppearancePicker />
          {guest ? <div className="sync-status" role="status">Guest: this browser only</div> : <SyncIndicator status={syncStatus} retry={() => { syncNow().catch(() => undefined); }} />}
          {guest ? <Link className="button secondary sign-out" href="/signin">Sign in</Link> : null}
          <button type="button" className="sign-out" onClick={leave} disabled={leaving}>
            <RoleIcon role="log-out" className="sync-icon" />
            {leaving ? "Leaving..." : guest ? "Leave guest" : "Sign out"}
          </button>
        </div>
      </header>
      {guest ? <p className="feedback hint banner">Guest mode: progress stays only in this browser and is not sent to the server. It is not linked to an account.</p> : null}
      {logoutError ? <p className="feedback bad banner" role="alert">Could not leave. Please try again; your progress has not been deleted.</p> : null}
      {cacheInvalid ? <p className="feedback bad banner" role="alert">{guest ? "This browser's guest progress could not be validated. Import a trusted backup on Progress to recover it." : "This device's saved progress could not be validated. Cloud sync is paused to protect it. Import a trusted backup on Progress, or recover the cloud copy from another browser."}</p> : null}
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
          {guest ? "Guest progress stays only in this browser. Clearing browser data removes it; export a backup to keep it." : "Progress syncs privately to your account; this device keeps a local copy."} <Link href="/info">Privacy and licences</Link>
        </p>
      </footer>
    </>
  );
}
