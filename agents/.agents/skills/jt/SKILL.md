---
name: jt
description: Manage Companion Energy's Jolteon worktrees and run Jolteon services through Sebastian's `jt` CLI. Use whenever work in the Jolteon codebase involves listing, creating, checking out, opening, setting up, removing, or cleaning worktrees; starting work from a GitHub issue or PR; or running and stopping the dashboard app, management or analytics MCP, agent-service, browser profiles, SDK generation, diff viewer, or docs server. Also use when choosing `lcl`, `dev`, or `prd` backing environments or an auth-bypass persona. Prefer this workflow over raw `git worktree` commands and ad hoc service startup commands.
---

# JT

Use `jt` as the orchestration layer for Jolteon. It owns worktree paths, environment-file copying, dependency setup, pinned runtimes, service ports, and coordinated shutdown.

## Establish Context

1. Confirm the CLI and inspect its current contract:

   ```bash
   command -v jt
   jt help
   ```

   Treat `jt help` and the installed script as authoritative if this skill drifts. If `jt` is missing, report the setup problem instead of silently replacing it with raw worktree or service commands.

2. Decide whether the task needs a new branch, an existing remote branch, an issue worktree, a PR-review worktree, or an existing worktree.
3. Resolve the selected worktree with `jt worktree list`. Run code and service commands from that worktree's repository root.
4. Read the Jolteon instructions in that worktree before changing code or running project-specific tests.

Pass explicit branches, issue/PR numbers, environments, personas, and ports whenever they are known. Omitted values often open `fzf`, a numbered menu, or another prompt. Allocate a PTY for interactive commands. When a creation command asks which agent or editor to open, choose `none` if continuing in the current agent session.

Do not expect `jt open` to change the working directory of later automation calls: it changes an interactive parent shell through a wrapper or starts a nested shell. Instead, set the execution tool's working directory to the resolved worktree root.

## Manage Worktrees

Use the narrowest matching command:

| Intent | Command | Important behavior |
| --- | --- | --- |
| Inspect worktrees | `jt worktree list` | Non-interactive overview with source and PR state. Bare `jt wt` opens the interactive dashboard. |
| Start a new branch | `jt worktree create <branch>` | Branches from `origin/main`, immediately pushes the new branch, copies local config/env files, and installs dependencies in the background. |
| Use an existing remote branch | `jt worktree checkout <branch>` | Fetches the remote branch and creates a managed local worktree. |
| Start an issue | `jt issue start <number-or-url>` | Derives a conventional branch name, creates its worktree, and seeds the selected agent with issue context. |
| Review a PR | `jt pr review <number-or-url>` | Checks out the PR branch and seeds the selected agent with `/code-review`. Cross-fork PRs are unsupported. |
| Repair or finish setup | `jt worktree setup <branch-or-path>` | Copies env/config files and blocks while Python, frontend, and pre-commit dependencies install. |
| Enter or edit | `jt open <branch>` / `jt worktree edit <branch>` | Enters a shell or opens Zed. Prefer an explicit automation working directory when acting as an agent. |
| Safely remove one | `jt remove <branch>` | Prompts, refuses a dirty worktree, and deletes the local branch only when Git considers it merged. |

Managed worktrees live under `~/work/worktrees/jolteon` (or the existing `~/Work` variant). A branch such as `feat/example` maps to a slash-free directory such as `feat-example`, but prefer `jt worktree list` over guessing.

After creating or checking out a worktree, dependency installation continues in `<worktree>/.jt-setup.log`. If dependencies are not ready or setup failed, inspect that log and run `jt worktree setup <branch-or-path>` for a blocking retry.

Treat cleanup commands as destructive:

- Run `jt worktree cleanup` only when the user asked for cleanup. It targets managed worktrees whose branches were merged into `main` or deleted upstream, then may force-remove them after confirmation. Inspect the proposed branches and their `git status` before confirming.
- Run `jt nuke <branch>` only with explicit authorization for that exact branch. It force-removes the worktree, drops uncommitted changes, and deletes both local and remote branches.
- Never use either command to work around an unclear or dirty state.

## Run Jolteon Components

First set the command's working directory to the intended worktree root. This is an invariant: several `jt` service helpers resolve `services/...` relative to the current directory and otherwise fall back to the main checkout. Confirm with:

```bash
test "$(git rev-parse --show-toplevel)" = "$PWD"
```

Use a PTY or persistent terminal session for long-running commands. Keep their output visible, verify the announced endpoint, and use the matching `jt ... stop` command when the process should not remain running.

| Need | Start | Stop / lifecycle |
| --- | --- | --- |
| Dashboard backend + frontend | `jt app run --lcl` | `jt app stop`; ports 8000 and 5173 |
| Dashboard plus complete agent workflow | `jt app run --lcl --as <persona> --agent` | `jt app stop`; also runs analytics API 8122, analytics MCP 8003, and agent-service 8140 |
| Management MCP only | `jt mcp run --lcl` | `jt mcp stop`; default port 8002 |
| Analytics MCP stack only | `jt mcp run --analytics --lcl --as <persona>` | `jt mcp stop --analytics`; MCP 8003 plus analytics API 8122 |
| Agent-service only | `jt agent run` | `jt agent stop`; service 8140, its Docker Postgres remains running on 5433 |
| Headed authenticated browser | `jt browser open <profile> [url]` | `jt browser stop` |

Select the backing environment deliberately:

- `--lcl`: use the local development environment.
- `--dev`: run local processes against the shared development backing environment.
- `--prd`: run local processes against production backing data. Use only when the user explicitly intends production access.
- `--as <persona>`: bypass normal auth as a configured persona against the selected environment's database. Never assume a persona; use the one the user requested or the task explicitly requires.

When acting as an agent, always pass an environment flag to `jt app run` and `jt mcp run`. Without one, `jt app run` prompts with `lcl` as the default while `jt mcp run` prompts with `dev` as the default. Do not print or inspect `~/.config/jt/environments.sh`; `jt` sources it internally and it may contain credentials.

`jt app run` stops existing listeners in its known service set before starting. `jt app stop` stops process groups listening on ports 8000, 5173, 8122, 8003, and 8140, but deliberately leaves the agent Docker database running. Avoid stopping services that belong to another active task.

## Use Supporting Commands

- Run `jt sdk generate` to regenerate the dashboard API TypeScript SDK. It requires the dashboard API on port 8000 and writes generated code; review the resulting diff.
- Run `jt diff open [--base <branch>]` and `jt diff stop` for the local diff viewer.
- Run `jt docs serve [dir] [--port N]` to expose `.context` or another directory over HTTP. It binds beyond localhost, so serve only intended content.
- Run `jt pulse cors [origin]` only when explicitly asked to configure dev pulse-report access; it changes Azure Storage CORS.
- Before `jt app forward`, load and follow the `machine-ssh` skill because forwarding accesses the other machine and uses its SSH aliases. The tunnel exposes remote ports 5173, 8000, and 8140 locally.

`jt` does not replace Jolteon's test, lint, migration, or one-off package commands. Use it to select and prepare the worktree and to run the supported service stacks, then follow the target worktree's repository instructions for everything else.
