---
name: jt-cli
description: >
  Use when working in the jolteon repo (~/work/jolteon): creating or switching
  git worktrees, starting work from a GitHub issue or PR, running the
  backend/frontend/MCP services, opening a browser, or generating the TS SDK via
  the `jt` CLI. Covers jt worktree, jt issue start, jt pr review, and jt
  app/mcp/browser/sdk/diff/docs.
version: 1.0.0
metadata:
  hermes:
    tags: [jolteon, worktree, git, cli, companion-energy]
    category: software-development
---

# jt — Jolteon worktree & service manager

`jt` manages git worktrees, services, and dev tooling for the **jolteon** monorepo.

- `REPO` = `~/work/jolteon` — the main checkout.
- `WORKSPACE` = `~/work/workspaces/jolteon` — **where worktrees live**, one dir per branch: `~/work/workspaces/jolteon/<branch>`. Worktrees are NOT created inside the repo.

## ⚠️ Running `jt` from an agent / non-interactive shell

On an interactive shell, `jt` is a **zsh function wrapper** around the real binary (`~/.local/bin/jt`). The wrapper adds two things the bare binary can't:

1. **Auto-cd** into a worktree after `create`/`open` (via `$JT_CD_FILE`).
2. **Auto-launch** an agent (claude/codex/agy) after `create` (via `$JT_AGENT_FILE`).

In a non-interactive shell only the bare binary runs, so neither happens. Two consequences:

- **`jt worktree create` and `jt issue start` PROMPT** — "Open an AI agent? 1) claude 2) codex 3) agy 4) none [4]". A non-interactive shell hangs on that `read`. **Always pipe an answer**: append `</dev/null` (selects "4) none") or `printf '4\n' | jt worktree create <branch>`.
- **You must `cd` yourself** — the new worktree is at `~/work/workspaces/jolteon/<branch>` (or run `jt worktree list` for the exact path).

### Non-interactive recipe

```bash
# 1. Create the worktree, skipping the interactive agent prompt
jt worktree create feat/my-thing </dev/null

# 2. Enter it (WORKSPACE/<branch>)
cd ~/work/workspaces/jolteon/feat/my-thing

# 3. On create, jt copies .env files, CLAUDE.md, .claude/, .cursor/, .vscode/,
#    .compound-engineering/ SYNCHRONOUSLY, but runs `uv sync` / `npm i` /
#    pre-commit install in the BACKGROUND (log: <worktree>/.jt-setup.log).
#    Wait for deps before building/testing:
cat .jt-setup.log        # check progress; or:
jt worktree setup .      # blocking re-run of the full setup
```

## Command reference

### Worktree (alias `wt`)
| Command | Purpose |
|---|---|
| `jt worktree create <branch>` | New worktree + branch at `WORKSPACE/<branch>` (interactive prompt — pipe `</dev/null`). |
| `jt worktree checkout <branch>` | Worktree from an existing **remote** branch. |
| `jt worktree list` | List all worktrees + paths. |
| `jt worktree open [branch]` | cd into a worktree (needs the shell wrapper; interactive picker if no branch). |
| `jt worktree setup [branch\|path]` | **Blocking** copy env files + install deps (default: cwd). |
| `jt worktree remove <branch>` | Remove a worktree + local branch (safe). |
| `jt worktree cleanup` | Bulk-remove worktrees whose branch is merged into main or whose upstream is gone. |
| `jt worktree nuke <branch>` | Force-remove worktree + delete local **AND remote** branch (destructive — confirm first). |

### Issue / PR
- `jt issue start <url|number>` — worktree+branch from a GitHub issue (branch inferred from type + title), then launches the chosen agent. Non-interactive: pipe `</dev/null`, then drive the agent yourself.
- `jt pr review <url|number>` — checks out the PR branch into a worktree and launches the agent with `/code-review`.

### Services & tooling
- `jt app run [--lcl|--dev|--prd]` — start backend + frontend (default `--lcl`); `jt app stop`; `jt app forward` SSH-tunnels dev ports (5173/8000/8002) to localhost.
- `jt mcp run [--lcl|--dev|--prd] [--port N]` — start MCP service (default `--dev`, port 8002); `jt mcp stop [--port N]`.
- `jt browser open <profile> [url]` — headed browser (default localhost:5173); `jt browser stop`.
- `jt sdk generate` — regenerate the dashboard-api TypeScript SDK (dashboard-api must be running).
- `jt diff open [--base <branch>]` / `jt diff stop` — PR-style local diff viewer.
- `jt docs serve [dir] [--port N]` — serve a worktree's `.context` folder over HTTP.
- `jt setup [branch|path]` — alias for `jt worktree setup`.

## Pitfalls
- Long-running services (`jt app run`, `jt mcp run`) don't return — background them / use a separate terminal and poll; don't block on them.
- `jt worktree nuke` deletes the **remote** branch too — never run without explicit confirmation.
- Most subcommands assume you're inside a jolteon worktree (jt prints a hint to that effect on error).
