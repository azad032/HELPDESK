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
```

The API needs `ASPNETCORE_ENVIRONMENT=Development` to run migrations/seeding automatically and to expose the OpenAPI endpoint (see Program.cs) — without it the app starts in Production and skips both.

The JWT signing key (`Jwt:Key`) is stored via `dotnet user-secrets` (from `src/HELPDESK.Api`, run `dotnet user-secrets set "Jwt:Key" "<value>"`), not in `appsettings.json`. A fresh clone needs this set before the API will start, since `Program.cs` throws if the `Jwt` config section is missing a key.

## Architecture

Single ASP.NET Core 10 Web API project (`src/HELPDESK.Api`) — a ticketing/helpdesk backend, no separate frontend. Structure is intentionally flat (no separate Domain/Infrastructure class libraries): `Models/`, `Data/`, `DTOs/`, `Services/`, `Controllers/`.

**Identity & auth**: `ApplicationUser` extends `IdentityUser` and is the single user type for all three roles — `Customer`, `Agent`, `Admin` (constants in `Common/Roles.cs`). Auth is stateless JWT bearer (`Services/TokenService.cs`), not cookie-based, since this is API-only. Role claims are embedded in the token at issuance, so authorization checks (`[Authorize(Roles = ...)]`, `User.IsInRole(...)`) never hit the database after login.

**Registration vs. staff creation**: `POST /api/auth/register` is public and always assigns `Customer`. `Agent`/`Admin` accounts can only be created via `POST /api/auth/staff`, which itself requires `Admin`. There is no self-service way to become staff — this is deliberate, not an oversight.

**Authorization model lives in the controllers, not middleware**: `TicketsController` and `CommentsController` both compute `IsStaff` (`Admin` or `Agent`) from `User` claims and manually filter queries / return `Forbid()` — e.g., a `Customer` can only ever see tickets/comments where they are the `RequesterId`. When adding new ticket-scoped endpoints, follow this same "load entity, check `IsStaff` or ownership, then act" pattern rather than introducing a separate policy/handler layer.

**Data layer**: `HelpdeskDbContext` extends `IdentityDbContext<ApplicationUser>`, so Identity tables (`AspNetUsers`, `AspNetRoles`, etc.) and domain tables (`Tickets`, `TicketComments`) live in one context/database. `Ticket.Status` and `Ticket.Priority` enums are stored as strings via `HasConversion<string>()` in `OnModelCreating` — and correspondingly, `Program.cs` registers `JsonStringEnumConverter` globally so API requests/responses use the enum names ("Open", "High") rather than integers. Keep both conventions in sync if new enums are added.

**Seeding**: `Data/SeedData.cs` creates the three roles and a default `admin@helpdesk.local` / `ChangeMe123!` account if one doesn't exist. It only runs in Development (called from `Program.cs`), alongside `Database.MigrateAsync()` — there is no separate seed command.

**Target framework**: net10.0. Database: SQL Server via `(localdb)\mssqllocaldb` in Development (`ConnectionStrings:DefaultConnection` in `appsettings.Development.json`).
