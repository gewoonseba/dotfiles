---
name: lint-fix
description: Fix linting and formatting issues across Python and TypeScript
---

# Lint Fix

Automatically fix linting and formatting issues, then report remaining problems that need manual attention.

## Steps

1. Run auto-fixers in parallel:
   - **Python lint fix**: `uv run ruff check --fix .`
   - **Python format**: `uv run ruff format .`
   - **Frontend lint fix**: `npm run lint-fix -w services/frontend`
2. After auto-fixers complete, run checks to find remaining issues:
   - **Python lint**: `uv run ruff check .`
   - **Python types**: `uv run pyright`
   - **Frontend lint**: `npm run lint -w services/frontend`
   - **Frontend dead code**: `npm run dead-code -w services/frontend`
3. For any remaining issues that couldn't be auto-fixed:
   - Read the relevant files and fix the issues manually using the Edit tool
   - Re-run the failing checks to confirm they pass
4. Summarize what was fixed automatically vs manually
