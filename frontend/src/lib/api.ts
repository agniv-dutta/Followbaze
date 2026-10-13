/**
 * Centralised typed API client. Every network call in the app goes through
 * here so components never build URLs or handle HTTP details themselves.
 */

import { API_BASE_URL } from "@/lib/config";
import type {
  ApiErrorBody,
  Discussion,
  DiscussionCreateInput,
  DiscussionCreateResponse,
  FieldError,
  Lead,
  LeadCreateInput,
  LeadDetail,
  LeadStatus,
  LeadUpdateInput,
} from "@/types";

const PREFIX = "/api/v1";

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: FieldError[];

  constructor(message: string, status: number, code: string, details: FieldError[] = []) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

function toApiError(status: number, body: ApiErrorBody | null): ApiError {
  const error = body?.error;
  return new ApiError(
    error?.message ?? `Request failed with status ${status}.`,
    status,
    error?.code ?? "http_error",
    error?.details ?? [],
  );
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
      cache: "no-store",
    });
  } catch {
    throw new ApiError(
      "Unable to reach the server. Check that the API is running and try again.",
      0,
      "network_error",
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  let payload: unknown = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = null;
    }
  }

  if (!response.ok) {
    throw toApiError(response.status, payload as ApiErrorBody | null);
  }
  return payload as T;
}

function buildQuery(params: Record<string, string | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") search.set(key, value);
  }
  const query = search.toString();
  return query ? `?${query}` : "";
}

export const api = {
  health(): Promise<{ status: string }> {
    return request(`${PREFIX}/health`);
  },

  listLeads(params: { status?: LeadStatus | "All"; search?: string } = {}): Promise<Lead[]> {
    const status = params.status && params.status !== "All" ? params.status : undefined;
    return request(`${PREFIX}/leads${buildQuery({ status, search: params.search?.trim() })}`);
  },

  createLead(input: LeadCreateInput): Promise<Lead> {
    return request(`${PREFIX}/leads`, { method: "POST", body: JSON.stringify(input) });
  },

  getLead(leadId: number): Promise<LeadDetail> {
    return request(`${PREFIX}/leads/${leadId}`);
  },

  updateLead(leadId: number, input: LeadUpdateInput): Promise<Lead> {
    return request(`${PREFIX}/leads/${leadId}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    });
  },

  listDiscussions(leadId: number): Promise<Discussion[]> {
    return request(`${PREFIX}/leads/${leadId}/discussions`);
  },

  createDiscussion(
    leadId: number,
    input: DiscussionCreateInput,
  ): Promise<DiscussionCreateResponse> {
    return request(`${PREFIX}/leads/${leadId}/discussions`, {
      method: "POST",
      body: JSON.stringify(input),
    });
  },
};

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.details.length > 0) {
      return error.details.map((d) => d.message).join(" ");
    }
    return error.message;
  }
  if (error instanceof Error) return error.message;
  return "Something went wrong.";
}
