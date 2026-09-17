using System.Security.Claims;
using HELPDESK.Api.Common;
using HELPDESK.Api.Data;
using HELPDESK.Api.DTOs.Tickets;
using HELPDESK.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HELPDESK.Api.Controllers;

[ApiController]
[Route("api/tickets")]
[Authorize]
public class TicketsController(HelpdeskDbContext db) : ControllerBase
{
    private string CurrentUserId => User.FindFirstValue(ClaimTypes.NameIdentifier)!;
    private bool IsStaff => User.IsInRole(Roles.Admin) || User.IsInRole(Roles.Agent);

    [HttpGet]
    public async Task<ActionResult<IEnumerable<TicketResponse>>> GetTickets()
    {
        var query = db.Tickets.AsNoTracking()
            .Include(t => t.Requester)
            .Include(t => t.AssignedAgent)
            .AsQueryable();

        if (!IsStaff)
        {
            query = query.Where(t => t.RequesterId == CurrentUserId);
        }

        var tickets = await query.OrderByDescending(t => t.CreatedAt).ToListAsync();
        return Ok(tickets.Select(ToResponse));
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<TicketResponse>> GetTicket(int id)
    {
        var ticket = await db.Tickets.AsNoTracking()
            .Include(t => t.Requester)
            .Include(t => t.AssignedAgent)
            .FirstOrDefaultAsync(t => t.Id == id);

        if (ticket is null) return NotFound();
        if (!IsStaff && ticket.RequesterId != CurrentUserId) return Forbid();

        return Ok(ToResponse(ticket));
    }

    [HttpPost]
    public async Task<ActionResult<TicketResponse>> CreateTicket(TicketCreateRequest request)
    {
        var ticket = new Ticket
        {
            Title = request.Title,
            Description = request.Description,
            Priority = request.Priority,
            RequesterId = CurrentUserId
        };

        db.Tickets.Add(ticket);
        await db.SaveChangesAsync();
        await db.Entry(ticket).Reference(t => t.Requester).LoadAsync();

        return CreatedAtAction(nameof(GetTicket), new { id = ticket.Id }, ToResponse(ticket));
    }

    [HttpPut("{id:int}")]
    [Authorize(Roles = $"{Roles.Admin},{Roles.Agent}")]
    public async Task<ActionResult<TicketResponse>> UpdateTicket(int id, TicketUpdateRequest request)
    {
        var ticket = await db.Tickets
            .Include(t => t.Requester)
            .Include(t => t.AssignedAgent)
            .FirstOrDefaultAsync(t => t.Id == id);

        if (ticket is null) return NotFound();

        if (request.Status.HasValue) ticket.Status = request.Status.Value;
        if (request.Priority.HasValue) ticket.Priority = request.Priority.Value;
        if (request.AssignedAgentId is not null) ticket.AssignedAgentId = request.AssignedAgentId;
        ticket.UpdatedAt = DateTimeOffset.UtcNow;

        await db.SaveChangesAsync();
        await db.Entry(ticket).Reference(t => t.AssignedAgent).LoadAsync();

        return Ok(ToResponse(ticket));
    }

    [HttpDelete("{id:int}")]
    [Authorize(Roles = Roles.Admin)]
    public async Task<IActionResult> DeleteTicket(int id)
    {
        var ticket = await db.Tickets.FindAsync(id);
        if (ticket is null) return NotFound();

        db.Tickets.Remove(ticket);
        await db.SaveChangesAsync();
        return NoContent();
    }

    private static TicketResponse ToResponse(Ticket ticket) => new()
    {
        Id = ticket.Id,
        Title = ticket.Title,
        Description = ticket.Description,
        Status = ticket.Status,
        Priority = ticket.Priority,
        RequesterId = ticket.RequesterId,
        RequesterName = ticket.Requester?.DisplayName ?? string.Empty,
        AssignedAgentId = ticket.AssignedAgentId,
        AssignedAgentName = ticket.AssignedAgent?.DisplayName,
        CreatedAt = ticket.CreatedAt,
        UpdatedAt = ticket.UpdatedAt
    };
}
