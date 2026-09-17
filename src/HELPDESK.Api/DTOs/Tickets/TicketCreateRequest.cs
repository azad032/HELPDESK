using System.ComponentModel.DataAnnotations;
using HELPDESK.Api.Models.Enums;

namespace HELPDESK.Api.DTOs.Tickets;

public class TicketCreateRequest
{
    [Required, MaxLength(200)]
    public string Title { get; set; } = string.Empty;

    [Required]
    public string Description { get; set; } = string.Empty;

    public TicketPriority Priority { get; set; } = TicketPriority.Medium;
}
