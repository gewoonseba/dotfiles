export PATH=$PATH:$HOME/.local/bin

# Aliases, taken from ~/.local/share/omarchy/default/bash/aliases

# File system
if command -v eza &> /dev/null; then
  alias ls='eza -lh --group-directories-first --icons=auto'
  alias lsa='ls -a'
  alias lt='eza --tree --level=2 --long --icons --git'
  alias lta='lt -a'
fi

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
  xdg-open "$@" >/dev/null 2>&1 &
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
source <(fzf --zsh)

# Setup zinit package manager
ZINIT_HOME="${XDG_DATA_HOME:-${HOME}/.local/share}/zinit/zinit.git"
[ ! -d $ZINIT_HOME ] && mkdir -p "$(dirname $ZINIT_HOME)"
[ ! -d $ZINIT_HOME/.git ] && git clone https://github.com/zdharma-continuum/zinit.git "$ZINIT_HOME"
source "${ZINIT_HOME}/zinit.zsh"

# Setup zinit plugins
zinit light zsh-users/zsh-syntax-highlighting
zinit light zsh-users/zsh-autosuggestions
zinit light zsh-users/zsh-completions
autoload -U compinit && compinit

# Setup Starship and zoxide
eval "$(starship init zsh)"
eval "$(zoxide init zsh)"

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
