using HELPDESK.Api.Data;
using HELPDESK.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace HELPDESK.Api.Repositories;

public class UserRepository(HelpdeskDbContext db) : IUserRepository
{
    public Task<ApplicationUser?> GetByIdAsync(string id, CancellationToken cancellationToken = default) =>
        db.Users.FirstOrDefaultAsync(u => u.Id == id, cancellationToken);
}
