# 10 Validation Contract

## Purpose

Define a repository-native validation contract for PancakePainter that works reliably on Windows PowerShell and other supported shells.

## Current Validation Commands

1. Install dependencies:
  - `npm install`

2. Lint/check command:
  - `npm test`
  - Current script target: `jshint src menus --exclude src/libs,node_modules`

3. Optional smoke check when startup behavior changes:
  - `npm start`

## Lint Baseline Strategy

Issue reference: #5

Decision for current baseline:
- Use **strict-fix now** for currently reported JSHint findings in tracked source files.
- Keep lint rules unchanged unless there is a documented reason to adjust them.
- Avoid broad stylistic rewrites; apply minimal behavior-safe edits.

## Pass/Fail Expectations

Validation passes when:
- `npm test` exits with code 0.

Validation fails when:
- shell or glob handling prevents lint execution
- JSHint reports one or more errors

## Notes

- This repository currently carries legacy code and dependencies. Validation must remain practical and repository-native.
- If future lint debt appears and cannot be safely fixed in-scope, it must be tracked in an issue with explicit triage rationale.
