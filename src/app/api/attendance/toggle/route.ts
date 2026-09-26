import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTodaySessionDate } from "@/lib/date";
import {
  ApiError,
  apiErrorResponse,
  requireStaff,
  requireStudentInScope,
} from "@/lib/api-auth";

export async function POST(req: NextRequest) {
  try {
    const user = requireStaff(req);

    const body = await req.json();
    const { studentId, status, sessionDate } = body;

    if (!studentId) {
      return NextResponse.json({ error: "Student ID is required" }, { status: 400 });
    }

    // A Group Khadem can only mark children from their own group.
    const target = await prisma.student.findUnique({
      where: { id: Number(studentId) },
      select: { id: true, assignedGroup: true },
    });
    if (!target) throw new ApiError(404, "Student not found.");
    requireStudentInScope(user, target.assignedGroup);

    const targetDate = sessionDate || getTodaySessionDate();
    const newStatus = status === "PRESENT" ? "PRESENT" : "ABSENT";

    const record = await prisma.attendanceRecord.upsert({
      where: {
        studentId_sessionDate: {
          studentId: Number(studentId),
          sessionDate: targetDate,
        },
      },
      update: {
        status: newStatus,
      },
      create: {
        studentId: Number(studentId),
        sessionDate: targetDate,
        status: newStatus,
      },
      include: {
        student: true,
      },
    });

    return NextResponse.json({
      success: true,
      record,
      message: `Status updated to ${newStatus}`,
    });
  } catch (error) {
    const authResponse = apiErrorResponse(error);
    if (authResponse) return authResponse;
    console.error("Toggle attendance error:", error);
    return NextResponse.json({ error: "Failed to update attendance" }, { status: 500 });
  }
}
