---
name: rename-branch
description: Rename the current git branch using conventional naming (feat/, fix/, chore/, prototype/) with optional GitHub ticket reference
---

# Rename Branch

Rename the current git branch to follow the project's branch naming convention.

## Branch Naming Convention

**Prefix** (based on scope of the change):
- `feat/` — a new feature
- `fix/` — a bugfix
- `chore/` — non-user-facing changes that are small in scope
- `prototype/` — experiments that should not be merged

**With GitHub ticket:**
`<prefix>/<ticket>-<short-description>`
Example: `feat/1234-add-user-auth`

**Without GitHub ticket:**
`<prefix>/<short-description>`
Example: `fix/null-pointer-in-parser`

## Steps

1. Run `git branch --show-current` to get the current branch name.
2. Run `git log main..HEAD --oneline` to understand what changes are on this branch.
3. Run `git diff main --stat` to see which files were changed.
4. Based on the changes, determine the appropriate prefix (`feat/`, `fix/`, `chore/`, or `prototype/`). If the scope is ambiguous, ask the user.
5. If the user provided a GitHub ticket number (e.g. `#1234` or just `1234`), include it after the prefix.
6. Generate a short kebab-case description (2-5 words) summarizing the branch's purpose.
7. Present the proposed new branch name to the user for confirmation.
8. Rename the branch:
   ```bash
   git branch -m <old-name> <new-name>
   ```
9. If the old branch was tracking a remote, inform the user that they may need to push the new branch and delete the old remote branch. Do NOT push or delete automatically.
