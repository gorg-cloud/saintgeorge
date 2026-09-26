import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";
import { getTodaySessionDate } from "@/lib/date";
import { apiErrorResponse, requireGroupAccess, requireStaff } from "@/lib/api-auth";
import { attachmentHeader, sheetName } from "@/lib/excel";

export async function GET(req: NextRequest) {
  try {
    const user = requireStaff(req);

    const { searchParams } = new URL(req.url);
    // Admins fall back to their own group when they have one, otherwise they
    // must name the group they want to export.
    const group = searchParams.get("group") || user.assignedGroup;
    if (!group) {
      return NextResponse.json(
        { success: false, error: "Please choose which group to export." },
        { status: 400 }
      );
    }
    requireGroupAccess(user, group);

    const today = getTodaySessionDate();

    // Fetch all students in this group
    const students = await prisma.student.findMany({
      where: { assignedGroup: group },
      include: {
        attendance: true,
      },
      orderBy: { fullName: "asc" },
    });

    // Fetch distinct session dates
    const distinctDates = await prisma.attendanceRecord.findMany({
      where: { student: { assignedGroup: group } },
      select: { sessionDate: true },
      distinct: ["sessionDate"],
      orderBy: { sessionDate: "asc" },
    });

    const dates = distinctDates.map((d) => d.sessionDate);
    if (!dates.includes(today)) {
      dates.push(today);
    }

    // Prepare Excel rows
    const rows = students.map((s, index) => {
      const attendanceMap = new Map(s.attendance.map((a) => [a.sessionDate, a.status]));
      
      const rowData: Record<string, any> = {
        "#": index + 1,
        "Student Name / اسم الطالب": s.fullName,
        "Group / المجموعة": s.assignedGroup,
        "Mother Phone / تليفون ماما": s.motherPhone || "-",
        "Father Phone / تليفون بابا": s.fatherPhone || "-",
        "Child Phone / تليفون الولد": s.childPhone || "-",
        "Address / العنوان": s.address || "-",
        "School / المدرسة": s.schoolName || "-",
        "Notes / ملاحظات": s.notes || "-",
      };

      // Add columns for each date
      let presentCount = 0;
      dates.forEach((d) => {
        const status = attendanceMap.get(d) || "ABSENT";
        rowData[`Session (${d})`] = status === "PRESENT" ? "✓ PRESENT" : "✗ ABSENT";
        if (status === "PRESENT") presentCount++;
      });

      rowData["Total Present / إجمالي الحضور"] = presentCount;
      rowData["Attendance Rate / النسبة"] = `${Math.round((presentCount / dates.length) * 100)}%`;

      return rowData;
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    // Group names are Khodam names, so they need trimming to Excel's 31-char cap.
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName(group, " Attendance"));

    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "buffer" });

    const filename = `Sunday_School_${group}_${today}.xlsx`;

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
    console.error("Export group error:", error);
    return NextResponse.json({ error: "Failed to export Excel sheet" }, { status: 500 });
  }
}
