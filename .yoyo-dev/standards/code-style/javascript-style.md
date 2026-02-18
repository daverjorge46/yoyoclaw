# JavaScript/TypeScript Style Guide

## Context

JavaScript and TypeScript coding standards for Yoyo Dev projects using React 18 + TypeScript, Vite, and Convex.

## General Formatting

### Indentation

- Use 2 spaces for indentation
- Maintain consistent indentation throughout files

### Naming Conventions

- **Variables and Functions**: Use camelCase (e.g., `userId`, `calculateTotal`)
- **Components**: Use PascalCase (e.g., `UserProfile`, `PaymentForm`)
- **Constants**: Use UPPER_SNAKE_CASE (e.g., `MAX_RETRY_COUNT`, `API_TIMEOUT`)
- **Types/Interfaces**: Use PascalCase with descriptive names (e.g., `UserData`, `ApiResponse`)
- **Private Functions**: Prefix with underscore (e.g., `_handleInternalState`)

### String Formatting

- Prefer template literals for string interpolation: `Hello ${name}`
- Use single quotes for simple strings: `'Hello World'`
- Use template literals for multi-line strings

## TypeScript Specific

### Type Safety

- Always define explicit types for function parameters and return values
- Avoid `any` type - use `unknown` if type is truly unknown
- Use type inference where TypeScript can reliably infer the type
- Define interfaces for object shapes and API responses

### Type Definitions

```typescript
// Good: Explicit types
interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: "admin" | "user";
}

function getUserProfile(userId: string): Promise<UserProfile> {
  // implementation
}

// Avoid: Implicit any
function processData(data) {
  // TypeScript can't help here
}
```

### Generics

- Use generics for reusable type-safe functions and components
- Provide descriptive generic names beyond single letters when it improves clarity

## React 18 Patterns

### Component Structure

```typescript
// Functional component with TypeScript
interface ButtonProps {
  label: string
  onClick: () => void
  variant?: 'primary' | 'secondary'
  disabled?: boolean
}

export function Button({ label, onClick, variant = 'primary', disabled = false }: ButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`btn btn-${variant}`}>
      {label}
    </button>
  )
}
```

### Hooks Usage

- Place hooks at the top of components
- Use descriptive names for custom hooks (prefix with `use`)
- Keep hooks focused on single responsibility

```typescript
function useUserData(userId: string) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUser(userId)
      .then(setUser)
      .finally(() => setLoading(false));
  }, [userId]);

  return { user, loading };
}
```

### State Management

- Use `useState` for local component state
- Use `useReducer` for complex state logic
- Prefer Convex queries for server state
- Keep state close to where it's used

## Convex Integration

### Queries and Mutations

```typescript
// queries/users.ts
import { query } from "./_generated/server";
import { v } from "convex/values";

export const getUserProfile = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("id"), args.userId))
      .first();
  },
});

// mutations/users.ts
import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const updateUserProfile = mutation({
  args: {
    userId: v.string(),
    name: v.string(),
    email: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, {
      name: args.name,
      email: args.email,
    });
  },
});
```

### Using Convex in Components

```typescript
import { useQuery, useMutation } from 'convex/react'
import { api } from '../convex/_generated/api'

function UserProfile({ userId }: { userId: string }) {
  const user = useQuery(api.queries.users.getUserProfile, { userId })
  const updateProfile = useMutation(api.mutations.users.updateUserProfile)

  if (user === undefined) return <div>Loading...</div>
  if (user === null) return <div>User not found</div>

  return <div>{user.name}</div>
}
```

## Code Organization

### File Structure

- One component per file
- Co-locate related files (component, styles, tests)
- Group by feature, not by file type

```
src/
  features/
    auth/
      components/
        LoginForm.tsx
        SignupForm.tsx
      hooks/
        useAuth.ts
      types.ts
    users/
      components/
        UserProfile.tsx
        UserList.tsx
      hooks/
        useUserData.ts
      types.ts
```

### Import Organization

```typescript
// 1. External libraries
import React, { useState, useEffect } from "react";
import { useQuery } from "convex/react";

// 2. Internal utilities and types
import { api } from "../convex/_generated/api";
import type { UserProfile } from "./types";

// 3. Components
import { Button } from "../components/Button";

// 4. Styles (if not using Tailwind exclusively)
import "./styles.css";
```

## Error Handling

### Try-Catch Patterns

```typescript
async function fetchUserData(userId: string): Promise<UserProfile | null> {
  try {
    const response = await fetch(`/api/users/${userId}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch user: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error("Error fetching user:", error);
    return null;
  }
}
```

### Error Boundaries

- Use error boundaries for component-level error handling
- Provide fallback UI for graceful degradation

## Performance Optimization

### Memoization

```typescript
import { useMemo, useCallback } from 'react'

function ExpensiveComponent({ data }: { data: number[] }) {
  // Memoize expensive calculations
  const processedData = useMemo(() => {
    return data.map(item => item * 2).filter(item => item > 10)
  }, [data])

  // Memoize callbacks passed to child components
  const handleClick = useCallback(() => {
    console.log('Clicked!')
  }, [])

  return <ChildComponent data={processedData} onClick={handleClick} />
}
```

### Code Splitting

```typescript
import { lazy, Suspense } from 'react'

const HeavyComponent = lazy(() => import('./HeavyComponent'))

function App() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <HeavyComponent />
    </Suspense>
  )
}
```

## Comments and Documentation

### JSDoc for Functions

```typescript
/**
 * Calculates the total price including tax
 * @param price - Base price before tax
 * @param taxRate - Tax rate as decimal (e.g., 0.1 for 10%)
 * @returns Total price including tax
 */
function calculateTotal(price: number, taxRate: number): number {
  return price * (1 + taxRate);
}
```

### Inline Comments

- Add comments for complex business logic
- Explain "why" not "what"
- Keep comments concise and up-to-date

## Persona-Specific Guidelines

### Frontend Persona

- Prioritize accessibility (ARIA labels, semantic HTML)
- Optimize for performance (lazy loading, code splitting)
- Focus on user experience (loading states, error messages)
- Ensure responsive design (mobile-first approach)

### Backend Persona (Convex)

- Design efficient database queries
- Implement proper error handling in mutations
- Consider rate limiting and abuse prevention
- Monitor query performance

### Performance Persona

- Profile components with React DevTools
- Minimize re-renders with memoization
- Optimize bundle size with code splitting
- Monitor and set performance budgets

### Security Persona

- Sanitize user inputs
- Implement proper authentication checks
- Use Clerk's built-in security features
- Validate data on both client and server

### QA Persona

- Write comprehensive tests for components
- Test edge cases and error states
- Ensure accessibility compliance
- Validate type safety
