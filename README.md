# case-intake-api

Small case-intake API for a financial regulator's examination program. Examiners sign in with a bearer token, then read cases, filings, and a workload report.

This repository is a remediation test bed. Five intentional behaviors are catalogued in [SEEDED.md](SEEDED.md).

## Setup

Node 22. Copy the environment file, then install. `npm install` generates the Prisma client.

```bash
cp .env.example .env
npm install
```

`DATABASE_URL` points at a SQLite file (`prisma/dev.db`). That file is gitignored. `JWT_SECRET` is the HMAC secret for examiner tokens. The token's `sub` claim is the examiner id (`examiner-a` or `examiner-b`).

## Scripts

`npm test` is self-contained. Its pretest script runs `prisma db push --force-reset --skip-generate && ts-node prisma/seed.ts`, which deletes and recreates the SQLite file and loads the seed. The reset is what makes the suite repeatable: a status update in one run cannot leak into the next.

```bash
npm test
npm run lint
npm run dev
```

`npm run dev` listens on `PORT` (default 3000).

## Seed

| Id | Record | Assignment |
| --- | --- | --- |
| examiner-a | Examiner A | Cases 1042 and 1043 |
| examiner-b | Examiner B | Cases 1107 and 1108 |
| 1042 | Northwind Capital Periodic Exam, open | examiner-a only |
| 1043 | Harborline Broker-Dealer Review, open | examiner-a only |
| 1107 | Southbank Mutual Fund Sweep, in review | examiner-b only |
| 1108 | Northwind Affiliate Referral, closed | examiner-b only |

Case 1043 is the one the tests move to `in_review`, so case 1042 stays `open`. Filings 5001–5003 belong to 1042. Two historical `audit_events` rows exist; they are not status changes.

## Routes

All routes require `Authorization: Bearer <jwt>`.

| Method | Path | Behavior |
| --- | --- | --- |
| GET | `/cases/:id` | One case |
| GET | `/cases` | List cases. `status` filters by case status (`open`, `in_review`, `closed`). `title` searches the title |
| GET | `/cases/:id/export` | JSON case export with filings and `generatedAt` |
| PATCH | `/cases/:id/status` | Body `{ "status" }`. Assigned examiners only |
| GET | `/filings` | Filings on the caller's cases. Optional `status` filter (`draft`, `submitted`, `amended`, `closed`) |
| GET | `/filings/:id` | One filing, if the caller is assigned to its case |
| GET | `/reports/workload` | Filing counts per examiner |

Sign a local token with the same secret as `JWT_SECRET` and `sub` set to an examiner id. The test helper in `tests/helpers/token.ts` does this for the suite.
