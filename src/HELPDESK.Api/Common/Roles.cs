namespace HELPDESK.Api.Common;

public static class Roles
{
    public const string Admin = "Admin";
    public const string Agent = "Agent";
    public const string Customer = "Customer";

    public static readonly string[] All = [Admin, Agent, Customer];
}
