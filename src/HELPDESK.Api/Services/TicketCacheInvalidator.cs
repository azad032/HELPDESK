using Microsoft.Extensions.Primitives;

namespace HELPDESK.Api.Services;

// Deliberately coarse: any ticket mutation drops every cached ticket list/detail for every
// user, not just the affected ticket or requester. Any user's cached list can go stale after
// another user's write (e.g. a customer's list showing an agent-assigned status change), so
// per-key invalidation isn't enough here. Don't "optimize" this into per-key removal without
// re-solving that staleness case.
public class TicketCacheInvalidator
{
    private CancellationTokenSource _cts = new();

    public IChangeToken GetChangeToken() => new CancellationChangeToken(_cts.Token);

    public void Invalidate()
    {
        var previous = Interlocked.Exchange(ref _cts, new CancellationTokenSource());
        previous.Cancel();
    }
}
