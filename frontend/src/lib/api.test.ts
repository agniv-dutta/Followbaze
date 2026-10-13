import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError, api } from "@/lib/api";
import type { Lead } from "@/types";

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(body),
  } as unknown as Response;
}

function textResponse(body: string, status: number): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => body,
  } as unknown as Response;
}

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("api client", () => {
  it("requests leads with no query when filters are empty", async () => {
    fetchMock.mockResolvedValue(jsonResponse([]));
    await api.listLeads({ status: "All", search: "" });
    expect(fetchMock.mock.calls[0][0]).toBe("http://localhost:8000/api/v1/leads");
  });

  it("encodes status and search into the query string", async () => {
    fetchMock.mockResolvedValue(jsonResponse([]));
    await api.listLeads({ status: "Won", search: "  grace " });
    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain("status=Won");
    expect(url).toContain("search=grace");
    expect(url).not.toContain("All");
  });

  it("posts a new lead as JSON", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ id: 1 } as Partial<Lead>, 201));
    await api.createLead({ name: "Grace Hopper" });
    const [, init] = fetchMock.mock.calls[0];
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual({ name: "Grace Hopper" });
  });

  it("throws a typed ApiError with details on validation failure", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(
        {
          error: {
            code: "validation_error",
            message: "Request validation failed.",
            details: [{ field: "name", message: "must not be blank" }],
          },
        },
        422,
      ),
    );

    await expect(api.createLead({ name: "" })).rejects.toMatchObject({
      status: 422,
      code: "validation_error",
      details: [{ field: "name", message: "must not be blank" }],
    });
  });

  it("maps network failures to a helpful ApiError", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));
    await expect(api.listLeads()).rejects.toMatchObject({ code: "network_error", status: 0 });
  });

  it("falls back to a generic message for non-JSON error bodies", async () => {
    fetchMock.mockResolvedValue(textResponse("<html>500</html>", 500));
    await expect(api.listLeads()).rejects.toMatchObject({ status: 500, code: "http_error" });
  });
});
