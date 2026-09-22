using HELPDESK.Api.Models;

namespace HELPDESK.Api.Repositories;

public interface IUserRepository
{
    Task<ApplicationUser?> GetByIdAsync(string id, CancellationToken cancellationToken = default);
}
