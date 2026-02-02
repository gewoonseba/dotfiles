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
- **Linux**: Use `yay` over `pacman` or other package managers whenever possible
- **macOS**: Platform-specific configs go in separate folders (e.g., `cursor-macos/`)

## Tool Configurations

### Current Tools
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

## Adding a New Tool

1. Create a new top-level folder: `tool-name/`
2. Place config files inside with their full path structure (as if in `$HOME`)
3. Add install/setup scripts to `scripts/.local/bin/` if needed
4. Update `STOW_FOLDERS` in `scripts/.local/bin/setup` if it should be auto-stowed
5. Test stow operation: `stow tool-name`

## Important Files

- `.stow-global-ignore`: Controls what files stow ignores (e.g., `.DS_Store`)
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
