---
name: add-endpoint
description: Add a new API endpoint to HELPDESK.Api following this project's exact controller, DTO, validation, and test conventions. Use when asked to add a new endpoint, route, or controller action to the backend.
---

# Add an API endpoint (HELPDESK.Api)

This project has no `TodoItem` model, no `Validators` folder, and no FluentValidation
package. Do not introduce them. Validation here is done with plain
`System.ComponentModel.DataAnnotations` attributes on the request DTO, enforced
automatically by `[ApiController]`'s built-in model-validation filter — there is
no separate validation middleware to wire up, and none should be added.

Follow the pattern in `Controllers/TicketsController.cs` and
`Controllers/CommentsController.cs` exactly. Read one of those two files before
writing anything, to confirm nothing has drifted from what's described below.

## 1. Request/response DTOs

New DTOs go in `DTOs/<Feature>/`, one class per file, matching
`DTOs/Tickets/TicketCreateRequest.cs` and `DTOs/Tickets/TicketResponse.cs`:

```csharp
// DTOs/<Feature>/<Name>CreateRequest.cs
using System.ComponentModel.DataAnnotations;

namespace HELPDESK.Api.DTOs.<Feature>;

public class <Name>CreateRequest
{
    [Required, MaxLength(200)]
    public string Title { get; set; } = string.Empty;

    [Required]
    public string Description { get; set; } = string.Empty;
}
```

Rules, taken from every existing DTO:
- String properties default to `= string.Empty`, never `null`.
- Required fields get `[Required]`; bounded strings get `[MaxLength(n)]`
  (200 for titles/names, 4000 for free-text bodies, matching the DB column
  lengths configured in `HelpdeskDbContext.OnModelCreating`).
- Enum properties are plain enum types on the DTO (e.g. `TicketPriority`), not
  strings — the global `JsonStringEnumConverter` registered in `Program.cs`
  handles string serialization, so don't add per-DTO converters.
- Update DTOs make every field nullable (`TicketStatus? Status`) so PATCH-style
  partial updates work — see `TicketUpdateRequest`.
- Response DTOs are flat (no nested objects): related entities are flattened
  into `<Related>Id` and `<Related>Name` pairs (see `TicketResponse.RequesterName`),
  not returned as nested DTOs.

**Do not create a validator class or a `Validators/` folder.** The
`[Required]`/`[MaxLength]`/etc. attributes above are the entire validation
story. `[ApiController]` already runs model validation before the action body
executes and returns a 400 with `ValidationProblemDetails` on failure — this is
already wired up in `Program.cs` via `builder.Services.AddControllers()`. There
is nothing to register per-endpoint and no pipeline step to add.

## 2. Controller action

Add the action to an existing controller if the resource already has one
(e.g. a new ticket-related action goes in `TicketsController`), or create a new
`Controllers/<Feature>Controller.cs` for a new resource, matching this shape
exactly:

```csharp
[ApiController]
[Route("api/<resource>")]
[Authorize]
public class <Feature>Controller(HelpdeskDbContext db) : ControllerBase
{
    private string CurrentUserId => User.FindFirstValue(ClaimTypes.NameIdentifier)!;
    private bool IsStaff => User.IsInRole(Roles.Admin) || User.IsInRole(Roles.Agent);

    [HttpPost]
    public async Task<ActionResult<<Name>Response>> Create<Name>(<Name>CreateRequest request)
    {
        // load anything the authorization check needs first
        // check IsStaff / ownership, return Forbid() or NotFound() before mutating
        // then act (create/update/delete), then return ToResponse(...)
    }

    private static <Name>Response ToResponse(<Entity> entity) => new()
    {
        // map every field explicitly, no AutoMapper
    };
}
```

Non-negotiable conventions (see CLAUDE.md and every existing controller):
- Primary-constructor DI (`Controller(HelpdeskDbContext db, ...)`), not field +
  explicit constructor.
- `[Authorize]` at the class level; add `[Authorize(Roles = $"{Roles.Admin},{Roles.Agent}")]`
  or `[Authorize(Roles = Roles.Admin)]` on individual actions that need a
  narrower role, exactly like `TicketsController.UpdateTicket`/`DeleteTicket`.
- Authorization is manual, in the action body — "load entity, check `IsStaff`
  or ownership, then act, else `Forbid()`/`NotFound()`". There is no policy or
  handler layer; don't add one.
- Route is `api/<resource>` (plural, lowercase), nested resources follow the
  `api/tickets/{ticketId:int}/comments` style with typed route constraints
  (`{id:int}`).
- A private static `ToResponse(...)` mapper lives at the bottom of the
  controller — don't extract it to a separate mapper class or use a mapping
  library.
