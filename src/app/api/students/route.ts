import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTodaySessionDate } from "@/lib/date";
import {
  ApiError,
  apiErrorResponse,
  requireAdmin,
  requireGroupScope,
  requireStaff,
  requireStudentInScope,
} from "@/lib/api-auth";
import { isUnassigned } from "@/lib/groupLabels";
import { isKnownGroup } from "@/lib/groups.server";

/**
 * Children register without a group: nobody guesses it for them. A group is
 * only ever set when staff explicitly pass one, and it must be a group that
 * still exists (groups are named after a Khodam and can be renamed away).
 */
async function resolveGroup(value: unknown): Promise<string | null> {
  if (value == null || value === "") return null;
  const name = typeof value === "string" ? value.trim() : "";
  if (!name) return null;
  if (!(await isKnownGroup(name))) {
    throw new ApiError(400, `Unknown group "${name}".`);
  }
  return name;
}

/** Rosters contain family phone numbers and addresses, so reads require a staff session. */
export async function GET(req: NextRequest) {
  try {
    const user = requireStaff(req);

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim().toLowerCase();
    const sessionDate = searchParams.get("date") || getTodaySessionDate();

    // A Group Khadem is pinned to their own group; admins may ask for any group
    // (or none, to get everybody including the unplaced children).
    const group = requireGroupScope(user, searchParams.get("group"));

    // Query students
    const students = await prisma.student.findMany({
      where: {
        AND: [
          group ? { assignedGroup: group } : {},
          search
            ? {
                OR: [
                  { fullName: { contains: search } },
                  { motherName: { contains: search } },
                  { motherPhone: { contains: search } },
                  { fatherPhone: { contains: search } },
                  { childPhone: { contains: search } },
                  { schoolName: { contains: search } },
                  { address: { contains: search } },
                ],
              }
            : {},
        ],
      },
      include: {
        attendance: {
          where: { sessionDate },
        },
      },
      orderBy: [{ assignedGroup: "asc" }, { fullName: "asc" }],
    });

    const formattedStudents = students.map((s) => ({
      ...s,
      // Children who have not been placed in a group yet keep working normally,
      // they just have no group to show.
      unassigned: isUnassigned(s.assignedGroup),
      todayStatus: s.attendance[0]?.status || "ABSENT",
      todayRecordId: s.attendance[0]?.id || null,
    }));

    return NextResponse.json({ success: true, students: formattedStudents, sessionDate });
  } catch (error) {
    const authResponse = apiErrorResponse(error);
    if (authResponse) return authResponse;
    console.error("Fetch students error:", error);
    return NextResponse.json({ error: "Failed to fetch students" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      fullName,
      dob,
      motherName,
      motherPhone,
      fatherPhone,
      childPhone,
      address,
      schoolName,
      assignedGroup,
      photoUrl,
      notes,
    } = body;

    if (!fullName || !fullName.trim()) {
      return NextResponse.json({ error: "Student full name is required" }, { status: 400 });
    }

    const group = await resolveGroup(assignedGroup);

    // Create student in DB
    const student = await prisma.student.create({
      data: {
        fullName: fullName.trim(),
        dob: dob || null,
        motherName: motherName?.trim() || null,
        motherPhone: motherPhone?.trim() || "",
        fatherPhone: fatherPhone?.trim() || "",
        childPhone: childPhone?.trim() || null,
        address: address?.trim() || null,
        schoolName: schoolName?.trim() || null,
        assignedGroup: group,
        photoUrl: photoUrl || null,
        notes: notes?.trim() || null,
      },
    });

    // Automatically set attendance to PRESENT for today
    const sessionDate = getTodaySessionDate();
    const attendanceRecord = await prisma.attendanceRecord.upsert({
      where: {
        studentId_sessionDate: {
          studentId: student.id,
          sessionDate,
        },
      },
      update: {
        status: "PRESENT",
      },
      create: {
        studentId: student.id,
        sessionDate,
        status: "PRESENT",
      },
    });

    return NextResponse.json({
      success: true,
      student: {
        ...student,
        todayStatus: "PRESENT",
        todayRecordId: attendanceRecord.id,
      },
      assignment: { group, source: group ? "explicit" : "unassigned" },
      message: group
        ? `Student registered successfully, added to ${group} and marked PRESENT!`
        : "Student registered successfully and marked PRESENT. No group was chosen, so a Khadem will place them.",
    });
  } catch (error) {
    const authResponse = apiErrorResponse(error);
    if (authResponse) return authResponse;
    console.error("Create student error:", error);
    return NextResponse.json({ error: "Failed to register student" }, { status: 500 });
  }
}

/**
 * Removes a child for good — admin only.
 *
 * The public form adds anyone who fills it in, so this is how a mistake (a
 * duplicate, or a name typed wrong) is cleaned up. The child's attendance rows
 * go with them: the relation is declared `onDelete: Cascade` in the schema.
 */
export async function DELETE(req: NextRequest) {
  try {
    requireAdmin(req);

    const body = await req.json().catch(() => ({}));
    const id = Number(body?.id);
    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json(
        { success: false, error: "A student id is required." },
        { status: 400 }
      );
    }

    const existing = await prisma.student.findUnique({
      where: { id },
      select: { id: true, fullName: true },
    });
    if (!existing) {
      return NextResponse.json({ success: false, error: "Student not found." }, { status: 404 });
    }

    await prisma.student.delete({ where: { id } });

    return NextResponse.json({
      success: true,
      deleted: { id: existing.id, fullName: existing.fullName },
    });
  } catch (error) {
    const authResponse = apiErrorResponse(error);
    if (authResponse) return authResponse;
    console.error("Delete student error:", error);
    return NextResponse.json({ error: "Failed to delete student" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = requireStaff(req);

    const body = await req.json();
    const {
      id,
      fullName,
      dob,
      motherName,
      motherPhone,
      fatherPhone,
      childPhone,
      address,
      schoolName,
      assignedGroup,
      photoUrl,
      notes,
    } = body;

    if (!id) {
      return NextResponse.json({ error: "Student ID is required" }, { status: 400 });
    }

    // "" / null clears the group, which is how a child is sent back to Unassigned.
    const nextGroup = assignedGroup === undefined ? undefined : await resolveGroup(assignedGroup);

    // A Group Khadem may only edit children who are already in their group.
    const existing = await prisma.student.findUnique({
      where: { id: Number(id) },
      select: { id: true, assignedGroup: true },
    });
    if (!existing) throw new ApiError(404, "Student not found.");
    requireStudentInScope(user, existing.assignedGroup);

    const updated = await prisma.student.update({
      where: { id: Number(id) },
      data: {
        fullName: fullName ? fullName.trim() : undefined,
        dob: dob !== undefined ? dob : undefined,
        motherName: motherName !== undefined ? motherName : undefined,
        motherPhone: motherPhone !== undefined ? motherPhone : undefined,
        fatherPhone: fatherPhone !== undefined ? fatherPhone : undefined,
        childPhone: childPhone !== undefined ? childPhone : undefined,
        address: address !== undefined ? address : undefined,
        schoolName: schoolName !== undefined ? schoolName : undefined,
        assignedGroup: nextGroup,
        photoUrl: photoUrl !== undefined ? photoUrl : undefined,
        notes: notes !== undefined ? notes : undefined,
      },
    });

    return NextResponse.json({ success: true, student: updated });
  } catch (error) {
    const authResponse = apiErrorResponse(error);
    if (authResponse) return authResponse;
    console.error("Update student error:", error);
    return NextResponse.json({ error: "Failed to update student" }, { status: 500 });
  }
}
