# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

This is a **dotfiles repository** that uses **GNU Stow** to manage configuration files across Linux and macOS machines. Stow creates symlinks from this repository to `$HOME`, allowing version-controlled config files while maintaining their expected locations in the filesystem.

## Core Architecture

### Stow-Based Structure

Each tool has its own top-level folder (e.g., `cursor/`, `zsh/`, `starship/`). Inside each folder, config files are placed **as if they were in the home directory**. When stowed:

- `tool-name/.config/app/config.json` becomes `~/.config/app/config.json`
- `tool-name/.zshrc` becomes `~/.zshrc`

**Critical**: Always maintain the "as if in home directory" structure within tool folders. When adding configs for a new tool, replicate the exact path structure expected from `$HOME`.

### Install Scripts Location

**All install scripts belong in `scripts/.local/bin/`**. These handle installation, setup, and maintenance tasks. Scripts must:

- Find dotfiles root relative to their location: `$(cd "$(dirname "$0")/../../../" && pwd)`
- Use `set -e` for error handling
- Be executable (`chmod +x`)

## Key Commands

### Stow Operations

```bash
# From repository root
stow folder-name          # Create symlinks for a folder
stow -D folder-name       # Remove symlinks (destow)
```

### Setup and Installation

```bash
# Run master setup script
./scripts/.local/bin/setup

# Cursor extension management
./scripts/.local/bin/cursor-sync-extensions     # Sync extensions to match extensions.txt
./scripts/.local/bin/cursor-install-extensions  # Install missing extensions only
./scripts/.local/bin/cursor-update-extensions   # Update extensions list from installed

# Install tod CLI (Linux only, requires yay)
./scripts/.local/bin/tod-install
```

### Platform-Specific Notes

- **All platforms**: `setup` runs `ensure_ssh_maxsessions` — on any machine with `sshd` it
  prompts to raise `MaxSessions` to `100` in `/etc/ssh/sshd_config` (default `10` is too low
  for parallel-agent tools like emdash, which multiplex many channels — shells + sftp — over one
  SSH connection). Idempotent: skips if an active `MaxSessions` line already exists. Needs sudo;
  reloads sshd after. Note a running connection keeps the limit it opened with, so reconnect to
  pick up the new value.
- **Linux**: Use `yay` over `pacman` or other package managers whenever possible
- **macOS**: Platform-specific configs go in separate folders (e.g., `cursor-macos/`)
- **WSL (Ubuntu)**: `setup` detects WSL (via `is_wsl`) and tailors itself for a headless install:
  - **Stows only the headless-safe set**: `zsh starship claude scripts`. Desktop-only folders
    (`ghostty`, `hypr`, `cursor*`, `zed`) are excluded — edit from the Windows host (e.g.
    Cursor/VS Code over Remote-WSL). The `gamemode-install` / `photo-backup` scripts are
    Arch-gaming / macOS-`/Volumes` only and never run here.
  - **Installs `wslu`** so the `open` function (in `zsh/.zshrc`) routes files/URLs to the Windows
    host via `wslview` (falling back to `explorer.exe`); native Linux/macOS still use `xdg-open`.
  - **Ensures zsh is the login shell** (prompts for `chsh`) and installs baseline CLI tools
    (`jq`, `eza`, `bat` — aliased from `batcat` on Ubuntu, etc.).
  - **Protects `~/.claude`**: a pre-existing real `settings.json` is backed up to
    `settings.json.pre-stow.bak` before stowing; live runtime files (credentials, history) are
    never touched.

## Tool Configurations

### Current Tools

