"use client";

import React, { useState } from "react";
import { useLanguage } from "@/lib/i18n/context";
import { CheckCircle2, Upload, Loader2, Check, Users, AlertCircle, PhoneCall } from "lucide-react";
import { isUnassigned } from "@/lib/groupLabels";
import { useGroups } from "@/lib/useGroups";

interface RegistrationFormProps {
  onSuccessRedirect?: () => void;
  /**
   * "public" — the child's own form. The name is recognised against the roster
   *            first: a known child has their details updated, an unknown name
   *            is added as a new child. Nobody is turned away.
   * "staff"  — the admin "add student" modal, which creates a new child and may
   *            pick a group up front.
   */
  mode?: "public" | "staff";
}

type PublicOutcome = "welcome" | "ambiguous";

const PRESET_AVATARS = [
  "https://images.unsplash.com/photo-1544717305-2782549b5136?w=200&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1595454223600-91fbdd77e800?w=200&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=200&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80",
];

export function RegistrationForm({ onSuccessRedirect, mode = "public" }: RegistrationFormProps) {
  const { t, isRtl } = useLanguage();
  const isStaffMode = mode === "staff";
  // Groups are admin-defined (named after a Khodam); the staff form places a
  // child directly, the public form never asks.
  const { names: groupNames } = useGroups();

  const emptyForm = {
    fullName: "",
    dob: "",
    motherName: "",
    motherPhone: "",
    fatherPhone: "",
    childPhone: "",
    address: "",
    schoolName: "",
    photoUrl: "",
    notes: "",
    assignedGroup: "",
  };

  const [formData, setFormData] = useState(emptyForm);

  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [submittedStudent, setSubmittedStudent] = useState<any>(null);
  const [outcome, setOutcome] = useState<PublicOutcome | null>(null);
  // True when the submission added a child who was not on the roster yet.
  const [createdNew, setCreatedNew] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };


  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setPhotoPreview(base64String);
        setFormData((prev) => ({ ...prev, photoUrl: base64String }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSelectPresetAvatar = (url: string) => {
    setPhotoPreview(url);
    setFormData((prev) => ({ ...prev, photoUrl: url }));
  };

  const resetForm = () => {
    setSubmittedStudent(null);
    setOutcome(null);
    setFormData(emptyForm);
    setPhotoPreview(null);
    setErrorMsg("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!formData.fullName.trim()) {
      setErrorMsg(isRtl ? "يرجى كتابة اسم الولد بالكامل" : "Please enter full name of child");
      return;
    }

    if (!formData.address.trim()) {
      setErrorMsg(isRtl ? "يرجى كتابة العنوان بالتفصيل" : "Please enter address");
      return;
    }


    setLoading(true);
    try {
      // Staff add a brand-new child straight from the admin dashboard.
      // The public form instead recognises the child first (see below).
      if (isStaffMode) {
        const res = await fetch("/api/students", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });
        const data = await res.json();

        if (data.success) {
          setSubmittedStudent(data.student);
          if (onSuccessRedirect) onSuccessRedirect();
        } else {
          setErrorMsg(data.error || "Failed to submit form");
        }
        return;
      }

      // Public form: the typed name is recognised against the roster first. A
      // known child is updated, an unknown name is added — either way the
      // submission is saved and the family sees the welcome screen.
      const res = await fetch("/api/students/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();

      if (data.success && data.found === true) {
        setCreatedNew(Boolean(data.created));
        setOutcome("welcome");
        if (onSuccessRedirect) onSuccessRedirect();
      } else if (res.status === 409 || data.found === "ambiguous") {
        setOutcome("ambiguous");
      } else {
        setErrorMsg(data.error || "Failed to submit form");
      }
    } catch (err) {
      console.error("Submission error:", err);
      setErrorMsg("Network error submitting form.");
    } finally {
      setLoading(false);
    }
  };

  // ---------------------------------------------------------------
  // Public form: the submission was saved — nothing else but the welcome.
  // ---------------------------------------------------------------
  if (!isStaffMode && outcome === "welcome") {
    return (
      <div className="rounded-2xl border-2 border-emerald-500 bg-white shadow-xl overflow-hidden animate-fade-in max-w-2xl mx-auto">
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 p-10 text-white text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white text-emerald-600 shadow-lg">
            <CheckCircle2 className="h-10 w-10" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold">
            {createdNew ? t.detailsSavedTitle : t.welcomeToSundaySchool}
          </h2>
          <p className="mt-2 text-xs sm:text-sm text-emerald-50">
            {createdNew ? t.detailsSavedBody : t.welcomeToSundaySchoolBody}
          </p>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------
  // Public form: two near-identical names — ask for the full name.
  // ---------------------------------------------------------------
  if (!isStaffMode && outcome === "ambiguous") {
    return (
      <div className="rounded-2xl border-2 border-amber-400 bg-amber-50 p-6 sm:p-8 text-amber-950 animate-fade-in space-y-4 shadow-sm max-w-2xl mx-auto">
        <div className="flex items-start gap-3.5">
          <AlertCircle className="h-7 w-7 flex-shrink-0 text-amber-600" />
          <div className="space-y-1">
            <h3 className="text-lg font-black text-amber-900">{t.ambiguousTitle}</h3>
            <p className="text-xs sm:text-sm text-amber-900 leading-relaxed">
              {t.ambiguousBody}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 pt-2">
          <a
            href="tel:+970553071353"
            className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-xs font-bold text-white shadow hover:bg-emerald-700 transition active:scale-95 cursor-pointer"
          >
            <PhoneCall className="h-4 w-4" />
            <span>{t.callSupport} (+970553071353)</span>
          </a>

          <button
            type="button"
            onClick={() => setOutcome(null)}
            className="flex items-center gap-2 rounded-xl border border-amber-500 bg-white px-5 py-3 text-xs font-bold text-amber-800 shadow-sm hover:bg-amber-100 transition active:scale-95 cursor-pointer"
          >
            <span>{t.tryAnotherName}</span>
          </button>
        </div>
      </div>
    );
  }

  if (submittedStudent) {
    return (
      <div className="rounded-2xl border-2 border-emerald-500 bg-white shadow-xl overflow-hidden animate-fade-in max-w-2xl mx-auto">
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 p-8 text-white text-center">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-white text-emerald-600 shadow-lg">
            <CheckCircle2 className="h-10 w-10" />
          </div>
          <h2 className="text-2xl font-bold">{t.registeredSuccess}</h2>
        </div>

        <div className="p-6 sm:p-8 space-y-4">
          <div className="rounded-xl bg-slate-50 p-4 border border-slate-200 flex items-center gap-4">
            <div className="h-16 w-16 rounded-full overflow-hidden bg-slate-200 flex-shrink-0 border-2 border-emerald-500">
              {submittedStudent.photoUrl ? (
                <img src={submittedStudent.photoUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center font-bold text-slate-500">
                  {submittedStudent.fullName.slice(0, 2)}
                </div>
              )}
            </div>
            <div className="min-w-0">
              <h3 className="text-lg font-bold text-slate-900">{submittedStudent.fullName}</h3>
              <p className="text-xs font-bold text-emerald-700">Status: PRESENT (حاضر)</p>
            </div>
          </div>

          {/* Group status, so parents know where to send their child */}
          <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-4 space-y-2">
            <p className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" />
              <span>{t.assignedGroupHeadline}</span>
            </p>
            {isUnassigned(submittedStudent.assignedGroup) ? (
              <p className="text-sm font-bold text-amber-800">{t.groupPendingNote}</p>
            ) : (
              <span className="inline-block rounded-lg bg-coptic-blue px-3 py-1 text-sm font-bold text-white shadow-sm">
                {submittedStudent.assignedGroup}
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={resetForm}
            className="w-full rounded-xl bg-slate-900 py-3 text-sm font-bold text-white hover:bg-slate-800 transition active:scale-95 cursor-pointer"
          >
            {isRtl ? "إرسال استمارة أخرى" : "Submit Another Response"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Google Forms Top Card */}
      <div className="rounded-2xl border-t-8 border-t-coptic-blue bg-white p-6 sm:p-8 shadow-sm border-x border-b border-slate-200">
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 leading-snug">
          {t.billboardSubtitle}
        </h2>
        <p className="text-xs sm:text-sm text-slate-600 mt-2">
          {isRtl
            ? "يرجى ملء الحقول ببيانات الطفل. الاستمارة للجدد والحاليين — نرجو من أولياء الأمور تأكيد بيانات أولادهم وتحديثها إذا تغيرت."
            : "Please fill in the fields with the child's details. This form is for new and existing students — parents of existing students, please confirm and update your child's details if anything has changed."}
        </p>
        <p className="text-xs text-rose-500 font-semibold mt-3">
          * {isRtl ? "يشير إلى حقل مطلوب" : "Indicates required question"}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMsg && (
          <div className="rounded-xl bg-rose-50 border border-rose-200 p-4 text-xs sm:text-sm font-bold text-rose-700">
            {errorMsg}
          </div>
        )}

        {/* 1. Full name of child : (REQUIRED) */}
        <div className="rounded-2xl bg-white p-6 border border-slate-200 shadow-sm space-y-2">
          <label className="block text-sm sm:text-base font-bold text-slate-900">
            {t.qFullName} <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            required
            value={formData.fullName}
            onChange={(e) => handleInputChange("fullName", e.target.value)}
            placeholder={isRtl ? "إجابتك" : "Your answer"}
            className="w-full border-b-2 border-slate-300 bg-transparent py-2 text-base text-slate-900 focus:border-coptic-blue focus:outline-none transition"
          />
          {!isStaffMode && (
            <p className="text-xs text-slate-500">{t.checkInHelp}</p>
          )}
        </div>

        {/* Staff-only: place the child straight into a group. Public forms never show this. */}
        {isStaffMode && (
          <div className="rounded-2xl bg-white p-6 border border-slate-200 shadow-sm space-y-2">
            <label className="block text-sm sm:text-base font-bold text-slate-900">
              {t.selectGroupLabel}
            </label>
            <select
              value={formData.assignedGroup}
              onChange={(e) => handleInputChange("assignedGroup", e.target.value)}
              className="w-full sm:w-72 cursor-pointer border-b-2 border-slate-300 bg-transparent py-2 text-base font-medium text-slate-900 focus:border-coptic-blue focus:outline-none transition"
            >
              <option value="">{t.unassignedOption}</option>
              {groupNames.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
            <p className="text-xs text-slate-500">{t.staffGroupHint}</p>
          </div>
        )}

        {/* Public notice: groups are handed out by the Khuddam, not guessed here */}
        {!isStaffMode && (
          <div className="rounded-2xl border border-blue-200 bg-blue-50/60 p-4 text-xs font-semibold leading-relaxed text-blue-900">
            ℹ️ {t.noGroupNeededNote}
          </div>
        )}

        {/* 3. Date of birth : (OPTIONAL) */}
        <div className="rounded-2xl bg-white p-6 border border-slate-200 shadow-sm space-y-2">
          <label className="block text-sm sm:text-base font-bold text-slate-900">
            {t.qDob}
          </label>
          <input
            type="date"
            value={formData.dob}
            onChange={(e) => handleInputChange("dob", e.target.value)}
            className="w-full sm:w-64 border-b-2 border-slate-300 bg-transparent py-2 text-base text-slate-900 focus:border-coptic-blue focus:outline-none transition cursor-pointer"
          />
        </div>

        {/* 3. Mother's Name : (OPTIONAL) */}
        <div className="rounded-2xl bg-white p-6 border border-slate-200 shadow-sm space-y-2">
          <label className="block text-sm sm:text-base font-bold text-slate-900">
            {t.qMotherName}
          </label>
          <input
            type="text"
            value={formData.motherName}
            onChange={(e) => handleInputChange("motherName", e.target.value)}
            placeholder={isRtl ? "إجابتك" : "Your answer"}
            className="w-full border-b-2 border-slate-300 bg-transparent py-2 text-base text-slate-900 focus:border-coptic-blue focus:outline-none transition"
          />
        </div>

        {/* 4. Mother's mobile number : (OPTIONAL) */}
        <div className="rounded-2xl bg-white p-6 border border-slate-200 shadow-sm space-y-2">
          <label className="block text-sm sm:text-base font-bold text-slate-900">
            {t.qMotherMob}
          </label>
          <input
            type="tel"
            value={formData.motherPhone}
            onChange={(e) => handleInputChange("motherPhone", e.target.value)}
            placeholder={isRtl ? "إجابتك" : "Your answer"}
            className="w-full border-b-2 border-slate-300 bg-transparent py-2 text-base text-slate-900 focus:border-coptic-blue focus:outline-none transition font-mono"
          />
        </div>

        {/* 5. Father's mobile number : (OPTIONAL) */}
        <div className="rounded-2xl bg-white p-6 border border-slate-200 shadow-sm space-y-2">
          <label className="block text-sm sm:text-base font-bold text-slate-900">
            {t.qFatherMob}
          </label>
          <input
            type="tel"
            value={formData.fatherPhone}
            onChange={(e) => handleInputChange("fatherPhone", e.target.value)}
            placeholder={isRtl ? "إجابتك" : "Your answer"}
            className="w-full border-b-2 border-slate-300 bg-transparent py-2 text-base text-slate-900 focus:border-coptic-blue focus:outline-none transition font-mono"
          />
        </div>

        {/* 6. Child mobile number : (OPTIONAL) */}
        <div className="rounded-2xl bg-white p-6 border border-slate-200 shadow-sm space-y-2">
          <label className="block text-sm sm:text-base font-bold text-slate-900">
            {t.qChildMob}
          </label>
          <input
            type="tel"
            value={formData.childPhone}
            onChange={(e) => handleInputChange("childPhone", e.target.value)}
            placeholder={isRtl ? "إجابتك" : "Your answer"}
            className="w-full border-b-2 border-slate-300 bg-transparent py-2 text-base text-slate-900 focus:border-coptic-blue focus:outline-none transition font-mono"
          />
        </div>

        {/* 7. Address : (REQUIRED) */}
        <div className="rounded-2xl bg-white p-6 border border-slate-200 shadow-sm space-y-2">
          <label className="block text-sm sm:text-base font-bold text-slate-900">
            {t.qAddress} <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            required
            value={formData.address}
            onChange={(e) => handleInputChange("address", e.target.value)}
            placeholder={isRtl ? "إجابتك" : "Your answer"}
            className="w-full border-b-2 border-slate-300 bg-transparent py-2 text-base text-slate-900 focus:border-coptic-blue focus:outline-none transition"
          />
        </div>

        {/* 8. School name : (OPTIONAL) */}
        <div className="rounded-2xl bg-white p-6 border border-slate-200 shadow-sm space-y-2">
          <label className="block text-sm sm:text-base font-bold text-slate-900">
            {t.qSchoolName}
          </label>
          <input
            type="text"
            value={formData.schoolName}
            onChange={(e) => handleInputChange("schoolName", e.target.value)}
            placeholder={isRtl ? "إجابتك" : "Your answer"}
            className="w-full border-b-2 border-slate-300 bg-transparent py-2 text-base text-slate-900 focus:border-coptic-blue focus:outline-none transition"
          />
        </div>

        {/* 9. A new photo for the child : (OPTIONAL) */}
        <div className="rounded-2xl bg-white p-6 border border-slate-200 shadow-sm space-y-3">
          <label className="block text-sm sm:text-base font-bold text-slate-900">
            {t.qPhoto}
          </label>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            {PRESET_AVATARS.map((url, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelectPresetAvatar(url)}
                className={`relative h-14 w-14 rounded-2xl overflow-hidden border-2 transition active:scale-95 cursor-pointer ${
                  photoPreview === url ? "border-coptic-blue ring-2 ring-blue-400 scale-105" : "border-slate-200 opacity-75 hover:opacity-100"
                }`}
              >
                <img src={url} alt="" className="h-full w-full object-cover" />
                {photoPreview === url && (
                  <div className="absolute inset-0 bg-blue-900/40 flex items-center justify-center text-white">
                    <Check className="h-4 w-4 stroke-[3]" />
                  </div>
                )}
              </button>
            ))}

            <label className="flex h-14 cursor-pointer items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 px-4 hover:border-coptic-blue hover:bg-blue-50/50 transition active:scale-95">
              <Upload className="h-4 w-4 text-coptic-blue" />
              <span className="text-xs font-bold text-slate-700">{t.uploadPhotoHint}</span>
              <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
            </label>
          </div>
        </div>

        {/* 10. Notes : (OPTIONAL) */}
        <div className="rounded-2xl bg-white p-6 border border-slate-200 shadow-sm space-y-2">
          <label className="block text-sm sm:text-base font-bold text-slate-900">
            {t.qNotes}
          </label>
          <textarea
            rows={3}
            value={formData.notes}
            onChange={(e) => handleInputChange("notes", e.target.value)}
            placeholder={isRtl ? "إجابتك" : "Your answer"}
            className="w-full border-b-2 border-slate-300 bg-transparent py-2 text-base text-slate-900 focus:border-coptic-blue focus:outline-none transition resize-none"
          />
        </div>

        {/* Submit Button */}
        <div className="pt-2 flex justify-between items-center">
          <button
            type="submit"
            disabled={loading}
            className="rounded-xl bg-coptic-blue px-8 py-3.5 text-base font-bold text-white shadow-lg transition hover:bg-blue-800 disabled:opacity-50 active:scale-95 cursor-pointer"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>{t.submitting}</span>
              </span>
            ) : (
              <span>{t.submitFormBtn}</span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
