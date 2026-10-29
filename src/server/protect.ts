import type { GetServerSideProps, GetServerSidePropsContext, GetServerSidePropsResult } from "next";
import { getServerSession } from "next-auth/next";
import { authConfigured, authOptions } from "./auth.ts";
import type { CourseSession } from "./auth.ts";
import { canAccess } from "../lib/access.ts";
import { loadCourse } from "./load.ts";
import { isGuest } from "../lib/guest.ts";

export function protect<Props extends object>(loader: (context: GetServerSidePropsContext) => GetServerSidePropsResult<Props> | Promise<GetServerSidePropsResult<Props>>): GetServerSideProps<Props> {
  return async (context) => {
    context.res.setHeader("Cache-Control", "private, no-store, max-age=0");
    context.res.setHeader("Vary", "Cookie");
    const session = authConfigured() ? await getServerSession(context.req, context.res, authOptions) as CourseSession | null : null;
    const authenticated = Boolean(session?.accountKey && canAccess(session.user?.email, true, process.env.ALLOWED_EMAILS));
    const guest = !authenticated && isGuest(context.req.cookies);
    if (!authenticated && !guest) {
      return { redirect: { destination: "/signin", permanent: false } };
    }
    const result = await loader(context);
    if (!("props" in result)) return result;
    const courseNav = loadCourse().weeks.map((unit, index) => ({ n: index + 1, title: unit.title, total: Object.keys(unit.items).length, sections: unit.sections.map(({ id, title, role }) => ({ id, title, role })) }));
    return { props: { ...await result.props, session: authenticated ? session : null, guest, courseNav } };
  };
}