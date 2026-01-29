#!/bin/bash
# Wrapper to load environment before running synthesize-memory
source ~/.zshenv 2>/dev/null || true
exec /Users/steve/clawd/scripts/synthesize-memory.sh "$@"
