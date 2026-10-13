"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { api, errorMessage } from "@/lib/api";
import type { Lead, LeadStatus } from "@/types";

export interface LeadFilters {
  status: LeadStatus | "All";
  search: string;
}

export interface UseLeadsResult {
  leads: Lead[];
  loading: boolean;
  error: string | null;
  reload: () => void;
  /** Insert or update a lead locally, honouring the active filters. */
  applyLead: (lead: Lead) => void;
}

function matchesFilters(lead: Lead, filters: LeadFilters): boolean {
  if (filters.status !== "All" && lead.status !== filters.status) return false;
  const term = filters.search.trim().toLowerCase();
  if (term && !lead.name.toLowerCase().includes(term)) return false;
  return true;
}

/**
 * Loads leads for the active filters and keeps them in sync after mutations.
 * Guards against out-of-order responses with a request sequence number.
 */
export function useLeads(filters: LeadFilters): UseLeadsResult {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);
  const { status, search } = filters;

  const load = useCallback(async () => {
    const id = ++requestId.current;
    setLoading(true);
    setError(null);
    try {
      const data = await api.listLeads({ status, search });
      if (id !== requestId.current) return;
      setLeads(data);
    } catch (caught) {
      if (id !== requestId.current) return;
      setError(errorMessage(caught));
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, [status, search]);

  useEffect(() => {
    void load();
  }, [load]);

  const applyLead = useCallback(
    (lead: Lead) => {
      setLeads((previous) => {
        const without = previous.filter((item) => item.id !== lead.id);
        if (!matchesFilters(lead, { status, search })) return without;
        return [lead, ...without];
      });
    },
    [status, search],
  );

  return { leads, loading, error, reload: load, applyLead };
}
