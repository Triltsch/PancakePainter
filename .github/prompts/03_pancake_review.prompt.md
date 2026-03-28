---
name: 03_pancake_review
description: Fetch and implement the reviewer suggestions from a pull request
agent: mcp-pr-review
---

# Objective

> Your goal is to fetch and implement the suggestions a reviewer has left on a pull request

# Workflow

Given a pull request, perform the necessary steps in the following order:

## Implementation

- Ask for the pull request URL or ID. If the user provides a URL, extract the pull request ID from the URL.
- Check if the current branch is the branch the pull request relates to. If not, switch to the correct branch.
- Check if the pull request is already closed. In this case, check if the reviewer suggestions were already implemented or are outdated. For the suggestions which are not implemented yet and not outdated, assume that they were added to the PR after the PR was closed and merged. Open a new branch, implement the suggestions and create a new PR in this case.
- **REQUIRED: Use ONLY MCP GitHub tools (sequentially, NO parallels)** to fetch PR data. This ensures stable, reliable API communication. Never use fallback methods or manual GitHub CLI unless MCP is completely unavailable.
- **Read through peer review related comments carefully**: Review comments may be returned in different API responses than general issue comments.
- **NO fallback methods allowed** unless all 4 MCP calls above complete AND return no results. In that case, only then escalate to authenticated GitHub CLI or user-provided review links.
- **Copilot AI review handling:** Treat Copilot AI review comments exactly like human inline review comments. They are required input and must be implemented unless outdated or explicitly declined by the user.
- **Stopping rule:** Only conclude "no reviewer comments" AFTER completing all 4 MCP calls above. Document exact call sequence and result counts in final report.
- Implement the suggested changes in the codebase following the project guidelines and best practices.
- Analyze why the suggested changes were found in a pull request only and not during the initial implementation. Add appropriate learnings and tests if this can prevent similar issues in the future.

### Mandatory MCP-based comment discovery sequence (sequential calls only)

1. Call `mcp_github_pull_request_read(method="get", owner, repo, pullNumber)` to fetch base PR metadata.
2. Call `mcp_github_pull_request_read(method="get_reviews", owner, repo, pullNumber)` to fetch all review summaries.
3. Call `mcp_github_pull_request_read(method="get_review_comments", owner, repo, pullNumber)` to fetch all inline review threads with full context.
4. Call `mcp_github_pull_request_read(method="get_comments", owner, repo, pullNumber)` to fetch general PR comments (non-review comments).
5. Filter results: keep only unresolved and non-outdated comments for implementation.
6. If there are no actionable comments after step 5: this is normal. Document which calls returned empty and proceed to the branch check / final reporting.

### Tool-availability rule (priority order)

1. **Primary**: Use MCP GitHub tools (`mcp_github_pull_request_read` with methods `get`, `get_reviews`, `get_review_comments`, and `get_comments`).
2. **Fallback 1**: If MCP tools are unavailable, use `github-pull-request_activePullRequest` from the VS Code GitHub PR extension.
3. **Fallback 2**: If both are unavailable, use `gh pr view` CLI commands.
4. Always report which method was used in the final response.

## Check and tests

- Run checks. Fix all warnings and errors before proceeding to the next step.
- Use repository-native validation only:
  - run VS Code task `Checks` if present
  - run `npm test` from repository root
  - if startup behavior is touched, run a short smoke check with `npm start` and report the result
- Fix all warnings and errors before proceeding to the next step.

## Commit and push

- `LEARNINGS.md` is mandatory in this workflow.
- If `LEARNINGS.md` is missing, create it before adding new learnings.
- If the suggestion implementation led to additional important learnings, add these learnings to `LEARNINGS.md` in the root of the repository.
- Commit the changes to the current branch. 
- Push the committed changes to the remote repository.

## Required reporting in final response

- List the exact review comments implemented (with links when available).
- If any review comment could not be fetched automatically, state which fallback source was used.
- If no comments were found after full discovery, explicitly state which discovery steps were executed.

# Hints

- **Development environment**: This project is primarily developed on Windows using PowerShell. VSCode tasks and automation scripts are written for PowerShell execution. Adjust commands accordingly if working on macOS/Linux (use `bash` instead of `pwsh`, adjust path separators from `\` to `/`).
- Prefer repository-native tasks and npm scripts over assumptions about external infrastructure.
