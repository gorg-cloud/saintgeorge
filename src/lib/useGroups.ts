"use client";

import { useCallback, useEffect, useState } from "react";

export interface GroupSummary {
  id: number;
  name: string;
  sortOrder: number;
  studentCount: number;
}

/**
 * Loads the admin-defined groups (each named after a Khodam) from the API.
 *
 * Groups live in the database rather than in a fixed constant, so any component
 * that needs to render a group picker or filter uses this hook.
 */
export function useGroups() {
  const [groups, setGroups] = useState<GroupSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/groups");
      const data = await res.json();
      if (data.success) setGroups(data.groups || []);
    } catch (err) {
      console.error("Failed to load groups:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { groups, names: groups.map((g) => g.name), loading, refresh };
}
