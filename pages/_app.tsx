import type { AppProps } from "next/app";
import Link from "next/link";
import "../styles/app.css";
import { ProgressProvider } from "../src/state/ProgressContext.tsx";
import { SessionProvider, useSession } from "next-auth/react";
import { CourseNavigation } from "../src/components/Sidebar.tsx";
import type { CourseSession } from "../src/server/auth.ts";
import type { NavWeek } from "../src/lib/weeks.ts";

type PageProps = { session?: CourseSession | null; guest?: boolean; courseNav?: NavWeek[] };

function CourseApp({ Component, pageProps, router }: AppProps<PageProps>) {
  const { data, status } = useSession();
  const session = data as CourseSession | null;
  if (router.pathname === "/signin") return <Component {...pageProps} />;
  const accountKey = pageProps.guest ? "guest" : session?.accountKey;
  if (!accountKey || (!pageProps.guest && status !== "authenticated")) {
    return <main className="signin"><h1>Sprungbrett</h1><p>{status === "loading" ? "Checking your session..." : "Your session has ended."}</p><Link href="/signin">Sign in</Link></main>;
  }
  return (
    <CourseNavigation.Provider value={pageProps.courseNav ?? []}>
      <ProgressProvider key={accountKey} accountKey={accountKey} guest={pageProps.guest}>
        <Component {...pageProps} />
      </ProgressProvider>
    </CourseNavigation.Provider>
  );
}

export default function App(props: AppProps<PageProps>) {
  return <SessionProvider session={props.pageProps.session} refetchInterval={60} refetchOnWindowFocus><CourseApp {...props} /></SessionProvider>;
}
