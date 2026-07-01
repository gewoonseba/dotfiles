---
name: code-review-loop
description: >
  Review the current branch with two reviewers — `ce-code-review` (general correctness,
  security, tests, standards) and the project-local `jt-frontend-review` (React/TS architecture
  + design-token adherence) — in either of two modes. Default: a review -> fix -> re-review loop
  that applies the findings and re-runs until nothing actionable remains. `report`: run both
  reviews once and write a single comprehensive report in the style of `ce-code-review`, with the
  specific frontend findings folded in, making no edits. Use when the user says "review and fix
  until clean", "loop the code review", "keep reviewing until there's nothing left", "auto-fix
  review findings", "code-review loop", "just review and report", "review but don't change
  anything", "write up a review report", or wants iterative or report-only review before a PR.
argument-hint: "[report] [base:<ref>] [max:<n>] (blank = fix-loop on current branch vs its merge-base)"
---

# Code Review Loop

Review the current branch with two reviewers, in one of **two modes**:

- **Fix loop (default)** — review, fix what the reviewers flag, re-review, and repeat until a
  full pass turns up **no actionable findings** (or a stop guard trips). See **Steps** below.
- **Report only (`report`)** — run both reviews once, synthesize a single comprehensive report
  in the style of `ce-code-review` (with the specific frontend findings folded in), and **make
  no edits**. See **Report mode** below.

Both modes compose the same two reviewers:

- **`ce-code-review`** — general review (correctness, security, tests, standards). Always invoked
  in `mode:agent` so it returns structured **JSON** and **does not mutate the tree** — in the fix
  loop this skill owns the edits; in report mode nothing edits at all.
- **`jt-frontend-review`** — Jolteon frontend review (React 19/TS patterns + locked design
  tokens). Project-local (lives in the repo's `.claude/skills/`), markdown output. Only run it
  when frontend files are in scope **and** the skill is available; skip with a note otherwise.

**Neither mode commits or pushes.** In the fix loop, edits land in the working tree; committing is
the outward step the user owns — when it finishes, tell the user how to commit (e.g. `/ce-commit`
or `/code-commit-push`). Report mode produces only the report.

## Argument parsing

| Token | Effect |
|-------|--------|
| `report` | **Report-only mode.** Run both reviews once, emit a unified report in `ce-code-review` style, make **no edits**. No loop. Aliases: `report-only`, `no-fix`. |
| `base:<ref>` | Pin the diff base (SHA / `origin/main` / branch). Otherwise detect the merge-base once (Step 1) and reuse it (every round in the fix loop) so scope stays stable. |
| `max:<n>` | Fix loop only: max iterations before stopping and reporting what's left. Default **5**. Ignored in `report` mode (single pass). |
| _(blank)_ | Fix loop on the current branch against its detected merge-base. |

Do not accept a PR number/branch *target* — both modes operate on the **current checkout** (the
fix loop edits it; report mode's frontend reviewer reads the working-tree files). If the user
wants a different branch reviewed, they check it out first.

## What counts as "actionable"

Both modes use this definition — the fix loop chases only these; report mode labels these as the
actionable tier and reports everything else separately:

- **`ce-code-review`**: the `actionable_findings` array from its JSON — the `gated_auto` /
  `manual` findings owned by `downstream-resolver` (typically P0–P2). Advisory / `human` /
  `release`-owned findings and P3 nitpicks are **not** loop fuel.
- **`jt-frontend-review`**: the **Issues** section and **Design token violations** (concrete
  problems that "should be fixed"). Its **Suggestions** and **Good patterns** are **not** loop
  fuel.

## Fix loop (default mode)

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

## Report mode (`report`)

Single pass, **no edits, no loop**. Produce one comprehensive report in the style of
`ce-code-review`'s markdown output, with the concrete frontend findings folded in.

1. **Pin scope** — same as fix-loop Step 1 (resolve `BASE`, list changed files, decide whether
   frontend files are in scope). Skip the attempted-fingerprints set; it isn't used here.
2. **Review once, both concurrently** — same as fix-loop Step 2 (`ce-code-review mode:agent
   base:<SHA>` for JSON; `jt-frontend-review` on the changed frontend files when in scope and
   available, else note it was skipped). Neither mutates the tree.
3. **Merge** — combine into one finding set, each tagged with its **source reviewer**. Fold the
   frontend review's **Issues** and **Design token violations** in as a `frontend` source, keeping
   their specifics: `file:line`, the offending snippet, and the **canonical token/pattern
   replacement from DESIGN.md**. Map frontend severities onto ce's P0–P3 (use the frontend
   review's own severity labels where given). Deduplicate across sources by fingerprint =
   `normalize(file) + line_bucket(line, ±3) + normalize(title)`, keeping the higher severity and
   noting both reviewers when they overlap.
4. **Render in `ce-code-review` style** (follow that skill's report skeleton and closing rules):
   - **Coverage** — branch, base, changed-file count; which reviewers ran; if the frontend review
     was skipped, say why (no frontend files / skill not present).
   - **Findings** — severity-ordered, pipe-delimited tables with stable, monotonic `#` numbers
     across the whole set. Columns: `# | severity | file:line | finding | source | suggested fix`.
   - **Design token violations** — a dedicated subsection (as `jt-frontend-review` groups them):
     `file:line` + offending snippet + canonical replacement.
   - **Actionable Findings** recap — the actionable-tier subset (see "What counts as actionable"):
     `# | severity | file:line | title | suggested-fix present? | confidence`. State
     `Actionable findings: none.` explicitly when empty.
   - **Verdict** — last and self-sufficient: the overall call plus the single most important thing
     to do, then the prioritized actionable list. A reader seeing only the last screen must get the
     verdict and the prioritized list, each item carrying severity, `file:line`, and the terse what.
   - **ASCII-safe formatting:** pipe tables only; `->` not arrows or middot; no box-drawing; escape
     literal `|` inside cells as `\|`.
5. **Stop.** Make no edits and no commits. Do not offer to enter the fix loop unless the user asks
   — if they want the findings applied, they re-run without `report`.

## Guardrails

- **Never commit or push.** Fixes (fix loop) stay in the working tree; report mode writes nothing.
- **Stable scope.** Reuse the Step-1 `BASE` for every round; the diff grows as you fix, but the
  base never drifts.
- **No infinite loops.** The `max:<n>` cap and the attempted-fingerprints no-progress check are
  both hard stops. A reviewer that keeps re-raising a finding you deliberately deferred must not
  restart the loop.
- **Don't gold-plate.** P3s, advisory items, and Suggestions are reported, never fixed-until-
  gone. "Actionable" is the bar; subjective polish is not.
- **Reviews are read-only.** `ce-code-review mode:agent` and `jt-frontend-review` don't touch the
  tree — every edit in this loop comes from Step 5, so you always know exactly what changed.
