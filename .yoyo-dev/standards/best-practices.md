# Development Best Practices

## Context

Global development guidelines for Yoyo Dev projects using React 18 + TypeScript, Vite, Convex, Clerk, and Tailwind CSS v4.

<conditional-block context-check="core-principles">
IF this Core Principles section already read in current context:
  SKIP: Re-reading this section
  NOTE: "Using Core Principles already in context"
ELSE:
  READ: The following principles

## Core Principles

### Keep It Simple

- Implement code in the fewest lines possible
- Avoid over-engineering solutions
- Choose straightforward approaches over clever ones
- Leverage framework features instead of custom implementations

### Optimize for Readability

- Prioritize code clarity over micro-optimizations
- Write self-documenting code with clear variable names
- Add comments for "why" not "what"
- Use TypeScript types to document intent

### DRY (Don't Repeat Yourself)

- Extract repeated business logic to utility functions
- Extract repeated UI patterns to reusable components
- Create custom hooks for shared stateful logic
- Use Convex queries/mutations for shared data operations

### File Structure

- Keep files focused on a single responsibility
- Group related functionality together (feature-based organization)
- Use consistent naming conventions
- Co-locate related files (components, hooks, types, tests)
  </conditional-block>

<conditional-block context-check="dependencies" task-condition="choosing-external-library">
IF current task involves choosing an external library:
  IF Dependencies section already read in current context:
    SKIP: Re-reading this section
    NOTE: "Using Dependencies guidelines already in context"
  ELSE:
    READ: The following guidelines
ELSE:
  SKIP: Dependencies section not relevant to current task

## Dependencies

### Choose Libraries Wisely

When adding third-party dependencies:

- Select the most popular and actively maintained option
- Check the library's GitHub repository for:
  - Recent commits (within last 6 months)
  - Active issue resolution
  - Number of stars/downloads
  - Clear documentation
  - TypeScript support
- Verify compatibility with React 18 and Vite
- Consider bundle size impact
  </conditional-block>

## Tech Stack Best Practices

### React 18 + TypeScript

#### Component Design

- Use functional components exclusively
- Define prop types with TypeScript interfaces
- Keep components small and focused
- Extract complex logic to custom hooks
- Use React.memo for expensive components

#### State Management

- Use `useState` for simple local state
- Use `useReducer` for complex state logic
- Prefer Convex queries for server state over client-side caching
- Keep state as close as possible to where it's used
- Avoid prop drilling - use composition or context

#### Hooks Guidelines

- Follow Rules of Hooks (call at top level, consistent order)
- Create custom hooks for reusable logic
- Name custom hooks with `use` prefix
- Keep hooks focused on single responsibility
- Properly declare dependencies in useEffect/useMemo/useCallback

### Vite Configuration

#### Build Optimization

- Configure code splitting for route-based chunks
- Use dynamic imports for large dependencies
- Set up environment variables correctly (.env files)
- Optimize asset handling (images, fonts)
- Monitor bundle size with rollup-plugin-visualizer

#### Development Experience

- Enable HMR for fast feedback
- Use Vite plugins sparingly (only when necessary)
- Configure path aliases for cleaner imports
- Set up proper TypeScript integration

### Convex Best Practices

#### Query Design

- Keep queries focused and efficient
- Use indexes for frequently queried fields
- Implement pagination for large datasets
- Cache queries appropriately
- Handle loading and error states

#### Mutation Design

- Validate inputs comprehensively
- Keep mutations atomic and focused
- Handle errors gracefully
- Return meaningful results
- Consider optimistic updates for better UX

#### Schema Design

- Define clear schemas with validators
- Use appropriate data types
- Consider denormalization for performance
- Plan for future schema evolution
- Document schema relationships

### Clerk Authentication

#### Security Best Practices

- Always validate authentication on server (Convex functions)
- Use Clerk's built-in session management
- Implement proper role-based access control
- Secure all API endpoints and mutations
- Never trust client-side authentication alone

#### User Experience

- Provide clear authentication flows
- Handle authentication errors gracefully
- Implement proper loading states
- Support multiple authentication methods
- Test authentication edge cases

### Tailwind CSS v4

#### Styling Patterns

- Use Tailwind utility classes exclusively
- Follow multi-line responsive class formatting (see code-style/css-style.md)
- Create reusable component classes sparingly
- Maintain consistent spacing scale
- Use Tailwind's color system

#### Design System

- Extend Tailwind configuration for brand colors
- Define custom breakpoints if needed (including xs: 400px)
- Use consistent component patterns
- Document design tokens
- Ensure dark mode support

## Persona-Driven Development

### Architect Persona

**When to Apply**: Designing new features, refactoring major systems, technical decision-making

**Best Practices**:

- Design for change and evolution
- Minimize coupling between modules
- Create clear boundaries and interfaces
- Document architectural decisions
- Think in systems and long-term maintainability
- Prefer proven patterns over innovation
- Consider scalability from the start

**Example Application**:

