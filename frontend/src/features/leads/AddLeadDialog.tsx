"use client";

import { useRef, useState, type FormEvent } from "react";

import { Spinner } from "@/components/ui/Feedback";
import { Modal } from "@/components/ui/Modal";
import { api, errorMessage } from "@/lib/api";
import { LEAD_STATUSES } from "@/types";
import type { Lead, LeadStatus } from "@/types";

interface AddLeadDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: (lead: Lead) => void;
}

const EMPTY = { name: "", company: "", phone: "", status: "New" as LeadStatus };

export function AddLeadDialog({ open, onClose, onCreated }: AddLeadDialogProps) {
  const [form, setForm] = useState(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  const update = (field: keyof typeof EMPTY, value: string) =>
    setForm((previous) => ({ ...previous, [field]: value }));

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    const name = form.name.trim();
    if (!name) {
      setNameError("Name is required.");
      nameRef.current?.focus();
      return;
    }

    setSubmitting(true);
    setError(null);
    setNameError(null);
    try {
      const lead = await api.createLead({
        name,
        company: form.company.trim() || null,
        phone: form.phone.trim() || null,
        status: form.status,
      });
      onCreated(lead);
      setForm(EMPTY); // reset only after a confirmed success
      onClose();
    } catch (caught) {
      // Keep the user's input so nothing is lost on failure.
      setError(errorMessage(caught));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add lead"
      description="Create a new lead in your pipeline."
      initialFocusRef={nameRef}
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {error ? (
          <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 ring-1 ring-rose-200">
            {error}
          </p>
        ) : null}

        <div>
          <label htmlFor="lead-name" className="mb-1 block text-sm font-medium text-slate-700">
            Name <span className="text-rose-500">*</span>
          </label>
          <input
            id="lead-name"
            ref={nameRef}
            value={form.name}
            onChange={(event) => update("name", event.target.value)}
            aria-invalid={Boolean(nameError)}
            aria-describedby={nameError ? "lead-name-error" : undefined}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
            placeholder="e.g. Jordan Blake"
          />
          {nameError ? (
            <p id="lead-name-error" className="mt-1 text-sm text-rose-600">
              {nameError}
            </p>
          ) : null}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="lead-company" className="mb-1 block text-sm font-medium text-slate-700">
              Company
            </label>
            <input
              id="lead-company"
              value={form.company}
              onChange={(event) => update("company", event.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
              placeholder="Optional"
            />
          </div>
          <div>
            <label htmlFor="lead-phone" className="mb-1 block text-sm font-medium text-slate-700">
              Phone
            </label>
            <input
              id="lead-phone"
              value={form.phone}
              onChange={(event) => update("phone", event.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
              placeholder="Optional"
            />
          </div>
        </div>

        <div>
          <label htmlFor="lead-status" className="mb-1 block text-sm font-medium text-slate-700">
            Status
          </label>
          <select
            id="lead-status"
            value={form.status}
            onChange={(event) => update("status", event.target.value as LeadStatus)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
          >
            {LEAD_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 disabled:opacity-60"
          >
            {submitting ? <Spinner /> : null}
            {submitting ? "Creating…" : "Create lead"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
