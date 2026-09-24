---
name: jt
description: Manage Companion Energy's Jolteon worktrees and run Jolteon services through Sebastian's `jt` CLI. Use whenever work in the Jolteon codebase involves listing, creating, checking out, opening, setting up, removing, or cleaning worktrees; starting work from a GitHub issue or PR; running and stopping the dashboard app or a parallel per-worktree environment (`jt env`), the agent stack (agent-service, LiteLLM gateway, analytics and management MCPs), browser profiles, SDK generation, diff viewer, or docs server; seeding local databases; or taking Tiger forks. Also use when choosing a backing environment (`local`, `dev`, `fork`, `prd-fork`) or deciding between a real login and an auth-bypass persona. Prefer this workflow over raw `git worktree` commands and ad hoc service startup commands.
---

# JT

Use `jt` as the orchestration layer for Jolteon. It owns worktree paths, environment-file copying, dependency setup, pinned runtimes, service ports, local databases, Tiger forks, and coordinated shutdown.

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

Managed worktrees live under `~/Work/worktrees/jolteon` (or the `~/work` variant). A branch such as `feat/example` maps to a slash-free directory such as `feat-example`, but prefer `jt worktree list` over guessing. Worktrees an agent harness creates (for example under `~/Work/jolteon/.claude/worktrees/`) start without env files or dependencies, and the app's services crash at import until they are set up.

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

Use a PTY or persistent terminal session for long-running commands. Keep their output visible, verify the announced endpoints, and use the matching `jt ... stop` command when the process should not remain running.

| Need | Start | Stop / lifecycle |
| --- | --- | --- |
| Your own app, alongside other worktrees' (the default for agents) | `jt env up [--agent]` | `jt env down`; see "Your own environment" below |
| Dashboard backend + frontend | `jt app run --dev` | `jt app stop`; ports 8000 and 5173 |
| Dashboard plus the whole agent stack | `jt app run --dev --agent` | `jt app stop`; adds analytics API 8122, analytics MCP 8003, management MCP 8002 (on this backend), agent-service 8140, LiteLLM gateway 4000, and the invoice worker. Every hop is local. |
| Seeded local databases | `jt db seed`, then `jt app run --local [--agent]` | `jt db status`; `jt db seed` rebuilds `jolteon_seed` + `agent_seed` from scratch |
| Production data | `jt app run --prd-fork --as root [--agent]` | Runs on a Tiger fork pair (see below); throwaway, auto-deleted |
| Management MCP only | `jt mcp run --dev` | `jt mcp stop`; port 8002, pointed at the *deployed* dashboard-api of that env |
| Analytics MCP stack only | `jt mcp run --analytics --dev --as <persona>` | `jt mcp stop --analytics`; MCP 8003 plus analytics API 8122 |
| Agent-service only | `jt agent run` | `jt agent stop`; service 8140, its Docker Postgres remains running on 5433 |
| Headed authenticated browser | `jt browser open <profile> [url]` | `jt browser stop` |

### Environments

Always pass an environment flag to `jt app run` and `jt mcp run`. Without one they prompt, defaulting to `dev`.

- `--dev`: the shared development databases. Writable and shared with the team, so treat writes as visible to others.
- `--local`: seeded databases on this machine (`jolteon_seed` on :5432, `agent_seed` on :5433), built by `jt db seed` from the migrations plus dev's real organizations, users and memberships (same ids, so the dev login works) and a demo site. Disposable. `jt db seed` refuses while any session has those databases open. That is usually another worktree's running app, so ask before passing `--force`. Set `JT_LOCAL_JOLTEON_DB` / `JT_LOCAL_AGENT_DB` to seed and run a separate pair instead.
- `--fork`: a throwaway Tiger fork of dev. Take one when a change involves a migration.
- `--prd-fork`: a throwaway Tiger fork of production: real customer data, writable. Use it only when the user explicitly wants production data, and never for anything recorded or posted on a PR. It requires `--as`.
- `--prd`: refused by `jt app run`. It still exists for `jt mcp run`, where it means the deployed production dashboard-api.

Forks come in pairs (Jolteon + agent-service) and are shared state across every worktree. `jt fork status` shows what is recorded and how long it has left. `jt app run --fork/--prd-fork` offers to take a fresh pair when the recorded one has expired. That takes 2–5 minutes and bills a production-sized instance for its whole duration, so reuse a live pair, and ask before replacing one somebody else took. `jt fork create/delete/use` manage pairs explicitly.

