"use client";

import React, { useState, useRef } from "react";
import { useLanguage } from "@/lib/i18n/context";
import { X, User, Phone, MapPin, School, Calendar, FileText, Edit2, Check, Upload, Trash2 } from "lucide-react";
import { groupLabel } from "@/lib/groupLabels";
import { useGroups } from "@/lib/useGroups";
import { compressImageFile } from "@/lib/imageUtils";
import { StudentAvatar } from "@/components/StudentAvatar";

interface StudentInfoModalProps {
  student: any;
  onClose: () => void;
  onUpdateSuccess?: (updated: any) => void;
}

export function StudentInfoModal({ student, onClose, onUpdateSuccess }: StudentInfoModalProps) {
  const { t, isRtl, lang } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({ ...student });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  // Groups are admin-defined (named after a Khodam).
  const { names: groupNames } = useGroups();

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const base64 = await compressImageFile(file);
      setFormData((prev: any) => ({ ...prev, photoUrl: base64 }));
    } catch (err) {
      console.error("Failed to process image:", err);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      // "" means "no group yet", which the API stores as null.
      const payload = {
        ...formData,
        assignedGroup: formData.assignedGroup || "",
      };

      const res = await fetch("/api/students", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        setIsEditing(false);
        if (onUpdateSuccess) onUpdateSuccess(data.student);
      } else {
        setError(data.error || "Failed to update");
      }
    } catch {
      setError("Network error updating student.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl border border-slate-200 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-gradient-to-r from-blue-900 to-coptic-blue px-6 py-4 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 backdrop-blur">
              <User className="h-5 w-5 text-amber-300" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold">{t.studentInfoModalTitle}</h3>
              <p className="text-xs text-blue-100">{groupLabel(student.assignedGroup, lang)}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-white/80 hover:bg-white/10 hover:text-white transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs font-semibold text-rose-700">
              {error}
            </div>
          )}

          {isEditing ? (
            <form onSubmit={handleSave} className="space-y-4">
              {/* Photo Edit Section */}
              <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <StudentAvatar
                  photoUrl={formData.photoUrl}
                  fullName={formData.fullName}
                  className="h-16 w-16 rounded-2xl border-2 border-coptic-blue shadow-xs"
                />
                <div className="flex flex-col gap-1.5">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handlePhotoUpload}
                  />
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-1.5 rounded-lg bg-coptic-blue px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-800 transition cursor-pointer"
                    >
                      <Upload className="h-3.5 w-3.5 text-amber-300" />
                      <span>{formData.photoUrl ? (isRtl ? "تغيير الصورة" : "Change Photo") : (isRtl ? "رفع صورة" : "Upload Photo")}</span>
                    </button>
                    {formData.photoUrl && (
                      <button
                        type="button"
                        onClick={() => setFormData((prev: any) => ({ ...prev, photoUrl: null }))}
                        className="flex items-center gap-1 rounded-lg border border-rose-200 bg-white px-2.5 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>{isRtl ? "إزالة" : "Remove"}</span>
                      </button>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500">
                    {isRtl ? "يمكنك رفع صورة جديدة لحفظها لهذا الطالب" : "Upload a new photo for this student"}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t.fullNameLabel}</label>
                  <input
                    type="text"
                    required
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    className="g-input-field"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t.dobLabel}</label>
                  <input
                    type="date"
                    value={formData.dob || ""}
                    onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                    className="g-input-field"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t.schoolNameLabel}</label>
                  <input
                    type="text"
                    value={formData.schoolName || ""}
                    onChange={(e) => setFormData({ ...formData, schoolName: e.target.value })}
                    className="g-input-field"
                  />
                </div>

                {/* The group is editable so Khuddam can place or move a child. */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t.groupLabel}</label>
                  <select
                    value={formData.assignedGroup || ""}
                    onChange={(e) => setFormData({ ...formData, assignedGroup: e.target.value })}
                    className="g-input-field cursor-pointer"
                  >
                    <option value="">{t.unassignedOption}</option>
                    {groupNames.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t.motherNameLabel}</label>
                  <input
                    type="text"
                    value={formData.motherName || ""}
                    onChange={(e) => setFormData({ ...formData, motherName: e.target.value })}
                    className="g-input-field"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t.motherPhoneLabel}</label>
                  <input
                    type="tel"
                    value={formData.motherPhone || ""}
                    onChange={(e) => setFormData({ ...formData, motherPhone: e.target.value })}
                    className="g-input-field"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t.fatherPhoneLabel}</label>
                  <input
                    type="tel"
                    value={formData.fatherPhone || ""}
                    onChange={(e) => setFormData({ ...formData, fatherPhone: e.target.value })}
                    className="g-input-field"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t.childPhoneLabel}</label>
                  <input
                    type="tel"
                    value={formData.childPhone || ""}
                    onChange={(e) => setFormData({ ...formData, childPhone: e.target.value })}
                    className="g-input-field"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t.addressLabel}</label>
                  <input
                    type="text"
                    value={formData.address || ""}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="g-input-field"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t.notesLabel}</label>
                  <textarea
                    rows={3}
                    value={formData.notes || ""}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="g-input-field"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                >
                  {isRtl ? "إلغاء" : "Cancel"}
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-coptic-blue px-5 py-2 text-xs font-bold text-white hover:bg-blue-800 transition cursor-pointer disabled:opacity-50"
                >
                  {saving ? (isRtl ? "جاري الحفظ..." : "Saving...") : t.saveChanges}
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-6">
              {/* Profile Top Card */}
              <div className="flex flex-col sm:flex-row items-center gap-4 rounded-2xl bg-slate-50 p-4 border border-slate-200/80">
                <StudentAvatar
                  photoUrl={student.photoUrl}
                  fullName={student.fullName}
                  className="h-16 w-16 rounded-full border-2 border-coptic-blue shadow-xs"
                  textClassName="text-sm font-bold text-slate-500"
                />
                <div className="text-center sm:text-start flex-1">
                  <h4 className="text-lg font-bold text-slate-900">{student.fullName}</h4>
                  <p className="text-xs text-slate-600">{groupLabel(student.assignedGroup, lang)}</p>
                </div>
                <button
                  onClick={() => {
                    setFormData({ ...student });
                    setIsEditing(true);
                  }}
                  className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-coptic-blue hover:bg-blue-50 transition cursor-pointer"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                  <span>{t.editStudent}</span>
                </button>
              </div>

              {/* Family Contacts Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="rounded-2xl border border-slate-200 p-4 space-y-1">
                  <p className="text-xs font-medium text-slate-500">{t.motherNameLabel}</p>
                  <p className="text-sm font-bold text-slate-800">{student.motherName || "-"}</p>
                </div>

                <div className="rounded-2xl border border-slate-200 p-4 space-y-1">
                  <p className="text-xs font-medium text-slate-500">{t.motherPhoneLabel}</p>
                  <p className="text-sm font-bold text-slate-800">
                    {student.motherPhone ? (
                      <a href={`tel:${student.motherPhone}`} className="text-emerald-700 hover:underline flex items-center gap-1">
                        <Phone className="h-3.5 w-3.5" />
                        {student.motherPhone}
                      </a>
                    ) : (
                      "-"
                    )}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 p-4 space-y-1">
                  <p className="text-xs font-medium text-slate-500">{t.fatherPhoneLabel}</p>
                  <p className="text-sm font-bold text-slate-800">
                    {student.fatherPhone ? (
                      <a href={`tel:${student.fatherPhone}`} className="text-emerald-700 hover:underline flex items-center gap-1">
                        <Phone className="h-3.5 w-3.5" />
                        {student.fatherPhone}
                      </a>
                    ) : (
                      "-"
                    )}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 p-4 space-y-1">
                  <p className="text-xs font-medium text-slate-500">{t.childPhoneLabel}</p>
                  <p className="text-sm font-bold text-slate-800">
                    {student.childPhone ? (
                      <a href={`tel:${student.childPhone}`} className="text-emerald-700 hover:underline flex items-center gap-1">
                        <Phone className="h-3.5 w-3.5" />
                        {student.childPhone}
                      </a>
                    ) : (
                      "-"
                    )}
                  </p>
                </div>
              </div>

              {/* Details List */}
              <div className="space-y-3 rounded-2xl border border-slate-200 p-4 text-xs">
                <div className="flex items-start gap-2 text-slate-600">
                  <Calendar className="h-4 w-4 text-slate-400 mt-0.5 flex-shrink-0" />
                  <span className="font-semibold">{t.dobLabel}:</span>
                  <span className="text-slate-800 font-bold">{student.dob || "-"}</span>
                </div>

                <div className="flex items-start gap-2 text-slate-600">
                  <School className="h-4 w-4 text-slate-400 mt-0.5 flex-shrink-0" />
                  <span className="font-semibold">{t.schoolNameLabel}:</span>
                  <span className="text-slate-800 font-bold">{student.schoolName || "-"}</span>
                </div>

                <div className="flex items-start gap-2 text-slate-600">
                  <MapPin className="h-4 w-4 text-slate-400 mt-0.5 flex-shrink-0" />
                  <span className="font-semibold">{t.addressLabel}:</span>
                  <span className="text-slate-800 font-bold">{student.address || "-"}</span>
                </div>

                {student.notes && (
                  <div className="flex items-start gap-2 text-slate-600 border-t pt-3 mt-3">
                    <FileText className="h-4 w-4 text-slate-400 mt-0.5 flex-shrink-0" />
                    <span className="font-semibold">{t.notesLabel}:</span>
                    <span className="text-slate-800 font-medium">{student.notes}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 bg-slate-50 px-6 py-3 flex justify-end">
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
