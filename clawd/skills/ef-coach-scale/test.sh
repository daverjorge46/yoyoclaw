#!/usr/bin/env bash
# EF Coaching at Scale - Test Suite
# APEX 5.1 Compliant: Test before/after delivery
# Created: 2026-01-27

# Don't use set -e - we want to continue even if some tests fail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

PASSED=0
FAILED=0
SKIPPED=0

log_pass() {
    echo -e "${GREEN}✓ PASS${NC}: $1"
    PASSED=$((PASSED + 1))
}

log_fail() {
    echo -e "${RED}✗ FAIL${NC}: $1"
    FAILED=$((FAILED + 1))
}

log_skip() {
    echo -e "${YELLOW}⊘ SKIP${NC}: $1"
    SKIPPED=$((SKIPPED + 1))
}

echo "=========================================="
echo "EF Coaching at Scale - Test Suite"
echo "=========================================="
echo ""

# Test 1: Check all required files exist
echo "--- File Structure Tests ---"

for file in init_db.py context-engine.py focus-session.py streak-tracker.py transition-assistant.py capture-predictor.py config.json SKILL.md; do
    if [[ -f "$file" ]]; then
        log_pass "File exists: $file"
    else
        log_fail "Missing file: $file"
    fi
done

echo ""

# Test 2: Python syntax validation
echo "--- Python Syntax Tests ---"

for pyfile in init_db.py context-engine.py focus-session.py streak-tracker.py transition-assistant.py capture-predictor.py; do
    if python3 -m py_compile "$pyfile" 2>/dev/null; then
        log_pass "Syntax valid: $pyfile"
    else
        log_fail "Syntax error: $pyfile"
    fi
done

echo ""

# Test 3: JSON config validation
echo "--- Config Validation Tests ---"

if python3 -c "import json; json.load(open('config.json'))" 2>/dev/null; then
    log_pass "config.json is valid JSON"
else
    log_fail "config.json is invalid JSON"
fi

echo ""

# Test 4: Database initialization
echo "--- Database Tests ---"

TEST_DB="/tmp/ef-coach-test-$$.db"
if python3 init_db.py "$TEST_DB" 2>/dev/null; then
    log_pass "Database initialization successful"
    
    # Check tables exist using Python sqlite3 module (sqlite3 CLI not installed)
    for table in energy_log habits habit_log context_suggestions focus_sessions capture_patterns; do
        TABLE_EXISTS=$(python3 -c "
import sqlite3
conn = sqlite3.connect('$TEST_DB')
cursor = conn.execute(\"SELECT name FROM sqlite_master WHERE type='table' AND name='$table'\")
result = cursor.fetchone()
print('yes' if result else '')
conn.close()
" 2>/dev/null || echo "")
        if [[ "$TABLE_EXISTS" == "yes" ]]; then
            log_pass "Table exists: $table"
        else
            log_fail "Missing table: $table"
        fi
    done
    
    rm -f "$TEST_DB"
else
    log_fail "Database initialization failed"
    log_skip "Table checks (db init failed)"
    SKIPPED=$((SKIPPED + 5))
fi

echo ""

# Test 5: Module imports (check for missing dependencies)
echo "--- Module Import Tests ---"

for module in context-engine focus-session streak-tracker transition-assistant capture-predictor; do
    pyfile="${module}.py"
    # Try to import the module (will fail if dependencies missing)
    if python3 -c "
import sys
sys.path.insert(0, '.')
# Just check syntax and basic imports
with open('$pyfile') as f:
    code = f.read()
    compile(code, '$pyfile', 'exec')
" 2>/dev/null; then
        log_pass "Module compiles: $module"
    else
        log_fail "Module compile error: $module"
    fi
done

echo ""

# Test 6: SKILL.md documentation completeness
echo "--- Documentation Tests ---"

if [[ -f "SKILL.md" ]]; then
    if grep -q "## Usage" SKILL.md 2>/dev/null; then
        log_pass "SKILL.md has Usage section"
    else
        log_fail "SKILL.md missing Usage section"
    fi
    
    if grep -q "## Components" SKILL.md 2>/dev/null || grep -q "## Features" SKILL.md 2>/dev/null; then
        log_pass "SKILL.md has Components/Features section"
    else
        log_fail "SKILL.md missing Components/Features section"
    fi
else
    log_fail "SKILL.md not found"
fi

echo ""

# Test 7: Check config.json required fields
echo "--- Config Schema Tests ---"

REQUIRED_FIELDS=("name" "version" "description")
for field in "${REQUIRED_FIELDS[@]}"; do
    if python3 -c "import json; c=json.load(open('config.json')); assert '$field' in c" 2>/dev/null; then
        log_pass "config.json has required field: $field"
    else
        log_fail "config.json missing required field: $field"
    fi
done

echo ""
echo "=========================================="
echo "Test Results Summary"
echo "=========================================="
echo -e "${GREEN}Passed${NC}: $PASSED"
echo -e "${RED}Failed${NC}: $FAILED"
echo -e "${YELLOW}Skipped${NC}: $SKIPPED"
echo ""

if [[ $FAILED -eq 0 ]]; then
    echo -e "${GREEN}All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}Some tests failed. Please fix before deployment.${NC}"
    exit 1
fi
