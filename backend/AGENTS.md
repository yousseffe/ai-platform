# Backend Developer & AI Agent Guidelines (AGENTS.md)

Welcome to the ModelOps backend codebase. This document serves as the absolute single source of truth for architectural standards, directory structure, coding practices, and design patterns. 

All human developers and AI coding agents MUST read, understand, and strictly follow these rules.

---

## 1. Directory Architecture

The backend project is built with NestJS and organized around a **Domain-Driven Modular Structure**. All source code resides in `src/` and is divided into either bounded feature domains (`src/modules/`) or shared infrastructure (`src/shared/`).

```
src/
├── main.ts                       # Application bootstrap entry point
├── app.module.ts                 # Root application module
├── app.controller.ts             # Root health-check controller
├── app.service.ts                # Root health-check service
│
├── modules/                      # FEATURE DOMAINS (Bounded Contexts)
│   ├── users/                    # User accounts management domain
│   │   ├── users.module.ts
│   │   ├── services/
│   │   │   └── users.service.ts
│   │   └── entities/
│   │       └── user.entity.ts
│   │
│   ├── auth/                     # Authentication & authorization domain
│   │   ├── auth.module.ts
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── strategies/
│   │   ├── guards/
│   │   ├── dto/
│   │   └── interfaces/
│   │
│   ├── models/                   # Machine learning models cataloging domain
│   │   ├── models.module.ts
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── entities/             # model.entity.ts, model-version.entity.ts
│   │   ├── dto/
│   │   └── enums/                # version-status.enum.ts
│   │
│   └── deployments/              # Prediction servers container deployment domain
│       ├── deployments.module.ts
│       ├── controllers/
│       ├── services/
│       ├── entities/             # deployment.entity.ts
│       └── enums/                # deployment-status.enum.ts
│
└── shared/                       # GLOBAL INFRASTRUCTURE & SHARED UTILITES
    └── queue/                    # Async worker queue processing (BullMQ)
        ├── queue.module.ts
        ├── serve.py              # Mock prediction server wrapper script
        ├── processors/           # build.processor.ts, deploy.processor.ts
        └── interfaces/           # queue.interface.ts (Strong job typing)
```

---

## 2. Bounded Feature Domains vs. Shared Infrastructure

Understanding where to write code is critical to preventing architectural rot. Follow this strict classification:

### A. Domain Feature Modules (`src/modules/<name>/`)
*   **Definition**: Bounded contexts representing specific business entities or operations.
*   **Rules**:
    *   Each folder under `src/modules/` must be a self-contained NestJS module.
    *   Must contain only files directly relevant to that domain (entities, controllers, services, DTOs, local enums, and local interfaces).
    *   No general-purpose code or third-party wrapper wrappers should be placed here.

### B. Shared Infrastructure Modules (`src/shared/<name>/`)
*   **Definition**: Cross-cutting utilities, third-party adapters, and background engine integrations that do NOT belong to any single business domain.
*   **Rules**:
    *   Use when a service or utility is consumed by multiple modules but has no domain-specific business logic.
    *   Examples: Asynchronous queues (`queue/`), database connection helpers, global logging, email senders, caching, or custom global middleware.
    *   Shared code must be decoupled from business entities (e.g. referencing database entities is allowed, but do not couple them with business controller layers).

---

## 3. Cross-Module Communication & Shared Code

To prevent circular dependencies and Spaghetti Architecture:
1.  **Imports**: A feature module may import another feature module *only* if the target module explicitly exports the required provider.
2.  **No Direct Entity/File Imports**: Never import files directly from the internal subfolders of another feature module (e.g. `import { SomeService } from '../auth/services/auth.service'`). Instead, import the module itself (`import { AuthModule } ...`) and inject the exported service.
3.  **Preventing Circular Dependencies**:
    *   If `Module A` depends on `Module B` and `Module B` depends on `Module A`, refactor the shared logic into a `shared/` module or extract a common interface.
    *   Use NestJS `@Inject(forwardRef(() => SomeService))` only as a last resort.
