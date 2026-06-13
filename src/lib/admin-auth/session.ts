import type { AdminRole } from "@/src/lib/admin-auth/policy";
import { decryptJson, encryptJson } from "@/src/lib/security/encryption";

export type ResolvedAdminSession = {
  adminUserId: string;
  role: AdminRole;
  storeId?: string;
};

export const ADMIN_SESSION_COOKIE = "admin_session";

export function resolveAdminSessionFromRequest(
  request: Request,
): ResolvedAdminSession | null {
  const url = new URL(request.url);
  const roleParam = url.searchParams.get("role");
  const storeIdParam = url.searchParams.get("storeId");
  const headerRole = request.headers.get("x-admin-role");
  const headerStoreId = request.headers.get("x-admin-store-id");

  if (roleParam || headerRole) {
    const role = normalizeRole(roleParam || headerRole);
    const storeId =
      role === "store_admin"
        ? storeIdParam || headerStoreId || "mock-store-solaria"
        : undefined;

    return {
      adminUserId: "todo-admin-user-id",
      role,
      storeId,
    };
  }

  const cookieSession = readSessionFromCookie(request);
  if (cookieSession) {
    return {
      adminUserId: cookieSession.adminUserId,
      role: normalizeRole(cookieSession.role),
      storeId:
        normalizeRole(cookieSession.role) === "store_admin"
          ? cookieSession.storeId || "mock-store-solaria"
          : undefined,
    };
  }

  return null;
}

export function createAdminSessionCookieValue(session: ResolvedAdminSession) {
  return encryptJson(session);
}

function readSessionFromCookie(request: Request) {
  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) {
    return null;
  }

  const cookies = Object.fromEntries(
    cookieHeader.split(";").map((entry) => {
      const [name, ...rest] = entry.trim().split("=");
      return [name, decodeURIComponent(rest.join("="))];
    }),
  );

  const raw = cookies[ADMIN_SESSION_COOKIE];
  if (!raw) {
    return null;
  }

  try {
    return decryptJson<ResolvedAdminSession>(raw);
  } catch {
    return null;
  }
}

function normalizeRole(value: string | null): AdminRole {
  if (value === "hq_admin" || value === "store_admin") {
    return value;
  }

  return "hq_admin";
}
