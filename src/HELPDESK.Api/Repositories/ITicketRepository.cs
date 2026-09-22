using HELPDESK.Api.Models;

namespace HELPDESK.Api.Repositories;

public interface ITicketRepository
{
    Task<List<Ticket>> GetAllAsync(string? requesterId, CancellationToken cancellationToken = default);

    Task<Ticket?> GetByIdAsync(int id, CancellationToken cancellationToken = default);

    Task<Ticket?> GetTrackedByIdAsync(int id, CancellationToken cancellationToken = default);

    Task AddAsync(Ticket ticket, CancellationToken cancellationToken = default);

    void Remove(Ticket ticket);

    Task LoadRequesterAsync(Ticket ticket, CancellationToken cancellationToken = default);

    Task LoadAssignedAgentAsync(Ticket ticket, CancellationToken cancellationToken = default);

    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}
