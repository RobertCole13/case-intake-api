# AC-3 Access Enforcement
Catalog: NIST SP 800-53 Rev 5, Release 5.2.0 (August 2025). Status: approved 2026-11-01 by security.

## Requirement, in developer terms
A request returns a record only if the caller is authorized for that specific record. Authentication is not authorization: being a valid examiner does not grant access to every case.

## Code pattern
Enforce at the data layer: scope the query by the caller (findFirst where id = :id and assignments some examinerId = :caller), so a new route cannot bypass it. Middleware may add defense in depth but is not sufficient alone. Apply to every route that reads or returns a case: detail, list, search, export, and any admin route without an explicit role check.

## Proof
For each route: a test where a non-assigned examiner receives 404 and no record fields; a test where an assigned examiner receives 200. Return 404, not 403, so the response does not confirm the record exists (SI-11). The denial is recorded as an access-denied audit event with examiner id, case id, route, and timestamp (AU-2 pairing); a test asserts the event.

## What a reviewer attacks
Enumeration through list and search; crafted or sequential IDs on detail and export; admin routes; cached responses; error messages that leak existence.

## Evidence an assessor expects
The diff and commit SHA; the CI test run with the deny tests; a retest procedure with a non-assigned account naming environment and build; an image of the denied request, captured by replaying it against the running build, with date, system, and build visible; the audit event for the denied attempt.
