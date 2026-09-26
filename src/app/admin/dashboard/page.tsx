"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/lib/i18n/context";
import { HeaderBar } from "@/components/HeaderBar";
import { AdminStudentDirectory } from "@/components/AdminStudentDirectory";
import { GroupsManager } from "@/components/GroupsManager";
import { SundayAttendanceCalendar } from "@/components/SundayAttendanceCalendar";
import { RegistrationForm } from "@/components/RegistrationForm";
import { useGroups } from "@/lib/useGroups";
import {
  ShieldCheck,
  Users,
  Calendar,
  FileSpreadsheet,
  LogOut,
  RefreshCw,
  PlusCircle,
  Layers,
  BookOpen,
  X,
} from "lucide-react";

export default function AdminDashboardPage() {
  const { t, isRtl } = useLanguage();
  const router = useRouter();

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
  const [sessionDates, setSessionDates] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"directory" | "attendance" | "groups">("attendance");
  const [showAddModal, setShowAddModal] = useState(false);
  const [exporting, setExporting] = useState(false);
  const { groups } = useGroups();

  const fetchAdminData = async () => {
    try {
      const authRes = await fetch("/api/auth/me");
      const authData = await authRes.json();

      if (!authData.authenticated || authData.user.role !== "ADMIN") {
        router.push("/login");
        return;
      }
      setCurrentUser(authData.user);

      const studentsRes = await fetch("/api/students");
      const studentsData = await studentsRes.json();
      if (studentsData.success) {
        setStudents(studentsData.students || []);
      }

      const attRes = await fetch("/api/attendance");
      const attData = await attRes.json();
      if (attData.success) {
        setAttendanceRecords(attData.records || []);
        setSessionDates(attData.dates || []);
      }
    } catch (err) {
      console.error("Admin data fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  const handleExportMaster = () => {
    setExporting(true);
    const a = document.createElement("a");
    a.href = "/api/export/master";
    a.download = "Sunday_School_Master_Attendance.xlsx";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => setExporting(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50">
        <HeaderBar />
        <div className="flex-1 flex items-center justify-center">
          <div className="flex items-center gap-3 text-coptic-blue font-bold">
            <RefreshCw className="h-6 w-6 animate-spin" />
            <span>Loading Admin Control Panel...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-100/70">
      <HeaderBar />

      <main className="flex-1 pb-16 pt-6 sm:pt-8">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 space-y-6">
          {/* Admin Hero Bar */}
          <div className="rounded-3xl border border-amber-300/60 bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 p-6 sm:p-8 text-white shadow-xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 rounded-full bg-amber-400/20 px-3 py-1 text-xs font-bold text-amber-300 border border-amber-400/30">
                  <ShieldCheck className="h-4 w-4" />
                  <span>
                    {currentUser?.assignedGroup
                      ? `${t.groupAdminBadge} (${currentUser.assignedGroup})`
                      : t.masterAdminBadge}
                  </span>
                </div>
                <h2 className="text-xl sm:text-3xl font-extrabold tracking-tight">
                  {t.adminWelcomeTitle}
                </h2>
                <p className="text-xs sm:text-sm text-slate-300 max-w-xl">
                  {t.adminSubtitle}
                </p>
              </div>

              {/* Top Controls */}
              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  onClick={() => setShowAddModal(true)}
                  className="flex items-center gap-2 rounded-xl bg-coptic-blue px-4 py-2.5 text-xs font-bold text-white shadow hover:bg-blue-800 transition active:scale-95 cursor-pointer"
                >
                  <PlusCircle className="h-4 w-4" />
                  <span>{t.addStudentAdminBtn}</span>
                </button>

                <button
                  onClick={handleExportMaster}
                  disabled={exporting}
                  className="flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-xs font-bold text-white shadow hover:bg-emerald-800 transition active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  <span>{exporting ? t.generatingExcel : t.exportMasterExcelBtn}</span>
                </button>

                <button
                  onClick={fetchAdminData}
                  className="flex items-center gap-1.5 rounded-xl bg-white/10 px-3 py-2 text-xs font-semibold text-white hover:bg-white/20 transition cursor-pointer"
                  title="Refresh"
                >
                  <RefreshCw className="h-4 w-4" />
                </button>

                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 rounded-xl bg-rose-600/80 px-3.5 py-2 text-xs font-semibold text-white hover:bg-rose-600 transition cursor-pointer"
                >
                  <LogOut className="h-4 w-4" />
                  <span>{t.logout}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="rounded-2xl bg-white p-5 border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-slate-500">{t.totalStudents}</p>
                <Users className="h-4 w-4 text-coptic-blue" />
              </div>
              <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2">
                {students.length}
              </p>
            </div>

            <div className="rounded-2xl bg-white p-5 border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-slate-500">{t.activeGroupsLabel}</p>
                <Layers className="h-4 w-4 text-amber-600" />
              </div>
              <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2">
                {groups.length}
              </p>
            </div>

            <div className="rounded-2xl bg-white p-5 border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-slate-500">{t.sessionDates}</p>
                <Calendar className="h-4 w-4 text-purple-600" />
              </div>
              <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2">
                {sessionDates.length} {t.sundaysLabel}
              </p>
            </div>

            <div className="rounded-2xl bg-white p-5 border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-slate-500">{t.attendanceRecordsLabel}</p>
                <BookOpen className="h-4 w-4 text-emerald-600" />
              </div>
              <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2">
                {attendanceRecords.length}
              </p>
            </div>
          </div>

          {/* Master View Tabs */}
          <div className="rounded-3xl bg-white p-6 border border-slate-200 shadow-sm space-y-6">
            <div className="flex rounded-2xl bg-slate-100 p-1.5">
              <button
                onClick={() => setActiveTab("attendance")}
                className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-xs sm:text-sm font-bold transition cursor-pointer ${
                  activeTab === "attendance"
                    ? "bg-white text-coptic-blue shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Calendar className="h-4 w-4 text-amber-500" />
                <span>{t.checkAttendanceTab} (Sunday Calendar)</span>
              </button>

              <button
                onClick={() => setActiveTab("directory")}
                className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-xs sm:text-sm font-bold transition cursor-pointer ${
                  activeTab === "directory"
                    ? "bg-white text-coptic-blue shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Users className="h-4 w-4" />
                <span>{t.checkChildrenInfoTab} (Directory)</span>
              </button>

              <button
                onClick={() => setActiveTab("groups")}
                className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-xs sm:text-sm font-bold transition cursor-pointer ${
                  activeTab === "groups"
                    ? "bg-white text-coptic-blue shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Layers className="h-4 w-4 text-amber-500" />
                <span>{t.groupsTab}</span>
              </button>
            </div>

            {/* Content Tab Render */}
            {activeTab === "directory" && (
              <AdminStudentDirectory
                students={students}
                onRefresh={fetchAdminData}
                onAddNewClick={() => setShowAddModal(true)}
              />
            )}

            {activeTab === "attendance" && <SundayAttendanceCalendar userRole="ADMIN" userGroup={null} />}

            {activeTab === "groups" && (
              <GroupsManager students={students} onRefresh={fetchAdminData} />
            )}
          </div>
        </div>
      </main>

      {/* Add Student Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl my-8">
            <div className="flex items-center justify-between p-4 px-6 bg-slate-900 text-white">
              <h3 className="font-bold text-base">{t.addStudentAdminBtn}</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="rounded-lg p-1 text-white/80 hover:bg-white/10 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6">
              <RegistrationForm
                mode="staff"
                onSuccessRedirect={() => {
                  fetchAdminData();
                  setShowAddModal(false);
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
