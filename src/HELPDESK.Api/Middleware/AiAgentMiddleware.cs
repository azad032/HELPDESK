namespace HELPDESK.Api.Middleware;

public class AiAgentMiddleware(RequestDelegate next)
{
    public async Task InvokeAsync(HttpContext context)
    {
        context.Response.Headers["X-Powered-By"] = "Claude-AI-Agent";
        await next(context);
    }
}
