---
name: 01_pancake_implement
description: Perform an implementation task
agent: agent
---

# Objective

> Your goal is to implement a new feature or fix a bug.

# Workflow

Perform the necessary steps in the following order:

## Access issue details

- Use GitHub exclusively via MCP tools for all repository, issue, PR, comment, and metadata interactions. Do not use web scraping/fetching or manual browser parsing for GitHub content when MCP is available.
- If an issue is given to be implemented, access the issue tracker using the MCP interface and read the issue description as well as all comments to get the full context about the issue.
- If you are asked to implement an issue step only, look for hints left by a prior agent instance in the issue comments. Implement that step only.
- Confirm the working branch and report it before making changes.
- Do not force branch switches during implementation unless the user explicitly asks.

## Access learnings

- `LEARNINGS.md` in the repository root is mandatory.
- If `LEARNINGS.md` does not exist, create it with a minimal structure before implementation.
- Read `LEARNINGS.md` before coding and apply relevant rules.



## Implementation

- Perform your implementation tasks, following the best practices.
- For new features or solved bugs, add tests or test cases matching the structure of the existing tests. Be thorough, but do not cover every detail with a test. Make a reasonable decision what is necessary for being tested.

## Validation

- Use repository-native validation only.
- Preferred order:
  1. Run VS Code task `Checks` if it exists.
  2. Run `npm test` from the repository root.
  3. If implementation changes startup behavior, perform a quick smoke check with `npm start` and document the observed result.
- If a referenced task does not exist, report that clearly and continue with available commands.
- Fix all errors introduced by the implementation before finishing this stage.

## Adapt documentation

- Scan the documentation for inconsistencies and necessary adaptations triggered by this issue's changes.
- Adapt the documentation accordingly to reflect the changes made.

# Hints

- Complain if the current setup is not sufficient for performing an implementation. Make a proposal on how to enhance the situation than.
- Do **not** commit the changes yet. They will be reviewed in a manual process and then committed by a later agent instance. Focus on the implementation and leave the committing to a later stage.
- **Development environment**: This project is primarily developed on Windows using PowerShell. Adjust shell syntax accordingly when running commands manually.