import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";
import { getTodaySessionDate } from "@/lib/date";
import { apiErrorResponse, requireAdmin } from "@/lib/api-auth";
import { groupLabel } from "@/lib/groupLabels";
import { listGroupNames } from "@/lib/groups.server";
import { attachmentHeader, uniqueSheetName } from "@/lib/excel";

export async function GET(req: NextRequest) {
  try {
    // The master workbook contains every group's family contact details.
    requireAdmin(req);

    const today = getTodaySessionDate();

    // Fetch all students across all groups, then order them so the children who
    // have not been placed in a group yet land in a trailing "Unassigned" block.
    const students = await prisma.student.findMany({
      include: {
        attendance: true,
      },
      orderBy: { fullName: "asc" },
    });
    // Groups are admin-defined (named after a Khodam), so the running order
    // comes from the database rather than a fixed list.
    const groupNames = await listGroupNames();
    const groupRank = (group: string | null) => {
      const index = group ? groupNames.indexOf(group) : -1;
      return index === -1 ? groupNames.length : index;
    };
    students.sort(
      (a, b) => groupRank(a.assignedGroup) - groupRank(b.assignedGroup) || a.fullName.localeCompare(b.fullName)
    );

    // Fetch all distinct session dates
    const distinctDates = await prisma.attendanceRecord.findMany({
      select: { sessionDate: true },
      distinct: ["sessionDate"],
      orderBy: { sessionDate: "asc" },
    });

    const dates = distinctDates.map((d) => d.sessionDate);
    if (!dates.includes(today)) {
      dates.push(today);
    }

    // 1. Master Combined Sheet
    const masterRows = students.map((s, index) => {
      const attendanceMap = new Map(s.attendance.map((a) => [a.sessionDate, a.status]));
      
      const rowData: Record<string, any> = {
        "#": index + 1,
        "Group / المجموعة": groupLabel(s.assignedGroup, "ar"),
        "Student Name / اسم الطالب": s.fullName,
        "Mother Name / اسم ماما": s.motherName || "-",
        "Mother Phone / تليفون ماما": s.motherPhone || "-",
        "Father Phone / تليفون بابا": s.fatherPhone || "-",
        "Child Phone / تليفون الولد": s.childPhone || "-",
        "Address / العنوان": s.address || "-",
        "School / المدرسة": s.schoolName || "-",
        "Notes / ملاحظات": s.notes || "-",
      };

      let presentCount = 0;
      dates.forEach((d) => {
        const status = attendanceMap.get(d) || "ABSENT";
        rowData[`Session (${d})`] = status === "PRESENT" ? "✓" : "✗";
        if (status === "PRESENT") presentCount++;
      });

      rowData["Total Present / إجمالي الحضور"] = presentCount;
      rowData["Total Sessions / عدد الحصص"] = dates.length;
      rowData["Attendance Rate / النسبة"] = `${Math.round((presentCount / dates.length) * 100)}%`;

      return rowData;
    });

    const workbook = XLSX.utils.book_new();
    // Group names are Khodam names, so every sheet title is trimmed to Excel's
    // 31-character cap and de-duplicated after trimming.
    const usedSheetNames = new Set<string>();
    const masterWorksheet = XLSX.utils.json_to_sheet(masterRows);
    XLSX.utils.book_append_sheet(
      workbook,
      masterWorksheet,
      uniqueSheetName("Master School Attendance", usedSheetNames)
    );

    // 2. Individual group sheets, including one for children still unplaced.
    const sheetGroups: (string | null)[] = [...groupNames, null];
    for (const grp of sheetGroups) {
      const groupStudents = students.filter((s) => (grp ? s.assignedGroup === grp : !s.assignedGroup));
      if (groupStudents.length > 0) {
        const groupRows = groupStudents.map((s, idx) => {
          const attendanceMap = new Map(s.attendance.map((a) => [a.sessionDate, a.status]));
          const rowData: Record<string, any> = {
            "#": idx + 1,
            "Student Name": s.fullName,
            "Mother Phone": s.motherPhone || "-",
            "Father Phone": s.fatherPhone || "-",
            "Notes": s.notes || "-",
          };
          dates.forEach((d) => {
            const status = attendanceMap.get(d) || "ABSENT";
            rowData[d] = status === "PRESENT" ? "PRESENT" : "ABSENT";
          });
          return rowData;
        });
        const grpSheet = XLSX.utils.json_to_sheet(groupRows);
        XLSX.utils.book_append_sheet(workbook, grpSheet, uniqueSheetName(grp ?? "Unassigned", usedSheetNames));
      }
    }

    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "buffer" });
    const filename = `Sunday_School_Master_Attendance_${today}.xlsx`;

    return new NextResponse(excelBuffer, {
      status: 200,
      headers: {
        "Content-Disposition": attachmentHeader(filename),
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      },
    });
  } catch (error) {
    const authResponse = apiErrorResponse(error);
    if (authResponse) return authResponse;
    console.error("Master export error:", error);
    return NextResponse.json({ error: "Failed to export master Excel sheet" }, { status: 500 });
  }
}
