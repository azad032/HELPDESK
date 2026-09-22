using HELPDESK.Api.Services;
using Xunit;

namespace HELPDESK.Api.Tests;

public class TicketCacheInvalidatorTests
{
    [Fact]
    public void Invalidate_CancelsPreviouslyIssuedToken()
    {
        var invalidator = new TicketCacheInvalidator();
        var token = invalidator.GetChangeToken();

        invalidator.Invalidate();

        Assert.True(token.HasChanged);
    }

    [Fact]
    public void GetChangeToken_AfterInvalidate_ReturnsFreshUncancelledToken()
    {
        var invalidator = new TicketCacheInvalidator();
        invalidator.Invalidate();

        var token = invalidator.GetChangeToken();

        Assert.False(token.HasChanged);
    }
}
