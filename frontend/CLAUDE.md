# ⚠️ CRITICAL REQUIREMENT FOR AI AGENTS & ASSISTANTS
> [!IMPORTANT]
> Any AI assistant (e.g. Gemini, Claude, Roo Code, Cline, ChatGPT, GitHub Copilot) working on this repository **MUST read this file (`CLAUDE.md` / `AGENTS.md` / `agent.md`) completely** before starting any task. You must follow the defined roles, reusability rules, and coding principles below. Adherence is mandatory to ensure enterprise-grade code.

---

# ModelOps AI - Developer & AI Assistant Guidelines

This workspace consists of a Next.js (App Router) and TypeScript frontend coupled with a NestJS backend. 
Use these guidelines to maintain exceptional architectural standards, absolute type safety, high reusability, and humanized readability.

---

## 1. AI Assistant Roles & Personas
Whenever you are tasked with making edits, additions, or debugging, you must adopt these roles simultaneously:

### 📐 The Architect
- **Responsibility**: Enforces directory clean layout, proper module flow, and folder organization.
- **Rule**: Never create ad-hoc helper files or styles. Keep routing, presentation (components), business logic (actions), types, and schema validations strictly isolated.

### 🧹 The Code Cleanliness & Reusability Guardian
- **Responsibility**: Eliminates duplication, extracts reusable atomic elements, and ensures single-responsibility functions.
- **Rule**: If a UI pattern or utility logic is repeated twice, it must be extracted into a shared reusable component or utility. All code must be clean, neat, and highly maintainable.

### 🛡️ The TypeScript Type-Safety Guardian
- **Responsibility**: Enforces compile-time type-safety and robust data validations.
- **Rule**: **Zero `any` data types**. Use strict generics, explicit parameters, and defined union return types for server action results. Catch blocks must narrow error types safely.

### ✍️ The Documenter & Humanizer
- **Responsibility**: Ensures code is written naturally for humans and documented thoroughly.
- **Rule**: Write clear, self-explanatory variable and function names. Use JSDoc comments for every single function, custom hook, class, layout component, and schema.

---

## 2. Reusability, Modularization & Size Rules
To ensure a modular and future-proof workspace, keep files small, clean, and testable:
1. **Component Separation**:
   - `src/components/ui/`: Atomic elements (buttons, inputs, status badges) that are stateless and stylable.
   - `src/components/layout/`: Interface shell components (Sidebar, Navbar, LayoutShell).
   - `src/components/providers/`: Context providers (Session, Themes).
   - `src/components/models/` (or other domain sub-folders): Shared and extracted domain-specific components.
2. **Page File Monolith Ban**:
   - **No page file (`page.tsx`) or client controller should exceed ~250 lines of code**.
   - If a page renders complex panels, lists, tables, modals, or forms, **you must extract them** into separate components inside `src/components/[domain]/`.
3. **Unit Testability**:
   - Keep components and helpers small, isolated, and simple so they are fully **unit-testable**.
   - Separate complex mathematical calculations or API mapping logic from React rendering into helper utilities or custom hooks so they can be tested independently.
4. **Helper Separation**:
   - Move pure functions, API helpers, and formatters to `src/lib/utils/`.
   - Never define inline utility functions within page routes.
5. **Logic Isolation**:
   - Next.js pages in `src/app/` should primarily handle layout and pass handlers to reusable client components.
   - Data mutations must go through server actions in `src/lib/actions/`.

---

## 3. Humanized Code Style & Simplicity Guidelines
"Humanized code" means code written to be easily understood, maintained, and verified by senior human developers:
- **No Over-Engineering**: Avoid wrapping basic tasks in complex custom abstract patterns or multi-level wrapper functions. Keep layout direct, flat, and simple.
- **No Machine Patterns**: Avoid obfuscated one-liners, overly dense nested ternary operators, or complex bitwise checks when simpler conditional blocks are clearer.
- **Early Returns (Guard Clauses)**: Avoid deep nesting of `if-else` blocks. Return early to keep code flat and easily readable.
- **Descriptive Naming**: Prefer descriptive names (e.g., `isSubmittingDeployment` or `activeModelVersion`) over abbreviations (e.g., `isSub`, `ver`).
- **Logical Grouping**: Group variables, state hooks, effect hooks, and event handlers logically using clean blank lines.

---

## 4. JSDoc Standards & Documentation
Every function, helper utility, server action, page component, context hook, and type declaration MUST have JSDoc comments.

### JSDoc Requirements
1. **Description**: Clear description of what the function/component does.
2. **Parameters**: Define `@param` with the parameter name and detailed purpose.
3. **Returns**: Define `@returns` with details about the return value.
4. **Errors**: Document thrown exceptions using `@throws`.

### JSDoc Template Example
```typescript
/**
 * Fetches data from the ModelOps backend API with automatic session authentication.
 * Automatically handles attaching the Bearer JWT token from the active session.
 *
 * @template T - The expected return type of the response data.
 * @param path - The backend API path endpoint (e.g. "/models").
 * @param options - Additional fetch request configuration options.
 * @returns A promise resolving to the typed backend response data.
 * @throws {Error} Throws an error containing the backend message if the request fails.
 */
export async function smartFetch<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
  // ...
}
```

