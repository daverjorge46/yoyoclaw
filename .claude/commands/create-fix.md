---
description: Fix bugs, issues, or layout problems with systematic root cause analysis
---

# Create Fix

Analyze and fix bugs, issues, design problems, or layout adjustments with systematic problem analysis using Yoyo-AI orchestration.

## Usage

```bash
/create-fix [issue-description]
```

## Description

Systematic bug fix workflow with intelligent debugging:

1. **Problem Identification** - Capture issue description
2. **Codebase Search** - Fire explore agent (background)
3. **Code Investigation** - Read relevant files
4. **Root Cause Analysis** - Use Oracle for complex issues
5. **Create Fix Directory** - `.yoyo-dev/fixes/YYYY-MM-DD-fix-name/`
6. **Solution Design** - Document analysis and approach
7. **User Review** - Approve solution strategy
8. **Create TDD Tasks** - Generate test-first fix tasks
9. **Execution Readiness** - Ready for /execute-tasks

## Yoyo-AI Integration (v5.0)

**Phase 0: Intent Classification**

- Classifies as "Debug" intent
- Routes to Investigation workflow

**Phase 1: Codebase Search (Parallel)**

- Fires explore agent in background:
  ```typescript
  background_task({
    agent: "explore",
    prompt: "Find all code related to ${issue}",
    name: "Bug Hunt",
  });
  ```

**Phase 2A: Investigation**

- Reads relevant files
- Analyzes error patterns
- Checks test failures

**Phase 2B: Root Cause (Oracle)**

- If complex or unclear, consult Oracle:
  ```typescript
  call_agent({
    agent: "oracle",
    prompt: "Debug root cause: ${issue} with context: ${code}",
    timeout: 120000,
  });
  ```

**Phase 3: Fix Tasks**

- Create TDD-based fix tasks
- Include verification steps
- Document expected outcomes

## Examples

```bash
# Bug with error message
/create-fix "Login button returns 401 error"

# UI issue
/create-fix "Dashboard layout breaks on mobile devices"

# Performance problem
/create-fix "Search query takes 5+ seconds"

# Test failure
/create-fix "Auth tests failing after recent changes"
```

## Workflow Steps

1. **Problem Identification**
   - Capture issue description
   - Note error messages
   - Document reproduction steps

2. **Codebase Search (Background)**
   - explore agent finds related code
   - Searches for:
     - Functions/classes mentioned in error
     - Related configuration files
     - Existing tests
     - Recent changes (git blame)

3. **Code Investigation**
   - Read files found by explore
   - Analyze error stack traces
   - Check recent git history
   - Review related tests

4. **Root Cause Analysis**
   - Simple issues: Analyze directly
   - Complex issues: Consult Oracle
   - Document findings

5. **Fix Analysis Document**
   - Problem statement
   - Root cause explanation
   - Proposed solution
   - Affected files
   - Testing strategy

6. **User Review**
   - User approves approach
   - Can request alternative solution
   - Confirms scope

7. **TDD Task Creation**
   - Write failing test first
   - Implement fix
   - Verify test passes
   - Run full test suite

8. **Execution Readiness**
   - Run `/execute-tasks` to implement
   - Yoyo-AI handles with failure recovery

## Output

Creates fix directory:

```
.yoyo-dev/fixes/YYYY-MM-DD-fix-name/
├── analysis.md          # Problem analysis
├── solution-lite.md     # Condensed summary
├── tasks.md             # Fix tasks (TDD-based)
└── state.json           # Workflow state
```

## Example Analysis Document

```markdown
# Fix Analysis: Login Button 401 Error

## Problem Statement

Login button returns 401 Unauthorized error when credentials are correct.

## Root Cause

Token generation service is using wrong signing algorithm.
Expected: RS256 (RSA + SHA-256)
Actual: HS256 (HMAC + SHA-256)

## Evidence

- Error log: "Invalid signature"
- Code location: src/auth/token-service.ts:42
- Recent change: Switched JWT library (commit abc123)
- New library defaults to HS256, not RS256

## Proposed Solution

1. Update TokenService to explicitly specify RS256
2. Update tests to verify algorithm
3. Add validation in auth middleware

## Affected Files

- src/auth/token-service.ts
- src/auth/**tests**/token-service.test.ts
- src/middleware/auth.ts

## Testing Strategy

1. Write test expecting RS256 tokens
2. Verify test fails (currently using HS256)
3. Update TokenService config
4. Verify test passes
5. Test full auth flow end-to-end
```

## Integration with Execute-Tasks

After fix analysis approved:

```bash
# Execute with Yoyo-AI (default)
/execute-tasks

# Yoyo-AI will:
# 1. Implement fix with TDD
# 2. If 3+ failures, escalate to Oracle
# 3. Run all tests
# 4. Create PR
```

## Oracle Escalation

For complex bugs, Oracle provides strategic debugging:

```bash
# Automatic escalation after 3 fix attempts fail
# Or manual consultation:
/consult-oracle "Login 401 error. Tried: token generation, signature validation, middleware config. All fail. Root cause?"
```

## Refer to Instructions

**Core Workflow:** `@.yoyo-dev/instructions/core/create-fix.md`

**Orchestration:** `@.yoyo-dev/instructions/core/yoyo-ai-orchestration.md`

**Failure Recovery:** Built into Yoyo-AI (auto-escalates to Oracle)

---

**Note:** Uses Yoyo-AI orchestration for intelligent debugging with automatic Oracle escalation. Background codebase search runs in parallel for faster analysis.
