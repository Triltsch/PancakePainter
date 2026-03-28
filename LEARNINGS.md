# LEARNINGS

This file is mandatory for the pancake agent workflow.

## Purpose

- Capture implementation and review learnings that prevent repeated mistakes.
- Preserve repository-specific constraints for future agent runs.

## Entry Format

Use this template for each new entry:

### YYYY-MM-DD - Short Title

- Context: What was being changed.
- Problem: What failed or was risky.
- Resolution: What fixed it.
- Rule: What to do next time.
- Affected files: List the key files.

## Entries

### 2026-03-28 - Repository-Native Prompt Contract Baseline

- Context: Sprint 1 Phase 0 alignment of agent prompts and workflow contracts.
- Problem: Prompts contained non-repo-native assumptions (Docker, Redis, PostgreSQL, pytest, Test: Verified task) that do not exist in this repository.
- Resolution: Replaced those assumptions with repository-native validation guidance and documented the contract in docs.
- Rule: Keep validation requirements tied to commands and tasks that exist in this repository.
- Affected files: .github/prompts/01_pancake_implement.prompt.md, .github/prompts/03_pancake_review.prompt.md, .github/agents/pancake-orchestrator.agent.md, .github/agents/mcp-pr-review.agent.md, docs/09_prompt_contract_audit.md.

### 2026-03-28 - PowerShell-Safe Validation Command

- Context: Commit-time validation for Sprint 1 prompt contract alignment.
- Problem: The original npm test script relied on shell glob expansion and failed in PowerShell before JSHint could lint the repository.
- Resolution: Replaced the glob-based JSHint invocation with directory-based arguments that work cross-platform.
- Rule: Prefer cross-platform npm scripts that do not depend on shell-specific glob expansion.
- Affected files: package.json, docs/09_prompt_contract_audit.md.
