# Automatically start/attach to tmux on SSH login. Shells that start inside a
# git worktree get a worktree-scoped session; plain SSH logins keep main.
__auto_tmux() {
  [[ -o interactive ]] || return
  [[ -n "$SSH_CONNECTION" || -n "$SSH_CLIENT" ]] || return
  [[ -z "$TMUX" ]] || return
  # Agent runners (emdash, etc.) multiplex many shells over one SSH connection
  # and already cd into the right worktree. Attaching tmux here blocks the shell,
  # pinning the SSH channel open until MaxSessions is exhausted. Leave them alone.
  [[ -z "$EMDASH_TASK_ID" ]] || return
  command -v tmux &> /dev/null || return

  case "${TMUX_AUTO_SESSION:-}" in
    off|false|no|0) return ;;
  esac

  local mode="${TMUX_AUTO_SESSION:-auto}"
  local session="main"
  local session_dir="$HOME"

  if [[ "$mode" == auto || "$mode" == worktree || "$mode" == project ]]; then
    if command -v git &> /dev/null; then
      session_dir="$(git -C "$PWD" rev-parse --show-toplevel 2>/dev/null)" || session_dir="$HOME"
    fi
    if [[ "$session_dir" != "$HOME" ]]; then
      session="${session_dir#$HOME/}"
      session="${session//[^A-Za-z0-9_.-]/-}"
      session="wt-${session:-home}"
    fi
  elif [[ "$mode" == cwd ]]; then
    session_dir="$PWD"
    session="${session_dir#$HOME/}"
    session="${session//[^A-Za-z0-9_.-]/-}"
    session="cwd-${session:-home}"
  elif [[ -n "$mode" && "$mode" != main ]]; then
    session="$mode"
  fi

  tmux new-session -A -s "$session" -c "$session_dir" && exit
}
__auto_tmux
unfunction __auto_tmux 2>/dev/null

# Source secrets (not tracked in git)
[ -f ~/.secrets ] && source ~/.secrets


export PNPM_HOME="$HOME/.local/share/pnpm"
export PATH=$PATH:$HOME/.local/bin:$PNPM_HOME

# Aliases, taken from ~/.local/share/omarchy/default/bash/aliases

# File system
if command -v eza &> /dev/null; then
  alias ls='eza -lh --group-directories-first --icons=auto'
  alias lsa='ls -a'
  alias lt='eza --tree --level=2 --long --icons --git'
  alias lta='lt -a'
fi

# Ubuntu ships bat's binary as `batcat`; alias it so `bat` (and `ff` below) work everywhere
command -v bat &> /dev/null || { command -v batcat &> /dev/null && alias bat='batcat'; }

alias ff="fzf --preview 'bat --style=numbers --color=always {}'"

