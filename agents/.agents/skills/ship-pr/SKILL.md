---
name: ship-pr
description: End-to-end "get this branch reviewed" flow — rebase on main, create (or reuse) the PR as a draft, run a full code review, address the feedback, then flip to ready-for-review, assign the reviewer, and ping them on Slack. Use when the user says something like "create a PR, rebase, run a code review, address feedback and put it up for review, assign <reviewer> and Slack them."
---

# Ship PR

Take the current branch from "work in progress" to "reviewed and handed off". This composes the [[create-pr]], [[deslop]], and [[code-review]] skills, adds a review-fix loop, and ends by notifying the reviewer.

Default reviewer: **titivermeesch** (Tristan). Override if the user names someone else — match their name against the [Reviewers](#reviewers) table (GitHub handle, first name, or full name all work) to get the GitHub handle for assignment and the Slack user ID for the ping.

## Steps

### 1. Rebase on main

- Fetch and rebase: `git fetch origin && git rebase origin/main`.
- If there are conflicts, stop and surface them — don't guess at resolutions. Let the user resolve, then continue.
- If the branch is `main` (or the repo default), stop and tell the user — there's nothing to ship.

### 2. Create or reuse the PR (as a draft)

- Check for an existing PR: `gh pr view --json number,url,isDraft,state 2>/dev/null`.
- **No PR yet** → follow the [[create-pr]] skill to commit/push anything outstanding and open the PR, but create it as a **draft** (`gh pr create --draft ...`). The point of drafting is that it flips to ready only after review feedback is addressed (step 5).
- **PR already exists** → make sure any local work is committed and pushed (per [[create-pr]] steps 1-3). This is the common "I made some more changes" case.
- Force-push is still off-limits; after a rebase use `git push --force-with-lease` only, and only on a branch that is clearly yours.

### 3. Run a deslop pass

- Follow the [[deslop]] skill against the branch diff (`origin/main...HEAD`) to strip AI-generated slop before the review sees it.
- Commit the cleanups (repo commit style + `Co-Authored-By` footer) and push. Skip the commit if deslop found nothing to change.

### 4. Run a full code review

- Follow the [[code-review]] skill with the fixed point set to `origin/main` (diff `origin/main...HEAD`).
- Let both axes (Standards + Spec) run to completion and collect the findings.

### 5. Address the feedback

- Work through the review findings and fix them. Prioritise hard violations and missing/wrong spec requirements over judgement-call smells.
- If a finding is a deliberate choice or out of scope, note why rather than forcing a change.
- Commit the fixes (follow the repo's commit style + `Co-Authored-By` footer) and push.
- Consider the loop done when every actionable finding is either fixed or explicitly dismissed with a reason.

### 6. Flip to ready-for-review

- `gh pr ready` to move the PR out of draft.

### 7. Assign the reviewer

- Resolve the reviewer to a GitHub handle via the [Reviewers](#reviewers) table, then `gh pr edit --add-reviewer <handle>`.

### 8. Slack the reviewer

- Look up the reviewer's Slack user ID in the [Reviewers](#reviewers) table and DM that ID directly with `slack_send_message` — no need to search. Only fall back to `slack_search_users` if the reviewer isn't in the table.
- Send a quick note plus the PR link, e.g. _"Made some more changes here: <PR URL>"_.
- Keep it short and in the user's voice — this is a heads-up, not a summary.

## Reviewers

The reviewer roster (GitHub handle ↔ name ↔ Slack user ID) lives in **`reviewers.local.md`**, next to this file. It's kept out of the repo (gitignored — the repo is public and this maps real teammates to internal Slack IDs), so it's machine-local.

- Read `reviewers.local.md` from this skill's own directory when resolving a reviewer.
- **If the file is missing** (fresh machine, first run), do not fail silently. Stop and tell the user clearly, e.g.: _"⚠️ `reviewers.local.md` isn't set up on this machine — it's gitignored, so it doesn't sync. I can still ship this by looking the reviewer up via `slack_search_users`, but the roster won't persist. Want me to create it?"_ Then fall back to resolving the named reviewer at runtime via `slack_search_users` (by name, or by `firstname.lastname@companion.energy` if the name search misses), and offer to write the file so it persists.

## Notes

- Steps run in order; each depends on the previous (a rebase before review means the review sees the real diff).
- Never use `--no-verify` or skip hooks. Fix hook failures with a new commit.
- If the code review surfaces nothing actionable, skip step 5 and go straight to flipping ready + notifying — but say so.
- The Slack ping is the last step and the only outward-facing one; do it only after the PR is genuinely ready and the reviewer is assigned.
