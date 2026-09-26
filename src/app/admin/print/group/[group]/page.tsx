import React from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { groupLabel } from "@/lib/groupLabels";
import { GroupSheetChild, loadGroupSheet } from "@/lib/groupSheet.server";
import { PrintTrigger } from "./PrintTrigger";

/**
 * Per-group profile sheet.
 *
 * One child per printed page, with their photo shown WHOLE — never cropped to a
 * square — and every stored field underneath. The browser turns it into a PDF
 * via the print dialog, which matters here because it is the only way to render
 * Arabic correctly without embedding a font.
 */

// Fields are bilingual to match the Excel exports the admin already uses.
const FIELDS: { key: keyof StudentRow; ar: string; en: string; wide?: boolean }[] = [
  { key: "dob", ar: "تاريخ الميلاد", en: "Date of Birth" },
  { key: "motherName", ar: "اسم ماما", en: "Mother's Name" },
  { key: "motherPhone", ar: "تليفون ماما", en: "Mother's Phone" },
  { key: "fatherPhone", ar: "تليفون بابا", en: "Father's Phone" },
  { key: "childPhone", ar: "تليفون الولد", en: "Child's Phone" },
  { key: "schoolName", ar: "المدرسة", en: "School" },
  { key: "address", ar: "العنوان", en: "Address", wide: true },
  { key: "notes", ar: "ملاحظات", en: "Notes", wide: true },
];

type StudentRow = GroupSheetChild;

function value(row: StudentRow, key: keyof StudentRow): string {
  const raw = row[key];
  const text = typeof raw === "string" ? raw.trim() : "";
  return text || "—";
}

const PRINT_CSS = `
  @page { size: A4 portrait; margin: 12mm; }

  .print-sheet { background: #fff; }

  .child-card {
    break-after: page;
    page-break-after: always;
    border: 1px solid #cbd5e1;
    border-radius: 18px;
    padding: 22px;
    margin: 0 0 24px;
  }
  .child-card:last-child {
    break-after: auto;
    page-break-after: auto;
    margin-bottom: 0;
  }

  /* The photo is always letterboxed inside the frame, never cropped. */
  .photo-frame {
    width: 260px;
    height: 300px;
    flex: 0 0 260px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #f1f5f9;
    border: 4px solid #fff;
    border-radius: 14px;
    overflow: hidden;
    box-shadow: 0 1px 6px rgba(15, 23, 42, 0.18);
  }
  .photo-frame img {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }

  @media print {
    .no-print { display: none !important; }
    body { background: #fff !important; }
    .child-card {
      border: 1px solid #94a3b8;
      border-radius: 12px;
      box-shadow: none;
    }
    .photo-frame { box-shadow: none; }
  }
`;

export default async function GroupPrintPage({
  params,
}: {
  params: Promise<{ group: string }>;
}) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    redirect("/login?callbackUrl=" + encodeURIComponent("/admin/dashboard"));
  }

  const { group } = await params;
  const groupName = decodeURIComponent(group);

  const students = await loadGroupSheet(groupName);

  const today = new Intl.DateTimeFormat("ar-EG", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date());

  return (
    <div dir="rtl" className="min-h-screen bg-slate-200/70 print:bg-white">
      <style dangerouslySetInnerHTML={{ __html: PRINT_CSS }} />

      <PrintTrigger />

      <div className="print-sheet mx-auto max-w-4xl px-4 pb-16 print:max-w-none print:px-0 print:pb-0">
        {/* Sheet header */}
        <div className="mb-5 rounded-2xl border border-amber-300/70 bg-gradient-to-l from-amber-50 via-white to-blue-50 p-5 text-center print:mb-4 print:rounded-none print:border-0 print:bg-white print:p-0 print:text-right">
          <h1 className="text-xl font-extrabold text-slate-900">
            مدارس الأحد — كشف بيانات المخدومين
          </h1>
          <p className="mt-1 text-sm font-bold text-[#183153]">
            المجموعة: {groupLabel(groupName, "ar")}
          </p>
          <p className="mt-0.5 text-xs font-semibold text-slate-500">
            {students.length} من المخدومين • {today}
          </p>
        </div>

        {students.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <p className="text-sm font-bold text-slate-600">
              لا يوجد مخدومون في هذه المجموعة بعد.
            </p>
            <p className="mt-1 text-xs text-slate-400">
              No children have been placed in this group yet.
            </p>
          </div>
        ) : (
          students.map((student, index) => (
            <article key={student.id} className="child-card">
              <div className="flex gap-5">
                {/* Full, uncropped photo */}
                <div className="photo-frame">
                  {student.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={student.photoUrl} alt={student.fullName} />
                  ) : (
                    <span className="text-xs font-semibold text-slate-400">
                      لا توجد صورة / No photo
                    </span>
                  )}
                </div>

                {/* Details */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2.5 border-b-2 border-amber-400 pb-2">
                    <span className="rounded-lg bg-[#183153] px-2.5 py-0.5 text-xs font-bold text-white">
                      {index + 1}
                    </span>
                    <h2 className="text-xl font-extrabold text-slate-900">{student.fullName}</h2>
                  </div>

                  <dl className="mt-3 grid grid-cols-2 gap-x-5 gap-y-2.5">
                    {FIELDS.map((field) => (
                      <div
                        key={String(field.key)}
                        className={field.wide ? "col-span-2" : "col-span-1"}
                      >
                        <dt className="text-[11px] font-bold text-slate-500">
                          {field.ar} / {field.en}
                        </dt>
                        <dd className="mt-0.5 text-sm font-semibold break-words text-slate-900">
                          {value(student, field.key)}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>
              </div>
            </article>
          ))
        )}
      </div>
    </div>
  );
}
