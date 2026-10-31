import Head from "next/head";
import type { GetServerSideProps } from "next";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { getServerSession } from "next-auth/next";
import { authConfigured, authOptions } from "../src/server/auth.ts";
import type { CourseSession } from "../src/server/auth.ts";
import { canAccess } from "../src/lib/access.ts";
import { Logo } from "../src/components/Logo.tsx";
import { Particles } from "../src/components/Particles.tsx";

export default function SignIn({ configured, denied }: { configured: boolean; denied: boolean }) {
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);
  const [guestPending, setGuestPending] = useState(false);
  const [guestFailed, setGuestFailed] = useState(false);
  const login = async () => {
    setPending(true);
    setFailed(false);
    try {
      await signIn("google", { callbackUrl: "/" });
    } catch {
      setFailed(true);
      setPending(false);
    }
  };
  const enterGuest = async () => {
    setGuestPending(true);
    setGuestFailed(false);
    try {
      const response = await fetch("/api/guest", { method: "POST", headers: { "x-sprungbrett-guest": "1" } });
      if (!response.ok) throw new Error("Guest access unavailable");
      window.location.assign("/");
    } catch {
      setGuestFailed(true);
      setGuestPending(false);
    }
  };
  return (
    <main className="signin-screen">
      <Head><title>Sign in · Sprungbrett</title><meta name="robots" content="noindex" /></Head>
      <div className="signin-content">
        <p className="signin-brand"><Logo /></p>
        <div className="signin-hero">
          <Particles />
          <h1 className="accent-heading">Deutsch lernen.<br />Schritt für Schritt.</h1>
        </div>
        <p className="signin-intro">Sign in to save your progress, or start learning as a guest.</p>
        {!configured ? <p role="status">Google sign-in is unavailable. You can still continue as a guest.</p> : null}
        {denied ? <p role="alert">Sign-in failed or this account is not approved. Try an approved Google account or continue as a guest.</p> : null}
        {failed ? <p role="alert">Sign-in could not start. Please try again.</p> : null}
        {guestFailed ? <p role="alert">Guest access could not start. Please try again.</p> : null}
        <div className="signin-actions">
          <button type="button" disabled={!configured || pending || guestPending} onClick={login}>{pending ? "Opening Google..." : "Continue with Google"}</button>
          <button type="button" className="secondary" disabled={guestPending} onClick={enterGuest}>{guestPending ? "Opening lessons..." : "Continue as guest"}</button>
        </div>
        <p className="signin-note">No account needed to try it. Guest progress stays only in this browser.</p>
      </div>
    </main>
  );
}

export const getServerSideProps: GetServerSideProps = async ({ req, res, query }) => {
  res.setHeader("Cache-Control", "private, no-store, max-age=0");
  res.setHeader("Vary", "Cookie");
  const configured = authConfigured();
  const session = configured ? await getServerSession(req, res, authOptions) as CourseSession | null : null;
  if (session?.accountKey && canAccess(session.user?.email, true, process.env.ALLOWED_EMAILS)) {
    return { redirect: { destination: "/", permanent: false } };
  }
  return { props: { configured, denied: typeof query.error === "string" } };
};