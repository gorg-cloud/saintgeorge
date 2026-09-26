"use client";

import React, { useState } from "react";
import { useLanguage } from "@/lib/i18n/context";
import { Info, Image as ImageIcon, Phone, CheckCircle, XCircle } from "lucide-react";
import { groupLabel } from "@/lib/groupLabels";

interface KhademRosterCardProps {
  student: any;
  sessionDate: string;
  onOpenInfo: (student: any) => void;
  onOpenPic: (student: any) => void;
  onStatusChanged: (studentId: number, newStatus: string) => void;
}

export function KhademRosterCard({
  student,
  sessionDate,
  onOpenInfo,
  onOpenPic,
  onStatusChanged,
}: KhademRosterCardProps) {
  const { t, isRtl } = useLanguage();
  const [status, setStatus] = useState<"PRESENT" | "ABSENT">(
    student.todayStatus === "PRESENT" ? "PRESENT" : "ABSENT"
  );
  const [toggling, setToggling] = useState(false);

  const toggleStatus = async () => {
    const nextStatus = status === "PRESENT" ? "ABSENT" : "PRESENT";
    setStatus(nextStatus);
    setToggling(true);
    onStatusChanged(student.id, nextStatus);

    try {
      await fetch("/api/attendance/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: student.id,
          status: nextStatus,
          sessionDate,
        }),
      });
    } catch (err) {
      console.error("Failed to toggle status:", err);
      // Revert on error
      setStatus(status);
      onStatusChanged(student.id, status);
    } finally {
      setToggling(false);
    }
  };

  const isPresent = status === "PRESENT";

  return (
    <div
      className={`rounded-2xl border transition-all duration-200 p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
        isPresent
          ? "border-emerald-200 bg-white hover:border-emerald-300 shadow-sm hover:shadow"
          : "border-rose-100 bg-rose-50/20 hover:border-rose-200 shadow-sm"
      }`}
    >
      {/* Student Details Left */}
      <div className="flex items-center gap-3.5 flex-1 min-w-0">
        {/* Avatar */}
        <button
          onClick={() => onOpenPic(student)}
          className="relative h-13 w-13 h-12 w-12 flex-shrink-0 overflow-hidden rounded-2xl border-2 border-slate-100 shadow-sm bg-slate-100 hover:opacity-90 transition"
          title="View Student Pic"
        >
          {student.photoUrl ? (
            <img src={student.photoUrl} alt={student.fullName} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center font-bold text-slate-500 text-sm">
              {student.fullName.slice(0, 2)}
            </div>
          )}
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h4 className="truncate text-base font-bold text-slate-900">{student.fullName}</h4>
          </div>
          <p className="text-xs text-slate-500 truncate mt-0.5">
            {groupLabel(student.assignedGroup, isRtl ? "ar" : "en")}
          </p>
          {student.motherPhone && (
            <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
              <Phone className="h-3 w-3" />
              <span>{student.motherPhone}</span>
            </p>
          )}
        </div>
      </div>

      {/* Action Controls Right */}
      <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100">
        {/* Info & Pic Buttons */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onOpenInfo(student)}
            className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:border-coptic-blue transition active:scale-95"
          >
            <Info className="h-3.5 w-3.5 text-coptic-blue" />
            <span>{t.getInfoBtn}</span>
          </button>

          <button
            type="button"
            onClick={() => onOpenPic(student)}
            className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:border-coptic-blue transition active:scale-95"
          >
            <ImageIcon className="h-3.5 w-3.5 text-coptic-blue" />
            <span>{t.childPicBtn}</span>
          </button>
        </div>

        {/* Present / Absent Toggle Button */}
        <button
          type="button"
          disabled={toggling}
          onClick={toggleStatus}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition shadow-sm active:scale-95 min-w-[125px] justify-center ${
            isPresent
              ? "bg-emerald-600 text-white hover:bg-emerald-700 ring-2 ring-emerald-400/30"
              : "bg-rose-600 text-white hover:bg-rose-700 ring-2 ring-rose-400/30"
          }`}
        >
          {isPresent ? (
            <>
              <CheckCircle className="h-4 w-4" />
              <span>{t.presentStatus}</span>
            </>
          ) : (
            <>
              <XCircle className="h-4 w-4" />
              <span>{t.absentStatus}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