### Signing in

By default every mode is a real login: open http://localhost:5173 and sign in with a dev WorkOS account. That needs a person at the keyboard.

`--as <persona>` is the auth bypass. Personas such as `root`, `partner` and `customer` are defined in `~/.config/jt/environments.sh`; on `--local` the dev ones apply. Use it only when:

- the environment requires it (`--prd-fork`), or
- you, an agent, must drive the browser yourself and cannot type a password.

Never pick a persona the user or task did not call for. Under the bypass, agent-service ignores the persona and always acts as one fixed root global admin. So the assistant works on whichever customer the browser views, files conversations under that fixed user, cannot forward a token to invoice intake, and does not exercise access checks.

Do not print or inspect `~/.config/jt/environments.sh`. `jt` sources it internally and it contains credentials.

### Your own environment (`jt env`)

`jt app run` holds the machine's shared ports, so only one worktree can run it at a time. As an agent, run the app in an environment of your own instead. It is the same `jt app run` in a network namespace of its own: every service keeps its usual port inside, and several environments run side by side.

```bash
jt env up --agent                                  # from your worktree; drop --agent if you only need frontend + backend
jt env exec -- curl -s localhost:8000/health       # anything that talks to the app goes through exec
jt env exec -- agent-browser open http://localhost:5173
jt env logs                                        # every service's output
jt env down                                        # when you are done
```

- The environment is named after the worktree, so commands run from inside it need no name. `jt env list` shows every environment with its state and memory.
- Reach it only through `jt env exec`. A plain `curl localhost:8000`, or a browser on the host, talks to whatever the host runs, not to your environment. `jt env exec` also gives `agent-browser` a session of its own inside the environment.
- `--local` is the default: databases of its own, seeded from dev's identities on first start. `--dev` and `--fork` share data with other people.
- It runs a real login by default, and you cannot type a password. When you must click through the UI yourself, start it with `--as root` (`jt env down`, then `jt env up --as root …`).
- A full environment (`--agent`) holds about 4.5 GB and a plain one about 2.5 GB, so the machine fits two or three full ones. Check `jt env list` before starting, add `--agent` only when the task touches the assistant or the MCPs, and stop yours when you are done.
- When you hand a running environment to the user for a manual check, give them both commands exactly as `jt env up` printed them, each in its own `bash` block so it can be copied. First the one for their Mac, where they then open http://localhost:5173:

  ```bash
  jt app forward --env <name>
  ```

  and the one for this machine, which opens a browser window inside the environment:

  ```bash
  jt env open <name>
  ```

### Shared ports

This section is about `jt app run`; an environment from `jt env up` holds none of these. Ports 5173, 8000, 8002, 8003, 8122, 8140 and 4000 are shared by every worktree on the machine, and only one app can hold them. `jt app run` refuses to start while another worktree holds them and names the owner. Before taking them, ask the other agent sessions whether they still need the app (`ListAgents`, then `SendMessage`) and act on the answer. `jt app stop` kills whatever holds those ports, including another session's app, so run it only for your own instance or once its owner has released it. Verify with `ss -ltnp | grep -E ':(5173|8000)'` rather than trusting the command's output. The agent Docker database (5433) and Azurite (10000) are deliberately left running.

## Use Supporting Commands

- Run `jt sdk generate` to regenerate the dashboard API TypeScript SDK. It requires the dashboard API on port 8000 and writes generated code; review the resulting diff.
- Run `jt invoice run` / `jt invoice stop` to restart only the invoice reconciliation worker. `jt app run --agent` already starts it.
- Run `jt diff open [--base <branch>]` and `jt diff stop` for the local diff viewer.
- Run `jt docs serve [dir] [--port N]` to expose `.context` or another directory over HTTP. It binds beyond localhost, so serve only intended content.
- Run `jt pulse cors [origin]` only when explicitly asked to configure dev pulse-report access; it changes Azure Storage CORS.
- Before `jt app forward`, load and follow the `machine-ssh` skill because forwarding accesses the other machine and uses its SSH aliases. The tunnel exposes remote ports 5173, 8000 and 8140 locally.

`jt` does not replace Jolteon's test, lint, migration, or one-off package commands. Use it to select and prepare the worktree and to run the supported service stacks, then follow the target worktree's repository instructions for everything else.
