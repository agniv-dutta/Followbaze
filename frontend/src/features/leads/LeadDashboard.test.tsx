import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return {
    ...actual,
    api: {
      health: vi.fn(),
      listLeads: vi.fn(),
      createLead: vi.fn(),
      getLead: vi.fn(),
      updateLead: vi.fn(),
      listDiscussions: vi.fn(),
      createDiscussion: vi.fn(),
    },
  };
});

import { LeadDashboard } from "@/features/leads/LeadDashboard";
import { ApiError, api } from "@/lib/api";
import type { Discussion, Lead, LeadDetail } from "@/types";

const mocked = vi.mocked(api);

const NOW = Date.now();

function makeLead(overrides: Partial<Lead> = {}): Lead {
  return {
    id: 1,
    name: "Grace Hopper",
    company: "US Navy",
    phone: null,
    status: "New",
    next_follow_up_at: null,
    created_at: new Date(NOW - 86_400_000).toISOString(),
    updated_at: new Date(NOW - 3_600_000).toISOString(),
    latest_discussion: null,
    discussion_count: 0,
    ...overrides,
  };
}

function makeDiscussion(overrides: Partial<Discussion> = {}): Discussion {
  return {
    id: 1,
    lead_id: 1,
    note: "First note",
    created_at: new Date(NOW - 7_200_000).toISOString(),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocked.listLeads.mockResolvedValue([]);
});