if command -v zoxide &> /dev/null; then
  alias cd="zd"
  zd() {
    if [ $# -eq 0 ]; then
      builtin cd ~ && return
    elif [ -d "$1" ]; then
      builtin cd "$1"
    else
      z "$@" && printf "\U000F17A9 " && pwd || echo "Error: Directory not found"
    fi
  }
fi

open() {
  if [ -n "$WSL_DISTRO_NAME" ] || grep -qi microsoft /proc/version 2>/dev/null; then
    # WSL: hand off to the Windows host so files/URLs open in Windows apps
    if command -v wslview &> /dev/null; then
      wslview "$@"
    else
      explorer.exe "$@" 2>/dev/null
    fi
  else
    xdg-open "$@" >/dev/null 2>&1 &
  fi
}

# Directories
alias ..='cd ..'
alias ...='cd ../..'
alias ....='cd ../../..'

# Git
alias g='git'
alias gcm='git commit -m'
alias gcam='git commit -a -m'
alias gcad='git commit -a --amend'

# cmux: open a new remote-SSH workspace on the home server (Tailscale)
alias remote='cmux ssh gewoonseba@100.92.46.91 --port 2222'

# Historty
HISTFILE=~/.zsh_history
HISTSIZE=50000
SAVEHIST=50000
HISTDUP=erase


setopt appendhistory
setopt sharehistory
setopt hist_ignore_all_dups
setopt hist_save_no_dups
setopt hist_ignore_dups
setopt hist_find_no_dups

# Set up fzf key bindings and fuzzy completion
command -v fzf &> /dev/null && source <(fzf --zsh)

# Setup zinit package manager
ZINIT_HOME="${XDG_DATA_HOME:-${HOME}/.local/share}/zinit/zinit.git"
[ ! -d $ZINIT_HOME ] && mkdir -p "$(dirname $ZINIT_HOME)"
[ ! -d $ZINIT_HOME/.git ] && git clone https://github.com/zdharma-continuum/zinit.git "$ZINIT_HOME"
source "${ZINIT_HOME}/zinit.zsh"

# Setup zinit plugins
zinit light zsh-users/zsh-syntax-highlighting
zinit light zsh-users/zsh-autosuggestions
zinit light zsh-users/zsh-completions

# Custom completion functions (e.g. jt)
fpath=($HOME/.zsh/completions $fpath)

autoload -U compinit && compinit

# Setup Starship and zoxide
command -v starship &> /dev/null && eval "$(starship init zsh)"
command -v zoxide &> /dev/null && eval "$(zoxide init zsh)"

# Keybindings
bindkey '^[[A' history-search-backward
bindkey '^[[B' history-search-forward

# Setup nvm
export NVM_DIR="${XDG_DATA_HOME:-${HOME}/.local/share}/nvm"
[ ! -d $NVM_DIR ] && mkdir -p "$NVM_DIR"
[ ! -s "$NVM_DIR/nvm.sh" ] && curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source "$NVM_DIR/nvm.sh"

[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"  # This loads nvm bash_completion

# Setup javm
command -v javm &> /dev/null || curl -fsSL https://javm.dev/install.sh | bash
command -v javm &> /dev/null && eval "$(javm init bash)"
export PATH="$HOME/.npm-global/bin:$PATH"


# Added by Antigravity CLI installer
export PATH="/Users/sebastianstoelen/.local/bin:$PATH"

# jt wrapper: lets the script ask us to cd the current shell into a worktree
# and (optionally) launch an AI agent in that shell after cd. Running the agent
# from the wrapper — not from inside the jt bash process — keeps the user's
# real zsh context (aliases, prompt, env) and makes the cd land in the right
# order.
jt() {
  local cd_file agent_file prompt_file rc target agent prompt
  cd_file=$(mktemp -t jt-cd 2>/dev/null) || cd_file="${TMPDIR:-/tmp}/jt-cd.$$"
  agent_file=$(mktemp -t jt-agent 2>/dev/null) || agent_file="${TMPDIR:-/tmp}/jt-agent.$$"
  prompt_file=$(mktemp -t jt-prompt 2>/dev/null) || prompt_file="${TMPDIR:-/tmp}/jt-prompt.$$"
  : > "$cd_file"
  : > "$agent_file"
  : > "$prompt_file"
  JT_CD_FILE="$cd_file" JT_AGENT_FILE="$agent_file" JT_PROMPT_FILE="$prompt_file" command jt "$@"
  rc=$?
  if [ -s "$cd_file" ]; then
    target=$(<"$cd_file")
    [ -d "$target" ] && builtin cd "$target"
  fi
  if [ -s "$agent_file" ]; then
    agent=$(<"$agent_file")
    prompt=""
    [ -s "$prompt_file" ] && prompt=$(<"$prompt_file")
    rm -f "$cd_file" "$agent_file" "$prompt_file"
    if command -v "$agent" >/dev/null 2>&1; then
      # claude/codex take the prompt positionally; agy needs -i.
      if [ -n "$prompt" ]; then
        case "$agent" in
          agy) "$agent" -i "$prompt" ;;
          *)   "$agent" "$prompt" ;;
        esac
      else
        "$agent"
      fi
      return
    else
      echo "jt: $agent not found in PATH"
      return 1
    fi
  fi
  rm -f "$cd_file" "$agent_file" "$prompt_file"
  return $rc
}


# Open the current directory in Zed as a remote-SSH project. Only active inside
# a cmux remote workspace (the remote box has no local `zed`). cmux doesn't track
# a remote workspace's cwd, so instead the remote shell — which DOES know its path
# — emits a ⌘-clickable OSC 8 link; cmux hands the zed:// URL to macOS, which opens
# it in Zed over SSH. Works from any worktree jt drops you into. `zed [subdir]`.
if [[ -n "$CMUX_WORKSPACE_ID" ]] && ! command -v zed &> /dev/null; then
  zed() {
    emulate -L zsh
    local dir="${1:-$PWD}"; [[ "$dir" = /* ]] || dir="$PWD/$dir"
    local dest="${USER}@100.92.46.91:2222"   # fallback if SSH_CONNECTION is unset
    if [[ -n "$SSH_CONNECTION" ]]; then
      local p=(${(s: :)SSH_CONNECTION}); dest="${USER}@${p[3]}:${p[4]}"
    fi
    printf '\e]8;;zed://ssh/%s%s\e\\󰏫 Open %s in Zed  (⌘-click)\e]8;;\e\\\n' \
      "$dest" "$dir" "${dir:t}"
  }
fi


# Added by Antigravity CLI installer
export PATH="/home/gewoonseba/.local/bin:$PATH"
