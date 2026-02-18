---
description: Generate/Update focused documentation for README.md file, components, functions, APIs, and features
---

# Update Documentation

Generate or update focused documentation for specific targets using the angeles-writer agent.

## Usage

```bash
/update-documentation [target] [--type inline|external|api|guide] [--style brief|detailed]
```

## Arguments

- `target` (required): Path to file, directory, or feature name to document
- `--type` (optional): Documentation type to generate
  - `inline` - Code comments, JSDoc, docstrings
  - `external` - Standalone documentation files
  - `api` - API reference documentation
  - `guide` - User guides and tutorials
  - Default: `external`
- `--style` (optional): Documentation verbosity
  - `brief` - Concise, essential information
  - `detailed` - Comprehensive with examples
  - Default: `detailed`

## Description

Delegates to **angeles-writer** agent for documentation generation:

1. **Analyze** - Examine target structure, interfaces, and functionality
2. **Identify** - Determine documentation requirements and audience
3. **Generate** - Create appropriate content based on type and style
4. **Format** - Apply consistent structure and patterns
5. **Integrate** - Ensure compatibility with existing documentation

## Agent Delegation

This command uses the **angeles-writer** agent (Sonnet preferred for cost efficiency):

```typescript
Task({
  subagent_type: "angeles-writer",
  prompt: "Generate ${type} documentation for ${target} in ${style} style",
  description: "Documentation: ${target}",
});
```

## Examples

### README Generation

```bash
# Generate README for a module
/update-documentation src/auth/ --type external
# Creates src/auth/README.md with module overview

# Update project README with new features
/update-documentation README.md
# Updates existing README.md based on codebase changes
```

### Inline Code Documentation

```bash
# Add JSDoc comments to JavaScript/TypeScript files
/update-documentation src/utils/helpers.ts --type inline
# Generates JSDoc comments for all exported functions

# Document Python module
/update-documentation lib/core.py --type inline --style detailed
# Generates comprehensive docstrings with examples
```

### API Reference Generation

```bash
# Document REST API endpoints
/update-documentation src/api --type api --style detailed
# Creates API.md with endpoints, schemas, and examples

# Document Convex functions
/update-documentation convex/users.ts --type api
# Creates convex/users.md with query/mutation documentation
```

### User Guide Creation

```bash
# Create feature guide
/update-documentation payment-module --type guide --style brief
# Creates user-focused documentation with common use cases

# Create getting started guide
/update-documentation . --type guide
# Creates comprehensive project guide
```

### Component Documentation

```bash
# Document React component library
/update-documentation src/components/ --type external
# Creates README.md for each component with props and examples

# Document single component
/update-documentation src/components/Button.tsx --type api
# Creates detailed component documentation
```

## Documentation Types

### Inline Documentation

Adds code comments directly to source files:

- **TypeScript/JavaScript**: JSDoc with `@param`, `@returns`, `@example`
- **Python**: Docstrings with Google/NumPy style
- **Rust**: `///` doc comments with examples
- **Go**: Godoc comments

**Best for:**

- Function/method documentation
- Type definitions and interfaces
- Complex algorithm explanations

### External Documentation

Creates standalone markdown files:

- README.md for directories/modules
- Usage guides and examples
- Architecture documentation
- Migration guides

**Best for:**

- Module overviews
- Installation instructions
- Project structure documentation

### API Documentation

Creates reference material for interfaces:

- Function signatures and parameters
- Return types and exceptions
- Usage examples and error handling
- Related functions and cross-references

**Best for:**

- Library documentation
- REST API endpoints
- GraphQL schemas
- Convex queries and mutations

### User Guides

Creates tutorial-style documentation:

- Getting started guides
- Feature tutorials
- Troubleshooting guides
- Best practices

**Best for:**

- Onboarding new developers
- Feature explanations
- Common workflows

## Output

Documentation is written to appropriate locations:

| Type       | Output Location                                 |
| ---------- | ----------------------------------------------- |
| `inline`   | Same file (modified in place)                   |
| `external` | `{target}/README.md` or `{target}.md`           |
| `api`      | `{target}/API.md` or `{target}-api.md`          |
| `guide`    | `docs/{target}-guide.md` or `{target}/GUIDE.md` |

## Boundaries

**Will:**

- Generate focused documentation for specific components and features
- Create multiple documentation formats based on target audience
- Integrate with existing documentation and maintain consistency
- Use appropriate language-specific documentation patterns

**Will Not:**

- Generate documentation without reading the source code first
- Override existing documentation standards or project conventions
- Create documentation that exposes sensitive implementation details
- Modify code logic when adding inline documentation

## Tool Coordination

The angeles-writer agent uses:

- **Read** - Analyze target code and existing documentation
- **Grep** - Extract references and identify patterns
- **Write** - Create new documentation files
- **Edit** - Add inline documentation to existing files
- **Glob** - Process multi-file documentation projects

## Integration with Workflow

**After implementation:**

```bash
# Document newly created feature
/execute-tasks          # Implement feature
/update-documentation src/new-feature/ --type external
```

**Before PR:**

```bash
# Ensure documentation is current
/update-documentation src/modified-module/ --type api
git add docs/
git commit -m "docs: update API documentation"
```

**For code review:**

```bash
# Add inline documentation for clarity
/update-documentation src/complex-algorithm.ts --type inline
```

---

**Note:** Uses angeles-writer agent with Sonnet preferred for cost efficiency. Documentation quality follows project standards automatically.
