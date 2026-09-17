using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using HELPDESK.Api.Common;
using HELPDESK.Api.Models;
using HELPDESK.Api.Services;
using Microsoft.Extensions.Options;
using Xunit;

namespace HELPDESK.Api.Tests;

public class TokenServiceTests
{
    private static TokenService CreateService() => new(Options.Create(new JwtOptions
    {
        Key = "unit-test-signing-key-that-is-long-enough-1234567890",
        Issuer = "HELPDESK.Tests",
        Audience = "HELPDESK.Tests.Client",
        ExpiryMinutes = 30
    }));

    [Fact]
    public void CreateToken_IncludesUserAndRoleClaims()
    {
        var service = CreateService();
        var user = new ApplicationUser
        {
            Id = "user-123",
            Email = "agent@helpdesk.local",
            DisplayName = "Test Agent"
        };

        var (token, expiresAt) = service.CreateToken(user, [Roles.Agent]);

        var jwt = new JwtSecurityTokenHandler().ReadJwtToken(token);

        Assert.Equal("user-123", jwt.Subject);
        Assert.Contains(jwt.Claims, c => c.Type == ClaimTypes.Role && c.Value == Roles.Agent);
        Assert.Contains(jwt.Claims, c => c.Type == JwtRegisteredClaimNames.Email && c.Value == user.Email);
        Assert.True(expiresAt > DateTimeOffset.UtcNow);
    }

    [Fact]
    public void CreateToken_WithNoRoles_ProducesTokenWithoutRoleClaims()
    {
        var service = CreateService();
        var user = new ApplicationUser { Id = "user-456", Email = "customer@test.com", DisplayName = "Customer" };

        var (token, _) = service.CreateToken(user, []);
        var jwt = new JwtSecurityTokenHandler().ReadJwtToken(token);

        Assert.DoesNotContain(jwt.Claims, c => c.Type == ClaimTypes.Role);
    }
}
