"use client";

import React, { useMemo, useState } from "react";
import { useLanguage } from "@/lib/i18n/context";
import { useGroups } from "@/lib/useGroups";
import { isUnassigned } from "@/lib/groupLabels";
import {
  Plus,
  Printer,
  Pencil,
  Trash2,
  Check,
  X,
  Layers,
  Users,
  AlertCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface GroupsManagerProps {
  students: any[];
  onRefresh: () => void;
}

/**
 * Admin-only group management.
 *
 * A group is simply the Khodam's name, so adding a group is typing a name.
 * This panel is also where children are placed: every child registered through
 * the public form arrives without a group and shows up in the "Place children"
 * list below.
 */
export function GroupsManager({ students, onRefresh }: GroupsManagerProps) {
  const { t } = useLanguage();
  const { groups, loading, refresh } = useGroups();

  const [newName, setNewName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [assigningId, setAssigningId] = useState<number | null>(null);

  const unassignedChildren = useMemo(
    () => students.filter((s) => isUnassigned(s.assignedGroup)),
    [students]
  );

  const childrenByGroup = useMemo(() => {
    const map = new Map<string, any[]>();
    for (const s of students) {
      if (isUnassigned(s.assignedGroup)) continue;
      const list = map.get(s.assignedGroup) ?? [];
      list.push(s);
      map.set(s.assignedGroup, list);
    }
    return map;
  }, [students]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (data.success) {
        setNewName("");
        await refresh();
      } else {
        setError(data.error || t.groupActionFailed);
      }
    } catch {
      setError(t.groupActionFailed);
    } finally {
      setBusy(false);
    }
  };

  const handleRename = async (id: number) => {
    const name = editName.trim();
    if (!name) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/groups", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, name }),
      });
      const data = await res.json();
      if (data.success) {
        setEditingId(null);
        await refresh();
        onRefresh();
      } else {
        setError(data.error || t.groupActionFailed);
      }
    } catch {
      setError(t.groupActionFailed);
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (id: number, name: string, childCount: number) => {
    setError("");
    // Children are never deleted with a group — they go back to Unassigned, and
    // that move is confirmed first.
    if (childCount > 0 && !window.confirm(t.deleteGroupWithChildrenConfirm)) return;

    setBusy(true);
    try {
      const res = await fetch("/api/groups", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, force: childCount > 0 }),
      });
      const data = await res.json();
      if (data.success) {
        await refresh();
        onRefresh();
      } else {
        setError(data.error || t.groupActionFailed);
      }
    } catch {
      setError(t.groupActionFailed);
    } finally {
      setBusy(false);
    }
  };

  const handleAssign = async (studentId: number, group: string) => {
    setAssigningId(studentId);
    setError("");
    try {
      const res = await fetch("/api/students", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: studentId, assignedGroup: group }),
      });
      const data = await res.json();
      if (data.success) {
        onRefresh();
        await refresh();
      } else {
        setError(data.error || t.groupActionFailed);
      }
    } catch {
      setError(t.groupActionFailed);
    } finally {
      setAssigningId(null);
    }
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Add a group — the group is the Khodam's name */}
      <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5">
        <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
          <Plus className="h-4 w-4 text-coptic-blue" />
          <span>{t.addGroupBtn}</span>
        </div>
        <p className="mt-1 text-xs text-slate-500">{t.addGroupHint}</p>

        <form onSubmit={handleAdd} className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder={t.khodamNamePlaceholder}
            className="flex-1 rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-coptic-blue focus:outline-none focus:ring-2 focus:ring-blue-100"
          />
          <button
            type="submit"
            disabled={busy || !newName.trim()}
            className="flex items-center justify-center gap-2 rounded-xl bg-coptic-blue px-5 py-2.5 text-xs font-bold text-white shadow transition hover:bg-blue-800 disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            <span>{t.saveLabel}</span>
          </button>
        </form>
      </div>

      {/* Group list */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
          <Layers className="h-4 w-4 text-amber-600" />
          <span>{t.groupsManagerTitle}</span>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-600">
            {groups.length}
          </span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white p-8 text-xs font-bold text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>{t.loadingLabel}</span>
          </div>
        ) : groups.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
            <p className="text-sm font-bold text-slate-600">{t.noGroupsYet}</p>
            <p className="mt-1 text-xs text-slate-400">{t.noGroupsYetHint}</p>
          </div>
        ) : (
          groups.map((group) => {
            const children = childrenByGroup.get(group.name) ?? [];
            const isEditing = editingId === group.id;
            const isExpanded = expandedId === group.id;

            return (
              <div
                key={group.id}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 text-sm font-extrabold text-white shadow-sm">
                      {group.name.slice(0, 1)}
                    </div>

                    {isEditing ? (
                      <div className="flex min-w-0 flex-1 items-center gap-2">
                        <input
                          autoFocus
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="min-w-0 flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm font-bold text-slate-900 focus:border-coptic-blue focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => handleRename(group.id)}
                          disabled={busy || !editName.trim()}
                          className="rounded-lg bg-emerald-600 p-2 text-white transition hover:bg-emerald-700 disabled:opacity-50"
                          title={t.saveLabel}
                        >
                          <Check className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="rounded-lg bg-slate-200 p-2 text-slate-700 transition hover:bg-slate-300"
                          title={t.cancelLabel}
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="min-w-0 flex-1">
                        <h4 className="truncate text-base font-bold text-slate-900">{group.name}</h4>
                        <button
                          type="button"
                          onClick={() => setExpandedId(isExpanded ? null : group.id)}
                          className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 transition hover:text-coptic-blue"
                        >
                          <Users className="h-3 w-3" />
                          <span>
                            {group.studentCount} {t.childrenCountLabel}
                          </span>
                          {isExpanded ? (
                            <ChevronUp className="h-3 w-3" />
                          ) : (
                            <ChevronDown className="h-3 w-3" />
                          )}
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <a
                      href={`/admin/print/group/${encodeURIComponent(group.name)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 rounded-xl bg-emerald-700 px-3.5 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-800"
                    >
                      <Printer className="h-3.5 w-3.5" />
                      <span>{t.printGroupSheetBtn}</span>
                    </a>

                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(group.id);
                        setEditName(group.name);
                      }}
                      className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">{t.renameGroupBtn}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDelete(group.id, group.name, group.studentCount)}
                      disabled={busy}
                      className="flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 transition hover:bg-rose-100 disabled:opacity-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">{t.deleteGroupBtn}</span>
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
                    {children.length === 0 ? (
                      <p className="text-xs font-semibold text-slate-400">
                        {t.noChildrenInGroup}
                      </p>
                    ) : (
                      children.map((child) => (
                        <span
                          key={child.id}
                          className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700"
                        >
                          {child.fullName}
                        </span>
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Place children into the groups */}
      <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-5">
        <div className="flex items-center gap-2 text-sm font-bold text-amber-950">
          <Users className="h-4 w-4 text-amber-600" />
          <span>{t.placeChildrenTitle}</span>
          <span className="rounded-full bg-amber-200/70 px-2 py-0.5 text-[11px] font-bold text-amber-900">
            {unassignedChildren.length}
          </span>
        </div>
        <p className="mt-1 text-xs text-amber-900/80">{t.placeChildrenHint}</p>

        {unassignedChildren.length === 0 ? (
          <p className="mt-3 text-xs font-semibold text-amber-900/70">{t.noUnassignedChildren}</p>
        ) : (
          <div className="mt-3 space-y-2">
            {unassignedChildren.map((child) => (
              <div
                key={child.id}
                className="flex flex-col gap-2 rounded-xl border border-amber-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-center gap-2.5">
                  {child.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={child.photoUrl}
                      alt={child.fullName}
                      className="h-9 w-9 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-[11px] font-bold text-slate-500">
                      {child.fullName.slice(0, 2)}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-slate-900">{child.fullName}</p>
                    {child.motherPhone && (
                      <p className="text-[11px] text-slate-500">{child.motherPhone}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {assigningId === child.id && (
                    <Loader2 className="h-4 w-4 animate-spin text-amber-600" />
                  )}
                  <select
                    value=""
                    disabled={assigningId === child.id || groups.length === 0}
                    onChange={(e) => e.target.value && handleAssign(child.id, e.target.value)}
                    className="cursor-pointer rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-900 focus:border-amber-500 focus:outline-none disabled:opacity-50"
                  >
                    <option value="">{t.placeInGroupLabel}</option>
                    {groups.map((g) => (
                      <option key={g.id} value={g.name}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
