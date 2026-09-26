"use client";

import React, { useState } from "react";
import { useLanguage } from "@/lib/i18n/context";
import { Search, Info, Image as ImageIcon, Phone, Plus, Loader2, Trash2 } from "lucide-react";
import { StudentInfoModal } from "./StudentInfoModal";
import { StudentPicModal } from "./StudentPicModal";
import { UNASSIGNED, isUnassigned } from "@/lib/groupLabels";
import { useGroups } from "@/lib/useGroups";

interface AdminStudentDirectoryProps {
  students: any[];
  onRefresh: () => void;
  onAddNewClick: () => void;
}

export function AdminStudentDirectory({
  students,
  onRefresh,
  onAddNewClick,
}: AdminStudentDirectoryProps) {
  const { t, isRtl } = useLanguage();
  const [search, setSearch] = useState("");
  const [selectedGroup, setSelectedGroup] = useState("all");
  const [selectedStudentForInfo, setSelectedStudentForInfo] = useState<any>(null);
  const [selectedStudentForPic, setSelectedStudentForPic] = useState<any>(null);
  const [assigningId, setAssigningId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const { names: groupNames } = useGroups();

  const unassignedCount = students.filter((s) => isUnassigned(s.assignedGroup)).length;

  const filtered = students.filter((s) => {
    const matchesSearch =
      s.fullName.toLowerCase().includes(search.toLowerCase()) ||
      (s.motherName && s.motherName.toLowerCase().includes(search.toLowerCase())) ||
      (s.motherPhone && s.motherPhone.includes(search)) ||
      (s.fatherPhone && s.fatherPhone.includes(search)) ||
      (s.schoolName && s.schoolName.toLowerCase().includes(search.toLowerCase()));

    const matchesGroup =
      selectedGroup === "all"
        ? true
        : selectedGroup === UNASSIGNED
          ? isUnassigned(s.assignedGroup)
          : s.assignedGroup === selectedGroup;

    return matchesSearch && matchesGroup;
  });

  /**
   * Deletes a child for good. The public form adds anyone who fills it in, so
   * this is where a duplicate or a mistyped name gets cleaned up. Their
   * attendance history is removed with them.
   */
  const handleDelete = async (student: any) => {
    if (!window.confirm(`${t.deleteStudentConfirm}\n\n${student.fullName}`)) return;

    setDeletingId(student.id);
    try {
      const res = await fetch("/api/students", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: student.id }),
      });
      const data = await res.json();
      if (data.success) onRefresh();
      else console.error("Delete failed:", data.error);
    } catch (err) {
      console.error("Delete error:", err);
    } finally {
      setDeletingId(null);
    }
  };

  /** Places a child into a group (or back to Unassigned) straight from the table. */
  const handleAssign = async (student: any, group: string) => {
    setAssigningId(student.id);
    try {
      const res = await fetch("/api/students", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: student.id, assignedGroup: group }),
      });
      const data = await res.json();
      if (data.success) onRefresh();
      else console.error("Assign failed:", data.error);
    } catch (err) {
      console.error("Assign error:", err);
    } finally {
      setAssigningId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Children still waiting to be placed */}
      {unassignedCount > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4">
          <p className="text-xs sm:text-sm font-bold text-amber-900">
            {t.unassignedBanner.replace("{count}", String(unassignedCount))}
          </p>
          <button
            type="button"
            onClick={() => setSelectedGroup(UNASSIGNED)}
            className="rounded-xl bg-amber-600 px-4 py-2 text-xs font-bold text-white hover:bg-amber-700 transition active:scale-95 cursor-pointer"
          >
            {t.showUnassignedBtn}
          </button>
        </div>
      )}

      {/* Search & Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
        <div className="sm:col-span-2 relative">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t.searchStudentsGlobal}
            className="g-input-field pl-10 pr-4"
          />
          <Search className={`absolute top-3 ${isRtl ? "left-3" : "right-3"} h-4 w-4 text-slate-400`} />
        </div>

        <div>
          <select
            value={selectedGroup}
            onChange={(e) => setSelectedGroup(e.target.value)}
            className="g-input-field cursor-pointer"
          >
            <option value="all">{t.filterByGroup}</option>
            <option value={UNASSIGNED}>{t.unassignedOption}</option>
            {groupNames.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Directory Table / Cards */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-start text-xs sm:text-sm">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
            <tr>
              <th className="p-3.5 text-center w-12">#</th>
              <th className="p-3.5 text-start">{t.fullNameLabel}</th>
              <th className="p-3.5 text-start min-w-[170px]">{t.groupLabel}</th>
              <th className="p-3.5 text-start">{t.motherPhoneLabel}</th>
              <th className="p-3.5 text-start">{t.fatherPhoneLabel}</th>
              <th className="p-3.5 text-start">{t.schoolNameLabel}</th>
              <th className="p-3.5 text-center">{isRtl ? "إجراءات" : "Actions"}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((s, idx) => (
              <tr key={s.id} className="hover:bg-blue-50/40 transition">
                <td className="p-3.5 text-center text-slate-400 font-mono">{idx + 1}</td>
                <td className="p-3.5">
                  <div className="flex items-center gap-2.5">
                    <button
                      onClick={() => setSelectedStudentForPic(s)}
                      className="h-8 w-8 rounded-full overflow-hidden bg-slate-200 flex-shrink-0 border border-slate-200 cursor-pointer"
                    >
                      {s.photoUrl ? (
                        <img src={s.photoUrl} alt={s.fullName} className="h-full w-full object-cover" />
                      ) : (
                        <span className="flex h-full w-full items-center justify-center font-bold text-[10px] text-slate-500">
                          {s.fullName.slice(0, 2)}
                        </span>
                      )}
                    </button>
                    <span className="font-bold text-slate-900">{s.fullName}</span>
                  </div>
                </td>
                <td className="p-3.5">
                  {/* Assign straight from the list: no need to open the modal. */}
                  <div className="flex items-center gap-2">
                    <select
                      value={s.assignedGroup || ""}
                      disabled={assigningId === s.id}
                      onChange={(e) => handleAssign(s, e.target.value)}
                      className={`cursor-pointer rounded-lg border px-2 py-1 text-xs font-bold transition ${
                        isUnassigned(s.assignedGroup)
                          ? "border-amber-300 bg-amber-50 text-amber-800"
                          : "border-slate-200 bg-coptic-blue text-white"
                      } ${assigningId === s.id ? "opacity-60" : ""}`}
                    >
                      <option value="">{t.unassignedOption}</option>
                      {groupNames.map((g) => (
                        <option key={g} value={g}>
                          {g}
                        </option>
                      ))}
                    </select>
                    {assigningId === s.id && <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" />}
                  </div>
                </td>
                <td className="p-3.5">
                  {s.motherPhone ? (
                    <a href={`tel:${s.motherPhone}`} className="text-emerald-700 hover:underline flex items-center gap-1 font-mono text-xs">
                      <Phone className="h-3 w-3" />
                      {s.motherPhone}
                    </a>
                  ) : (
                    "-"
                  )}
                </td>
                <td className="p-3.5">
                  {s.fatherPhone ? (
                    <a href={`tel:${s.fatherPhone}`} className="text-emerald-700 hover:underline flex items-center gap-1 font-mono text-xs">
                      <Phone className="h-3 w-3" />
                      {s.fatherPhone}
                    </a>
                  ) : (
                    "-"
                  )}
                </td>
                <td className="p-3.5 text-slate-600">{s.schoolName || "-"}</td>
                <td className="p-3.5 text-center">
                  <div className="flex items-center justify-center gap-1.5">
                    <button
                      onClick={() => setSelectedStudentForInfo(s)}
                      className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-700 hover:bg-slate-50 hover:border-coptic-blue hover:text-coptic-blue transition cursor-pointer"
                      title={t.getInfoBtn}
                    >
                      <Info className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setSelectedStudentForPic(s)}
                      className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-700 hover:bg-slate-50 hover:border-coptic-blue hover:text-coptic-blue transition cursor-pointer"
                      title={t.childPicBtn}
                    >
                      <ImageIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(s)}
                      disabled={deletingId === s.id}
                      className="rounded-lg border border-rose-200 bg-rose-50 p-1.5 text-rose-700 hover:bg-rose-100 transition cursor-pointer disabled:opacity-50"
                      title={t.deleteStudentBtn}
                    >
                      {deletingId === s.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className="text-center py-12 text-slate-400">
            <p className="text-sm font-semibold">No students found matching current filters.</p>
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={onAddNewClick}
        className="flex items-center gap-2 rounded-xl bg-coptic-blue px-4 py-2.5 text-xs font-bold text-white shadow hover:bg-blue-800 transition active:scale-95 cursor-pointer"
      >
        <Plus className="h-4 w-4" />
        <span>{t.addStudentAdminBtn}</span>
      </button>

      {/* Modals */}
      {selectedStudentForInfo && (
        <StudentInfoModal
          student={selectedStudentForInfo}
          onClose={() => setSelectedStudentForInfo(null)}
          onUpdateSuccess={() => {
            onRefresh();
            setSelectedStudentForInfo(null);
          }}
        />
      )}

      {selectedStudentForPic && (
        <StudentPicModal
          student={selectedStudentForPic}
          onClose={() => setSelectedStudentForPic(null)}
        />
      )}
    </div>
  );
}
