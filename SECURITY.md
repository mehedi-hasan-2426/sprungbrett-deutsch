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

Sprungbrett is a statically exported Next.js site. It has no backend, no API routes,
no database, no user accounts, no cookies, no analytics and no third-party scripts.

- Learner progress, written texts and self-ratings stay in the browser's
  `localStorage`. They leave the device only when the learner exports a file.
- Imported progress files are size-capped and validated against a strict schema;
  unknown versions, malformed keys and oversized fields are rejected.
- Voice recordings exist only as in-memory `blob:` URLs in the open tab. They are
  never stored or uploaded. The microphone is requested only after a click.
- Course Markdown is converted to structured data at build time and rendered as
  React elements. No HTML from content or input is injected into the page.
- The deployed Content Security Policy is `default-src 'none'` with
  `script-src 'self'` and `style-src 'self'`, without `unsafe-inline` or
  `unsafe-eval`. The build fails if the generated HTML would need either.
- Runtime dependencies are limited to `next`, `react` and `react-dom`, pinned to
  exact versions with a committed lockfile.

## Verification

```sh
npm run verify            # static security checks
npm run verify:negative   # proves each check fails when its control is broken
npm run build             # also scans the generated HTML for CSP violations
```

CI runs these on every push and pull request, together with lint, type checking,
unit and content tests, `npm audit`, a gitleaks secret scan and CodeQL.
CodeQL SARIF results are checked explicitly; High and Critical findings fail CI.
The loopback preview serves only files registered from the static output directory,
never filesystem paths constructed from requests.
See [docs/threat-model.md](docs/threat-model.md) for the threat model.
