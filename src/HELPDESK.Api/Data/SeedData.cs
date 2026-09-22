using HELPDESK.Api.Common;
using HELPDESK.Api.Models;
using HELPDESK.Api.Models.Enums;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace HELPDESK.Api.Data;

public static class SeedData
{
    public static async Task InitializeAsync(IServiceProvider services)
    {
        var roleManager = services.GetRequiredService<RoleManager<IdentityRole>>();
        foreach (var role in Roles.All)
        {
            if (!await roleManager.RoleExistsAsync(role))
            {
                await roleManager.CreateAsync(new IdentityRole(role));
            }
        }

        var userManager = services.GetRequiredService<UserManager<ApplicationUser>>();
        var admin = await EnsureUserAsync(userManager, "admin@helpdesk.local", "Administrator", Roles.Admin);
        var agent = await EnsureUserAsync(userManager, "agent@helpdesk.local", "Sample Agent", Roles.Agent);
        var customer = await EnsureUserAsync(userManager, "customer@helpdesk.local", "Sample Customer", Roles.Customer);

        var db = services.GetRequiredService<HelpdeskDbContext>();
        if (!await db.Tickets.AnyAsync())
        {
            db.Tickets.AddRange(
                new Ticket
                {
                    Title = "Cannot log into the portal",
                    Description = "Getting an 'invalid credentials' error even though the password was just reset.",
                    Status = TicketStatus.Open,
                    Priority = TicketPriority.High,
                    RequesterId = customer.Id
                },
                new Ticket
                {
                    Title = "Request for a second monitor",
                    Description = "Would like a second monitor added to my workstation for the new project.",
                    Status = TicketStatus.InProgress,
                    Priority = TicketPriority.Low,
                    RequesterId = customer.Id,
                    AssignedAgentId = agent.Id
                });

            await db.SaveChangesAsync();
        }
    }

    private static async Task<ApplicationUser> EnsureUserAsync(
        UserManager<ApplicationUser> userManager, string email, string displayName, string role)
    {
        var user = await userManager.FindByEmailAsync(email);
        if (user is null)
        {
            user = new ApplicationUser
            {
                UserName = email,
                Email = email,
                DisplayName = displayName,
                EmailConfirmed = true
            };

            var result = await userManager.CreateAsync(user, "ChangeMe123!");
            if (!result.Succeeded)
            {
                throw new InvalidOperationException(
                    $"Failed to seed user {email}: {string.Join(", ", result.Errors.Select(e => e.Description))}");
            }
        }

        if (!await userManager.IsInRoleAsync(user, role))
        {
            await userManager.AddToRoleAsync(user, role);
        }

        return user;
    }
}