4.  **Types Sharing**:
    *   If two modules require the same typescript interface or enum, extract it to a shared location (e.g., `src/shared/interfaces/` or `src/shared/enums/`) rather than importing it from a peer module.

---

## 4. Strict Type Safety (Zero-`any` Policy)

To ensure robust static code analysis and linting:
*   **Strict No `any` Rule**: The `any` keyword is **completely banned**. Using it is a build and review blocker.
*   **Catches**: Catch blocks must not have `any` typed exceptions. Use `catch (error: unknown)` and inspect or cast safe types:
    ```typescript
    try {
      // code
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to process: ${message}`);
    }
    ```
*   **Objects & Inputs**: For dynamic objects or generic inputs, use `Record<string, unknown>` or a generic parameter `<T>`.
*   **DTOs**: Use class-validator and class-transformer in DTO classes to validate runtime parameters. All controller route parameters must be mapped to strongly-typed DTOs.
*   **Nullability**: Ensure typescript interfaces and TypeORM entities correctly model nullable database columns:
    ```typescript
    @Column({ nullable: true })
    errorMessage: string | null; // Use '| null' to match database nullability.
    ```

---

## 5. Simplicity & Modularization (Zero Over-Engineering)

Code must be written with readability, testability, and maintainability in mind:
*   **Keep Files Small**: Controllers and services must be focused. If a file exceeds **200 lines**, it must be refactored. Split complex logic into helper classes, utils, or separate micro-services.
*   **Single Responsibility Principle**:
    *   **Controllers**: Map HTTP requests, parse DTOs, invoke service methods, and return responses. No business logic.
    *   **Services**: Handle database transactions, core business validation, and calls to external adapters.
    *   **Processors/Workers**: Execute background queue tasks. Keep processor tasks atomic and stateless.
*   **Write Testable Code**:
    *   Keep functions pure when possible.
    *   Avoid deep nesting of loops or conditional statements. Use **Early Returns** to keep the code flat.
    *   Avoid over-engineering. Do not write abstractions (such as generic repositories, multiple interfaces for single services, or unnecessary factories) unless they are actively utilized in multiple areas.

---

## 6. JSDoc Annotation Requirements

Every class, controller action, service method, background job processor, and entity property must be documented using JSDoc. This is critical for onboarding and for AI assistants to parse functions correctly.

### Reference JSDoc Guidelines:
1.  **Classes**: Document the responsibility of the module/service/controller.
2.  **Methods**: Explain what the method does, list its inputs (`@param`) with details, specify the return value (`@returns`), and document expected exceptions (`@throws`).

```typescript
/**
 * Controller exposing endpoints for deployment actions (starting/stopping model containers).
 */
@UseGuards(JwtAuthGuard)
@Controller('deployments')
export class DeploymentsController {
  constructor(private readonly deploymentsService: DeploymentsService) {}

  /**
   * Triggers the deployment of a specific model version.
   * 
   * @param versionId - The UUID of the model version to deploy.
   * @returns A promise resolving to the newly created Deployment entity.
   * @throws {NotFoundException} If the model version does not exist.
   */
  @Post('version/:versionId')
  async deployVersion(@Param('versionId') versionId: string): Promise<Deployment> {
    return this.deploymentsService.deployVersion(versionId);
  }
}
```

---

## 7. Standardized Enums Policy

To ensure compile-time safety and maintainability, **raw string literals or string union types MUST NOT be used** for representing entity/system statuses, membership roles, and workspace types. 

All statuses, roles, and types must be defined as standard TypeScript Enums:
*   **Location**: If an enum is domain-specific, place it in `src/modules/<domain>/enums/`. If it is shared between multiple domains, place it in `src/shared/enums/`.
*   **Enforcement**: Any string literal comparison (e.g. `status === 'ACTIVE'`) is strictly banned. Always use the enum definition (e.g. `status === UserStatus.ACTIVE`).

