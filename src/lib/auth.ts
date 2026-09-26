import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";

const JWT_SECRET = process.env.JWT_SECRET || "sk-1e3751ec36ca03f6d02e848c761b14acd5bc356cc0cf7c9d";
const COOKIE_NAME = "khodam_auth_token";

export interface SessionUser {
  id: number;
  username: string;
  role: "ADMIN" | "KHADIM";
  assignedGroup: string | null;
  assistantName?: string | null;
  assistantPhone?: string | null;
}

export function createToken(payload: SessionUser): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string): SessionUser | null {
  try {
    return jwt.verify(token, JWT_SECRET) as SessionUser;
  } catch {
    return null;
  }
}

export async function hashPassword(passcode: string): Promise<string> {
  return bcrypt.hash(passcode, 10);
}

export async function verifyPassword(plainPasscode: string, hashedPasscode: string): Promise<boolean> {
  return bcrypt.compare(plainPasscode, hashedPasscode);
}

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

export function getSessionFromRequest(request: NextRequest): SessionUser | null {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

export { COOKIE_NAME };
