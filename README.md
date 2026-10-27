# Sprungbrett · Deutsch A1 → A2

A privacy-first web app for practising German from A1 to A2, with instant feedback.
It turns a self-paced course (placement test, everyday topics, checkpoints) into
interactive exercises. Course access requires one of exactly two approved Google
accounts. Learning progress syncs privately to Neon Postgres, separated by account,
with a local browser copy for interrupted connections. No analytics are used.

Navigation, explanations and hints are in **English**. Reading and writing tasks
and their instructions are in **German**. Every vocabulary entry has an English
meaning, forms, and an original German example with an English translation.

> Self-assessment only. The checkpoints are not a certificate, and no study plan can
> guarantee a language level. The exercises are original, not official exam material.

## Features

- **Placement test** with automatic scoring and a recommendation.
- **12 everyday topic modules**: vocabulary, grammar explanations, grammar exercises,
  vocabulary retrieval, reading, listening, speaking, pronunciation, writing and a
   cumulative quiz. 930 exercises in total, including 108 extra topic-practice items.
- **28 grammar topics** with 252 original exercises, explanations and Easy/Medium/Hard
  practice. Advanced passive forms are clearly marked as optional extensions.
- **366 vocabulary entries**, including 120 new entries: ten per topic.
- **Easy, Medium and Hard** extra practice: recognition, guided completion and
   open reading responses. Core checkpoint scores are unchanged; extra practice
   has its own progress table. Hard remains within everyday A2 contexts.
- **Instant feedback**: each answer is marked as soon as you press "Check"; a hint follows the
  first wrong answer, the solution and the rule follow the second. `ae/oe/ue/ss` are
  accepted for `ä/ö/ü/ß` with a spelling note; lowercase nouns are marked wrong.
- **Open completions** use explicit self-assessment with an example answer, not an
   exact-match grade. Submitted exercise answers remain visible after reloading;
   older progress files without saved answers still load and show the model answer.
- **Error categories** (verb position, case, gender, plural, verb form, preposition,
  vocabulary, pronunciation, spelling, listening) with practice suggestions once a
  category comes up three times in 30 days.
- **Flashcards** with Leitner boxes (1, 3, 7, 14, 30 days), at most 7 new cards a day
  and none when reviews would exceed 15 minutes.
- **der/die/das and plural drill.**
- **Listening** is a separate coming-soon area and is excluded from all scores.
- **Speaking**: optional recording that stays in the tab, plus a self-rating rubric.
- **Writing**: word counter, checklist, model text unlocked after submitting, rubric.
- **Checkpoints** after weeks 4, 8 and 12 with the course's adjustment rules.
- **Short day** mode (15 minutes), study streak, JSON export and import.
- **Account progress sync**: debounced automatic saves, offline local copies, an
   explicit device/cloud choice on conflicts, and a recoverable copy before replacement.

## Run locally

Requires Node.js 22.12 or newer.

```sh
npm ci
npm run build
npm start          # loopback production server; configure auth first
npm run dev        # http://localhost:3000
```

For local Google login, configure the variables below privately in `.env.local`.
Use `NEXTAUTH_URL=http://localhost:3000` with the development server and register
`http://localhost:3000/api/auth/callback/google` in a separate development OAuth
client. Never put secrets in source or chat. Missing configuration denies access.

## Checks

```sh
npm run lint
npm run typecheck        # also rebuilds and validates the course data
npm test                 # unit tests and content tests
npm run verify           # security checks
npm run verify:negative  # proves the security checks fail when broken
npm run build            # build plus CSP scan of the generated HTML
node scripts/test-server.mjs # production-route tests with synthetic sessions
```

## Content pipeline

1. The course is written as Markdown notes outside this repository.
2. `node scripts/sync-source.mjs <notes folder>` copies an **allowlist** of course files
   into `content/source/`. The learner profile and personal logs are never copied and
   the learner's name is replaced. Do not edit `content/source/` by hand.
3. `scripts/build-content.ts` parses the Markdown into typed data
   (`content/generated/course.json`, not committed). It fails the build if any exercise
   lacks an answer, answer numbering does not match, a week is missing a skill, or a
   writing task lacks a model text.
4. The same script translates interface/supporting instructions using
   `src/content/en.ts` (keyed by a hash of the German text; `"="` keeps German practice
   material). Reading/writing instructions and prompts remain German. The build
   fails if a required instruction has no English entry. After changing the
   course, run `node --experimental-strip-types scripts/dump-strings.ts` to list all
   instruction strings with their keys.
5. `src/content/feedback-hints.ts` holds hints and one-line rules per exercise group;
   `src/content/overrides.ts` holds the few answers that cannot be derived mechanically.
6. `src/content/vocabulary.ts` and `src/content/enrichment.ts` own bilingual glosses
   and original additions. These survive re-syncing the source notes. Original
   IDs are preserved and schema-v1 progress exports still import. New reading
   responses are self-assessed, not falsely exact-match graded.

The [learning references](docs/learning-sources.md) record sources used for the
initial enrichment. Additional practice links are available inside grammar topics.

## Security model

