---
name: deslop
description: Remove AI-generated code slop and clean up code style
---

# Remove AI code slop

Check the diff against main and remove AI-generated slop introduced in the branch.

## Focus Areas

- Extra comments that are unnecessary
- Defensive checks or try/catch blocks that are abnormal for trusted code paths
- Casts to `any` used only to bypass type issues
- Deeply nested code that should be simplified with early returns
- Other patterns inconsistent with the file and surrounding codebase

### Dealing with Unnecessary Comments

- Commments should be used only sparingly across to code to explain complex logic or provide context. It should be an added value, not a crutch to make sloppy code readable.
- Splitting code into smaller, more focussed funtions is preferred over adding comments
- When certain behaviour is critical for a function, capture it in a test instead of relying on comments

## Guardrails

- Keep behavior unchanged unless fixing a clear bug.
- Prefer minimal, focused edits over broad rewrites.
- Keep the final summary concise (1-3 sentences).
