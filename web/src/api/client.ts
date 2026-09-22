import type {
  AuthResponse,
  CommentCreateRequest,
  CommentResponse,
  LoginRequest,
  RegisterRequest,
  TicketCreateRequest,
  TicketResponse,
  TicketUpdateRequest,
} from './types';

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

let authToken: string | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
}

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

interface ProblemDetails {
  title?: string;
  errors?: Record<string, string[]>;
}

function describeProblem(body: unknown, fallback: string): string {
  const problem = body as ProblemDetails | undefined;
  if (problem?.errors) {
    return Object.values(problem.errors).flat().join(' ');
  }
  return problem?.title ?? fallback;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');
  if (authToken) {
    headers.set('Authorization', `Bearer ${authToken}`);
  }

  const response = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  const body = text ? JSON.parse(text) : undefined;

  if (!response.ok) {
    if (response.status === 401) {
      window.dispatchEvent(new Event('helpdesk:unauthorized'));
    }
    throw new ApiError(describeProblem(body, response.statusText), response.status);
  }

  return body as T;
}

export const api = {
  login: (payload: LoginRequest) =>
    request<AuthResponse>('/api/auth/login', { method: 'POST', body: JSON.stringify(payload) }),

  register: (payload: RegisterRequest) =>
    request<AuthResponse>('/api/auth/register', { method: 'POST', body: JSON.stringify(payload) }),

  getTickets: () => request<TicketResponse[]>('/api/tickets'),

  getTicket: (id: number) => request<TicketResponse>(`/api/tickets/${id}`),

  createTicket: (payload: TicketCreateRequest) =>
    request<TicketResponse>('/api/tickets', { method: 'POST', body: JSON.stringify(payload) }),

  updateTicket: (id: number, payload: TicketUpdateRequest) =>
    request<TicketResponse>(`/api/tickets/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),

  deleteTicket: (id: number) => request<void>(`/api/tickets/${id}`, { method: 'DELETE' }),

  getComments: (ticketId: number) => request<CommentResponse[]>(`/api/tickets/${ticketId}/comments`),

  addComment: (ticketId: number, payload: CommentCreateRequest) =>
    request<CommentResponse>(`/api/tickets/${ticketId}/comments`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
};