describe("LeadDashboard", () => {
  it("renders leads and their status badges", async () => {
    mocked.listLeads.mockResolvedValue([
      makeLead({ id: 1, name: "Grace Hopper", status: "Won" }),
      makeLead({ id: 2, name: "Alan Turing", status: "New" }),
    ]);

    render(<LeadDashboard />);

    expect(await screen.findByText("Grace Hopper")).toBeInTheDocument();
    expect(screen.getByText("Alan Turing")).toBeInTheDocument();
    const graceRow = screen.getByRole("button", { name: "Open Grace Hopper" });
    expect(within(graceRow).getByText("Won")).toBeInTheDocument();
  });

  it("shows an empty state with an add action when there are no leads", async () => {
    render(<LeadDashboard />);
    expect(await screen.findByText("No leads yet")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Add Lead" }).length).toBeGreaterThan(0);
  });

  it("combines search and status filters", async () => {
    const user = userEvent.setup();
    render(<LeadDashboard />);
    await waitFor(() => expect(mocked.listLeads).toHaveBeenCalled());

    await user.selectOptions(screen.getByLabelText("Filter by status"), "Won");
    await waitFor(() =>
      expect(mocked.listLeads).toHaveBeenLastCalledWith(
        expect.objectContaining({ status: "Won" }),
      ),
    );

    await user.type(screen.getByLabelText("Search leads by name"), "grace");
    await waitFor(() =>
      expect(mocked.listLeads).toHaveBeenLastCalledWith(
        expect.objectContaining({ status: "Won", search: "grace" }),
      ),
    );
  });

  it("groups overdue follow-ups separately without duplicating them", async () => {
    mocked.listLeads.mockResolvedValue([
      makeLead({
        id: 1,
        name: "Overdue Guy",
        next_follow_up_at: new Date(NOW - 86_400_000).toISOString(),
      }),
      makeLead({
        id: 2,
        name: "Future Guy",
        next_follow_up_at: new Date(NOW + 10 * 86_400_000).toISOString(),
      }),
      makeLead({ id: 3, name: "No Plan", next_follow_up_at: null }),
    ]);

    render(<LeadDashboard />);

    const overdueSection = await screen.findByTestId("overdue-section");
    expect(within(overdueSection).getByText("Overdue Guy")).toBeInTheDocument();
    expect(screen.getAllByText("Overdue Guy")).toHaveLength(1);
    expect(screen.getByText("Future Guy")).toBeInTheDocument();
    expect(screen.getByText("No Plan")).toBeInTheDocument();
  });

  it("opens the timeline dialog, renders newest-first, and closes on Escape", async () => {
    const user = userEvent.setup();
    const lead = makeLead({ id: 1, name: "Grace Hopper", discussion_count: 2 });
    mocked.listLeads.mockResolvedValue([lead]);
    mocked.getLead.mockResolvedValue({
      ...lead,
      discussions: [
        makeDiscussion({ id: 2, note: "Second note" }),
        makeDiscussion({ id: 1, note: "First note" }),
      ],
    } satisfies LeadDetail);

    render(<LeadDashboard />);
    await user.click(await screen.findByRole("button", { name: "Open Grace Hopper" }));

    const dialog = await screen.findByRole("dialog");
    await within(dialog).findByText("Second note");
    const history = within(dialog).getByLabelText("Discussion history");
    const items = within(history).getAllByRole("listitem");
    expect(items[0]).toHaveTextContent("Second note");
    expect(items[1]).toHaveTextContent("First note");

    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("submits a discussion and updates the dashboard", async () => {
    const user = userEvent.setup();
    const lead = makeLead({ id: 1, name: "Grace Hopper" });
    const created = makeDiscussion({ id: 9, note: "Great call", created_at: new Date().toISOString() });
    mocked.listLeads.mockResolvedValue([lead]);
    mocked.getLead.mockResolvedValue({ ...lead, discussions: [] } satisfies LeadDetail);
    mocked.createDiscussion.mockResolvedValue({
      discussion: created,
      lead: makeLead({
        id: 1,
        name: "Grace Hopper",
        latest_discussion: { id: 9, note: "Great call", created_at: created.created_at },
        discussion_count: 1,
      }),
    });

    render(<LeadDashboard />);
    await user.click(await screen.findByRole("button", { name: "Open Grace Hopper" }));
    const dialog = await screen.findByRole("dialog");

    await user.type(within(dialog).getByLabelText("Add discussion note"), "Great call");
    await user.click(within(dialog).getByRole("button", { name: "Save discussion" }));

    await waitFor(() =>
      expect(mocked.createDiscussion).toHaveBeenCalledWith(1, {
        note: "Great call",
        follow_up_at: null,
      }),
    );
    expect(await within(dialog).findByText("Great call")).toBeInTheDocument();

    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(await screen.findByText("Great call")).toBeInTheDocument();
  });

  it("creates a lead and adds it to the dashboard", async () => {
    const user = userEvent.setup();
    mocked.createLead.mockResolvedValue(makeLead({ id: 9, name: "New Person" }));

    render(<LeadDashboard />);
    await user.click(await screen.findByRole("button", { name: "Add Lead" }));
    const dialog = await screen.findByRole("dialog");

    await user.type(within(dialog).getByLabelText(/Name/), "New Person");
    await user.click(within(dialog).getByRole("button", { name: "Create lead" }));

    await waitFor(() =>
      expect(mocked.createLead).toHaveBeenCalledWith(
        expect.objectContaining({ name: "New Person", status: "New" }),
      ),
    );
    expect(await screen.findByText("New Person")).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("updates the lead status from the dialog", async () => {
    const user = userEvent.setup();
    const lead = makeLead({ id: 1, name: "Grace Hopper", status: "New" });
    mocked.listLeads.mockResolvedValue([lead]);
    mocked.getLead.mockResolvedValue({ ...lead, discussions: [] } satisfies LeadDetail);
    mocked.updateLead.mockResolvedValue(makeLead({ id: 1, name: "Grace Hopper", status: "Won" }));

    render(<LeadDashboard />);
    await user.click(await screen.findByRole("button", { name: "Open Grace Hopper" }));
    const dialog = await screen.findByRole("dialog");

    await user.selectOptions(within(dialog).getByLabelText("Update lead status"), "Won");

    await waitFor(() => expect(mocked.updateLead).toHaveBeenCalledWith(1, { status: "Won" }));
    await waitFor(() =>
      expect(within(dialog).getByLabelText("Update lead status")).toHaveValue("Won"),
    );
  });

  it("shows a validation error and does not submit a blank lead name", async () => {
    const user = userEvent.setup();
    render(<LeadDashboard />);
    await user.click(await screen.findByRole("button", { name: "Add Lead" }));
    const dialog = await screen.findByRole("dialog");

    await user.type(within(dialog).getByLabelText(/Name/), "   ");
    await user.click(within(dialog).getByRole("button", { name: "Create lead" }));

    expect(await within(dialog).findByText("Name is required.")).toBeInTheDocument();
    expect(mocked.createLead).not.toHaveBeenCalled();
  });

  it("keeps user input and shows an error when creation fails", async () => {
    const user = userEvent.setup();
    mocked.createLead.mockRejectedValue(new ApiError("Server exploded", 500, "internal_error"));

    render(<LeadDashboard />);
    await user.click(await screen.findByRole("button", { name: "Add Lead" }));
    const dialog = await screen.findByRole("dialog");

    const nameInput = within(dialog).getByLabelText(/Name/);
    await user.type(nameInput, "Keep Me");
    await user.click(within(dialog).getByRole("button", { name: "Create lead" }));

    expect(await within(dialog).findByText("Server exploded")).toBeInTheDocument();
    expect(nameInput).toHaveValue("Keep Me");
  });

  it("prevents duplicate lead submissions while a request is in flight", async () => {
    const user = userEvent.setup();
    let resolveCreate: (lead: Lead) => void = () => {};
    mocked.createLead.mockReturnValue(
      new Promise<Lead>((resolve) => {
        resolveCreate = resolve;
      }),
    );

    render(<LeadDashboard />);
    await user.click(await screen.findByRole("button", { name: "Add Lead" }));
    const dialog = await screen.findByRole("dialog");

    await user.type(within(dialog).getByLabelText(/Name/), "Slow Person");
    const submit = within(dialog).getByRole("button", { name: "Create lead" });
    await user.click(submit);
    await user.click(submit);

    expect(mocked.createLead).toHaveBeenCalledTimes(1);
    resolveCreate(makeLead({ id: 11, name: "Slow Person" }));
  });
});
