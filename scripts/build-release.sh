#!/usr/bin/env bash
set -euo pipefail

# Build script for petter account
# Usage: ./scripts/build-release.sh v2026.1.6

VERSION="${1:-}"
if [[ -z "$VERSION" ]]; then
  echo "Usage: $0 <version>"
  echo "Example: $0 v2026.1.6"
  exit 1
fi

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LATEST_DIR="$REPO_ROOT/.worktrees/latest"
BRANCH_NAME="release/$VERSION"

echo "🚀 Building Clawdbot $VERSION"
echo ""

cd "$REPO_ROOT"

# Remove existing 'latest' worktree if it exists
if [[ -d "$LATEST_DIR" ]]; then
  echo "🧹 Removing existing 'latest' worktree..."
  git worktree remove "$LATEST_DIR" --force 2>/dev/null || rm -rf "$LATEST_DIR"
  echo ""
fi

# Create worktree at 'latest' using the tag (detached HEAD)
if git rev-parse --verify --quiet "$VERSION" >/dev/null; then
  echo "📂 Creating worktree 'latest' from tag $VERSION (detached HEAD)..."
  git worktree add --detach "$LATEST_DIR" "$VERSION"
else
  echo "❌ Error: Tag '$VERSION' does not exist"
  echo "   Available tags: $(git tag | grep '^v2026' | tail -5 | tr '\n' ' ')"
  exit 1
fi
echo ""

# Navigate to worktree
cd "$LATEST_DIR"
echo "📍 Working directory: $(pwd)"
echo ""

# Initialize submodules (required for Peekaboo and its dependencies)
if [[ ! -d "Peekaboo/Core/PeekabooCore" ]]; then
  echo "📦 Initializing submodules..."
  git submodule update --init --recursive
  echo ""
fi

# Skip hotfix application - build upstream as-is
echo "⏭️  Skipping hotfix application (building upstream as-is)"
echo ""

# Install dependencies if needed
if [[ ! -d "node_modules" ]]; then
  echo "📦 Installing dependencies..."
  pnpm self-update
  pnpm install
  echo ""
fi

# Build
echo "🔨 Building app..."
BUILD_ARCHS="arm64" \
DISABLE_LIBRARY_VALIDATION=1 \
./scripts/package-mac-app.sh

echo ""
echo "✅ Build complete!"
echo ""

echo "Build location: $LATEST_DIR/dist/Clawdbot.app"
echo "Version: $VERSION"
echo ""
echo "Next steps:"
echo "1. Switch to admin account"
echo "2. Run: ./scripts/deploy-release.sh"
echo ""
