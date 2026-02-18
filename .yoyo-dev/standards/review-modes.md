# Review Modes

## Context

Critical review approaches for Yoyo Dev projects when you need extra scrutiny. These modes are **opt-in only** and used via the `/yoyo-review` command or `--review` flag on `/execute-tasks`.

**When to use review modes:**

- Project has accumulated technical debt
- Bugs keep reappearing in the same area
- Performance is degrading
- Security audit needed
- Production issues require root cause analysis

**Default behavior:** Yoyo Dev uses constructive, systematic development. Review modes are tools for specific situations, not the default approach.

---

## Available Review Modes

### Devil's Advocate Mode (`--devil`)

**Purpose:** Find flaws, naive assumptions, and failure modes before they happen.

**Approach:**

- Assume the implementation is broken until proven otherwise
- Point out edge cases that will cause failures
- Challenge architectural decisions
- Identify "what will break" scenarios
- Question assumptions about APIs, frameworks, and system capabilities

**When to use:**

- Before major refactoring
- When similar bugs keep appearing
- Complex distributed systems work
- Critical business logic implementation
- After multiple failed attempts at a feature

**Example prompts:**

```
/yoyo-review --devil "Review the authentication flow"
/execute-tasks --review=devil
```

**Review checklist:**

- [ ] What happens when the API is down?
- [ ] What happens with concurrent requests?
- [ ] What edge cases are unhandled?
- [ ] What assumptions will break in production?
- [ ] What will fail at scale?
- [ ] What's the worst-case scenario?

---

### Security Review Mode (`--security`)

**Purpose:** Identify security vulnerabilities, data leaks, and attack vectors.

**Approach:**

- Threat modeling for the feature
- Check for common vulnerabilities (OWASP Top 10)
- Validate authentication and authorization
- Check for data exposure
- Review input validation
- Check for injection attacks

**When to use:**

- Authentication/authorization changes
- Payment processing
- User data handling
- API endpoints
- File uploads
- Admin functionality

**Review checklist:**

- [ ] Authentication properly validated?
- [ ] Authorization checked on all endpoints?
- [ ] Input sanitized and validated?
- [ ] SQL/NoSQL injection prevented?
- [ ] XSS vulnerabilities eliminated?
- [ ] CSRF protection in place?
- [ ] Sensitive data encrypted?
- [ ] Secrets not hardcoded?
- [ ] Rate limiting implemented?
- [ ] Audit logging for sensitive operations?

---

### Performance Review Mode (`--performance`)

**Purpose:** Identify performance bottlenecks, memory leaks, and scalability issues.

**Approach:**

- Analyze algorithmic complexity
- Check for N+1 queries
- Review database indexing
- Check for memory leaks
- Analyze render performance
- Review bundle size impact

**When to use:**

- Slow page loads
- High database query times
- Memory usage growing
- Large data sets
- Real-time features
- Mobile performance issues

**Review checklist:**

- [ ] Algorithm complexity acceptable? (O(n) vs O(n²))
- [ ] Database queries optimized?
- [ ] Proper indexes in place?
- [ ] N+1 query problems eliminated?
- [ ] Unnecessary re-renders prevented?
- [ ] Large lists virtualized?
- [ ] Images optimized and lazy-loaded?
- [ ] Bundle size impact acceptable?
- [ ] Memory leaks prevented?
- [ ] Caching strategy effective?

---

### Production Readiness Mode (`--production`)

**Purpose:** Ensure code is ready for production deployment.

**Approach:**

- Comprehensive error handling
- Logging and monitoring
- Graceful degradation
- Rollback procedures
- Performance under load
- Configuration management

**When to use:**

- Before major releases
- Critical features
- Infrastructure changes
- Database migrations
- API changes

**Review checklist:**

- [ ] All errors handled gracefully?
- [ ] User-friendly error messages?
- [ ] Logging for debugging?
- [ ] Monitoring/alerting configured?
- [ ] Rollback procedure documented?
- [ ] Feature flags for gradual rollout?
- [ ] Database migrations reversible?
- [ ] Configuration externalized?
- [ ] Health checks implemented?
- [ ] Load tested?

---

### Pre-Mortem Analysis Mode (`--premortem`)

**Purpose:** Before implementation, identify why it will fail.

**Approach:**

- Assume the feature has failed in production
- Work backwards to identify causes
- Document failure scenarios
- Plan mitigations before building

