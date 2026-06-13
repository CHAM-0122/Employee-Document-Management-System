import { apiError } from "@/src/lib/api/responses";
import type { AdminRole } from "@/src/lib/admin-auth/policy";
import { resolveAdminSessionFromRequest } from "@/src/lib/admin-auth/session";

export interface PublicIntakeAuth {
  token: string;
}

export interface AdminAuthContext {
  adminUserId: string;
  role: AdminRole;
  storeId?: string;
}

type AuthFailure = {
  ok: false;
  response: ReturnType<typeof apiError>;
};

type PublicAuthSuccess = {
  ok: true;
  context: PublicIntakeAuth;
};

type AdminAuthSuccess = {
  ok: true;
  context: AdminAuthContext;
};

export async function requirePublicIntakeToken(
  token?: string,
): Promise<AuthFailure | PublicAuthSuccess> {
  if (!token) {
    return {
      ok: false as const,
      response: apiError("INVALID_TOKEN", "招待トークンがありません", 401),
    };
  }

  return {
    ok: true as const,
    context: { token } satisfies PublicIntakeAuth,
  };
}

export async function requireAdminAuth(
  request: Request,
): Promise<AuthFailure | AdminAuthSuccess> {
  // TODO: NextAuth等の本番認証に差し替える。現状は query/header ベースのデモ用セッション。
  const session = resolveAdminSessionFromRequest(request);
  if (!session) {
    return {
      ok: false as const,
      response: apiError("FORBIDDEN", "管理者ログインが必要です", 401),
    };
  }

  return {
    ok: true as const,
    context: session satisfies AdminAuthContext,
  };
}
