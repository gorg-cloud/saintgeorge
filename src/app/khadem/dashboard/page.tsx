"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/lib/i18n/context";
import { HeaderBar } from "@/components/HeaderBar";
import { KhademRosterCard } from "@/components/KhademRosterCard";
import { StudentInfoModal } from "@/components/StudentInfoModal";
import { StudentPicModal } from "@/components/StudentPicModal";
import { SundayAttendanceCalendar } from "@/components/SundayAttendanceCalendar";
import {
  Users,
  UserCheck,
  UserX,
  FileSpreadsheet,
  LogOut,
  RefreshCw,
  Search,
  Phone,
  Sparkles,
  Calendar as CalendarIcon,
  Layers,
} from "lucide-react";
import { getTodaySessionDate, formatDisplayDate } from "@/lib/date";

export default function KhademDashboardPage() {
  const { t, isRtl } = useLanguage();
  const router = useRouter();

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sessionDate, setSessionDate] = useState(getTodaySessionDate());
  const [exporting, setExporting] = useState(false);
  const [activeTab, setActiveTab] = useState<"my_group" | "calendar">("my_group");

  // Modals state
  const [selectedStudentForInfo, setSelectedStudentForInfo] = useState<any>(null);
  const [selectedStudentForPic, setSelectedStudentForPic] = useState<any>(null);

  // Fetch current user and students
  const fetchGroupData = async () => {
    try {
      const authRes = await fetch("/api/auth/me");
      const authData = await authRes.json();

      if (!authData.authenticated) {
        router.push("/login");
        return;
      }

      setCurrentUser(authData.user);

      // A Group Khadem always has a group; an admin with a group can use this
      // same roster page for their own children.
      if (!authData.user.assignedGroup) {
        setStudents([]);
        return;
      }

      const studentsRes = await fetch(
        `/api/students?group=${encodeURIComponent(authData.user.assignedGroup)}&date=${sessionDate}`
      );
      const studentsData = await studentsRes.json();

      if (studentsData.success) {
        setStudents(studentsData.students || []);
      }
    } catch (err) {
      console.error("Fetch group data error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroupData();
    const interval = setInterval(fetchGroupData, 15000);
    return () => clearInterval(interval);
  }, [sessionDate]);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  const handleStatusChanged = (studentId: number, newStatus: string) => {
    setStudents((prev) =>
      prev.map((s) => (s.id === studentId ? { ...s, todayStatus: newStatus } : s))
    );
  };

  const handleExportExcel = async () => {
    if (!currentUser?.assignedGroup) return;
    setExporting(true);
    try {
      const group = currentUser.assignedGroup;
      const a = document.createElement("a");
      a.href = `/api/export/group?group=${encodeURIComponent(group)}`;
      a.download = `Sunday_School_${group.replace(/\s+/g, "_")}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      console.error("Export error:", err);
    } finally {
      setTimeout(() => setExporting(false), 2000);
    }
  };

  const filteredStudents = students.filter((s) =>
    s.fullName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const presentCount = students.filter((s) => s.todayStatus === "PRESENT").length;
  const absentCount = students.length - presentCount;
  const attendanceRate = students.length > 0 ? Math.round((presentCount / students.length) * 100) : 0;

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50">
        <HeaderBar />
        <div className="flex-1 flex items-center justify-center">
          <div className="flex items-center gap-3 text-coptic-blue font-bold">
            <RefreshCw className="h-6 w-6 animate-spin" />
            <span>Loading Khuddam Dashboard...</span>
          </div>
        </div>
      </div>
    );
  }

  const assignedGroupName = currentUser?.assignedGroup || null;
  const assistantName = currentUser?.assistantName || "خادم المسؤول";
  const assistantPhone = currentUser?.assistantPhone || "+970553071353";

  // A Master Admin has no group of their own and should not land on this page.
  if (!assignedGroupName) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50">
        <HeaderBar />
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-md space-y-3 rounded-3xl border border-amber-300 bg-white p-8 text-center shadow-lg">
            <Layers className="mx-auto h-10 w-10 text-amber-500" />
            <h2 className="text-lg font-bold text-slate-900">
              {isRtl ? "لا توجد مجموعة مرتبطة بحسابك" : "No group is assigned to your account"}
            </h2>
            <p className="text-xs text-slate-600">
              {isRtl
                ? "هذا الحساب أمين خدمة عام بدون مجموعة. استخدم لوحة الإدارة الكاملة."
                : "This is a Master Admin account with no group of its own. Use the full admin panel instead."}
            </p>
            <button
              onClick={() => router.push("/admin/dashboard")}
              className="rounded-xl bg-coptic-blue px-4 py-2.5 text-xs font-bold text-white hover:bg-blue-800 transition cursor-pointer"
            >
              {isRtl ? "لوحة الإدارة" : "Go to admin panel"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-100/70">
      <HeaderBar />

      <main className="flex-1 pb-16 pt-6 sm:pt-8">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 space-y-6">
          {/* Welcome Banner */}
          <div className="rounded-3xl border border-blue-200 bg-gradient-to-r from-blue-900 via-coptic-blue to-indigo-950 p-6 sm:p-8 text-white shadow-xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-amber-300 border border-white/15">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>{assignedGroupName}</span>
                </div>
                <h2 className="text-xl sm:text-3xl font-extrabold tracking-tight">
                  {t.khademWelcomeBanner}
                </h2>
                <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm text-blue-100">
                  <span>
                    {t.yourAssistantIs}: <strong className="text-white font-bold">{assistantName}</strong>
                  </span>
                  <span>•</span>
                  <a
                    href={`tel:${assistantPhone}`}
                    className="flex items-center gap-1 hover:underline text-amber-200 font-mono"
                  >
                    <Phone className="h-3.5 w-3.5" />
                    <span>{assistantPhone}</span>
                  </a>
                </div>
              </div>

              {/* Top Actions */}
              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  onClick={fetchGroupData}
                  className="flex items-center gap-1.5 rounded-xl bg-white/10 px-3.5 py-2 text-xs font-semibold text-white backdrop-blur hover:bg-white/20 transition active:scale-95 cursor-pointer"
                  title="Refresh Roster"
                >
                  <RefreshCw className="h-4 w-4" />
                  <span>{isRtl ? "تحديث" : "Refresh"}</span>
                </button>

                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 rounded-xl bg-rose-600/80 px-3.5 py-2 text-xs font-semibold text-white hover:bg-rose-600 transition active:scale-95 cursor-pointer"
                >
                  <LogOut className="h-4 w-4" />
                  <span>{t.logout}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Navigation Tabs for Khuddam */}
          <div className="flex rounded-2xl bg-white p-1.5 shadow-sm border border-slate-200">
            <button
              type="button"
              onClick={() => setActiveTab("my_group")}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
                activeTab === "my_group"
                  ? "bg-coptic-blue text-white shadow"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Users className="h-4 w-4" />
              <span>{isRtl ? `كشف مجموعتي (${assignedGroupName})` : `My Group Roster (${assignedGroupName})`}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("calendar")}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
                activeTab === "calendar"
                  ? "bg-coptic-blue text-white shadow"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <CalendarIcon className="h-4 w-4 text-amber-300" />
              <span>{isRtl ? "📅 تقويم حضور جميع الأولاد (كل الآحاد)" : "📅 Sunday Attendance Calendar (All Students)"}</span>
            </button>
          </div>

          {/* Tab 1: My Group Roster */}
          {activeTab === "my_group" ? (
            <div className="space-y-6">
              {/* Stats Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="rounded-2xl bg-white p-4 sm:p-5 border border-slate-200 shadow-sm">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-slate-500">{t.totalStudents}</p>
                    <Users className="h-4 w-4 text-coptic-blue" />
                  </div>
                  <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2">
                    {students.length}
                  </p>
                </div>

                <div className="rounded-2xl bg-white p-4 sm:p-5 border border-emerald-200 shadow-sm bg-emerald-50/30">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-emerald-700">{t.presentCount}</p>
                    <UserCheck className="h-4 w-4 text-emerald-600" />
                  </div>
                  <p className="text-2xl sm:text-3xl font-extrabold text-emerald-700 mt-2">
                    {presentCount}
                  </p>
                </div>

                <div className="rounded-2xl bg-white p-4 sm:p-5 border border-rose-200 shadow-sm bg-rose-50/30">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-rose-700">{t.absentCount}</p>
                    <UserX className="h-4 w-4 text-rose-600" />
                  </div>
                  <p className="text-2xl sm:text-3xl font-extrabold text-rose-700 mt-2">
                    {absentCount}
                  </p>
                </div>

                <div className="rounded-2xl bg-white p-4 sm:p-5 border border-slate-200 shadow-sm">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-slate-500">Attendance Rate</p>
                    <CalendarIcon className="h-4 w-4 text-amber-600" />
                  </div>
                  <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2">
                    {attendanceRate}%
                  </p>
                </div>
              </div>

              {/* Roster Controls & Search */}
              <div className="rounded-3xl bg-white p-6 border border-slate-200 shadow-sm space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">{t.groupRosterTitle}</h3>
                    <p className="text-xs text-slate-500">
                      {formatDisplayDate(sessionDate, isRtl)} • {students.length} {t.totalStudents}
                    </p>
                  </div>

                  {/* Export Group Excel Button */}
                  <button
                    onClick={handleExportExcel}
                    disabled={exporting}
                    className="flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-800 transition active:scale-95 disabled:opacity-50 cursor-pointer"
                  >
                    <FileSpreadsheet className="h-4 w-4" />
                    <span>{exporting ? t.generatingExcel : t.exportGroupExcelBtn}</span>
                  </button>
                </div>

                {/* Search filter */}
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t.searchRosterPlaceholder}
                    className="g-input-field pl-10 pr-4"
                  />
                  <Search className={`absolute top-3 ${isRtl ? "left-3" : "right-3"} h-4 w-4 text-slate-400`} />
                </div>

                {/* Students List */}
                {filteredStudents.length === 0 ? (
                  <div className="text-center py-12 text-slate-400">
                    <Users className="h-10 w-10 mx-auto mb-2 opacity-50" />
                    <p className="text-sm font-semibold">No students match the search in this group.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredStudents.map((student) => (
                      <KhademRosterCard
                        key={student.id}
                        student={student}
                        sessionDate={sessionDate}
                        onOpenInfo={(s) => setSelectedStudentForInfo(s)}
                        onOpenPic={(s) => setSelectedStudentForPic(s)}
                        onStatusChanged={handleStatusChanged}
                      />
                    ))}
                  </div>
                )}

                {/* Automation Footer */}
                <div className="rounded-2xl border border-blue-200 bg-blue-50/70 p-4 text-center">
                  <p className="text-xs font-bold text-blue-900 leading-relaxed">
                    📢 {t.khademFooterAutomation}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            /* Tab 2: Sunday Attendance Calendar (All Students across all Sundays) */
            <SundayAttendanceCalendar userRole="KHADIM" userGroup={assignedGroupName} />
          )}
        </div>
      </main>

      {/* Modals */}
      {selectedStudentForInfo && (
        <StudentInfoModal
          student={selectedStudentForInfo}
          onClose={() => setSelectedStudentForInfo(null)}
          onUpdateSuccess={(updated) => {
            setStudents((prev) =>
              prev.map((s) => (s.id === updated.id ? { ...s, ...updated } : s))
            );
            setSelectedStudentForInfo(updated);
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
