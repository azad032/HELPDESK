import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, ApiError } from '../api/client';
import type { CommentResponse, TicketPriority, TicketResponse, TicketStatus } from '../api/types';
import { PriorityBadge, StatusBadge } from '../components/Badges';
import { useAuth } from '../auth/AuthContext';

const STATUSES: TicketStatus[] = ['Open', 'InProgress', 'Resolved', 'Closed'];
const PRIORITIES: TicketPriority[] = ['Low', 'Medium', 'High', 'Urgent'];

export function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const ticketId = Number(id);
  const { user, isStaff, isAdmin } = useAuth();
  const navigate = useNavigate();

  const [ticket, setTicket] = useState<TicketResponse | null>(null);
  const [comments, setComments] = useState<CommentResponse[]>([]);
  const [newComment, setNewComment] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [ticketData, commentData] = await Promise.all([
        api.getTicket(ticketId),
        api.getComments(ticketId),
      ]);
      setTicket(ticketData);
      setComments(commentData);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to load ticket.');
    }
  }, [ticketId]);

  useEffect(() => {
    load();
  }, [load]);

  async function updateTicket(changes: Partial<{ status: TicketStatus; priority: TicketPriority; assignedAgentId: string }>) {
    setIsBusy(true);
    setError(null);
    try {
      setTicket(await api.updateTicket(ticketId, changes));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to update ticket.');
    } finally {
      setIsBusy(false);
    }
  }

  async function handleAddComment(event: FormEvent) {
    event.preventDefault();
    if (!newComment.trim()) return;
    setIsBusy(true);
    setError(null);
    try {
      const comment = await api.addComment(ticketId, { body: newComment });
      setComments((prev) => [...prev, comment]);
      setNewComment('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to add comment.');
    } finally {
      setIsBusy(false);
    }
  }

  async function handleDelete() {
    if (!confirm('Delete this ticket? This cannot be undone.')) return;
    try {
      await api.deleteTicket(ticketId);
      navigate('/');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to delete ticket.');
    }
  }

  if (error && !ticket) return <div className="alert-error">{error}</div>;
  if (!ticket) return <p>Loading ticket…</p>;

  return (
    <div>
      <h1>{ticket.title}</h1>
      {error && <div className="alert-error">{error}</div>}

      <div className="card ticket-meta">
        <div>
          <StatusBadge status={ticket.status} /> <PriorityBadge priority={ticket.priority} />
        </div>
        <p>{ticket.description}</p>
        <dl>
          <dt>Requester</dt>
          <dd>{ticket.requesterName}</dd>
          <dt>Assigned to</dt>
          <dd>{ticket.assignedAgentName ?? 'Unassigned'}</dd>
          <dt>Created</dt>
          <dd>{new Date(ticket.createdAt).toLocaleString()}</dd>
        </dl>

        {isStaff && (
          <div className="ticket-controls">
            <label>
              Status
              <select
                value={ticket.status}
                disabled={isBusy}
                onChange={(e) => updateTicket({ status: e.target.value as TicketStatus })}
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Priority
              <select
                value={ticket.priority}
                disabled={isBusy}
                onChange={(e) => updateTicket({ priority: e.target.value as TicketPriority })}
              >
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </label>
            {ticket.assignedAgentId !== user?.id && (
              <button type="button" disabled={isBusy} onClick={() => updateTicket({ assignedAgentId: user!.id })}>
                Assign to me
              </button>
            )}
            {isAdmin && (
              <button type="button" className="button-danger" disabled={isBusy} onClick={handleDelete}>
                Delete ticket
              </button>
            )}
          </div>
        )}
      </div>

      <h2>Comments</h2>
      <ul className="comment-list">
        {comments.map((comment) => (
          <li key={comment.id} className="card">
            <div className="comment-header">
              <strong>{comment.authorName}</strong>
              <span className="muted">{new Date(comment.createdAt).toLocaleString()}</span>
            </div>
            <p>{comment.body}</p>
          </li>
        ))}
        {comments.length === 0 && <p className="muted">No comments yet.</p>}
      </ul>

      <form className="card" onSubmit={handleAddComment}>
        <label>
          Add a comment
          <textarea value={newComment} onChange={(e) => setNewComment(e.target.value)} rows={3} required />
        </label>
        <button type="submit" disabled={isBusy}>
          Post comment
        </button>
      </form>
    </div>
  );
}
