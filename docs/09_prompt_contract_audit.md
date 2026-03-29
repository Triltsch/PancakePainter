# 09 Prompt Contract Audit

## Scope

This audit fulfills Issue #1:

- identify mismatches between prompt assumptions and repository reality
- document required prompt changes
- define which assumptions are removed, replaced, or deferred

Repository target: Triltsch/PancakePainter
Date: 2026-03-28

## Executive Summary

The pancake workflow had high-risk non-repository-native assumptions inherited from another stack (Docker, Redis, PostgreSQL, pytest, and Test: Verified task). Those assumptions are now removed from the core implementation and review workflow and replaced with repository-native validation guidance.

LEARNINGS.md remains mandatory by policy and has been bootstrapped in the repository root so all agents can read and update shared implementation learnings.

## Baseline Repository Reality

Observed in the repository:

- Validation currently available via npm scripts, especially npm test (jshint-based checks).
- No .vscode/tasks.json in workspace at this time.
- No Docker Compose-based app/test infrastructure in this repository.
- LEARNINGS.md did not exist previously.

## Mismatch Matrix

| ID | Assumption Found in Workflow Files | Evidence in Repo | Severity | Decision | Action Taken |
|---|---|---|---|---|---|
| A-01 | Mandatory Test: Verified task | .vscode/tasks.json is absent | High | Replace | Replaced with repository-native validation order (Checks task if present, npm test, optional npm start smoke). |
| A-02 | Mandatory Docker/Redis/PostgreSQL/pytest validation | No matching infrastructure in this repository | High | Remove | Removed from implementation/review prompt contracts. |
| A-03 | LEARNINGS.md required but missing in repository | File not present before this audit | Medium | Keep and enforce | Added LEARNINGS.md and added bootstrap rule: create if missing before appending. |
| A-04 | MCP function names in review workflow did not match current MCP API naming | Current environment uses mcp_github_pull_request_read with methods | High | Replace | Updated review prompt and review agent to use mcp_github_pull_request_read methods. |
| A-05 | Validation reporting in orchestrator hardcoded to Checks and Test: Verified | Test: Verified is not repository-native here | Medium | Replace | Updated orchestrator reporting to refer to actual commands/tasks executed. |
| A-06 | npm test relied on shell glob expansion and failed in PowerShell | Validation failed before linting because the script was not cross-platform | Medium | Replace | Updated package.json to use directory-based JSHint arguments instead of shell-expanded globs. |

## Remediation Implemented in This Issue

### 1) LEARNINGS mandatory baseline

- Added LEARNINGS.md in repository root.
- Added mandatory bootstrap behavior to workflow prompts and agents.

### 2) Repository-native validation contract in core workflow files

Updated files:

- .github/prompts/01_pancake_implement.prompt.md
- .github/prompts/03_pancake_review.prompt.md
- .github/prompts/00_pancake_orchestrate.prompt.md
- .github/agents/pancake-orchestrator.agent.md

Implemented contract behavior:

- Prefer VS Code task Checks if present.
- Run npm test from repository root.
- Run `npm run smoke` as the smoke check if startup behavior changed (delegates to `scripts/smoke-test.ps1`).
- Report missing tasks explicitly instead of assuming they exist.
- Make npm test cross-platform so it works in the repository's primary PowerShell environment.

### 3) MCP PR review API contract correction

Updated files:

- .github/prompts/03_pancake_review.prompt.md
- .github/agents/mcp-pr-review.agent.md

Implemented behavior:

- Use mcp_github_pull_request_read with methods:
  - get
  - get_reviews
  - get_review_comments
  - get_comments

## Deferred Items

These are intentionally deferred for follow-up issues:

- Introduce an explicit .vscode/tasks.json with stable task names (for example Checks and Smoke) to reduce prompt variability.
- Add a dedicated validation-contract document and link all prompts to a single source of truth.
- Add automated checks for customization integrity (frontmatter lint and prompt contract lint).

## Recommended Follow-up Issues

1. Define and commit .vscode/tasks.json with canonical validation tasks.
2. Add docs/10_validation_contract.md and reference it from all relevant prompts.
3. Add a lightweight customization contract checker to prevent future drift.

## Acceptance Criteria Mapping for Issue #1

- Prompt assumptions compared against repository: complete.
- Mismatches documented clearly: complete.
- Remediation list produced for follow-up issues: complete.
