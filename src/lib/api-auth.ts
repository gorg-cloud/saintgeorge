import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest, SessionUser } from "@/lib/auth";

/**
 * Raised by the guard helpers below so route handlers can turn an auth problem
 * into a proper HTTP response without nesting conditionals.
 */
export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/** Any signed-in Khadem or Admin. */
export function requireStaff(req: NextRequest): SessionUser {
  const user = getSessionFromRequest(req);
  if (!user) {
    throw new ApiError(401, "Authentication required. Please sign in as Khadem or Admin.");
  }
  return user;
}

/** Master administrators only. */
export function requireAdmin(req: NextRequest): SessionUser {
  const user = requireStaff(req);
  if (user.role !== "ADMIN") {
    throw new ApiError(403, "Administrator access required.");
  }
  return user;
}

/** Khuddam may only touch their own group's rosters and exports. */
export function requireGroupAccess(user: SessionUser, group: string | null | undefined) {
  if (user.role === "ADMIN") return;
  if (!group || user.assignedGroup !== group) {
    throw new ApiError(403, "You can only manage your own group.");
  }
}

/**
 * Pins a group filter to the caller's permissions.
 *
 * Admins (with or without a group of their own) may ask for any group, or for
 * none at all when they want everything. A Group Khadem is locked to their own
 * group, so passing `?group=Group 5` can never reveal another group's children.
 */
export function requireGroupScope(user: SessionUser, requested: string | null): string | null {
  if (user.role === "ADMIN") return requested;
  if (!user.assignedGroup) {
    throw new ApiError(403, "Your account has no group assigned. Ask an admin to set one.");
  }
  if (requested && requested !== user.assignedGroup) {
    throw new ApiError(403, "You can only access your own group.");
  }
  return user.assignedGroup;
}

/** A Group Khadem may only mark attendance for children in their own group. */
export function requireStudentInScope(user: SessionUser, studentGroup: string | null | undefined) {
  if (user.role === "ADMIN") return;
  if (!user.assignedGroup || studentGroup !== user.assignedGroup) {
    throw new ApiError(403, "You can only manage children in your own group.");
  }
}

/**
 * Converts an API error into a JSON response.
 * Returns null for unexpected errors so callers can keep their own 500 handling.
 */
export function apiErrorResponse(error: unknown): NextResponse | null {
  if (error instanceof ApiError) {
    return NextResponse.json({ success: false, error: error.message }, { status: error.status });
  }
  return null;
}
