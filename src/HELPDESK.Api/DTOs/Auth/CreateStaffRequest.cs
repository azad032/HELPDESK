using System.ComponentModel.DataAnnotations;

namespace HELPDESK.Api.DTOs.Auth;

public class CreateStaffRequest
{
    [Required, EmailAddress]
    public string Email { get; set; } = string.Empty;

    [Required, MinLength(6)]
    public string Password { get; set; } = string.Empty;

    [Required]
    public string DisplayName { get; set; } = string.Empty;

    /// <summary>Must be "Agent" or "Admin".</summary>
    [Required]
    public string Role { get; set; } = string.Empty;
}