---

## 5. Directory Structure & Architecture

The frontend follows a clean, domain-driven architecture separated from the UI layout components:

```
frontend/
├── src/
│   ├── app/                    # Routing Layer (App Router)
│   │   ├── (auth)/             # Route Group: Authentication pages (transparent URLs)
│   │   │   ├── login/          # Login Page (/login)
│   │   │   └── register/       # Registration Page (/register)
│   │   ├── (dashboard)/        # Route Group: Protected layout pages
│   │   │   ├── models/         # Model registry, upload, sandbox details
│   │   │   └── page.tsx        # Dashboard System Overview Page
│   │   ├── api/                # Route Handlers / API proxies
│   │   ├── globals.css         # Styling with customized CSS variables
│   │   └── layout.tsx          # Root HTML layout and fonts
│   ├── components/             # UI Components Layer
│   │   ├── layout/             # Layout-only components (Header, Sidebar, Shell)
│   │   ├── models/             # Shared model details and upload sub-components
│   │   ├── providers/          # React contexts/providers (SessionProvider)
│   │   └── ui/                 # Basic atomic elements (buttons, inputs)
│   ├── lib/                    # Business Logic / Infrastructure Layer
│   │   ├── actions/            # Next.js Server Actions (auth, models, deployments)
│   │   ├── schemas/            # Zod validation schemas split by domain (auth, models)
│   │   └── utils/              # Pure functions and helpers (smartFetch)
│   ├── types/                  # Centralized TypeScript definitions
│   │   ├── auth/               # NextAuth and session declarations
│   │   ├── models/             # Model, ModelVersion, Deployment interfaces
│   │   ├── user/               # User account interfaces
│   │   └── index.ts            # Central re-exporter for all types
│   └── auth.ts                 # NextAuth options, callbacks, token refresh logic
```

---

## 6. Coding Standards & Guidelines

### A. Strict TypeScript Enforcement (Zero-`any` Rule)
- **Do not use `any`**. All types must be declared explicitly. Use `unknown` if the type is dynamic/generic, or cast using safe type definitions.
- **Catch Blocks**: Do not use `catch (err: any)`. Use `catch (err)` and narrow down the type with a check:
  ```typescript
  catch (error) {
    const message = error instanceof Error ? error.message : String(error);
  }
  ```
- **Indexable Objects**: If handling dynamic backend responses, cast them using Record utility:
  ```typescript
  const responseData = res.data as Record<string, unknown> & { prediction?: string };
  ```

### B. Next.js Server Actions
- Server actions must declare **explicit union return types** to construct a discriminated union. This avoids `undefined` fields in client handlers:
  ```typescript
  export async function createModel(
    name: string, 
    description: string
  ): Promise<{ success: true; data: Model } | { success: false; error: string }> {
    try {
      const res = await smartFetch<Model>("/models", { ... });
      return { success: true, data: res };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Failed" };
    }
  }
  ```

### C. Zod Schemas & React Hook Form
- Organize validation schemas inside `src/lib/schemas/` split into domain files (`auth/`, `models/`).
- Use `react-hook-form` coupled with the `@hookform/resolvers/zod` in client components for form state:
  ```typescript
  const { register, handleSubmit, formState: { errors } } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    mode: "onChange",
  });
  ```

### D. NextAuth & API Calls
- NextAuth configurations must extend standard sessions, users, and tokens in [src/types/auth/index.ts](file:///Users/ahmedamr/Desktop/gp/frontend/src/types/auth/index.ts) to manage JWT tokens.
- All backend requests should pass through the `smartFetch` utility to automatically attach JWT authorization headers:
  ```typescript
  import { smartFetch } from "@/lib/utils/smart-fetch";
  const data = await smartFetch<Model[]>("/models");
  ```

### E. Service Layer for API Communication
- **Isolate Network Operations**: Do not write raw fetch/smartFetch calls directly inside React page layouts, server actions, or client-side UI components. Instead, encapsulate them in a dedicated Service Layer under `src/lib/services/`.
- **Domain-Specific Services**: Group services logically by domains (e.g., `src/lib/services/models.service.ts`, `src/lib/services/deployments.service.ts`, `src/lib/services/auth.service.ts`).
- **Isomorphic Architecture**: Write services to be isomorphic using `smartFetch` so they operate cleanly on both the server (inside Server Actions) and the client (inside custom React hooks).

### F. Custom Hooks for Client State & Data Flow
- **Decouple View and Logic**: Refactor complex client state management, file upload forms, polling loops, streaming response builders, and API triggers out of layout/view components and into custom React hooks in `src/hooks/`.
- **Naming Pattern**: Name hooks clearly based on context or feature (e.g., `useModelDetails.ts`, `usePrediction.ts`).
- **Maintain Small Components**: By delegating state coordination to custom hooks, client view components must remain under ~250 lines, focused solely on presentation layout and HTML binding.

---

## 7. Command Reference

Use these commands for project configuration and validations:

- **Run Dev Server**:
  ```bash
  npm run dev
  ```
- **Type Checking (No Emit)**:
  ```bash
  npx tsc --noEmit
  ```
- **Production Build**:
  ```bash
  npm run build
  ```
- **Code Linter**:
  ```bash
  npm run lint
  ```
