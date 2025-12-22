#!/bin/bash

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
EXTENSIONS_FILE="$SCRIPT_DIR/extensions.txt"

if ! command -v cursor &> /dev/null; then
    echo "Error: cursor command not found. Is Cursor installed?"
    exit 1
fi

echo "Updating extensions list..."
cursor --list-extensions > "$EXTENSIONS_FILE"

echo "Extensions list updated at: $EXTENSIONS_FILE"
echo "Total extensions: $(wc -l < "$EXTENSIONS_FILE")"
echo ""
echo "Don't forget to commit the changes:"
echo "  git add cursor-extensions/extensions.txt"
echo "  git commit -m 'Update Cursor extensions list'"
