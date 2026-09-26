import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword, createToken, COOKIE_NAME } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { username, passcode } = body;

    if (!username || !passcode) {
      return NextResponse.json(
        { error: "Username and passcode are required" },
        { status: 400 }
      );
    }

    const trimmedUsername = username.trim().toLowerCase();
    const user = await prisma.user.findUnique({
      where: { username: trimmedUsername },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Invalid username or passcode" },
        { status: 401 }
      );
    }

    const isValid = await verifyPassword(passcode, user.passcode);
    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid username or passcode" },
        { status: 401 }
      );
    }

    // Only the administrator signs in now. Khodam have no accounts — the groups
    // they used to own are named after them and managed from the admin panel,
    // so this keeps the Khadem dashboard code in place but unreachable.
    if (user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, error: "KHADEM_LOGIN_DISABLED" },
        { status: 403 }
      );
    }

    const sessionPayload = {
      id: user.id,
      username: user.username,
      role: user.role as "ADMIN" | "KHADIM",
      assignedGroup: user.assignedGroup,
      assistantName: user.assistantName,
      assistantPhone: user.assistantPhone,
    };

    const token = createToken(sessionPayload);

    const response = NextResponse.json({
      success: true,
      user: sessionPayload,
      redirectTo: "/admin/dashboard",
    });

    // Set secure HTTP-only cookie
    response.cookies.set({
      name: COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
