using System.ComponentModel.DataAnnotations;

namespace HELPDESK.Api.DTOs.Comments;

public class CommentCreateRequest
{
    [Required, MaxLength(4000)]
    public string Body { get; set; } = string.Empty;
}
