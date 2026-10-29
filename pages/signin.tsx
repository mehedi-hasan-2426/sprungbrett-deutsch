import Head from "next/head";
import type { GetServerSideProps } from "next";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { getServerSession } from "next-auth/next";
import { authConfigured, authOptions } from "../src/server/auth.ts";
import type { CourseSession } from "../src/server/auth.ts";
import { canAccess } from "../src/lib/access.ts";
import { AppearancePicker } from "../src/components/AppearancePicker.tsx";

export default function SignIn({ configured, denied }: { configured: boolean; denied: boolean }) {
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);
  const login = async () => {
    setPending(true);
    try {
      await signIn("google", { callbackUrl: "/" });
    } catch {
      setFailed(true);
      setPending(false);
    }
  };
  return (
    <main className="signin">
      <Head><title>Sign in · Sprungbrett</title><meta name="robots" content="noindex" /></Head>
      <p className="eyebrow">Deutsch A1 → A2</p>
      <h1>Sprungbrett</h1>
      <p>Sign in with one of the two approved Google accounts.</p>
      {!configured ? <p role="status">Sign-in setup is incomplete. Course access is closed until the owner configures it.</p> : null}
      {denied ? <p role="alert">Access denied or sign-in failed. Only the two approved, verified Google accounts can enter.</p> : null}
      {failed ? <p role="alert">Sign-in could not start. Please try again.</p> : null}
      <button type="button" disabled={!configured || pending} onClick={login}>{pending ? "Opening Google..." : "Continue with Google"}</button>
      <AppearancePicker />
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