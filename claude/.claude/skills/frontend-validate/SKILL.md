---
name: frontend-validate
description: >
  Validate the frontend by running lint, typecheck, tests, and build in parallel via subagents,
  then fix all issues found. Use when the user asks to "validate frontend", "check everything",
  "run all frontend checks", or wants a full frontend health check.
---

# Validate Frontend

Run all frontend validation checks in parallel using subagents, collect failures, then fix them.

## Phase 1: Run checks in parallel

Spawn **four agents in parallel** (in a single message with four Agent tool calls). Each agent runs one check and reports back structured results.

### Agent 1 — Linter

```
description: "Frontend lint check"
prompt: |
  Run the frontend linter and report results.
  Command: npm run lint -w services/frontend
  If the command exits 0, report: LINT: PASS
  If it fails, report: LINT: FAIL followed by the full error output.
  Do NOT attempt to fix anything — just report.
```

### Agent 2 — Type checker

```
description: "Frontend typecheck"
prompt: |
  Run the frontend TypeScript type checker and report results.
  Command: npm run tsc -w services/frontend
  If the command exits 0, report: TYPECHECK: PASS
  If it fails, report: TYPECHECK: FAIL followed by the full error output.
  Do NOT attempt to fix anything — just report.
```

### Agent 3 — Tests

```
description: "Frontend test runner"
prompt: |
  Run the frontend test suite (single run, not watch mode) and report results.
  Command: npx vitest run --reporter=verbose
  Run this from the services/frontend directory.
  If all tests pass, report: TESTS: PASS (N tests passed)
  If any fail, report: TESTS: FAIL followed by the failing test names and error output.
  Do NOT attempt to fix anything — just report.
```

### Agent 4 — Build

```
description: "Frontend build check"
prompt: |
  Run the frontend production build and report results.
  Command: npm run build -w services/frontend
  If the command exits 0, report: BUILD: PASS
  If it fails, report: BUILD: FAIL followed by the full error output.
  Do NOT attempt to fix anything — just report.
```

## Phase 2: Summarize results

After all four agents complete, present a summary table to the user:

```
| Check      | Status |
|------------|--------|
| Lint       | PASS/FAIL |
| Typecheck  | PASS/FAIL |
| Tests      | PASS/FAIL |
| Build      | PASS/FAIL |
```

If all checks pass, congratulate the user and stop here.

## Phase 3: Fix issues

If any checks failed, spawn a **single fixer agent** with the combined error output from all failing checks. The fixer agent must receive:

1. Which checks failed and their complete error output
2. Instructions to fix issues in this priority order (cheapest first):
   - **Lint errors** — try `npm run lint-fix -w services/frontend` first for auto-fixable issues, then manually fix remaining ones
   - **Type errors** — read the failing files and fix type issues
   - **Test failures** — read failing test files and the source they test, fix the root cause
   - **Build errors** — address whatever is blocking the build

The fixer agent prompt should follow this template:

```
description: "Fix frontend validation errors"
prompt: |
  The following frontend checks failed. Fix all issues.

  {paste the full error output from each failing check here}

  Fix priority (cheapest first):
  1. Lint: run `npm run lint-fix -w services/frontend` first, then manually fix remaining
  2. Typecheck: read failing files, fix type errors
  3. Tests: read failing tests and source code, fix root causes
  4. Build: fix whatever blocks the build

  After fixing, re-run each previously-failing check to confirm it passes:
  - Lint: npm run lint -w services/frontend
  - Typecheck: npm run tsc -w services/frontend
  - Tests: npx vitest run (from services/frontend)
  - Build: npm run build -w services/frontend

  Report what you fixed and whether all checks now pass.
```

## Phase 4: Final report

After the fixer agent completes, present a final summary:
- What failed initially
- What was fixed (and how)
- Whether all checks now pass
- Any remaining issues that need manual attention
