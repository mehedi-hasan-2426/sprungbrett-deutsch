# Security Policy

## Reporting a vulnerability

Report suspected vulnerabilities through GitHub's private vulnerability reporting
(Security tab, "Report a vulnerability") rather than a public issue. Include
reproduction steps, the affected file or URL, and the impact you believe it has.

Expect an acknowledgement within 5 working days. Fixes are released as a new commit
to `main`; the hosted site picks them up on the next deployment.

## Scope

In scope:

- the application in `pages/`, `src/` and `styles/`
- the content pipeline in `scripts/` and the course files in `content/source/`
- deployment configuration in `vercel.json` and CI in `.github/`

Out of scope:

- language-teaching accuracy of the course, which is a content issue
- the browser's own speech synthesis voices and microphone implementation
- findings that require a compromised browser, extension or operating system

## Security properties

Sprungbrett uses Next.js request-time rendering and NextAuth's Google provider.
There is no progress database, no analytics and no third-party browser scripts.
Google handles sign-in; the application checks verified email against exactly two
configured addresses on sign-in and on every protected page/data request. Missing
or invalid configuration denies access. Course responses are private and no-store.

- Learner progress, written texts and self-ratings stay in the browser's
  `localStorage`, namespaced by a hash of the provider subject. They leave the
  device only when the learner exports a file. Legacy progress requires explicit
  migration confirmation and is kept if the new save fails.
- Imported progress files are size-capped and validated against a strict schema;
  unknown versions, malformed keys and oversized fields are rejected.
- Voice recordings exist only as in-memory `blob:` URLs in the open tab. They are
  never stored or uploaded. The microphone is requested only after a click.
- Course Markdown is converted to structured data at build time and rendered as
  React elements. No HTML from content or input is injected into the page.
- The deployed Content Security Policy is `default-src 'none'` with
  `script-src 'self'` and `style-src 'self'`, without `unsafe-inline` or
  `unsafe-eval`. The build fails if the generated HTML would need either.
- Runtime dependencies are limited to `next`, `next-auth`, `react` and `react-dom`, pinned to
  exact versions with a committed lockfile.
- Authentication uses encrypted HTTP-only session cookies, secure on production
  HTTPS, with an absolute eight-hour maximum. Provider access tokens and secrets
  are not returned to the browser. OAuth uses PKCE, state and nonce; authentication
  POST operations retain the library's CSRF protection.
- Build checks reject prerendered course pages and lesson examples in public
  browser bundles. No generated course download is exposed. Previously public
  repository history and old deployments are not made confidential by this change.

## Verification

```sh
npm run verify            # static security checks
npm run verify:negative   # proves each check fails when its control is broken
npm run build             # also scans the generated HTML for CSP violations
node scripts/test-server.mjs # server authorization tests, synthetic identities only
```

CI runs these on every push and pull request, together with lint, type checking,
unit and content tests, `npm audit`, a gitleaks secret scan and CodeQL.
CodeQL SARIF results are checked explicitly; High and Critical findings fail CI.
Use Next's loopback production server for current deployments. The legacy static
preview utility remains tested for historical exports, but must not be used to
serve authenticated course deployments. Actual Google consent and account access
must also be verified against the configured environment; synthetic sessions alone
do not prove OAuth credentials or Google project settings are correct.
See [docs/threat-model.md](docs/threat-model.md) for the threat model.
