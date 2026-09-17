import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, ApiError } from '../api/client';
import type { TicketPriority } from '../api/types';

const PRIORITIES: TicketPriority[] = ['Low', 'Medium', 'High', 'Urgent'];

export function NewTicketPage() {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TicketPriority>('Medium');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const ticket = await api.createTicket({ title, description, priority });
      navigate(`/tickets/${ticket.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to create ticket.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div>
      <h1>New ticket</h1>
      <form className="card" onSubmit={handleSubmit}>
        {error && <div className="alert-error">{error}</div>}
        <label>
          Title
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} required />
        </label>
        <label>
          Description
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={6} required />
        </label>
        <label>
          Priority
          <select value={priority} onChange={(e) => setPriority(e.target.value as TicketPriority)}>
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Creating…' : 'Create ticket'}
        </button>
      </form>
    </div>
  );
}
