import type { SessionUser } from "@/lib/auth";

/**
 * The three kinds of staff account, all expressed with `role` + `assignedGroup`:
 *
 *   GROUP_KHADIM  role KHADIM + a group   -> sees and manages that one group only.
 *   MASTER_ADMIN  role ADMIN  + no group  -> full control, no group of their own.
 *   GROUP_ADMIN   role ADMIN  + a group   -> full control, plus their own group
 *                                            with their own children.
 *
 * Deriving the kind from the two existing columns keeps the DB and the JWT
 * session unchanged, and means an admin can be given a group without switching
 * account types.
 */
export type AccountKind = "GROUP_KHADIM" | "MASTER_ADMIN" | "GROUP_ADMIN";

export interface AccountLike {
  role: string;
  assignedGroup?: string | null;
}

export function accountKind(user: AccountLike): AccountKind {
  if (user.role === "ADMIN") {
    return user.assignedGroup ? "GROUP_ADMIN" : "MASTER_ADMIN";
  }
  return "GROUP_KHADIM";
}

/** Admins (with or without a group) can do everything. */
export function canControlEverything(user: AccountLike): boolean {
  return user.role === "ADMIN";
}

/** True when this account also has a group of its own to look after. */
export function hasOwnGroup(user: AccountLike): boolean {
  return Boolean(user.assignedGroup);
}

export function accountKindLabel(kind: AccountKind, lang: "en" | "ar" = "ar"): string {
  if (kind === "MASTER_ADMIN") return lang === "ar" ? "أمين خدمة عام" : "Master Admin";
  if (kind === "GROUP_ADMIN") return lang === "ar" ? "أمين خدمة + خادم مجموعة" : "Admin with Group";
  return lang === "ar" ? "خادم مجموعة" : "Group Khadem";
}
