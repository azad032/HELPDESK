using HELPDESK.Api.Models.Enums;

namespace HELPDESK.Api.DTOs.Tickets;

public class TicketUpdateRequest
{
    public TicketStatus? Status { get; set; }
    public TicketPriority? Priority { get; set; }
    public string? AssignedAgentId { get; set; }
}