Server rendering with an authorization check on every course page and Next data
request; no static course export or publicly bundled lesson data. Google sign-in
requires verified email and an exact server-side two-address allowlist. Sessions
use encrypted HTTP-only cookies, PKCE/state/nonce checks and an eight-hour absolute
maximum. Strict CSP (`default-src 'none'`, `script-src 'self'`, `style-src 'self'`,
no `unsafe-*`), no HTML injection, validated imports, five pinned runtime dependencies,
SHA-pinned CI actions, CodeQL and gitleaks. The project builds with `--webpack` because
Next.js 16's default Turbopack output contains an inline bootstrap script that a strict
CSP would block. See [SECURITY.md](SECURITY.md) and
[docs/threat-model.md](docs/threat-model.md).

## Deploy on Vercel

1. In Vercel, choose **Add New → Project** and import this GitHub repository.
2. Framework preset: **Next.js**. Use `npm run build` and leave Output Directory
   override disabled; do not select `out` or deploy with the legacy static preview.
3. In Google Auth Platform, create a **Web application** OAuth client. For personal
   Gmail accounts choose an External audience, initially Testing, and add the two
   intended users. Register exactly
   `https://YOUR_DOMAIN/api/auth/callback/google`. Only `openid email` is requested;
   Gmail, Drive and Calendar permissions are unnecessary.
4. Set server-only environment variables in the intended Vercel environment:

   | Variable | Value |
   | --- | --- |
   | `NEXTAUTH_URL` | Canonical HTTPS site origin |
   | `NEXTAUTH_SECRET` | Privately generated random secret, at least 32 characters |
   | `GOOGLE_CLIENT_ID` | OAuth client ID |
   | `GOOGLE_CLIENT_SECRET` | OAuth client secret |
   | `ALLOWED_EMAILS` | Exactly two distinct comma-separated Google-account emails |
   | `DATABASE_URL` | Server-only Neon pooled connection string, Production only |

   Store both secrets using Vercel's Secret type. No variable uses `NEXT_PUBLIC_`.
   Environment changes apply to new deployments. Use a separate OAuth client and
   canonical callback URL for previews; otherwise previews intentionally deny access.
5. Deploy, then check the response headers of the deployed site (for example in the
   browser's network tab) and confirm the `Content-Security-Policy` from `vercel.json`
   is present and the browser console shows no CSP violations.
6. Verify anonymous lesson/data requests redirect to sign-in; sign in using both
   approved users, reject a third account, then check sign-out and progress export/
   import. Synthetic tests validate application policy but not Google's real consent
   flow. Do not claim that flow passed until it has actually been exercised.

Anonymous progress is not automatically assigned to any user. On Progress, explicit
confirmation can migrate the previous browser data to the signed-in account; the
old copy is removed only after saving. Export before replacing account progress.
Shared browser profiles can inspect local storage; use separate profiles when
privacy between people using the same machine matters. Login does not erase source
already published in this public repository or copies from earlier deployments.

## Progress Storage

Create a Neon **Free** database through Vercel Marketplace and connect only the
Production environment. Keep optional Neon Auth, Realtime and deployment branching
off. Existing Google authentication remains the identity boundary. Check the actual
Free plan before accepting it; no paid upgrade or add-on is needed for two users.

Apply the statements in `scripts/progress-schema.sql` using the database's query
editor. Vercel's prepared-statement editor requires running each statement
separately. The migration creates only `public.sprungbrett_progress`, revokes public
table grants, and enables row security. The managed database owner may bypass RLS;
per-user isolation is enforced by the authenticated server API, not by pretending
owner connections are subject to user-specific RLS policies.

`GET /api/progress` selects only the signed-in account. `PUT /api/progress` accepts
validated `{revision, progress}` with a same-origin request and custom request
header. Identity is never accepted from request data. SQL uses driver parameters;
an atomic revision comparison returns HTTP 409 instead of overwriting newer work.
Preview deployments cannot activate this storage adapter, even if credentials were
mistakenly configured. Keep production credentials out of Preview regardless.

The first device can seed an empty account record from its existing validated local
progress. A new device loads cloud progress. Concurrent, offline, or imported copies
that disagree with changed cloud data require a choice on Progress; the other copy
is retained under an account-specific recovery key before replacement. Sign-out
tries to flush queued changes and asks before leaving if sync has not finished.
The save indicator distinguishes cloud success from local-only availability.

Resets replace the current cloud record with an empty progress snapshot; they do not
erase exports, recovery files or provider historical backups. No recording is
uploaded. Learning text is protected in transit and by server access checks, not
end-to-end encrypted against the hosting/database operator. Keep independent exports
and monitor the provider's free quotas. If a quota or network failure blocks cloud
saves, local progress is kept and sync reports failure instead of claiming success.

After changing integration scope, previous deployments still retain old credentials.
Rotate the Neon resource secrets and redeploy Production to revoke such access.
Never expose or log connection values. Do not rotate unrelated Google/session secrets.

## Licence

Code: MIT ([LICENSE](LICENSE)). Course content: all rights reserved ([NOTICE](NOTICE)).
