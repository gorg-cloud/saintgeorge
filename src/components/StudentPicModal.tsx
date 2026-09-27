"use client";

import React, { useState, useRef } from "react";
import { useLanguage } from "@/lib/i18n/context";
import { X, Image as ImageIcon, User, Upload, Trash2, Loader2, Check } from "lucide-react";
import { groupLabel } from "@/lib/groupLabels";
import { compressImageFile } from "@/lib/imageUtils";

interface StudentPicModalProps {
  student: any;
  onClose: () => void;
  onUpdateSuccess?: (updated: any) => void;
}

export function StudentPicModal({ student, onClose, onUpdateSuccess }: StudentPicModalProps) {
  const { t, isRtl } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [currentPhoto, setCurrentPhoto] = useState<string | null>(student.photoUrl || null);
  const [imgError, setImgError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setSaving(true);
      setErrorMessage("");
      setSavedSuccess(false);

      const compressedBase64 = await compressImageFile(file);

      // Save directly to database
      const res = await fetch("/api/students", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: student.id,
          photoUrl: compressedBase64,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setCurrentPhoto(compressedBase64);
        setImgError(false);
        setSavedSuccess(true);
        if (onUpdateSuccess) onUpdateSuccess(data.student);
        setTimeout(() => setSavedSuccess(false), 3000);
      } else {
        setErrorMessage(data.error || "Failed to save photo");
      }
    } catch (err) {
      console.error(err);
      setErrorMessage("Error uploading image");
    } finally {
      setSaving(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemovePhoto = async () => {
    if (!confirm(isRtl ? "هل تريد إزالة صورة هذا الطالب؟" : "Remove photo for this student?")) {
      return;
    }

    try {
      setSaving(true);
      setErrorMessage("");
      setSavedSuccess(false);

      const res = await fetch("/api/students", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: student.id,
          photoUrl: null,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setCurrentPhoto(null);
        setImgError(false);
        setSavedSuccess(true);
        if (onUpdateSuccess) onUpdateSuccess(data.student);
        setTimeout(() => setSavedSuccess(false), 3000);
      } else {
        setErrorMessage(data.error || "Failed to remove photo");
      }
    } catch (err) {
      console.error(err);
      setErrorMessage("Error removing image");
    } finally {
      setSaving(false);
    }
  };

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
          <div className="relative aspect-square w-64 max-w-full overflow-hidden rounded-2xl border-4 border-white shadow-xl bg-slate-200 flex items-center justify-center">
            {currentPhoto && !imgError ? (
              <img
                src={currentPhoto}
                alt={student.fullName}
                className="h-full w-full object-cover"
                onError={() => setImgError(true)}
              />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-slate-400">
                <User className="h-16 w-16" />
                <span className="text-xs font-semibold">
                  {imgError ? (isRtl ? "تعذر تحميل الصورة" : "Image failed to load") : t.noPhoto}
                </span>
              </div>
            )}

            {saving && (
              <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs flex flex-col items-center justify-center text-white gap-2">
                <Loader2 className="h-8 w-8 animate-spin text-amber-400" />
                <span className="text-xs font-bold">{isRtl ? "جاري الحفظ..." : "Saving..."}</span>
              </div>
            )}
          </div>

          <div className="text-center">
            <h4 className="text-lg font-bold text-slate-900">{student.fullName}</h4>
            <p className="text-xs text-slate-500 font-medium">
              {groupLabel(student.assignedGroup, isRtl ? "ar" : "en")}
            </p>
          </div>

          {savedSuccess && (
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200">
              <Check className="h-3.5 w-3.5" />
              <span>{isRtl ? "تم حفظ الصورة بنجاح!" : "Photo updated successfully!"}</span>
            </div>
          )}

          {errorMessage && (
            <p className="text-xs font-semibold text-rose-600 bg-rose-50 px-3 py-1.5 rounded-full border border-rose-200">
              {errorMessage}
            </p>
          )}

          {/* Quick Photo Actions */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />

          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              disabled={saving}
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 rounded-xl bg-coptic-blue px-3.5 py-2 text-xs font-bold text-white hover:bg-blue-800 transition active:scale-95 shadow-xs cursor-pointer disabled:opacity-50"
            >
              <Upload className="h-3.5 w-3.5 text-amber-300" />
              <span>{currentPhoto ? (isRtl ? "تغيير الصورة" : "Change Photo") : (isRtl ? "رفع صورة جديدة" : "Upload Photo")}</span>
            </button>

            {currentPhoto && (
              <button
                type="button"
                disabled={saving}
                onClick={handleRemovePhoto}
                className="flex items-center gap-1.5 rounded-xl border border-rose-200 bg-white px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 transition active:scale-95 shadow-xs cursor-pointer disabled:opacity-50"
                title={isRtl ? "إزالة الصورة" : "Remove Photo"}
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>{isRtl ? "إزالة" : "Remove"}</span>
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 bg-white px-6 py-3 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-xl bg-slate-800 px-5 py-2 text-xs font-bold text-white hover:bg-slate-900 transition cursor-pointer"
          >
            {t.closeModal}
          </button>
        </div>
      </div>
    </div>
  );
}
