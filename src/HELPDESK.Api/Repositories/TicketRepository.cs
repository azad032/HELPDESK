using HELPDESK.Api.Data;
using HELPDESK.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace HELPDESK.Api.Repositories;

public class TicketRepository(HelpdeskDbContext db) : ITicketRepository
{
    public async Task<List<Ticket>> GetAllAsync(string? requesterId, CancellationToken cancellationToken = default)
    {
        var query = db.Tickets.AsNoTracking()
            .Include(t => t.Requester)
            .Include(t => t.AssignedAgent)
            .AsQueryable();

        if (requesterId is not null)
        {
            query = query.Where(t => t.RequesterId == requesterId);
        }

        return await query.OrderByDescending(t => t.CreatedAt).ToListAsync(cancellationToken);
    }

    public Task<Ticket?> GetByIdAsync(int id, CancellationToken cancellationToken = default) =>
        db.Tickets.AsNoTracking()
            .Include(t => t.Requester)
            .Include(t => t.AssignedAgent)
            .FirstOrDefaultAsync(t => t.Id == id, cancellationToken);

    public Task<Ticket?> GetTrackedByIdAsync(int id, CancellationToken cancellationToken = default) =>
        db.Tickets
            .Include(t => t.Requester)
            .Include(t => t.AssignedAgent)
            .FirstOrDefaultAsync(t => t.Id == id, cancellationToken);

    public async Task AddAsync(Ticket ticket, CancellationToken cancellationToken = default) =>
        await db.Tickets.AddAsync(ticket, cancellationToken);

    public void Remove(Ticket ticket) => db.Tickets.Remove(ticket);

    public Task LoadRequesterAsync(Ticket ticket, CancellationToken cancellationToken = default) =>
        db.Entry(ticket).Reference(t => t.Requester).LoadAsync(cancellationToken);

    public Task LoadAssignedAgentAsync(Ticket ticket, CancellationToken cancellationToken = default) =>
        db.Entry(ticket).Reference(t => t.AssignedAgent).LoadAsync(cancellationToken);

    public Task<int> SaveChangesAsync(CancellationToken cancellationToken = default) =>
        db.SaveChangesAsync(cancellationToken);
}
