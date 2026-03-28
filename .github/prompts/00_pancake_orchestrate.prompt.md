---
name: 00_pancake_orchestrate
description: Orchestrate the full pancake workflow from implementation to merge
agent: pancake-orchestrator
---

# Objective

> Your goal is to orchestrate the complete workflow for an issue from implementation through merge with clear approval gates.

# Usage

- `/00_pancake_orchestrate Issue #123`
- `/00_pancake_orchestrate Issue #123, PR #130`

# Workflow

Execute the following stages in sequence:

1. Implement changes (equivalent to `01_pancake_implement`)
2. Commit and push (equivalent to `02_pancake_commit`)
3. Wait for Copilot review readiness via polling:
   - Poll interval: 60 seconds
   - Condition: new review/comments from Copilot reviewer are available
   - Timeout: 30 minutes (then stop as blocked with recovery hint)
   - PowerShell note: use Windows-safe null redirection (`2>$null`), never `/dev/null`
4. Address PR review comments (equivalent to `03_pancake_review`)
5. Merge and clean up branch (equivalent to `04_pancake_merge`), with two sub-steps:
   a. **Conflict check**: Before merging, verify PR `mergeable` status. If `CONFLICTED`, resolve via `git merge origin/main`, fix conflicting files, commit and push. Abort and report if non-resolvable.
   b. Merge once `MERGEABLE`, delete remote branch, sync local `main`.
6. Post-merge CI verification:
   - Verify CI status on `main` using the repository's configured CI provider (timeout target: 10 minutes).
   - If CI fails: diagnose from provider logs or local CI command output, apply targeted hotfix commits, re-verify.
   - If still failing after 2 fix attempts: stop as `blocked` and report exact failures and recovery action.

# Approval gates

- Stop after implementation and ask for approval to continue with commit/push.
- Stop after review-fix stage and ask for approval to continue with merge.
- **Hard gate**: Never execute any merge command unless the user has explicitly approved merge in this chat turn (for example: "approve merge", "merge freigeben", "ja, merge").
- If approval is missing, stop with status `blocked` and print: `Waiting for explicit merge approval.`

# Guard rails (must not be bypassed)

- CI green is not a substitute for reviewer readiness.
- "No comments found" is valid only after completing the full review discovery flow (reviews + inline comments + PR comments).
- If review polling times out, do not merge. Report `blocked` with exact next action.
- Before merge, emit a checkpoint that includes: PR number, mergeable state, latest check conclusions, and explicit approval evidence text.

# Required reporting

- Show stage status and key artifacts (branch, commits, PR number)
- Show validation outcomes using repository-native commands and tasks that actually exist
- Show post-merge CI status on `main`
- Show blockers and exact next step if workflow cannot continue
