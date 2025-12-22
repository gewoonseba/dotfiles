#!/bin/bash

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DOTFILES_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
EXTENSIONS_FILE="$DOTFILES_DIR/cursor-extensions/extensions.txt"

if ! command -v cursor &> /dev/null; then
    echo "Error: cursor command not found. Is Cursor installed?"
    exit 1
fi

if [ ! -f "$EXTENSIONS_FILE" ]; then
    echo "Error: extensions.txt not found at $EXTENSIONS_FILE"
    exit 1
fi

echo "Syncing Cursor extensions..."
echo ""

# Get currently installed extensions
mapfile -t INSTALLED < <(cursor --list-extensions)

# Get extensions from file (skip empty lines and comments)
mapfile -t DESIRED < <(grep -v '^#' "$EXTENSIONS_FILE" | grep -v '^[[:space:]]*$')

# Convert arrays to associative arrays for easier lookup
declare -A installed_map
declare -A desired_map

for ext in "${INSTALLED[@]}"; do
    installed_map["$ext"]=1
done

for ext in "${DESIRED[@]}"; do
    desired_map["$ext"]=1
done

# Install missing extensions
echo "=== Installing missing extensions ==="
installed_count=0
for ext in "${DESIRED[@]}"; do
    if [[ ! ${installed_map["$ext"]} ]]; then
        echo "Installing: $ext"
        cursor --install-extension "$ext"
        ((installed_count++))
    fi
done

if [ $installed_count -eq 0 ]; then
    echo "No extensions to install."
fi
echo ""

# Uninstall extensions not in the list
echo "=== Removing extensions not in list ==="
removed_count=0
for ext in "${INSTALLED[@]}"; do
    if [[ ! ${desired_map["$ext"]} ]]; then
        echo "Uninstalling: $ext"
        cursor --uninstall-extension "$ext"
        ((removed_count++))
    fi
done

if [ $removed_count -eq 0 ]; then
    echo "No extensions to remove."
fi
echo ""

echo "=== Sync Complete ==="
echo "Installed: $installed_count"
echo "Removed: $removed_count"