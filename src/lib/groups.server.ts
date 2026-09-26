import { prisma } from "@/lib/prisma";

/**
 * Group CRUD.
 *
 * A group's name is the Khodam's name and is the single source of truth for
 * "which group is this". Student rows store that name in `assignedGroup`, so
 * renaming a group is one transaction that rewrites the matching child rows.
 *
 * Server-only: this module imports Prisma, so client components must use the
 * pure helpers in `@/lib/groupLabels` instead.
 */

export interface GroupSummary {
  id: number;
  name: string;
  sortOrder: number;
  studentCount: number;
}

/** Raised for a rule the caller broke; routes map it straight to a status code. */
export class GroupError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
  }
}

function cleanName(name: unknown): string {
  return typeof name === "string" ? name.trim() : "";
}

export async function listGroups(): Promise<GroupSummary[]> {
  const [groups, counts] = await Promise.all([
    prisma.group.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
    prisma.student.groupBy({ by: ["assignedGroup"], _count: { _all: true } }),
  ]);

  // Children moved back to "Unassigned" have assignedGroup = null and simply do
  // not appear in the counts.
  const countByName = new Map(
    counts
      .filter((c) => !!c.assignedGroup)
      .map((c) => [c.assignedGroup as string, c._count._all])
  );

  return groups.map((g) => ({
    id: g.id,
    name: g.name,
    sortOrder: g.sortOrder,
    studentCount: countByName.get(g.name) ?? 0,
  }));
}

export async function listGroupNames(): Promise<string[]> {
  const groups = await prisma.group.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { name: true },
  });
  return groups.map((g) => g.name);
}

/** True when `name` matches a group that exists right now. */
export async function isKnownGroup(name: string | null | undefined): Promise<boolean> {
  const candidate = cleanName(name);
  if (!candidate) return false;
  const found = await prisma.group.findUnique({ where: { name: candidate }, select: { id: true } });
  return Boolean(found);
}

export async function createGroup(rawName: unknown): Promise<GroupSummary> {
  const name = cleanName(rawName);
  if (!name) throw new GroupError(400, "Enter the Khodam's name for the group.");

  const existing = await prisma.group.findUnique({ where: { name }, select: { id: true } });
  if (existing) throw new GroupError(409, `A group named "${name}" already exists.`);

  // New groups append to the end of the running order.
  const last = await prisma.group.findFirst({ orderBy: { sortOrder: "desc" }, select: { sortOrder: true } });

  const created = await prisma.group.create({
    data: { name, sortOrder: (last?.sortOrder ?? 0) + 1 },
  });

  return { id: created.id, name: created.name, sortOrder: created.sortOrder, studentCount: 0 };
}

/**
 * Renames a group and carries its children across in the same transaction, so
 * no child is ever orphaned under a name that no longer exists.
 */
export async function renameGroup(id: number, rawName: unknown): Promise<GroupSummary> {
  const name = cleanName(rawName);
  if (!name) throw new GroupError(400, "The group name cannot be empty.");

  const group = await prisma.group.findUnique({ where: { id } });
  if (!group) throw new GroupError(404, "Group not found.");

  if (name !== group.name) {
    const clash = await prisma.group.findUnique({ where: { name }, select: { id: true } });
    if (clash) throw new GroupError(409, `A group named "${name}" already exists.`);
  }

  const [updated, moved] = await prisma.$transaction([
    prisma.group.update({ where: { id }, data: { name } }),
    prisma.student.updateMany({ where: { assignedGroup: group.name }, data: { assignedGroup: name } }),
  ]);

  return { id: updated.id, name: updated.name, sortOrder: updated.sortOrder, studentCount: moved.count };
}

/**
 * Deletes a group. Children are never deleted — they go back to Unassigned.
 * Refuses while the group still holds children unless `force` is set, which is
 * how the UI asks the admin to confirm the move.
 */
export async function deleteGroup(
  id: number,
  options: { force?: boolean } = {}
): Promise<{ movedToUnassigned: number }> {
  const group = await prisma.group.findUnique({ where: { id } });
  if (!group) throw new GroupError(404, "Group not found.");

  const childCount = await prisma.student.count({ where: { assignedGroup: group.name } });
  if (childCount > 0 && !options.force) {
    throw new GroupError(
      409,
      `This group still has ${childCount} ${childCount === 1 ? "child" : "children"}. Confirm to move them back to Unassigned.`
    );
  }

  const [, cleared] = await prisma.$transaction([
    prisma.group.delete({ where: { id } }),
    prisma.student.updateMany({ where: { assignedGroup: group.name }, data: { assignedGroup: null } }),
  ]);

  return { movedToUnassigned: cleared.count };
}
