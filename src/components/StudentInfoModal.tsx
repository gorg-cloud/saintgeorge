"use client";

import React, { useState } from "react";
import { useLanguage } from "@/lib/i18n/context";
import { X, User, Phone, MapPin, School, Calendar, FileText, Edit2, Check, ShieldAlert } from "lucide-react";
import { groupLabel } from "@/lib/groupLabels";
import { useGroups } from "@/lib/useGroups";

interface StudentInfoModalProps {
  student: any;
  onClose: () => void;
  onUpdateSuccess?: (updated: any) => void;
}

export function StudentInfoModal({ student, onClose, onUpdateSuccess }: StudentInfoModalProps) {
  const { t, isRtl, lang } = useLanguage();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({ ...student });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  // Groups are admin-defined (named after a Khodam).
  const { names: groupNames } = useGroups();

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
            className="rounded-lg p-1.5 text-white/80 hover:bg-white/10 hover:text-white transition"
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
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-coptic-blue px-5 py-2 text-xs font-bold text-white hover:bg-blue-800 transition"
                >
                  {saving ? "Saving..." : t.saveChanges}
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-6">
              {/* Profile Top Card */}
              <div className="flex flex-col sm:flex-row items-center gap-4 rounded-2xl bg-slate-50 p-4 border border-slate-200/80">
                <div className="h-16 w-16 overflow-hidden rounded-full border-2 border-coptic-blue bg-slate-200 flex-shrink-0">
                  {student.photoUrl ? (
                    <img src={student.photoUrl} alt={student.fullName} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center font-bold text-slate-500">
                      {student.fullName.slice(0, 2)}
                    </div>
                  )}
                </div>
                <div className="text-center sm:text-start flex-1">
                  <h4 className="text-lg font-bold text-slate-900">{student.fullName}</h4>
                  <p className="text-xs text-slate-600">{groupLabel(student.assignedGroup, lang)}</p>
                </div>
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-coptic-blue hover:bg-blue-50 transition"
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
                      isRtl ? "غير متوفر" : "None"
                    )}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 p-4 space-y-1">
                  <p className="text-xs font-medium text-slate-500">{t.dobLabel}</p>
                  <p className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-slate-400" />
                    {student.dob || "-"}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 p-4 space-y-1">
                  <p className="text-xs font-medium text-slate-500">{t.schoolNameLabel}</p>
                  <p className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                    <School className="h-3.5 w-3.5 text-slate-400" />
                    {student.schoolName || "-"}
                  </p>
                </div>

              </div>

              {/* Address */}
              <div className="rounded-2xl border border-slate-200 p-4 space-y-1">
                <p className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-slate-400" />
                  <span>{t.addressLabel}</span>
                </p>
                <p className="text-sm font-semibold text-slate-800">{student.address || "-"}</p>
              </div>

              {/* Notes */}
              <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4 space-y-1">
                <p className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5 text-amber-600" />
                  <span>{t.notesLabel}</span>
                </p>
                <p className="text-sm text-slate-700 leading-relaxed">
                  {student.notes || t.noNotes}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 bg-slate-50 px-6 py-4 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-xl bg-slate-800 px-6 py-2.5 text-xs font-bold text-white hover:bg-slate-900 transition"
          >
            {t.closeModal}
          </button>
        </div>
      </div>
    </div>
  );
}
