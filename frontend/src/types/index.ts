/**
 * Shared domain types. These intentionally mirror the backend Pydantic
 * schemas so responses can be used without an adapter layer.
 */

export const LEAD_STATUSES = [
  "New",
  "Contacted",
  "Qualified",
  "Proposal Sent",
  "Won",
  "Lost",
] as const;

export type LeadStatus = (typeof LEAD_STATUSES)[number];

export type FollowUpState = "overdue" | "due_today" | "upcoming" | "unscheduled";

export interface LeadWithFollowUpState {
  lead: Lead;
  followUpState: FollowUpState;
}

export interface DiscussionSummary {
  id: number;
  note: string;
  created_at: string;
}

export interface Discussion {
  id: number;
  lead_id: number;
  note: string;
  created_at: string;
}

export interface Lead {
  id: number;
  name: string;
  company: string | null;
  phone: string | null;
  status: LeadStatus;
  next_follow_up_at: string | null;
  created_at: string;
  updated_at: string;
  latest_discussion: DiscussionSummary | null;
  discussion_count: number;
}

export interface LeadDetail extends Lead {
  discussions: Discussion[];
}

export interface LeadCreateInput {
  name: string;
  company?: string | null;
  phone?: string | null;
  status?: LeadStatus;
}

export interface LeadUpdateInput {
  name?: string;
  company?: string | null;
  phone?: string | null;
  status?: LeadStatus;
}

export interface DiscussionCreateInput {
  note: string;
  follow_up_at?: string | null;
}

export interface DiscussionCreateResponse {
  discussion: Discussion;
  lead: Lead;
}

export interface FieldError {
  field: string;
  message: string;
}

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    details?: FieldError[] | null;
  };
}
