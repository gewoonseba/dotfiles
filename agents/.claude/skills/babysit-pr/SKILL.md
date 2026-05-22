---
name: babysit
description: >
  Keep the current branch's open PR healthy and up to date. Rebases on main, reviews and addresses
  PR comments, and investigates failing CI checks. Use this skill whenever the user says "babysit",
  "update my PR", "check my PR", "address PR comments", "fix CI", "keep PR up to date", "rebase and
  fix", or anything about maintaining, grooming, or tending to an open pull request. Also trigger when
  the user mentions "PR review comments", "failing checks", or "merge conflicts" in the context of
  wanting them handled automatically.
---

# Babysit PR

Automatically maintain the current branch's open pull request: rebase on main, address review comments, and fix failing CI — so the PR stays healthy and merge-ready.

## Workflow

Run these three phases in order. Each phase gates on the previous one — a failed rebase means comments and CI fixes would be based on stale code.

### Phase 1: Rebase on main

Keep the branch up to date with the latest main. This avoids merge conflicts piling up and ensures CI runs against current code.

1. `git fetch origin main`
2. `git rebase origin/main`
3. If conflicts arise, attempt to resolve them:
   - For trivial conflicts (import reordering, lockfile changes, whitespace), resolve automatically
   - For non-trivial conflicts, show the conflicting hunks to the user and ask how to resolve
4. After a successful rebase: `git push --force-with-lease`
5. **Never force-push without `--force-with-lease`** — it protects against overwriting someone else's work

If the branch is already up to date with main, skip the push and move on.

### Phase 2: Address PR comments

Review comments are the highest-value thing to address because they're blocking a human reviewer.

1. **Fetch reviews and comments**: use `gh pr view --json number` to get the PR number, then `gh api repos/{owner}/{repo}/pulls/{number}/reviews` and `gh api repos/{owner}/{repo}/pulls/{number}/comments` to get all review comments and inline comments.

   **Check for approvals**: while parsing reviews, look for any with `state: "APPROVED"`. If the PR has been approved by one or more reviewers, notify the user prominently at the top of the summary — this is great news and means the PR may be ready to merge once CI is green.

2. **Categorize each comment** into one of three buckets:

   - **Clear fix** — the reviewer is pointing out a concrete issue (typo, missing null check, naming suggestion, style nit) and the fix is unambiguous. Go ahead and fix these.
   - **Ambiguous remark** — the comment raises a valid concern but the right fix isn't obvious, or it might involve a design tradeoff the reviewer and author need to discuss. Flag these for the user (see step 4).
   - **Informational / praise** — comments like "nice!", "TIL", questions that don't require code changes. Skip these.

3. **Apply clear fixes**:
   - Read the relevant file(s) and understand the surrounding context
   - Make the change
   - Run the project's linter/formatter to make sure the fix is clean:
     - Python: `uv run ruff check . --fix && uv run ruff format .`
     - TypeScript: `npm run lint-fix -w services/frontend` (if frontend files changed)
   - Stage and commit with a message like: `address review: <short description of what changed>`
   - **Do not amend** previous commits — always create new commits so the reviewer can see what changed

4. **Surface ambiguous remarks**:
   - Present each ambiguous comment to the user with:
     - The reviewer's comment text
     - The file and line it refers to
     - Your assessment of what the reviewer is asking for
     - A proposed fix (if you have one), clearly marked as a suggestion
   - Wait for the user to approve, reject, or modify before making any changes
   - If the user approves a fix, apply it the same way as clear fixes above

5. **Push** all commits once done: `git push`

### Phase 3: Fix failing CI

CI failures on a rebased, review-addressed branch are the last thing standing between the PR and a merge.

1. **Check CI status**: `gh pr checks` to see which checks are failing
2. **For each failing check**:
   - Fetch the logs: `gh run view <run-id> --log-failed` (or download the log with `gh run view <run-id> --log`)
   - Analyze the failure:
     - **Test failure**: read the failing test, understand the assertion, check if it's a real bug or a test that needs updating. Fix the code or the test as appropriate.
     - **Lint / type error**: run the relevant checker locally, fix the issue
     - **Build failure**: check for missing imports, syntax errors, dependency issues
     - **Flaky / infra failure**: if the logs suggest a transient issue (network timeout, runner OOM), tell the user rather than trying to "fix" it — they may want to re-run the job
   - Apply fixes following the same commit conventions as Phase 2
3. **Run checks locally** before pushing to catch issues early:
   - Python: `uv run ruff check . && uv run pyright` (for changed packages)
   - Frontend: `npm run lint -w services/frontend && npm run test -w services/frontend` (if frontend files changed)
   - Tests: `uv run pytest <affected-package>` for changed Python packages
4. **Push** fixes: `git push`

## Important guidelines

- **Never edit `uv.lock`** — it's auto-generated and must not be committed (per project rules)
- **Never edit `packages/dashboard-api-ts-sdk`** — it's auto-generated from the OpenAPI spec
- **Commit hygiene**: each fix gets its own commit with a descriptive message. Don't squash unrelated fixes together.
- **Ask when unsure**: the whole point of the ambiguous-remark bucket is to avoid making changes the author didn't intend. When in doubt, ask.
- **Report what you did**: after all three phases, give the user a brief summary — what was rebased, which comments were addressed, which CI issues were fixed, and anything that still needs their attention.

## Example summary output

After running, provide something like:

> **Babysit complete for PR #247**
>
> ✅ **Approved by @alice** — ready to merge once CI is green!
>
> **Rebase**: rebased 3 commits onto latest main, no conflicts
>
> **Comments addressed (4)**:
> - Fixed missing null check in `services/dashboard-api/routers/assets.py` (reviewer: @alice)
> - Renamed `get_data` → `get_asset_data` per naming convention (reviewer: @alice)
> - Added docstring to `calculate_savings` (reviewer: @bob)
> - ⚠️ @bob suggested restructuring the query builder — **needs your input** (design tradeoff)
>
> **CI fixes (1)**:
> - Fixed pyright error: missing return type annotation on `fetch_contracts`
>
> **Still needs attention**:
> - Bob's query builder comment (see above)
> - `e2e-tests` check is failing due to a timeout — likely flaky, consider re-running
