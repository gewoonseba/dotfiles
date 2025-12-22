#!/bin/bash

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
EXTENSIONS_FILE="$SCRIPT_DIR/extensions.txt"

if [ ! -f "$EXTENSIONS_FILE" ]; then
    echo "Error: extensions.txt not found at $EXTENSIONS_FILE"
    exit 1
fi

if ! command -v cursor &> /dev/null; then
    echo "Error: cursor command not found. Is Cursor installed?"
    exit 1
fi

echo "Installing Cursor extensions..."
while IFS= read -r extension; do
    # Skip empty lines and comments
    [[ -z "$extension" || "$extension" =~ ^# ]] && continue
    
    echo "Installing: $extension"
    cursor --install-extension "$extension"
done < "$EXTENSIONS_FILE"

echo "Done! All extensions installed."
