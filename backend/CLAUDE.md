# Backend Guidelines (CLAUDE.md)

## Build, Run & Test Commands
*   **Install Dependencies**: `npm install`
*   **Build Production**: `npm run build`
*   **Run Local Dev Server**: `npm run start:dev`
*   **Run Production Server**: `npm run start:prod`
*   **Format Code**: `npm run format`
*   **Lint Code**: `npm run lint`
*   **Run Unit Tests**: `npm run test`
*   **Run E2E Tests**: `npm run test:e2e`

---

## Directory Architecture
*   **Bounded Feature Modules**: Place in `src/modules/<name>/` (`users`, `auth`, `models`, `deployments`).
*   **Shared/Infrastructure**: Place in `src/shared/<name>/` (`queue`, `database`, `config`).
*   **Enums/Interfaces Location**:
    *   Place domain-specific enums/interfaces in `src/modules/<name>/enums/` and `src/modules/<name>/interfaces/`.
    *   Place shared/cross-domain enums/interfaces in `src/shared/enums/` and `src/shared/interfaces/`.

---

## Critical Development Rules
1.  **Zero-`any` Policy**: The `any` keyword is strictly prohibited. Cast catches using `catch (error: unknown)` and narrow variables properly. Use `Record<string, unknown>` for dynamic maps.
2.  **No Direct Inner Imports**: Do not import files directly from internal subdirectories of other feature modules. Import their parent module instead.
3.  **Keep Files Small**: Controllers and services must not exceed **200 lines**. Extract complex business rules or helper functions to maintain atomic, testable code.
4.  **Early Returns**: Use early returns instead of nested `if/else` checks to keep code flat and easily readable.
5.  **JSDoc Documentation**: Every class, route handler, service method, and background job processor must have complete JSDoc annotations.
6.  **Database Safety**: Set database nullability correctly on entity columns (`column: T | null`). Use TypeORM migrations for schema modifications; do not use `synchronize: true` in production.
