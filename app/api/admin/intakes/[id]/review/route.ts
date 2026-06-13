import { parseJson } from "@/src/lib/api/parse";
import { ok } from "@/src/lib/api/responses";
import { requireAdminAuth } from "@/src/lib/api/auth";
import { adminReviewSchema } from "@/src/lib/intake-contracts/schemas";
import { markAdminIntakeReviewed } from "@/src/lib/db/admin-intakes";
import { apiError } from "@/src/lib/api/responses";
import { createAdminAuditLog } from "@/src/lib/db/audit-logs";
import { getRequestMeta } from "@/src/lib/api/request-meta";
import {
  markMockIntakeReviewed,
  shouldUseMockData,
} from "@/src/lib/mock/mock-repositories";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminAuth(request);
  if (!auth.ok) {
    return auth.response;
  }

  const parsed = await parseJson(request, adminReviewSchema);
  if (!parsed.success) {
    return parsed.response;
  }

  const { id } = await params;

  if (shouldUseMockData()) {
    const updated = markMockIntakeReviewed(id, {
      adminStoreId: auth.context.storeId,
      restrictToStore: auth.context.role === "store_admin",
    });

    if (!updated) {
      return apiError("NOT_FOUND", "対象データが見つかりません", 404);
    }

    return ok({
      ok: true,
      id,
      status: updated.status,
      reviewedAt: updated.reviewedAt,
    });
  }

  const updated = await markAdminIntakeReviewed({
    id,
    adminUserId: auth.context.adminUserId,
    adminStoreId: auth.context.storeId,
    restrictToStore: auth.context.role === "store_admin",
  });

  if (!updated) {
    return apiError("NOT_FOUND", "対象データが見つかりません", 404);
  }

  const meta = getRequestMeta(request);
  await createAdminAuditLog({
    adminUserId: auth.context.adminUserId,
    employeeIntakeId: id,
    action: "reviewed",
    actionTarget: "intake",
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
    metadataJson: parsed.data,
  });

  return ok({
    ok: true,
    id,
    status: updated.status,
    reviewedAt: updated.reviewedAt?.toISOString() ?? new Date().toISOString(),
  });
}
