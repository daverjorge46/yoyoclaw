#!/bin/bash
# Wrapper to load environment before running extract-facts
source ~/.zshenv 2>/dev/null || true
exec /Users/steve/clawd/scripts/extract-facts.sh "$@"
