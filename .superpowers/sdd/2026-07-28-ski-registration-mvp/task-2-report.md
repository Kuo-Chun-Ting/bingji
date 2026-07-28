# Task 2 Report

## Files

- Added `shared/types/domain.ts` with `Student`, `Course`, `Registration`, and status types.
- Added `server/domain/students.ts` with phone normalization and Google Sheet row parsing.
- Added `server/domain/lessons.ts` with remaining lesson calculation.
- Added `server/domain/registrations.ts` with registration creation and status transitions.
- Added `tests/unit/students.test.ts`, `tests/unit/lessons.test.ts`, and `tests/unit/registrations.test.ts`.

## RED/GREEN Evidence

- Student RED: `npm test -- tests/unit/students.test.ts` failed because `server/domain/students` was missing.
- Student GREEN: the focused student suite passed with 4 tests.
- Lessons RED: `npm test -- tests/unit/lessons.test.ts` failed because `server/domain/lessons` was missing.
- Lessons GREEN: `npm test -- tests/unit/lessons.test.ts tests/unit/students.test.ts` passed with 6 tests.
- Registrations RED: `npm test -- tests/unit/registrations.test.ts` failed because `server/domain/registrations` was missing.
- Registrations GREEN: `npm test -- tests/unit/students.test.ts tests/unit/lessons.test.ts tests/unit/registrations.test.ts` passed with 13 tests.

## Commands and Results

- `npm test`: passed, 4 test files and 14 tests.
- `npm run typecheck`: passed with exit code 0.
- `git diff --check`: passed with no whitespace errors.

## Commit

- `22f8565 feat: implement ski registration domain rules`

## Self-Review

- Domain functions are pure and fully typed; timestamps and registration identity are supplied or derived deterministically.
- Phone comparison uses normalized values; remaining lessons counts only matching `attended` registrations.
- Registration status changes are one-way from `registered` to `attended`, `absent`, or `cancelled`.
- Existing changes to `docs/superpowers/plans/2026-07-28-ski-registration-mvp.md` were preserved and excluded from the Task 2 commit.

## Review Fix Round 1

### Changes

- `parseStudentRows` now accepts only the exact four headers in the required order and rejects extra, reordered, duplicate, or missing headers.
- `createRegistration` now rejects empty normalized phones and non-Taiwanese mobile numbers that do not match `09` plus eight digits.
- `parseStudentRows` now rejects an empty `購買堂數` cell before numeric conversion.
- Authentication identity and teacher authorization remain outside pure domain functions; Task 3 must derive the student target phone from the signed session and enforce teacher authorization at API boundaries.

### RED/GREEN Evidence

- RED: `npm test -- tests/unit/students.test.ts tests/unit/registrations.test.ts` reported 7 expected failures and 10 passing tests for the new review regression cases.
- GREEN: the same focused command passed with 2 test files and 17 tests.

### Verification

- `npm test`: passed, 4 test files and 20 tests.
- `npm run typecheck`: passed with exit code 0.
- `git diff --check`: passed with no whitespace errors.

### Fix Commit

- `7e6839b fix: tighten ski registration domain validation`