- **agents/**: Shared agent skills for Claude Code, Codex, and Antigravity (see below)
- **claude/**: Claude Code settings and commands (skills live in `agents/`)
- **cursor/**: Cursor IDE (shared configs)
  - `.config/Cursor/User/settings.json`
  - `.config/Cursor/User/keybindings.json`
- **cursor-macos/**: macOS-specific Cursor configs
- **cursor-extensions/**: Extension management via `extensions.txt`
- **ghostty/**: Ghostty terminal emulator
- **hypr/**: Hyprland window manager (Linux)
- **scripts/**: All install and maintenance scripts in `.local/bin/`
- **starship/**: Starship prompt configuration
- **zsh/**: Zsh shell configuration

### Shared Agent Skills (`agents/`)

Claude Code, Codex, and Antigravity (`agy`) all use the same `SKILL.md`
format. To avoid duplicating skills, the canonical source lives in **one
place** — `agents/.agents/skills/` — and is exposed to every agent at its
expected path.

```
agents/.agents/skills/<name>/SKILL.md     ← canonical: edit here
```

`agents-sync-skills` (run by `setup`, or anytime manually) sets this up:

1. `stow agents` → `~/.agents/skills/` becomes a folder of real files
   pointing into the repo.
2. The script then wires each agent's expected location to it:
   - `~/.claude/skills`                                → symlink to `~/.agents/skills`
   - `~/Library/Application Support/Antigravity/skills` → symlink to `~/.agents/skills` (macOS)
   - `~/.codex/skills/<name>`                          → per-skill symlinks
     (Codex bundles its own `.system/` here, so we can't replace the parent.)

Cursor and other per-repo agents pick skills up automatically when a project
has its own `.cursor/skills/` or `.agents/skills/`; the global set isn't
exposed to them.

**Adding a new skill**: create `agents/.agents/skills/<name>/SKILL.md`, then
run `agents-sync-skills` to refresh the Codex per-skill symlinks (adds new,
removes dangling). Claude/agy/Cursor pick it up immediately with no rerun
needed — they're whole-dir symlinks.

## Adding a New Tool

1. Create a new top-level folder: `tool-name/`
2. Place config files inside with their full path structure (as if in `$HOME`)
3. Add install/setup scripts to `scripts/.local/bin/` if needed
4. Update `STOW_FOLDERS` in `scripts/.local/bin/setup` if it should be auto-stowed
5. Test stow operation: `stow tool-name`

## Important Files

- `.stow-global-ignore`: Controls what files stow ignores (e.g., `.DS_Store`). Stow only reads this from `$HOME`, so the setup script symlinks the repo's copy to `~/.stow-global-ignore` on first run. If stow conflicts on macOS junk files, check that this symlink exists.
- `.cursorrules` and `.cursor/rules/project-overview.mdc`: Contain the same structure and philosophy documented here
- `cursor-extensions/extensions.txt`: Single source of truth for Cursor extensions
- `scripts/.local/bin/setup`: Master setup script that runs sub-installers and stows configured folders

## Critical Patterns

### Script Path Resolution

Scripts in `scripts/.local/bin/` are 3 levels deep from the root. Standard pattern:

```bash
DOTFILES_DIR=$(cd "$(dirname "$0")/../../../" && pwd)
```

### Stow Behavior

- Stow creates **symlinks**, so edits in the repo immediately affect actual configs
- Test stow operations before committing changes
- Use `stow -D` to remove symlinks before re-stowing

### Extension Management

The `cursor-sync-extensions` script enforces the `extensions.txt` list as the single source of truth—it installs missing extensions AND uninstalls extensions not in the list.

## Behavioral Guidelines

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

Tradeoff: These guidelines bias toward caution over speed. For trivial tasks, use judgment.

1. Think Before Coding
   Don't assume. Don't hide confusion. Surface tradeoffs.

Before implementing:

State your assumptions explicitly. If uncertain, ask.
If multiple interpretations exist, present them - don't pick silently.
If a simpler approach exists, say so. Push back when warranted.
If something is unclear, stop. Name what's confusing. Ask. 2. Simplicity First
Minimum code that solves the problem. Nothing speculative.

No features beyond what was asked.
No abstractions for single-use code.
No "flexibility" or "configurability" that wasn't requested.
No error handling for impossible scenarios.
If you write 200 lines and it could be 50, rewrite it.
Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

3. Surgical Changes
   Touch only what you must. Clean up only your own mess.

When editing existing code:

Don't "improve" adjacent code, comments, or formatting.
Don't refactor things that aren't broken.
Match existing style, even if you'd do it differently.
If you notice unrelated dead code, mention it - don't delete it.
When your changes create orphans:

Remove imports/variables/functions that YOUR changes made unused.
Don't remove pre-existing dead code unless asked.
The test: Every changed line should trace directly to the user's request.

4. Goal-Driven Execution
   Define success criteria. Loop until verified.

Transform tasks into verifiable goals:

"Add validation" → "Write tests for invalid inputs, then make them pass"
"Fix the bug" → "Write a test that reproduces it, then make it pass"
"Refactor X" → "Ensure tests pass before and after"
For multi-step tasks, state a brief plan:

1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
   Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

These guidelines are working if: fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.
