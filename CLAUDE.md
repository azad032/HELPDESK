# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

All commands run from the repo root (`HELPDESK.slnx` solution) unless noted.

```bash
# Build everything
dotnet build

# Run the API (from src/HELPDESK.Api)
cd src/HELPDESK.Api && dotnet run

# Run all tests
dotnet test

# Run a single test
dotnet test --filter "FullyQualifiedName~TokenServiceTests.CreateToken_IncludesUserAndRoleClaims"

# EF Core migrations (from src/HELPDESK.Api; requires dotnet-ef: `dotnet tool install --global dotnet-ef`)
dotnet ef migrations add <Name> -o Data/Migrations
dotnet ef database update

# React UI (from web/)
cd web && npm install
npm run dev      # Vite dev server on http://localhost:5173
npm run build    # tsc -b && vite build
npm run lint     # oxlint
```

The API needs `ASPNETCORE_ENVIRONMENT=Development` to run migrations/seeding automatically and to expose the OpenAPI endpoint (see Program.cs) — without it the app starts in Production and skips both.

The JWT signing key (`Jwt:Key`) is stored via `dotnet user-secrets` (from `src/HELPDESK.Api`, run `dotnet user-secrets set "Jwt:Key" "<value>"`), not in `appsettings.json`. A fresh clone needs this set before the API will start, since `Program.cs` throws if the `Jwt` config section is missing a key.

Run the API and the `web` dev server together for full-stack local dev — the UI at `:5173` calls the API at `:5279` (see `web/.env`'s `VITE_API_BASE_URL`, matching the API's `http` launch profile), and `Program.cs` has a CORS policy scoped to `http://localhost:5173`.

## Architecture

Two projects: `src/HELPDESK.Api` (ASP.NET Core 10 Web API — the ticketing/helpdesk backend) and `web/` (React 19 + TypeScript + Vite UI), joined only over HTTP; there's no shared code or types between them. The API's structure is intentionally flat (no separate Domain/Infrastructure class libraries): `Models/`, `Data/`, `DTOs/`, `Services/`, `Controllers/`.

**Identity & auth**: `ApplicationUser` extends `IdentityUser` and is the single user type for all three roles — `Customer`, `Agent`, `Admin` (constants in `Common/Roles.cs`). Auth is stateless JWT bearer (`Services/TokenService.cs`), not cookie-based, since this is API-only. Role claims are embedded in the token at issuance, so authorization checks (`[Authorize(Roles = ...)]`, `User.IsInRole(...)`) never hit the database after login.

**Registration vs. staff creation**: `POST /api/auth/register` is public and always assigns `Customer`. `Agent`/`Admin` accounts can only be created via `POST /api/auth/staff`, which itself requires `Admin`. There is no self-service way to become staff — this is deliberate, not an oversight.

**Authorization model lives in the controllers, not middleware**: `TicketsController` and `CommentsController` both compute `IsStaff` (`Admin` or `Agent`) from `User` claims and manually filter queries / return `Forbid()` — e.g., a `Customer` can only ever see tickets/comments where they are the `RequesterId`. When adding new ticket-scoped endpoints, follow this same "load entity, check `IsStaff` or ownership, then act" pattern rather than introducing a separate policy/handler layer.

**Data layer**: `HelpdeskDbContext` extends `IdentityDbContext<ApplicationUser>`, so Identity tables (`AspNetUsers`, `AspNetRoles`, etc.) and domain tables (`Tickets`, `TicketComments`) live in one context/database. `Ticket.Status` and `Ticket.Priority` enums are stored as strings via `HasConversion<string>()` in `OnModelCreating` — and correspondingly, `Program.cs` registers `JsonStringEnumConverter` globally so API requests/responses use the enum names ("Open", "High") rather than integers. Keep both conventions in sync if new enums are added.

**Seeding**: `Data/SeedData.cs` creates the three roles and a default `admin@helpdesk.local` / `ChangeMe123!` account if one doesn't exist. It only runs in Development (called from `Program.cs`), alongside `Database.MigrateAsync()` — there is no separate seed command.

**Target framework**: net10.0. Database: SQL Server via `(localdb)\mssqllocaldb` in Development (`ConnectionStrings:DefaultConnection` in `appsettings.Development.json`).

**Frontend (`web/`)**: plain Vite + React, no framework router conventions or server components — `react-router-dom` v7 in declarative mode (`App.tsx`). No UI library or CSS framework; `src/index.css` hand-rolls a small design-token/utility system (`.card`, `.badge`, `.table`, form element resets) rather than per-component styling.

- **Auth state lives in `auth/AuthContext.tsx`**, backed by `localStorage` (key `helpdesk.auth`), not cookies. The API's `AuthResponse` doesn't include a user id, so the frontend decodes the JWT's `sub` claim itself (`auth/jwt.ts`) to get it — needed for the "assign to me" action, which sends the current user's id straight back to `PUT /api/tickets/{id}`. If the API's auth DTOs change, check `jwt.ts` and `AuthContext.tsx` still line up.
- **`api/client.ts`** is a thin `fetch` wrapper, not axios — a module-level `authToken` variable (set by `AuthContext` via `setAuthToken`) is attached as the `Authorization` header on every request. `api/types.ts` hand-mirrors the API's DTOs (`TicketResponse`, `CommentResponse`, etc.); there's no shared contract or code generation between backend and frontend, so a DTO shape change on one side must be updated on the other manually.
- **Role-based rendering mirrors the API's authorization rules**, not a separate frontend permission system: pages check `isStaff`/`isAdmin` from `useAuth()` to decide what to show (e.g., `TicketsListPage` hides the Requester column for customers, `TicketDetailPage` only shows status/priority/assign controls to staff) — but the API still independently enforces this server-side, so the frontend checks are for UX only.
- **`ProtectedRoute`** gates the authenticated app shell (`Layout` + ticket pages) behind a `user` check; `/login` and `/register` are the only unauthenticated routes.
