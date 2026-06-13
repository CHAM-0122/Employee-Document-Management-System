import { created } from "@/src/lib/api/responses";
import { requireAdminAuth } from "@/src/lib/api/auth";
import { getAdminPermissions } from "@/src/lib/admin-auth/policy";
import { apiError } from "@/src/lib/api/responses";
import { issueMockEmploymentContractRenewal, shouldUseMockData } from "@/src/lib/mock/mock-repositories";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminAuth(request);
  if (!auth.ok) {
    return auth.response;
  }

  const permissions = getAdminPermissions(auth.context.role);
  if (!permissions.canInvite) {
    return apiError("FORBIDDEN", "この権限では更新発行できません", 403);
  }

  const { id } = await params;
  const url = new URL(request.url);
  const baseUrl = request.headers.get("origin") || url.origin;

  if (shouldUseMockData()) {
    const result = issueMockEmploymentContractRenewal({
      id,
      baseUrl,
    });

    if (!result) {
      return apiError("NOT_FOUND", "対象データが見つかりません", 404);
    }

    return created({
      ok: true,
      renewalId: result.id,
      periodYear: result.periodYear,
      periodHalf: result.periodHalf,
      periodLabel: result.periodLabel,
      status: result.status,
      issuedAt: result.issuedAt,
      renewalUrl: result.renewalUrl,
    });
  }

  return apiError(
    "INTERNAL_ERROR",
    "更新履歴テーブル未実装のため、現状はモック環境でのみ更新発行できます",
    501,
  );
}
