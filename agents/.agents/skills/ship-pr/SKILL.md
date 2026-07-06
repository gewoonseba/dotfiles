---
name: ship-pr
description: End-to-end "get this branch reviewed" flow — rebase on main, create (or reuse) the PR as a draft, run a full code review, address the feedback, then flip to ready-for-review, assign the reviewer, and ping them on Slack. Use when the user says something like "create a PR, rebase, run a code review, address feedback and put it up for review, assign <reviewer> and Slack them."
---

# Ship PR

Take the current branch from "work in progress" to "reviewed and handed off". This composes the [[create-pr]] and [[code-review]] skills, adds a review-fix loop, and ends by notifying the reviewer.

Default reviewer: **titivermeesch** (GitHub handle). Override if the user names someone else.

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

### 3. Run a full code review

- Follow the [[code-review]] skill with the fixed point set to `origin/main` (diff `origin/main...HEAD`).
- Let both axes (Standards + Spec) run to completion and collect the findings.

### 4. Address the feedback

- Work through the review findings and fix them. Prioritise hard violations and missing/wrong spec requirements over judgement-call smells.
- If a finding is a deliberate choice or out of scope, note why rather than forcing a change.
- Commit the fixes (follow the repo's commit style + `Co-Authored-By` footer) and push.
- Consider the loop done when every actionable finding is either fixed or explicitly dismissed with a reason.

### 5. Flip to ready-for-review

- `gh pr ready` to move the PR out of draft.

### 6. Assign the reviewer

- `gh pr edit --add-reviewer titivermeesch` (or the reviewer the user named).

### 7. Slack the reviewer

- Find their Slack user with `slack_search_users` (search "titivermeesch" / their name).
- Send a DM with `slack_send_message`: a quick note plus the PR link, e.g. _"Made some more changes here: <PR URL>"_.
- Keep it short and in the user's voice — this is a heads-up, not a summary.

## Notes

- Steps run in order; each depends on the previous (a rebase before review means the review sees the real diff).
- Never use `--no-verify` or skip hooks. Fix hook failures with a new commit.
- If the code review surfaces nothing actionable, skip step 4 and go straight to flipping ready + notifying — but say so.
- The Slack ping is the last step and the only outward-facing one; do it only after the PR is genuinely ready and the reviewer is assigned.
