import { prisma } from "@/lib/prisma";

/**
 * The data behind one group's printed profile sheet.
 *
 * Kept out of the page component so it can be exercised directly by the test
 * suite — the page itself only renders what this returns.
 */
export interface GroupSheetChild {
  id: number;
  fullName: string;
  dob: string | null;
  motherName: string | null;
  motherPhone: string | null;
  fatherPhone: string | null;
  childPhone: string | null;
  address: string | null;
  schoolName: string | null;
  notes: string | null;
  photoUrl: string | null;
}

/** Children of one group, in the order the sheet prints them. */
export async function loadGroupSheet(groupName: string): Promise<GroupSheetChild[]> {
  return prisma.student.findMany({
    where: { assignedGroup: groupName },
    orderBy: { fullName: "asc" },
    select: {
      id: true,
      fullName: true,
      dob: true,
      motherName: true,
      motherPhone: true,
      fatherPhone: true,
      childPhone: true,
      address: true,
      schoolName: true,
      notes: true,
      photoUrl: true,
    },
  });
}
