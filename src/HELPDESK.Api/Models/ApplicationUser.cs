using Microsoft.AspNetCore.Identity;

namespace HELPDESK.Api.Models;

public class ApplicationUser : IdentityUser
{
    public string DisplayName { get; set; } = string.Empty;

    public ICollection<Ticket> RequestedTickets { get; set; } = [];
    public ICollection<Ticket> AssignedTickets { get; set; } = [];
    public ICollection<TicketComment> Comments { get; set; } = [];
}
