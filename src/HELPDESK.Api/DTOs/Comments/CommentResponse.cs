namespace HELPDESK.Api.DTOs.Comments;

public class CommentResponse
{
    public int Id { get; set; }
    public int TicketId { get; set; }
    public string AuthorId { get; set; } = string.Empty;
    public string AuthorName { get; set; } = string.Empty;
    public string Body { get; set; } = string.Empty;
    public DateTimeOffset CreatedAt { get; set; }
}
