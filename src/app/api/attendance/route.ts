import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, requireGroupScope, requireStaff } from "@/lib/api-auth";

export async function GET(req: NextRequest) {
  try {
    const user = requireStaff(req);

    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date");

    // A Group Khadem can only ever read their own group's history.
    const group = requireGroupScope(user, searchParams.get("group"));

    const whereClause: any = {};
    if (date) {
      whereClause.sessionDate = date;
    }
    if (group) {
      whereClause.student = { assignedGroup: group };
    }

    const records = await prisma.attendanceRecord.findMany({
      where: whereClause,
      include: {
        student: true,
      },
      orderBy: [{ sessionDate: "desc" }, { student: { fullName: "asc" } }],
    });

    // Also get all distinct session dates
    const distinctDates = await prisma.attendanceRecord.findMany({
      select: { sessionDate: true },
      distinct: ["sessionDate"],
      orderBy: { sessionDate: "asc" },
    });

    return NextResponse.json({
      success: true,
      records,
      dates: distinctDates.map((d) => d.sessionDate),
    });
  } catch (error) {
    const authResponse = apiErrorResponse(error);
    if (authResponse) return authResponse;
    console.error("Fetch attendance error:", error);
    return NextResponse.json({ error: "Failed to fetch attendance" }, { status: 500 });
  }
}
