export type TicketStatus = 'Open' | 'InProgress' | 'Resolved' | 'Closed';
export type TicketPriority = 'Low' | 'Medium' | 'High' | 'Urgent';

export interface AuthResponse {
  token: string;
  expiresAt: string;
  email: string;
  displayName: string;
  roles: string[];
}

export interface RegisterRequest {
  email: string;
  password: string;
  displayName: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface TicketResponse {
  id: number;
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  requesterId: string;
  requesterName: string;
  assignedAgentId: string | null;
  assignedAgentName: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TicketCreateRequest {
  title: string;
  description: string;
  priority: TicketPriority;
}

export interface TicketUpdateRequest {
  status?: TicketStatus;
  priority?: TicketPriority;
  assignedAgentId?: string;
}

export interface CommentResponse {
  id: number;
  ticketId: number;
  authorId: string;
  authorName: string;
  body: string;
  createdAt: string;
}

export interface CommentCreateRequest {
  body: string;
}
