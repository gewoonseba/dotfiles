---
name: code-review
description: A lean, single-pass code review of the diff since a fixed point. Always discovers and applies repo-specific review guidance (review skills, coding standards, CLAUDE.md, cursor rules), and pulls in the frontend skills — composition patterns and React best practices — whenever the change touches frontend code. Use to review a branch, PR, or work-in-progress changes.
---

# Quick Review

A single-pass review of the diff — one agent, no fan-out.

The review is only as good as the rules behind it, so **step 1 is always to gather the rules that apply to this repo and this diff** — never review from generic instinct alone.

## Process

### 1. Pin the fixed point

Diff `HEAD` against a fixed point. Default to `origin/main` (three-dot: `git diff origin/main...HEAD`). If the user named a commit/branch/tag, use that. Confirm it resolves (`git rev-parse`) and the diff is non-empty before going further.

Note the changed files — you'll need to know whether frontend code is involved (`.tsx`, `.jsx`, `.ts`/`.js` under a UI/components/app dir, `.vue`, `.svelte`, etc.).

### 2. Gather the rules that apply (always)

Look, in the repo, for anything that documents how code here should be written or reviewed. Check for and load whatever exists:

- **Repo review skills** — `.agents/skills/`, `.claude/skills/`, `.cursor/skills/` in the repo root. If a skill looks review- or standards-related, read it and treat it as authoritative.
- **Coding standards** — `CODING_STANDARDS.md`, `CONTRIBUTING.md`, `CLAUDE.md`, `.cursorrules`, `.cursor/rules/*`, `AGENTS.md`, or similar.

A documented repo rule always wins over generic judgement.

### 3. Add the frontend lenses (when the diff touches frontend)

If step 1 found frontend files in the diff, also apply these two skills as review criteria:

- [[vercel-composition-patterns]] — boolean-prop proliferation, compound components, render props, context, over-configurable APIs.
- [[vercel-react-best-practices]] — component structure, hooks usage, data fetching, rendering strategy, bundle/perf, accessibility, TypeScript patterns.

Read the relevant skill(s) and check the changed components against them. Skip this step entirely for backend-only diffs.

### 4. Review in one pass

With the repo rules (step 2) and any frontend lenses (step 3) in hand, read the diff and report findings. Keep the bar practical — flag what a thoughtful reviewer would actually comment on:

- Violations of a documented repo rule (cite the rule: file + what it says). These are the strongest findings.
- Frontend findings against the two skills, when they apply.
- Clear correctness or simplicity problems: over-engineering, speculative abstraction, code that could be much smaller, error handling for impossible cases, duplicated logic in the diff.
- Any **smell from the baseline below**.

Skip anything tooling (linter, formatter, typechecker) already enforces.

#### Smell baseline (Fowler, _Refactoring_ ch.3)

Applies on top of whatever the repo documents, even when the repo documents nothing. Two rules bind it:

- **The repo overrides.** A documented repo rule always wins; where it endorses something the baseline would flag, suppress the smell.
- **Always a judgement call.** Each smell is a labelled heuristic ("possible Feature Envy"), never a hard violation — and, like any rule here, skip anything tooling already enforces.

Each reads *what it is* → *how to fix*; match it against the diff:

- **Mysterious Name** — a function, variable, or type whose name doesn't reveal what it does or holds. → rename it; if no honest name comes, the design's murky.
- **Duplicated Code** — the same logic shape appears in more than one hunk or file in the change. → extract the shared shape, call it from both.
- **Feature Envy** — a method that reaches into another object's data more than its own. → move the method onto the data it envies.
- **Data Clumps** — the same few fields or params keep travelling together (a type wanting to be born). → bundle them into one type, pass that.
- **Primitive Obsession** — a primitive or string standing in for a domain concept that deserves its own type. → give the concept its own small type.
- **Repeated Switches** — the same `switch`/`if`-cascade on the same type recurs across the change. → replace with polymorphism, or one map both sites share.
- **Shotgun Surgery** — one logical change forces scattered edits across many files in the diff. → gather what changes together into one module.
- **Divergent Change** — one file or module is edited for several unrelated reasons. → split so each module changes for one reason.
- **Speculative Generality** — abstraction, parameters, or hooks added for needs the spec doesn't have. → delete it; inline back until a real need shows.
- **Message Chains** — long `a.b().c().d()` navigation the caller shouldn't depend on. → hide the walk behind one method on the first object.
- **Middle Man** — a class or function that mostly just delegates onward. → cut it, call the real target direct.
- **Refused Bequest** — a subclass or implementer that ignores or overrides most of what it inherits. → drop the inheritance, use composition.

### 5. Report

A short, skimmable list, most important first. For each finding: the file/hunk, one line on what's wrong, and — where it helps — the fix. Cite the source (repo rule / composition-patterns / react-best-practices / smell baseline / general) so the user knows where it came from, and distinguish hard violations of documented rules from judgement-call smells. If nothing meaningful turns up, say so plainly.

## Notes

- One pass, one agent — no parallel sub-agents. If the diff is genuinely large and multi-concern, consider splitting the review by area.
- Reviewing means reporting, not editing. Don't change code unless the user asks.
