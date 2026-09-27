"use client";

import React, { useState, useEffect } from "react";
import { useLanguage } from "@/lib/i18n/context";
import {
  Calendar as CalendarIcon,
  CheckCircle2,
  XCircle,
  Search,
  Filter,
  Users,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  RefreshCw,
  FileSpreadsheet,
} from "lucide-react";
import { formatDisplayDate, getTodaySessionDate } from "@/lib/date";
import { UNASSIGNED, groupLabel, isUnassigned } from "@/lib/groupLabels";
import { useGroups } from "@/lib/useGroups";
import { StudentAvatar } from "./StudentAvatar";

interface SundayAttendanceCalendarProps {
  userRole?: string;
  userGroup?: string | null;
}

export function SundayAttendanceCalendar({ userRole, userGroup }: SundayAttendanceCalendarProps) {
  const { t, isRtl } = useLanguage();
  // Groups are admin-defined (named after a Khodam).
  const { names: groupNames } = useGroups();

  const [students, setStudents] = useState<any[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
  const [sessionDates, setSessionDates] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & State
  const [selectedGroup, setSelectedGroup] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"matrix" | "single_sunday">("single_sunday");
  const [activeSunday, setActiveSunday] = useState<string>(getTodaySessionDate());
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // Generate Sunday list (past and upcoming Sundays)
  const generateSundays = () => {
    const sundays: string[] = [];
    const base = new Date();
    // Go back 4 Sundays and forward 4 Sundays
    for (let i = -6; i <= 6; i++) {
      const d = new Date();
      const day = d.getDay(); // 0 is Sunday
      const diff = d.getDate() - day + i * 7;
      const targetDate = new Date(d.setDate(diff));
      const y = targetDate.getFullYear();
      const m = String(targetDate.getMonth() + 1).padStart(2, "0");
      const dt = String(targetDate.getDate()).padStart(2, "0");
      sundays.push(`${y}-${m}-${dt}`);
    }
    return Array.from(new Set([...sundays, ...sessionDates, getTodaySessionDate()])).sort();
  };

  const allSundays = generateSundays();

  const fetchData = async () => {
    try {
      setLoading(true);
      // Fetch all students (accessible to all Khuddam for attendance)
      const studentsRes = await fetch("/api/students");
      const studentsData = await studentsRes.json();
      if (studentsData.success) {
        setStudents(studentsData.students || []);
      }

      // Fetch all attendance records
      const attRes = await fetch("/api/attendance");
      const attData = await attRes.json();
      if (attData.success) {
        setAttendanceRecords(attData.records || []);
        setSessionDates(attData.dates || []);
      }
    } catch (err) {
      console.error("Error loading Sunday attendance:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Map for fast status lookup: studentId_sessionDate -> status
  const lookup = new Map<string, string>();
  attendanceRecords.forEach((r) => {
    lookup.set(`${r.studentId}_${r.sessionDate}`, r.status);
  });

  const handleToggleAttendance = async (studentId: number, targetSunday: string, currentStatus: string) => {
    const nextStatus = currentStatus === "PRESENT" ? "ABSENT" : "PRESENT";
    const key = `${studentId}_${targetSunday}`;
    setTogglingId(key);

    // Optimistic UI update
    setAttendanceRecords((prev) => {
      const existingIdx = prev.findIndex(
        (r) => r.studentId === studentId && r.sessionDate === targetSunday
      );
      if (existingIdx >= 0) {
        const copy = [...prev];
        copy[existingIdx] = { ...copy[existingIdx], status: nextStatus };
        return copy;
      }
      return [...prev, { studentId, sessionDate: targetSunday, status: nextStatus }];
    });

    try {
      await fetch("/api/attendance/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId,
          sessionDate: targetSunday,
          status: nextStatus,
        }),
      });
    } catch (err) {
      console.error("Toggle error:", err);
      // Revert on error
      fetchData();
    } finally {
      setTogglingId(null);
    }
  };

  // Filter students. Children with no group yet match the "Unassigned" filter.
  const filteredStudents = students.filter((s) => {
    const matchesGroup =
      selectedGroup === "all"
        ? true
        : selectedGroup === UNASSIGNED
          ? isUnassigned(s.assignedGroup)
          : s.assignedGroup === selectedGroup;
    const haystack = `${s.fullName} ${s.assignedGroup || ""}`.toLowerCase();
    return matchesGroup && haystack.includes(searchQuery.toLowerCase());
  });

  // Calculate stats for active Sunday
  const attendedCountForActiveSunday = filteredStudents.filter((s) => {
    const st = lookup.get(`${s.id}_${activeSunday}`) || "ABSENT";
    return st === "PRESENT";
  }).length;
  const notAttendedCountForActiveSunday = filteredStudents.length - attendedCountForActiveSunday;

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="rounded-3xl border border-blue-200 bg-gradient-to-r from-blue-900 via-coptic-blue to-indigo-950 p-6 sm:p-7 text-white shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 rounded-full bg-amber-400/20 px-3 py-1 text-xs font-bold text-amber-300 border border-amber-400/30">
              <CalendarIcon className="h-3.5 w-3.5" />
              <span>{isRtl ? "نظام حضور الأحد الشامل" : "Sunday School Attendance Calendar"}</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight">
              {isRtl ? "تسجيل حضور وغياب جميع المخدومين" : "Mark Sunday Attendance for All Students"}
            </h2>
            <p className="text-xs sm:text-sm text-blue-200/90">
              {isRtl
                ? "يمكن لأي خادم اختيار أي يوم أحد وتسجيل حضور أو غياب أي مخدوم بنقرة واحدة."
                : "Every Khadem can select any Sunday and mark attendance (Attended / Not Attended) for all students."}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchData}
              className="flex items-center gap-1.5 rounded-xl bg-white/10 px-3.5 py-2 text-xs font-bold text-white hover:bg-white/20 transition active:scale-95 shadow-sm"
              title="Refresh Attendance Data"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              <span>{isRtl ? "تحديث" : "Refresh"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Controls Bar: Sunday Selector, View Toggle, Search, Group Filter */}
      <div className="rounded-2xl bg-white p-5 border border-slate-200 shadow-sm space-y-4">
        {/* Row 1: Sunday Picker Ribbon */}
        <div>
          <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <CalendarIcon className="h-4 w-4 text-coptic-blue" />
            <span>{isRtl ? "اختر يوم الأحد المطلوب:" : "Select Sunday Date:"}</span>
          </label>

          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
            {allSundays.map((sun) => {
              const isSelected = activeSunday === sun;
              const isToday = sun === getTodaySessionDate();

              return (
                <button
                  key={sun}
                  type="button"
                  onClick={() => setActiveSunday(sun)}
                  className={`flex-shrink-0 px-3.5 py-2 rounded-xl text-xs font-bold transition-all duration-200 active:scale-95 cursor-pointer flex flex-col items-center gap-0.5 border ${
                    isSelected
                      ? "bg-coptic-blue text-white border-blue-900 shadow-md ring-2 ring-blue-300"
                      : isToday
                      ? "bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100"
                      : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  <span>{formatDisplayDate(sun, isRtl)}</span>
                  {isToday && (
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-md font-extrabold ${
                        isSelected ? "bg-amber-400 text-slate-900" : "bg-amber-200 text-amber-900"
                      }`}
                    >
                      {isRtl ? "اليوم" : "Today"}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Row 2: Filters & Search */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100">
          {/* Search by Name */}
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isRtl ? "بحث عن مخدوم بالاسم..." : "Search student by name..."}
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2 pl-9 pr-9 text-xs sm:text-sm text-slate-800 focus:border-coptic-blue focus:outline-none"
            />
            <Search className={`absolute top-2.5 ${isRtl ? "left-3" : "right-3"} h-4 w-4 text-slate-400`} />
          </div>

          {/* Group Filter Dropdown */}
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-400 flex-shrink-0" />
            <select
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs sm:text-sm font-bold text-slate-800 focus:border-coptic-blue focus:outline-none cursor-pointer"
            >
              <option value="all">{isRtl ? "جميع المجموعات" : "All Groups"}</option>
              <option value={UNASSIGNED}>{isRtl ? "لم يتم التوزيع" : "Unassigned"}</option>
              {groupNames.map((grp) => (
                <option key={grp} value={grp}>
                  {grp}
                </option>
              ))}
            </select>
          </div>

          {/* View Mode Switcher */}
          <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200">
            <button
              type="button"
              onClick={() => setViewMode("single_sunday")}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition ${
                viewMode === "single_sunday"
                  ? "bg-white text-coptic-blue shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {isRtl ? "يوم الأحد المحدد" : "Selected Sunday"}
            </button>
            <button
              type="button"
              onClick={() => setViewMode("matrix")}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition ${
                viewMode === "matrix"
                  ? "bg-white text-coptic-blue shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {isRtl ? "شبكة جميع الأسابيع" : "Full Matrix"}
            </button>
          </div>
        </div>
      </div>

      {/* View Mode 1: Selected Sunday Student List with 1-Click Toggle */}
      {viewMode === "single_sunday" ? (
        <div className="rounded-3xl bg-white p-6 border border-slate-200 shadow-sm space-y-5">
          {/* Sunday Header & Quick Stats */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <span>{isRtl ? "كشف حضور يوم:" : "Attendance for:"}</span>
                <span className="text-coptic-blue underline underline-offset-4">
                  {formatDisplayDate(activeSunday, isRtl)}
                </span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {filteredStudents.length} {isRtl ? "مخدوم معروض" : "students shown"}
              </p>
            </div>

            {/* Stats Badges */}
            <div className="flex items-center gap-2.5 text-xs">
              <span className="flex items-center gap-1.5 rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-1.5 font-bold text-emerald-800">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span>
                  {attendedCountForActiveSunday} {isRtl ? "حاضر" : "Attended"}
                </span>
              </span>

              <span className="flex items-center gap-1.5 rounded-xl bg-rose-50 border border-rose-200 px-3 py-1.5 font-bold text-rose-800">
                <XCircle className="h-4 w-4 text-rose-600" />
                <span>
                  {notAttendedCountForActiveSunday} {isRtl ? "غائب" : "Not Attended"}
                </span>
              </span>
            </div>
          </div>

          {/* Student Roster Table for Selected Sunday */}
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
            <table className="w-full text-start text-xs sm:text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                <tr>
                  <th className="p-3.5 text-center w-12">#</th>
                  <th className="p-3.5 text-start">{isRtl ? "اسم الولد" : "Student Name"}</th>
                  <th className="p-3.5 text-start">{isRtl ? "المجموعة" : "Group"}</th>
                  <th className="p-3.5 text-center w-40">{isRtl ? "حالة الحضور (انقر للتغيير)" : "Attendance Status"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.map((s, idx) => {
                  const key = `${s.id}_${activeSunday}`;
                  const currentStatus = lookup.get(key) || "ABSENT";
                  const isPresent = currentStatus === "PRESENT";
                  const isToggling = togglingId === key;

                  return (
                    <tr key={s.id} className="hover:bg-blue-50/40 transition">
                      <td className="p-3.5 text-center text-slate-400 font-mono">{idx + 1}</td>
                      <td className="p-3.5 font-bold text-slate-900">
                        <div className="flex items-center gap-2.5">
                          <StudentAvatar
                            photoUrl={s.photoUrl}
                            fullName={s.fullName}
                            className="h-8 w-8 rounded-full border border-slate-200"
                            textClassName="text-[10px] font-bold text-slate-500"
                          />
                          <span>{s.fullName}</span>
                        </div>
                      </td>
                      <td className="p-3.5">
                        <span
                          className={`rounded-lg px-2.5 py-1 text-xs font-bold shadow-sm ${
                            isUnassigned(s.assignedGroup)
                              ? "bg-amber-100 text-amber-900"
                              : "bg-coptic-blue text-white"
                          }`}
                        >
                          {groupLabel(s.assignedGroup, isRtl ? "ar" : "en")}
                        </span>
                      </td>
                      <td className="p-3.5 text-center">
                        <button
                          type="button"
                          disabled={isToggling}
                          onClick={() => handleToggleAttendance(s.id, activeSunday, currentStatus)}
                          className={`w-full max-w-[140px] inline-flex items-center justify-center gap-1.5 rounded-xl py-2 px-3 text-xs font-bold transition-all duration-150 active:scale-95 shadow-sm cursor-pointer ${
                            isPresent
                              ? "bg-emerald-600 text-white hover:bg-emerald-700 ring-2 ring-emerald-400/30"
                              : "bg-rose-600 text-white hover:bg-rose-700 ring-2 ring-rose-400/30"
                          } ${isToggling ? "opacity-50 animate-pulse" : ""}`}
                        >
                          {isPresent ? (
                            <>
                              <CheckCircle2 className="h-4 w-4" />
                              <span>{isRtl ? "حاضر (Attended)" : "Attended"}</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="h-4 w-4" />
                              <span>{isRtl ? "غائب (Absent)" : "Not Attended"}</span>
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {filteredStudents.length === 0 && (
              <div className="text-center py-12 text-slate-400">
                <Users className="h-10 w-10 mx-auto mb-2 opacity-40" />
                <p className="text-sm font-semibold">
                  {isRtl ? "لا يوجد مخدومين يطابقون البحث." : "No students found matching your filters."}
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* View Mode 2: Multi-Sunday Calendar Matrix Grid */
        <div className="rounded-3xl bg-white p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-black text-slate-900">
              {isRtl ? "شبكة حضور جميع أسابيع الأحد" : "Cross-Sunday Attendance Matrix"}
            </h3>
            <span className="text-xs text-slate-500 font-semibold">
              {allSundays.length} {isRtl ? "أسابيع مسجلة" : "Sundays recorded"}
            </span>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
            <table className="w-full text-start text-xs border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white font-bold border-b border-slate-800">
                  <th className="p-3 text-center w-12 border-r border-slate-800">#</th>
                  <th className="p-3 text-start min-w-[170px] border-r border-slate-800">
                    {isRtl ? "اسم الولد" : "Student Name"}
                  </th>
                  <th className="p-3 text-center min-w-[90px] border-r border-slate-800">
                    {isRtl ? "المجموعة" : "Group"}
                  </th>
                  {allSundays.map((sun) => (
                    <th
                      key={sun}
                      className={`p-2.5 text-center min-w-[95px] border-r border-slate-800 ${
                        sun === activeSunday ? "bg-amber-600 text-white font-black" : ""
                      }`}
                    >
                      <div>{formatDisplayDate(sun, isRtl)}</div>
                    </th>
                  ))}
                  <th className="p-3 text-center min-w-[80px]">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.map((student, idx) => {
                  let studentAttendedTotal = 0;

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
                          {groupLabel(student.assignedGroup, isRtl ? "ar" : "en")}
                        </span>
                      </td>

                      {/* Sunday Date Cells with 1-Click Toggle */}
                      {allSundays.map((sun) => {
                        const cellKey = `${student.id}_${sun}`;
                        const status = lookup.get(cellKey) || "ABSENT";
                        const isPresent = status === "PRESENT";
                        if (isPresent) studentAttendedTotal++;

                        const isToggling = togglingId === cellKey;

                        return (
                          <td key={sun} className="p-2 text-center border-r border-slate-100">
                            <button
                              type="button"
                              disabled={isToggling}
                              onClick={() => handleToggleAttendance(student.id, sun, status)}
                              className={`h-7 w-14 rounded-lg font-bold text-[11px] transition-all duration-150 active:scale-95 shadow-sm cursor-pointer ${
                                isPresent
                                  ? "bg-emerald-600 text-white hover:bg-emerald-700"
                                  : "bg-rose-100 text-rose-700 hover:bg-rose-200"
                              } ${isToggling ? "opacity-40 animate-pulse" : ""}`}
                              title={`Click to switch status on ${sun}`}
                            >
                              {isPresent ? "✓ Attended" : "✗ Absent"}
                            </button>
                          </td>
                        );
                      })}

                      <td className="p-3 text-center font-bold text-slate-800">
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px]">
                          {studentAttendedTotal}/{allSundays.length}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
