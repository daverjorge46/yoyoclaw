#!/usr/bin/env bash
# Ralph Wiggum Loop — Safe Scaffolding (v1.0)
# Generated: 2026-02-05
# Purpose: Continuous task execution with deterministic gates and safety checks
#
# IMPORTANT: This is SCAFFOLDING ONLY during bootstrap.
# It validates readiness and logs status but does NOT auto-execute code changes.
# Future Claude sessions may enhance this with plugin support.

set -euo pipefail

# Configuration
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEVPACK_DIR="${REPO_ROOT}/docs/_sophie_devpack"
TODO_QUEUE="${DEVPACK_DIR}/TODO_QUEUE.md"
LOOP_RULES="${DEVPACK_DIR}/LOOP_RULES.md"
LOOP_LOG="${DEVPACK_DIR}/LOOP_LOG.md"
SLEEP_SECONDS="${RALPH_SLEEP:-60}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Utility functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $*"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $*"
}

log_warning() {
    echo -e "${YELLOW}[WARN]${NC} $*"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $*"
}

timestamp() {
    date -u +"%Y-%m-%dT%H:%M:%SZ"
}

# Verify required files exist
verify_environment() {
    log_info "Verifying environment..."

    if [[ ! -f "${TODO_QUEUE}" ]]; then
        log_error "TODO_QUEUE not found: ${TODO_QUEUE}"
        exit 1
    fi

    if [[ ! -f "${LOOP_RULES}" ]]; then
        log_error "LOOP_RULES not found: ${LOOP_RULES}"
        exit 1
    fi

    if [[ ! -f "${LOOP_LOG}" ]]; then
        log_warning "LOOP_LOG not found, creating: ${LOOP_LOG}"
        echo "# Ralph Loop Log" > "${LOOP_LOG}"
        echo "**Generated:** $(timestamp)" >> "${LOOP_LOG}"
        echo "" >> "${LOOP_LOG}"
    fi

    log_success "Environment verified"
}

# Find next READY task from TODO_QUEUE
find_next_task() {
    log_info "Scanning TODO_QUEUE for READY tasks..."

    # This is a placeholder implementation
    # Real implementation would parse TODO_QUEUE.md and extract READY tasks

    local ready_tasks
    ready_tasks=$(grep -E "^\s*-\s*\[READY\]" "${TODO_QUEUE}" | head -1 || true)

    if [[ -z "${ready_tasks}" ]]; then
        log_warning "No READY tasks found in queue"
        return 1
    fi

    echo "${ready_tasks}"
    return 0
}

# Run lint
run_lint() {
    log_info "Running lint..."
    cd "${REPO_ROOT}"

    if pnpm -s lint; then
        log_success "Lint passed"
        return 0
    else
        log_error "Lint failed"
        return 1
    fi
}

# Run tests
run_tests() {
    log_info "Running tests..."
    cd "${REPO_ROOT}"

    if pnpm -s test; then
        log_success "Tests passed"
        return 0
    else
        log_error "Tests failed"
        return 1
    fi
}

# Write loop log entry
write_log_entry() {
    local task="$1"
    local status="$2"
    local message="$3"

    {
        echo ""
        echo "## $(timestamp)"
        echo "**Task:** ${task}"
        echo "**Status:** ${status}"
        echo "**Message:** ${message}"
    } >> "${LOOP_LOG}"
}

# Main loop iteration
loop_iteration() {
    local iteration=$1

    log_info "========================================="
    log_info "Ralph Loop Iteration #${iteration}"
    log_info "========================================="

    # Find next task
    local next_task
    if ! next_task=$(find_next_task); then
        write_log_entry "NONE" "IDLE" "No READY tasks in queue"
        return 0
    fi

    log_info "Selected task: ${next_task}"

    # Run lint
    if ! run_lint; then
        write_log_entry "${next_task}" "BLOCKED" "Lint failed"
        log_error "Stopping loop due to lint failure"
        return 1
    fi

    # Run tests
    if ! run_tests; then
        write_log_entry "${next_task}" "BLOCKED" "Tests failed"
        log_error "Stopping loop due to test failure"
        return 1
    fi

    # SCAFFOLDING NOTE: In bootstrap, we only validate
    # Future implementations will create branches and execute tasks here
    write_log_entry "${next_task}" "VALIDATED" "Lint and tests pass; ready for implementation"

    log_success "Iteration complete"
    return 0
}

# Main entry point
main() {
    log_info "Ralph Loop starting..."
    log_info "Repo root: ${REPO_ROOT}"
    log_info "Sleep interval: ${SLEEP_SECONDS}s"

    verify_environment

    iteration=1
    while true; do
        if ! loop_iteration "${iteration}"; then
            log_error "Loop failed at iteration ${iteration}"
            log_error "Check ${LOOP_LOG} for details"
            exit 1
        fi

        log_info "Sleeping ${SLEEP_SECONDS}s before next iteration..."
        sleep "${SLEEP_SECONDS}"

        ((iteration++))
    done
}

# Handle Ctrl-C gracefully
trap 'echo ""; log_warning "Loop interrupted by user"; exit 0' INT TERM

# Run
main "$@"
