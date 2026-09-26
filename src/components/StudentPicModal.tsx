"use client";

import React from "react";
import { useLanguage } from "@/lib/i18n/context";
import { X, Image as ImageIcon, User } from "lucide-react";
import { groupLabel } from "@/lib/groupLabels";

interface StudentPicModalProps {
  student: any;
  onClose: () => void;
}

export function StudentPicModal({ student, onClose }: StudentPicModalProps) {
  const { t } = useLanguage();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-gradient-to-r from-blue-900 to-coptic-blue px-6 py-4 text-white">
          <div className="flex items-center gap-2.5">
            <ImageIcon className="h-5 w-5 text-amber-300" />
            <h3 className="text-base font-bold">{t.studentPicModalTitle}</h3>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-white/80 hover:bg-white/10 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Image Content */}
        <div className="p-6 flex flex-col items-center justify-center space-y-4 bg-slate-50">
          <div className="relative aspect-square w-64 max-w-full overflow-hidden rounded-2xl border-4 border-white shadow-xl bg-slate-200">
            {student.photoUrl ? (
              <img
                src={student.photoUrl}
                alt={student.fullName}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-slate-400">
                <User className="h-16 w-16" />
                <span className="text-xs font-semibold">{t.noPhoto}</span>
              </div>
            )}
          </div>

          <div className="text-center">
            <h4 className="text-lg font-bold text-slate-900">{student.fullName}</h4>
            <p className="text-xs text-slate-500 font-medium">
              {groupLabel(student.assignedGroup, "ar")}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 bg-white px-6 py-3 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-xl bg-slate-800 px-5 py-2 text-xs font-bold text-white hover:bg-slate-900 transition"
          >
            {t.closeModal}
          </button>
        </div>
      </div>
    </div>
  );
}
