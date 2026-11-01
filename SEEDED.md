# Seeded conditions

This API is a test bed for remediation exercises. The five behaviors below are intentional. A null-check defect is not part of this seed; do not add one here.

## 1. Case reads do not check assignment

`GET /cases/:id`, `GET /cases`, and `GET /cases/:id/export` return cases with no lookup in `assignments`. Case 1042 is assigned only to examiner-a, and examiner-b can still read it.

`PATCH /cases/:id/status` and `GET /filings/:id` do check assignment. Code: `src/services/cases.ts` (`getById`, `list`, `exportCase`).

## 2. Status changes write no audit event

`PATCH /cases/:id/status` updates `cases.status` and does not insert into `audit_events`. `src/services/audit.ts` exposes `record`, and nothing in the status path calls it. Seeded rows in `audit_events` are historical only.

## 3. Filing list concatenates the status filter into SQL

`GET /filings` builds its query with `prisma.$queryRawUnsafe` and concatenates the `status` query parameter into the SQL string. Code: `src/services/filings.ts`.

## 4. Error handler returns stack traces

The global error handler sends `stack` on every error JSON body. Code: `src/middleware/errorHandler.ts`.

## 5. Workload report counts amended filings twice

`GET /reports/workload` adds one to an examiner's filing count for every filing on an assigned case, then adds one more when the filing status is `amended`. Code: `src/services/reports.ts`.
