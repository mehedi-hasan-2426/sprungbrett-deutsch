# Sprungbrett · Deutsch A1 → A2

A privacy-first web app for practising German from A1 to A2, with instant feedback.
It turns a 12-week course (placement test, weekly modules, checkpoints) into
interactive exercises. Everything runs in the browser: no accounts, no tracking,
no server-side data.

All instructions, explanations, hints and buttons are in **English**. The practice
material itself (sentences to complete, reading texts, dialogues, model texts,
useful phrases) stays in **German**.

> Self-assessment only. The checkpoints are not a certificate, and no study plan can
> guarantee a language level. The exercises are original, not official exam material.

## Features

- **Placement test** with automatic scoring and a recommendation.
- **12 weekly modules**: vocabulary, grammar explanations, grammar exercises,
  vocabulary retrieval, reading, listening, speaking, pronunciation, writing and a
  cumulative quiz. 570 exercises in total.
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
- **Listening** through the browser's speech synthesis (normal and slower). The script
  stays hidden until the questions are answered.
- **Speaking**: optional recording that stays in the tab, plus a self-rating rubric.
- **Writing**: word counter, checklist, model text unlocked after submitting, rubric.
- **Checkpoints** after weeks 4, 8 and 12 with the course's adjustment rules.
- **Short day** mode (15 minutes), study streak, JSON export and import.

## Run locally

Requires Node.js 22.12 or newer.

```sh
npm ci
npm run dev        # http://localhost:3000
npm run build      # static export to out/
```

## Checks

```sh
npm run lint
npm run typecheck        # also rebuilds and validates the course data
npm test                 # unit tests and content tests
npm run verify           # security checks
npm run verify:negative  # proves the security checks fail when broken
npm run build            # build plus CSP scan of the generated HTML
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
4. The same script replaces every German instruction with its English version from
   `src/content/en.ts` (keyed by a hash of the German text; `"="` keeps German practice
   material). The build fails if an instruction has no English entry. After changing the
   course, run `node --experimental-strip-types scripts/dump-strings.ts` to list all
   instruction strings with their keys.
5. `src/content/feedback-hints.ts` holds hints and one-line rules per exercise group;
   `src/content/overrides.ts` holds the few answers that cannot be derived mechanically.

## Security model

Static export, strict CSP (`default-src 'none'`, `script-src 'self'`, `style-src 'self'`,
no `unsafe-*`), no HTML injection, validated imports, three pinned runtime dependencies,
SHA-pinned CI actions, CodeQL and gitleaks. The project builds with `--webpack` because
Next.js 16's default Turbopack output contains an inline bootstrap script that a strict
CSP would block. See [SECURITY.md](SECURITY.md) and
[docs/threat-model.md](docs/threat-model.md).

## Deploy on Vercel

1. In Vercel, choose **Add New → Project** and import this GitHub repository.
2. Framework preset: **Next.js** (detected). Keep the defaults; the build command comes
   from `package.json` (`npm run build`). No environment variables are needed.
3. Deploy, then check the response headers of the deployed site (for example in the
   browser's network tab) and confirm the `Content-Security-Policy` from `vercel.json`
   is present and the browser console shows no CSP violations.

## Licence

Code: MIT ([LICENSE](LICENSE)). Course content: all rights reserved ([NOTICE](NOTICE)).