- Designing feature module structure
- Planning data flow architecture
- Establishing component hierarchies
- Defining API contracts

### Frontend Persona

**When to Apply**: Building UI components, implementing user interactions, styling

**Best Practices**:

- Prioritize user experience over technical elegance
- Design mobile-first, then enhance for larger screens
- Ensure accessibility (ARIA labels, keyboard navigation, screen readers)
- Optimize for perceived performance
- Test across devices and browsers
- Handle loading and error states gracefully
- Progressive enhancement approach

**Example Application**:

- Building form components with validation
- Implementing responsive layouts
- Creating accessible navigation
- Optimizing images and assets

### Backend Persona (Convex)

**When to Apply**: Writing queries/mutations, designing schemas, server-side logic

**Best Practices**:

- Design for reliability and data integrity
- Optimize query performance with indexes
- Implement comprehensive error handling
- Validate all inputs server-side
- Monitor performance metrics
- Plan for scalability (pagination, caching)
- Handle edge cases and race conditions

**Example Application**:

- Designing database schemas
- Writing efficient queries
- Implementing mutations with validation
- Handling concurrent updates

### Security Persona

**When to Apply**: Authentication, authorization, data validation, sensitive operations

**Best Practices**:

- Never trust client input
- Validate and sanitize all data
- Implement defense in depth
- Use Clerk's security features properly
- Secure all API endpoints
- Handle sensitive data carefully
- Regular security audits
- Plan for security incidents

**Example Application**:

- Implementing authorization checks
- Securing mutations and queries
- Handling user data
- Implementing rate limiting

### Performance Persona

**When to Apply**: Optimizing slow features, improving load times, reducing bundle size

**Best Practices**:

- Measure before optimizing
- Focus on user-perceived performance
- Implement code splitting strategically
- Optimize images and assets
- Use memoization judiciously
- Monitor performance budgets
- Profile before and after changes
- Test on low-end devices

**Example Application**:

- Optimizing component re-renders
- Implementing lazy loading
- Reducing bundle size
- Improving time to interactive

### QA Persona

**When to Apply**: Writing tests, code reviews, validating implementations

**Best Practices**:

- Test behavior, not implementation
- Cover edge cases and error states
- Ensure accessibility compliance
- Validate type safety
- Test user workflows end-to-end
- Automate regression testing
- Think like an adversarial user
- Maintain high test coverage

**Example Application**:

- Writing component tests
- Testing form validation
- E2E user workflow tests
- Accessibility testing

### Refactorer Persona

**When to Apply**: Code cleanup, reducing technical debt, improving maintainability

**Best Practices**:

- Refactor incrementally
- Maintain test coverage during refactoring
- Simplify before optimizing
- Extract reusable patterns
- Improve naming and clarity
- Reduce coupling
- Document refactoring decisions
- Keep behavior unchanged

**Example Application**:

- Extracting custom hooks
- Simplifying complex components
- Removing code duplication
- Improving code organization

### Analyzer Persona

**When to Apply**: Debugging issues, investigating bugs, understanding code behavior

**Best Practices**:

- Follow evidence, not assumptions
- Create minimal reproduction cases
- Eliminate potential causes systematically
- Document investigation process
- Question initial hypotheses
- Use debugging tools effectively
- Consider multiple root causes
- Verify fixes thoroughly

**Example Application**:

- Debugging rendering issues
- Investigating performance problems
- Tracing data flow issues
- Understanding third-party behavior

### Mentor Persona

**When to Apply**: Documentation, onboarding, explaining complex concepts

**Best Practices**:

- Explain concepts progressively
- Use clear examples and analogies
- Check for understanding
- Provide context and reasoning
- Encourage questions
- Adapt to learning style
- Document for future reference
- Focus on understanding over completion

**Example Application**:

- Writing component documentation
- Creating onboarding guides
- Explaining architectural decisions
- Teaching new patterns

## Collaboration Patterns

### Sequential Workflows

Apply personas in sequence for comprehensive development:

1. **Design → Implementation → Validation**
   - Architect: Design system architecture
   - Frontend/Backend: Implement features
   - QA: Validate implementation
   - Security: Review security aspects

2. **Investigation → Fix → Optimization**
   - Analyzer: Identify root cause
   - Refactorer: Clean up problem area
   - Performance: Optimize if needed
   - QA: Verify fix

### Parallel Application

Apply multiple personas simultaneously:

- **Frontend + Backend + Security**: Full-stack feature development
- **QA + Performance + Accessibility**: Comprehensive quality review
- **Refactorer + Analyzer**: Technical debt analysis and cleanup

## Quality Gates

Before considering any feature complete:

1. **Functionality**: Feature works as specified
2. **Type Safety**: No TypeScript errors
3. **Testing**: Adequate test coverage
4. **Accessibility**: WCAG compliance
5. **Performance**: Meets performance budgets
6. **Security**: No security vulnerabilities
7. **Code Quality**: Follows style guidelines
8. **Documentation**: Adequately documented
