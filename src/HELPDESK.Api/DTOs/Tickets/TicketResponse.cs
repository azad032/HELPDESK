using HELPDESK.Api.Models.Enums;

namespace HELPDESK.Api.DTOs.Tickets;

public class TicketResponse
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public TicketStatus Status { get; set; }
    public TicketPriority Priority { get; set; }

    public string RequesterId { get; set; } = string.Empty;
    public string RequesterName { get; set; } = string.Empty;

    public string? AssignedAgentId { get; set; }
    public string? AssignedAgentName { get; set; }

    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
}
