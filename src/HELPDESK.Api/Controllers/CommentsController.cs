using System.Security.Claims;
using HELPDESK.Api.Common;
using HELPDESK.Api.Data;
using HELPDESK.Api.DTOs.Comments;
using HELPDESK.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;

namespace HELPDESK.Api.Controllers;

[ApiController]
[Route("api/tickets/{ticketId:int}/comments")]
[Authorize]
public class CommentsController(HelpdeskDbContext db, IMemoryCache cache) : ControllerBase
{
    private static readonly TimeSpan CacheDuration = TimeSpan.FromMinutes(5);

    private string CurrentUserId => User.FindFirstValue(ClaimTypes.NameIdentifier)!;
    private bool IsStaff => User.IsInRole(Roles.Admin) || User.IsInRole(Roles.Agent);

    [HttpGet]
    public async Task<ActionResult<IEnumerable<CommentResponse>>> GetComments(int ticketId)
    {
        var ticket = await db.Tickets.AsNoTracking().FirstOrDefaultAsync(t => t.Id == ticketId);
        if (ticket is null) return NotFound();
        if (!IsStaff && ticket.RequesterId != CurrentUserId) return Forbid();

        var cacheKey = $"tickets:{ticketId}:comments";

        var comments = await cache.GetOrCreateAsync(cacheKey, async entry =>
        {
            entry.SetAbsoluteExpiration(CacheDuration);

            var results = await db.TicketComments.AsNoTracking()
                .Include(c => c.Author)
                .Where(c => c.TicketId == ticketId)
                .OrderBy(c => c.CreatedAt)
                .ToListAsync();

            return results.Select(ToResponse).ToList();
        });

        return Ok(comments);
    }

    [HttpPost]
    public async Task<ActionResult<CommentResponse>> AddComment(int ticketId, CommentCreateRequest request)
    {
        var ticket = await db.Tickets.FirstOrDefaultAsync(t => t.Id == ticketId);
        if (ticket is null) return NotFound();
        if (!IsStaff && ticket.RequesterId != CurrentUserId) return Forbid();

        var comment = new TicketComment
        {
            TicketId = ticketId,
            AuthorId = CurrentUserId,
            Body = request.Body
        };

        db.TicketComments.Add(comment);
        ticket.UpdatedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync();
        await db.Entry(comment).Reference(c => c.Author).LoadAsync();

        cache.Remove($"tickets:{ticketId}:comments");

        return CreatedAtAction(nameof(GetComments), new { ticketId }, ToResponse(comment));
    }

    private static CommentResponse ToResponse(TicketComment comment) => new()
    {
        Id = comment.Id,
        TicketId = comment.TicketId,
        AuthorId = comment.AuthorId,
        AuthorName = comment.Author?.DisplayName ?? string.Empty,
        Body = comment.Body,
        CreatedAt = comment.CreatedAt
    };
}
