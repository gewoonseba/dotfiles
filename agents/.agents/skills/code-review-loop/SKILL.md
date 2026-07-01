---
name: code-review-loop
description: >
  Run an automated review -> fix -> re-review loop over the current branch until no
  actionable findings remain. Drives the `ce-code-review` skill (general correctness,
  security, tests, standards) and the project-local `jt-frontend-review` skill (React/TS
  architecture + design-token adherence) in each round, applies the findings, then re-runs
  the reviews to confirm they're gone. Use when the user says "review and fix until clean",
  "loop the code review", "keep reviewing until there's nothing left", "auto-fix review
  findings", "code-review loop", or wants iterative self-correcting review before a PR.
argument-hint: "[base:<ref>] [max:<n>] (blank = review current branch vs its merge-base)"
---

# Code Review Loop

Iteratively review the current branch, fix what the reviewers flag, and re-review — until a
full pass turns up **no actionable findings** (or a stop guard trips). This composes two
reviewers:

- **`ce-code-review`** — general review (correctness, security, tests, standards). Invoked in
  `mode:agent` so it returns structured **JSON** and **does not mutate the tree** — this loop
  owns the fixes.
- **`jt-frontend-review`** — Jolteon frontend review (React 19/TS patterns + locked design
  tokens). Project-local (lives in the repo's `.claude/skills/`), markdown output. Only run it
  when frontend files are in scope **and** the skill is available; skip with a note otherwise.

**This loop never commits or pushes.** All fixes land in the working tree; committing is the
outward step the user owns. When the loop finishes, tell the user how to commit (e.g.
`/ce-commit` or `/code-commit-push`).

## Argument parsing

| Token | Effect |
|-------|--------|
| `base:<ref>` | Pin the diff base (SHA / `origin/main` / branch). Otherwise detect the merge-base once (Step 1) and reuse it every round so scope stays stable as fixes accumulate. |
| `max:<n>` | Max iterations before stopping and reporting what's left. Default **5**. |
| _(blank)_ | Review the current branch against its detected merge-base. |

Do not accept a PR number/branch *target* — this loop applies fixes, so it only operates on the
**current checkout**. If the user wants a different branch reviewed-and-fixed, they check it out
first.

## What counts as "actionable"

Only these drive the loop (everything else is reported at the end, never chased):

- **`ce-code-review`**: the `actionable_findings` array from its JSON — the `gated_auto` /
  `manual` findings owned by `downstream-resolver` (typically P0–P2). Advisory / `human` /
  `release`-owned findings and P3 nitpicks are **not** loop fuel.
- **`jt-frontend-review`**: the **Issues** section and **Design token violations** (concrete
  problems that "should be fixed"). Its **Suggestions** and **Good patterns** are **not** loop
  fuel.

## Steps

### 1. Pin scope (once)

```bash
echo "BRANCH:" && git rev-parse --abbrev-ref HEAD
echo "BASE:" && git merge-base HEAD "$(git rev-parse --abbrev-ref --symbolic-full-name @{u} 2>/dev/null || echo origin/main)"
```

Resolve `BASE` to a concrete SHA (honor `base:<ref>` if passed). If no base can be resolved,
stop and say so — don't fall back to `git diff HEAD` (it would miss committed work on the
branch). Capture the changed-file list; note whether any `services/frontend/src/**` `*.tsx`/`*.ts`
files changed (decides whether `jt-frontend-review` runs).

Initialize an empty **attempted-fingerprints** set (see Step 5).

### 2. Review (run both, concurrently)

In one turn, invoke both reviewers so they run in parallel:

- `ce-code-review` with **`mode:agent base:<SHA>`**. Parse the returned JSON. If `status` is
  `failed` / `degraded` / `skipped`, surface the reason and treat its actionable set as empty
  for this round (don't crash the loop).
- `jt-frontend-review` — only if frontend files are in scope and the skill exists. Point it at
  the changed frontend files in the branch diff. If the skill is unavailable, log `frontend
  review: skipped (skill not present)` and continue with `ce-code-review` alone.

### 3. Collect the actionable set

Merge both reviewers' actionable findings (per the definition above) into one list, each tagged
with `file:line`, severity, the concrete fix, and its source reviewer. Deduplicate across
reviewers by fingerprint = `normalize(file) + line_bucket(line, ±3) + normalize(title)`.

### 4. Decide: stop or fix

**Stop and report** (Step 6) when any holds:
- The actionable set is **empty** → success, tree is clean.
- Iteration count reached **`max:<n>`** → cap hit.
- **No progress**: every remaining actionable finding is a fingerprint already in the
  attempted-fingerprints set (a fix didn't resolve it, or it re-appears unchanged) → stalled;
  don't ping-pong.

Otherwise continue to Step 5.

### 5. Fix

Apply each *new* actionable finding (fingerprint not yet attempted):

- Apply the reviewer's `suggested_fix`, or a correct equivalent, editing the smallest surface
  that resolves it. Group edits by file. Match surrounding style.
- **Judgment, not blind obedience.** If a finding is a false positive, or needs a product/design
  decision you can't make, **do not fix it** — record it as `deferred (<reason>)` and add its
  fingerprint to attempted so the loop won't re-chase it.
- Record every finding you *attempt* into the attempted-fingerprints set.

After editing, run the project's fast validation if one exists (typecheck / lint / build — e.g.
the `code-frontend-validate` skill in a frontend repo). If a fix broke something, fold the
breakage into this round's fixes before re-reviewing — don't carry a broken tree into Step 2.

### 6. Loop / report

If Step 4 said continue, increment the iteration counter and go to **Step 2** (re-review the now-
larger diff against the same pinned `BASE`).

When you stop, emit a concise summary:

- Outcome: **clean** (0 actionable) / **capped** (hit `max`) / **stalled** (no progress).
- Per iteration: how many findings were fixed, and by which reviewer.
- **Deferred** findings still open, each with `file:line` + the one-line reason (false positive,
  design decision, or unresolved-after-retry) — this is the human's queue.
- Non-actionable notes worth surfacing (advisory items, P3s, Suggestions) — brief, not chased.
- Reminder that nothing was committed, and how to commit when ready.

## Guardrails

- **Never commit or push.** Fixes stay in the working tree.
- **Stable scope.** Reuse the Step-1 `BASE` for every round; the diff grows as you fix, but the
  base never drifts.
- **No infinite loops.** The `max:<n>` cap and the attempted-fingerprints no-progress check are
  both hard stops. A reviewer that keeps re-raising a finding you deliberately deferred must not
  restart the loop.
- **Don't gold-plate.** P3s, advisory items, and Suggestions are reported, never fixed-until-
  gone. "Actionable" is the bar; subjective polish is not.
- **Reviews are read-only.** `ce-code-review mode:agent` and `jt-frontend-review` don't touch the
  tree — every edit in this loop comes from Step 5, so you always know exactly what changed.
