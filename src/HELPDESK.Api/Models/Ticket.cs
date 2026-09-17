using HELPDESK.Api.Models.Enums;

namespace HELPDESK.Api.Models;

public class Ticket
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public TicketStatus Status { get; set; } = TicketStatus.Open;
    public TicketPriority Priority { get; set; } = TicketPriority.Medium;

    public string RequesterId { get; set; } = string.Empty;
    public ApplicationUser? Requester { get; set; }

    public string? AssignedAgentId { get; set; }
    public ApplicationUser? AssignedAgent { get; set; }

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

    public ICollection<TicketComment> Comments { get; set; } = [];
}
