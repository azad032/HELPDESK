using System.Security.Claims;
using HELPDESK.Api.Common;
using HELPDESK.Api.DTOs.Tickets;
using HELPDESK.Api.Models;
using HELPDESK.Api.Repositories;
using HELPDESK.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Caching.Memory;

namespace HELPDESK.Api.Controllers;

[ApiController]
[Route("api/tickets")]
[Authorize]
public class TicketsController(
    ITicketRepository ticketRepository,
    IUserRepository userRepository,
    IMemoryCache cache,
    TicketCacheInvalidator cacheInvalidator) : ControllerBase
{
    private static readonly TimeSpan CacheDuration = TimeSpan.FromMinutes(5);

    private string CurrentUserId => User.FindFirstValue(ClaimTypes.NameIdentifier)!;
    private bool IsStaff => User.IsInRole(Roles.Admin) || User.IsInRole(Roles.Agent);

    [HttpGet]
    public async Task<ActionResult<IEnumerable<TicketResponse>>> GetTickets()
    {
        var cacheKey = $"tickets:list:{CurrentUserId}";

        var tickets = await cache.GetOrCreateAsync(cacheKey, async entry =>
        {
            entry.SetAbsoluteExpiration(CacheDuration);
            entry.AddExpirationToken(cacheInvalidator.GetChangeToken());

            var results = await ticketRepository.GetAllAsync(IsStaff ? null : CurrentUserId);
            return results.Select(ToResponse).ToList();
        });

        return Ok(tickets);
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<TicketResponse>> GetTicket(int id)
    {
        var cacheKey = $"tickets:{id}";

        var ticket = await cache.GetOrCreateAsync(cacheKey, async entry =>
        {
            entry.SetAbsoluteExpiration(CacheDuration);
            entry.AddExpirationToken(cacheInvalidator.GetChangeToken());

            var entity = await ticketRepository.GetByIdAsync(id);
            return entity is null ? null : ToResponse(entity);
        });

        if (ticket is null) return NotFound();
        if (!IsStaff && ticket.RequesterId != CurrentUserId) return Forbid();

        return Ok(ticket);
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

        await ticketRepository.AddAsync(ticket);
        await ticketRepository.SaveChangesAsync();
        await ticketRepository.LoadRequesterAsync(ticket);

        cacheInvalidator.Invalidate();

        return CreatedAtAction(nameof(GetTicket), new { id = ticket.Id }, ToResponse(ticket));
    }

    [HttpPut("{id:int}")]
    [Authorize(Roles = $"{Roles.Admin},{Roles.Agent}")]
    public async Task<ActionResult<TicketResponse>> UpdateTicket(int id, TicketUpdateRequest request)
    {
        var ticket = await ticketRepository.GetTrackedByIdAsync(id);
        if (ticket is null) return NotFound();

        if (!string.IsNullOrEmpty(request.AssignedAgentId) &&
            await userRepository.GetByIdAsync(request.AssignedAgentId) is null)
        {
            return BadRequest("AssignedAgentId does not refer to an existing user.");
        }

        if (request.Status.HasValue) ticket.Status = request.Status.Value;
        if (request.Priority.HasValue) ticket.Priority = request.Priority.Value;
        if (request.AssignedAgentId is not null) ticket.AssignedAgentId = request.AssignedAgentId;
        ticket.UpdatedAt = DateTimeOffset.UtcNow;

        await ticketRepository.SaveChangesAsync();
        await ticketRepository.LoadAssignedAgentAsync(ticket);

        cacheInvalidator.Invalidate();

        return Ok(ToResponse(ticket));
    }

    [HttpDelete("{id:int}")]
    [Authorize(Roles = Roles.Admin)]
    public async Task<IActionResult> DeleteTicket(int id)
    {
        var ticket = await ticketRepository.GetTrackedByIdAsync(id);
        if (ticket is null) return NotFound();

        ticketRepository.Remove(ticket);
        await ticketRepository.SaveChangesAsync();

        cacheInvalidator.Invalidate();

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