- If the endpoint mutates ticket data or comments, call
  `TicketCacheInvalidator.Invalidate()` (already injected into
  `TicketsController`/`CommentsController`) after `SaveChangesAsync()` — see
  `Services/TicketCacheInvalidator.cs`. Reads that should be cached use
  `IMemoryCache.GetOrCreateAsync` with `entry.AddExpirationToken(cacheInvalidator.GetChangeToken())`
  plus a 5-minute `SetAbsoluteExpiration`, matching `TicketsController.GetTickets`.

## 3. New entity/migration (only if this endpoint needs a new table)

- Add `Models/<Entity>.cs` (plain POCO, no base class, `DateTimeOffset` for
  timestamps defaulting to `DateTimeOffset.UtcNow`).
- New enums go in `Models/Enums/<Enum>.cs` and get `HasConversion<string>()` in
  `HelpdeskDbContext.OnModelCreating`, matching `Ticket.Status`/`Ticket.Priority`.
- Add a `DbSet<T>` property to `HelpdeskDbContext` and configure relationships/
  max lengths in `OnModelCreating`, following the existing `Ticket`/`TicketComment`
  configuration blocks.
- Generate and apply the migration from `src/HELPDESK.Api`:
  ```bash
  dotnet ef migrations add <Name> -o Data/Migrations
  dotnet ef database update
  ```

## 4. New service registrations

If the endpoint needs a new service (cache, external client, etc.), register
it directly in `Program.cs` next to the similar existing registration (e.g.
`builder.Services.AddSingleton<TicketCacheInvalidator>();`) — services are
wired up inline in `Program.cs`, there's no `ServiceCollectionExtensions` file
to add to.

## 5. Tests

Add `tests/HELPDESK.Api.Tests/<Feature>Tests.cs`. Match `TokenServiceTests.cs`:
plain xUnit `[Fact]`/`[Theory]`, no mocking framework, `MethodName_Scenario_ExpectedBehavior`
naming, arrange/act/assert with no comments separating the sections.

Controllers depend directly on `HelpdeskDbContext` (no repository
abstraction), so testing a controller action needs a real `DbContext` backed
by the EF Core in-memory provider. If `Microsoft.EntityFrameworkCore.InMemory`
isn't already a package reference in `tests/HELPDESK.Api.Tests/HELPDESK.Api.Tests.csproj`,
add it — this is the first controller-level test in the project, so it's
establishing the pattern, not deviating from one:

```bash
cd tests/HELPDESK.Api.Tests
dotnet add package Microsoft.EntityFrameworkCore.InMemory
```

Test shape — happy path plus one validation failure, in the same file:

```csharp
using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using HELPDESK.Api.Data;
using HELPDESK.Api.DTOs.<Feature>;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace HELPDESK.Api.Tests;

public class <Feature>ControllerTests
{
    private static HelpdeskDbContext CreateDb() =>
        new(new DbContextOptionsBuilder<HelpdeskDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options);

    private static <Feature>Controller CreateController(HelpdeskDbContext db, string userId, params string[] roles)
    {
        var claims = new List<Claim> { new(ClaimTypes.NameIdentifier, userId) };
        claims.AddRange(roles.Select(r => new Claim(ClaimTypes.Role, r)));
        var identity = new ClaimsIdentity(claims, "Test");

        return new <Feature>Controller(db)
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext { User = new ClaimsPrincipal(identity) }
            }
        };
    }

    [Fact]
    public async Task Create<Name>_WithValidRequest_ReturnsCreated<Name>()
    {
        using var db = CreateDb();
        var controller = CreateController(db, userId: "user-1");

        var result = await controller.Create<Name>(new <Name>CreateRequest { Title = "Test", Description = "..." });

        var created = Assert.IsType<CreatedAtActionResult>(result.Result);
        Assert.IsType<<Name>Response>(created.Value);
    }

    [Fact]
    public void <Name>CreateRequest_WithMissingTitle_FailsValidation()
    {
        var request = new <Name>CreateRequest { Title = "", Description = "..." };
        var context = new ValidationContext(request);
        var results = new List<ValidationResult>();

        var isValid = Validator.TryValidateObject(request, context, results, validateAllProperties: true);

        Assert.False(isValid);
        Assert.Contains(results, r => r.MemberNames.Contains(nameof(<Name>CreateRequest.Title)));
    }
}
```

The second test validates the DTO directly with `Validator.TryValidateObject`
rather than going through HTTP, because controller unit tests constructed
this way (no `WebApplicationFactory`) bypass the `[ApiController]` model-binding
pipeline that would normally reject an invalid request before the action runs.
Asserting on the DTO's own `[Required]`/`[MaxLength]` attributes is the
equivalent check at this test level — don't reach for
`Microsoft.AspNetCore.Mvc.Testing` / `WebApplicationFactory` unless the task
specifically calls for a full integration test, since none exist in this
project yet.

Run it:
```bash
dotnet test --filter "FullyQualifiedName~<Feature>ControllerTests"
```
