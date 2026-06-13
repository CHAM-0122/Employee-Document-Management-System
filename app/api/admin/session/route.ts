import { NextResponse } from "next/server";

import { findDemoAdminUser } from "@/src/lib/admin-auth/demo-users";
import { createAdminSessionCookieValue, ADMIN_SESSION_COOKIE } from "@/src/lib/admin-auth/session";
import { apiError } from "@/src/lib/api/responses";

export async function GET(request: Request) {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const hasSession = cookieHeader.includes(`${ADMIN_SESSION_COOKIE}=`);

  return NextResponse.json({
    ok: true,
    hasSession,
  });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | { email?: string; password?: string }
    | null;

  const email = body?.email?.trim().toLowerCase();
  const password = body?.password?.trim();

  if (!email || !password) {
    return apiError("VALIDATION_ERROR", "メールアドレスとパスワードを入力してください", 422);
  }

  const user = findDemoAdminUser(email, password);
  if (!user) {
    return apiError("FORBIDDEN", "ログイン情報が正しくありません", 401);
  }

  const response = NextResponse.json({
    ok: true,
    role: user.role,
    storeId: user.storeId,
  });

  response.cookies.set({
    name: ADMIN_SESSION_COOKIE,
    value: createAdminSessionCookieValue({
      adminUserId: `demo-${user.role}`,
      role: user.role,
      storeId: user.storeId,
    }),
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8,
  });

  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: ADMIN_SESSION_COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });

  return response;
}
