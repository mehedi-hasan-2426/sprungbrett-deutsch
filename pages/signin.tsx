import Head from "next/head";
import type { GetServerSideProps } from "next";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { authConfigured } from "../src/server/auth.ts";

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
    </main>
  );
}

export const getServerSideProps: GetServerSideProps = ({ res, query }) => {
  res.setHeader("Cache-Control", "private, no-store, max-age=0");
  return Promise.resolve({ props: { configured: authConfigured(), denied: typeof query.error === "string" } });
};