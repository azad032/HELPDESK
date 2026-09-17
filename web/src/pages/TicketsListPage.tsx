import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, ApiError } from '../api/client';
import type { TicketResponse } from '../api/types';
import { PriorityBadge, StatusBadge } from '../components/Badges';
import { useAuth } from '../auth/AuthContext';

export function TicketsListPage() {
  const { isStaff } = useAuth();
  const [tickets, setTickets] = useState<TicketResponse[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .getTickets()
      .then(setTickets)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Unable to load tickets.'));
  }, []);

  if (error) return <div className="alert-error">{error}</div>;
  if (!tickets) return <p>Loading tickets…</p>;

  return (
    <div>
      <h1>Tickets</h1>
      {tickets.length === 0 ? (
        <p className="muted">No tickets yet.</p>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Status</th>
              <th>Priority</th>
              {isStaff && <th>Requester</th>}
              <th>Assigned to</th>
              <th>Updated</th>
            </tr>
          </thead>
          <tbody>
            {tickets.map((ticket) => (
              <tr key={ticket.id}>
                <td>
                  <Link to={`/tickets/${ticket.id}`}>{ticket.title}</Link>
                </td>
                <td>
                  <StatusBadge status={ticket.status} />
                </td>
                <td>
                  <PriorityBadge priority={ticket.priority} />
                </td>
                {isStaff && <td>{ticket.requesterName}</td>}
                <td>{ticket.assignedAgentName ?? <span className="muted">Unassigned</span>}</td>
                <td>{new Date(ticket.updatedAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
