---
name: rebase-main
description: Rebase the current branch on the latest main branch
---

# Rebase on Main

Rebase the current branch on the latest main branch.

## Steps

1. Run `git status` to check for uncommitted changes
   - If there are uncommitted changes, stash them: `git stash push -m "auto-stash before rebase-main"`
2. Run `git branch --show-current` to confirm the current branch
   - If already on main, inform the user and stop (pop the stash first if one was created)
3. Fetch the latest main: `git fetch origin main`
4. Rebase onto main: `git rebase origin/main`
5. If the rebase encounters conflicts:
   - Run `git diff --name-only --diff-filter=U` to list conflicted files
   - Read each conflicted file and resolve the conflicts using the Edit tool
   - Stage resolved files with `git add <file>`
   - Continue with `git rebase --continue`
   - Repeat until all conflicts are resolved
6. If changes were stashed in step 1, reapply them: `git stash pop`
   - If the stash pop has conflicts, inform the user and help resolve them
7. Run `git status` and `git log --oneline -10` to confirm the rebase succeeded
8. Force push the rebased branch to update the remote: `git push --force-with-lease`
9. Inform the user the rebase and push are complete
