/**
 * Sunday School group labels — pure helpers with no database access, so they
 * are safe to import from client components.
 *
 * A group's name is simply the Khodam's name (see `groups.server.ts` for the
 * CRUD side). A child is "unassigned" only while their group is empty; there is
 * no fixed list of valid groups any more, so any non-empty name counts.
 */

/** Sentinel used by filters/selects for children who have not been placed yet. */
export const UNASSIGNED = "unassigned";

/** True when a stored group is empty, i.e. the child still needs to be placed. */
export function isUnassigned(group: string | null | undefined): boolean {
  return !group || !group.trim();
}

/** Display label for a stored group, falling back to the "Unassigned" wording. */
export function groupLabel(group: string | null | undefined, lang: "en" | "ar" = "ar"): string {
  if (!isUnassigned(group)) return group!.trim();
  return lang === "ar" ? "لم يتم التوزيع" : "Unassigned";
}
