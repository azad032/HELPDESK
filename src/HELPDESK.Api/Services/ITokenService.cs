using HELPDESK.Api.Models;

namespace HELPDESK.Api.Services;

public interface ITokenService
{
    (string Token, DateTimeOffset ExpiresAt) CreateToken(ApplicationUser user, IList<string> roles);
}
