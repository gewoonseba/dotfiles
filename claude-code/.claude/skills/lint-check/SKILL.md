---
name: lint-check
description: Check for linting, formatting, and type errors across Python and TypeScript
---

# Lint Check

Check for linting, formatting, and type errors across the codebase.

## Steps

1. Run all checks in parallel:
   - **Python lint**: `uv run ruff check .`
   - **Python format**: `uv run ruff format --check .`
   - **Python types**: `uv run pyright`
   - **Frontend lint**: `npm run lint -w services/frontend`
   - **Frontend dead code**: `npm run dead-code -w services/frontend`
2. Summarize the results to the user:
   - List each check as passed or failed
   - For failed checks, show the number of issues and the most important ones
   - If all checks pass, confirm the codebase is clean