**When to use:**

- Complex new features
- Architectural changes
- Third-party integrations
- High-risk deployments

**Analysis questions:**

1. What am I not seeing?
2. What will break in production?
3. What's naive about this approach?
4. What external dependencies can fail?
5. What happens at 10x scale?
6. What regulatory/compliance issues exist?

---

### Code Quality Mode (`--quality`)

**Purpose:** Enforce high code quality standards.

**Approach:**

- Review code maintainability
- Check test coverage
- Enforce style guidelines
- Review documentation
- Check for technical debt

**When to use:**

- Code reviews
- Refactoring sessions
- Technical debt reduction
- Onboarding new developers

**Review checklist:**

- [ ] Code follows style guide?
- [ ] Functions are focused and small?
- [ ] Variable names are clear?
- [ ] Comments explain "why" not "what"?
- [ ] Tests cover edge cases?
- [ ] Test coverage meets threshold (50%+)?
- [ ] Documentation up to date?
- [ ] No commented-out code?
- [ ] No TODO comments without tickets?
- [ ] Dependencies up to date?

---

## Using Review Modes

### Review Existing Code

```bash
/yoyo-review --devil "Review the payment processing flow"
/yoyo-review --security "Audit the authentication system"
/yoyo-review --performance "Analyze the dashboard query performance"
```

### Execute Tasks with Review Mode

```bash
/execute-tasks --review=devil
/execute-tasks --review=security
/execute-tasks --review=performance
```

### Combine Multiple Modes

```bash
/yoyo-review --security --performance "Review the API endpoints"
```

---

## Review Mode Behaviors

### What Review Modes DO

✅ **Point out specific issues** - "This function has O(n²) complexity"
✅ **Suggest fixes** - "Use a Set for O(1) lookups instead"
✅ **Ask critical questions** - "What happens when the API times out?"
✅ **Challenge assumptions** - "This assumes the user array is always sorted"
✅ **Identify risks** - "This hardcoded key will leak in the bundle"

### What Review Modes DON'T DO

❌ **Block all progress** - Review modes still help you build
❌ **Provide endless criticism** - Focus on actionable issues
❌ **Assume everything is wrong** - Point out specific problems
❌ **Refuse to help** - Suggest improvements, don't just complain

---

## Best Practices

1. **Use review modes strategically** - Not for every task
2. **Apply early for complex features** - Pre-mortem before building
3. **Layer reviews** - Start with --devil, then --security, then --performance
4. **Document findings** - Add to decisions.md
5. **Fix critical issues first** - Prioritize security and correctness
6. **Use QA persona for testing** - Review modes complement persona testing

---

## Integration with Personas

Review modes work alongside Yoyo Dev personas:

- **Architect** + `--premortem` - Design validation
- **Security** + `--security` - Security audit
- **Performance** + `--performance` - Performance optimization
- **QA** + `--devil` - Edge case testing
- **Analyzer** + `--production` - Production readiness

---

## Example Workflows

### Workflow 1: High-Risk Feature

```bash
# 1. Pre-mortem analysis
/yoyo-review --premortem "Authentication system redesign"

# 2. Create spec with findings
/create-new

# 3. Execute with devil's advocate
/execute-tasks --review=devil

# 4. Security audit before PR
/yoyo-review --security "Review authentication implementation"
```

### Workflow 2: Performance Crisis

```bash
# 1. Identify bottleneck
/yoyo-review --performance "Dashboard loading slowly"

# 2. Create fix with analysis
/create-fix

# 3. Execute with performance review
/execute-tasks --review=performance
```

### Workflow 3: Production Incident

```bash
# 1. Devil's advocate on failed feature
/yoyo-review --devil "Why did the payment flow fail?"

# 2. Create fix with root cause
/create-fix

# 3. Production readiness check
/execute-tasks --review=production
```

---

## Configuration

Review modes can be configured in `.yoyo-dev/config.yml`:

```yaml
review_modes:
  default_mode: none # Options: none, devil, security, performance, production
  auto_enable:
    security: true # Auto-enable for auth changes
    performance: false
  severity_threshold: high # Options: low, medium, high, critical
```

---

## The Golden Rule

**Review modes are tools, not defaults.**

Use them when you need extra scrutiny. Trust the systematic Yoyo Dev workflow for normal development. Apply review modes strategically when projects go sideways.
