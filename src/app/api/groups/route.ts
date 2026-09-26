import { NextRequest, NextResponse } from "next/server";
import { apiErrorResponse, requireAdmin } from "@/lib/api-auth";
import {
  GroupError,
  createGroup,
  deleteGroup,
  listGroups,
  renameGroup,
} from "@/lib/groups.server";

/**
 * Group management — admin only.
 *
 * A group's name is the Khodam's name, so this is where the admin builds the
 * running order and renames it as needed. Groups have no accounts of their own.
 */

function groupErrorResponse(error: unknown): NextResponse | null {
  if (error instanceof GroupError) {
    return NextResponse.json({ success: false, error: error.message }, { status: error.status });
  }
  return null;
}

function handle(error: unknown, fallback: string) {
  return (
    apiErrorResponse(error) ??
    groupErrorResponse(error) ??
    (console.error(`${fallback}:`, error),
    NextResponse.json({ success: false, error: fallback }, { status: 500 }))
  );
}

export async function GET(req: NextRequest) {
  try {
    requireAdmin(req);
    const groups = await listGroups();
    return NextResponse.json({ success: true, groups });
  } catch (error) {
    return handle(error, "Failed to load groups");
  }
}

export async function POST(req: NextRequest) {
  try {
    requireAdmin(req);
    const body = await req.json().catch(() => ({}));
    const group = await createGroup(body?.name);
    return NextResponse.json({ success: true, group }, { status: 201 });
  } catch (error) {
    return handle(error, "Failed to create the group");
  }
}

export async function PUT(req: NextRequest) {
  try {
    requireAdmin(req);
    const body = await req.json().catch(() => ({}));
    const id = Number(body?.id);
    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json({ success: false, error: "A group id is required." }, { status: 400 });
    }
    const group = await renameGroup(id, body?.name);
    return NextResponse.json({ success: true, group });
  } catch (error) {
    return handle(error, "Failed to rename the group");
  }
}

export async function DELETE(req: NextRequest) {
  try {
    requireAdmin(req);
    const body = await req.json().catch(() => ({}));
    const id = Number(body?.id);
    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json({ success: false, error: "A group id is required." }, { status: 400 });
    }
    const result = await deleteGroup(id, { force: Boolean(body?.force) });
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    return handle(error, "Failed to delete the group");
  }
}
