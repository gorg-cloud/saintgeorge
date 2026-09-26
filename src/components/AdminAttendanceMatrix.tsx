"use client";

import React, { useState } from "react";
import { useLanguage } from "@/lib/i18n/context";
import { Check, X, Calendar, Filter, Sparkles } from "lucide-react";
import { formatDisplayDate, getTodaySessionDate } from "@/lib/date";

interface AdminAttendanceMatrixProps {
  students: any[];
  records: any[];
  dates: string[];
  onRefresh: () => void;
}

export function AdminAttendanceMatrix({
  students,
  records,
  dates,
  onRefresh,
}: AdminAttendanceMatrixProps) {
  const { t, isRtl } = useLanguage();
  const [selectedGroup, setSelectedGroup] = useState<string>("all");
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const today = getTodaySessionDate();
  const allDates = [...dates];
  if (!allDates.includes(today)) {
    allDates.push(today);
  }

  // Create lookup map: studentId_sessionDate -> status
  const lookup = new Map<string, string>();
  records.forEach((r) => {
    lookup.set(`${r.studentId}_${r.sessionDate}`, r.status);
  });

  // Filter students by group
  const displayedStudents =
    selectedGroup === "all"
      ? students
      : students.filter((s) => s.assignedGroup === selectedGroup);

  // Group students by group
  const groupedStudents: { [key: string]: any[] } = {};
  displayedStudents.forEach((s) => {
    if (!groupedStudents[s.assignedGroup]) {
      groupedStudents[s.assignedGroup] = [];
    }
    groupedStudents[s.assignedGroup].push(s);
  });

  const handleToggleCell = async (studentId: number, date: string, currentStatus: string) => {
    const nextStatus = currentStatus === "PRESENT" ? "ABSENT" : "PRESENT";
    setTogglingId(`${studentId}_${date}`);

    try {
      await fetch("/api/attendance/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId,
          sessionDate: date,
          status: nextStatus,
        }),
      });
      onRefresh();
    } catch (err) {
      console.error("Failed to toggle matrix status:", err);
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Controls & Group Filter */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-coptic-blue" />
          <h3 className="text-sm font-bold text-slate-800">{t.sessionDates} ({allDates.length} Sundays)</h3>
        </div>

        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-400" />
          <select
            value={selectedGroup}
            onChange={(e) => setSelectedGroup(e.target.value)}
            className="g-input-field text-xs sm:text-sm py-1.5 font-bold text-coptic-blue"
          >
            <option value="all">{t.filterByGroup}</option>
            {Array.from({ length: 10 }, (_, i) => `Group ${i + 1}`).map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Master Matrix Grid */}
      <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-start text-xs sm:text-sm border-collapse">
          <thead>
            <tr className="bg-slate-900 text-white font-bold border-b border-slate-800">
              <th className="p-3 text-center w-12 border-r border-slate-800">#</th>
              <th className="p-3 text-start min-w-[180px] border-r border-slate-800">
                {t.fullNameLabel}
              </th>
              <th className="p-3 text-center min-w-[90px] border-r border-slate-800">
                {t.groupLabel}
              </th>
              {allDates.map((date) => (
                <th
                  key={date}
                  className={`p-3 text-center min-w-[100px] border-r border-slate-800 ${
                    date === today ? "bg-amber-600 text-white font-black" : ""
                  }`}
                >
                  <div>{formatDisplayDate(date, isRtl)}</div>
                  {date === today && (
                    <span className="text-[10px] uppercase font-bold tracking-widest block text-amber-100">
                      (Today)
                    </span>
                  )}
                </th>
              ))}
              <th className="p-3 text-center min-w-[80px]">Total Present</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-200">
            {Object.keys(groupedStudents).map((groupName) => (
              <React.Fragment key={groupName}>
                {/* Group Divider Row */}
                <tr className="bg-blue-50/90 font-black text-coptic-blue border-y border-blue-200">
                  <td colSpan={allDates.length + 4} className="p-2.5 px-4 text-xs tracking-wider">
                    📌 {groupName} ({groupedStudents[groupName].length} Students)
                  </td>
                </tr>

                {groupedStudents[groupName].map((student, idx) => {
                  let totalStudentPresent = 0;

                  return (
                    <tr key={student.id} className="hover:bg-slate-50 transition">
                      <td className="p-3 text-center text-slate-400 font-mono border-r border-slate-100">
                        {idx + 1}
                      </td>
                      <td className="p-3 font-bold text-slate-900 border-r border-slate-100">
                        {student.fullName}
                      </td>
                      <td className="p-3 text-center border-r border-slate-100">
                        <span className="inline-block rounded bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-700">
                          {student.assignedGroup}
                        </span>
                      </td>

                      {/* Date Status Cells */}
                      {allDates.map((date) => {
                        const cellKey = `${student.id}_${date}`;
                        const currentStatus = lookup.get(cellKey) || (date === today ? student.todayStatus : "ABSENT");
                        const isPresent = currentStatus === "PRESENT";
                        if (isPresent) totalStudentPresent++;

                        const isToggling = togglingId === cellKey;

                        return (
                          <td
                            key={date}
                            className="p-2 text-center border-r border-slate-100"
                          >
                            <button
                              type="button"
                              disabled={isToggling}
                              onClick={() => handleToggleCell(student.id, date, currentStatus)}
                              className={`inline-flex items-center justify-center h-8 w-14 rounded-lg font-bold text-xs transition active:scale-95 shadow-sm ${
                                isPresent
                                  ? "bg-emerald-600 text-white hover:bg-emerald-700"
                                  : "bg-rose-100 text-rose-700 hover:bg-rose-200"
                              } ${isToggling ? "opacity-40 animate-pulse" : ""}`}
                              title={`Click to switch status for ${student.fullName} on ${date}`}
                            >
                              {isPresent ? "✓ Present" : "✗ Absent"}
                            </button>
                          </td>
                        );
                      })}

                      <td className="p-3 text-center font-bold text-slate-800">
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs">
                          {totalStudentPresent} / {allDates.length}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
