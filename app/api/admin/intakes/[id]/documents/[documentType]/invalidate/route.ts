import { requireAdminAuth } from "@/src/lib/api/auth";
import { parseJson } from "@/src/lib/api/parse";
import { apiError, ok } from "@/src/lib/api/responses";
import { getAdminPermissions } from "@/src/lib/admin-auth/policy";
import { createAdminAuditLog } from "@/src/lib/db/audit-logs";
import { updateAdminDocumentState } from "@/src/lib/db/admin-intakes";
import { adminInvalidateSchema } from "@/src/lib/intake-contracts/schemas";
import { getRequestMeta } from "@/src/lib/api/request-meta";
import {
  shouldUseMockData,
  updateMockConsentAdminState,
} from "@/src/lib/mock/mock-repositories";

const allowedDocumentTypes = [
  "employment_contract",
  "employee_pledge",
  "sns_pledge",
  "retirement_pledge",
] as const;

function isAllowedDocumentType(
  value: string,
): value is (typeof allowedDocumentTypes)[number] {
  return allowedDocumentTypes.includes(value as (typeof allowedDocumentTypes)[number]);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; documentType: string }> },
) {
  const auth = await requireAdminAuth(request);
  if (!auth.ok) {
    return auth.response;
  }

  const permissions = getAdminPermissions(auth.context.role);
  if (!permissions.canManageDocuments) {
    return apiError("FORBIDDEN", "この権限では文書を無効化できません", 403);
  }

  const parsed = await parseJson(request, adminInvalidateSchema);
  if (!parsed.success) {
    return parsed.response;
  }

  const { id, documentType } = await params;
  if (!isAllowedDocumentType(documentType)) {
    return apiError("VALIDATION_ERROR", "対象文書の種類が不正です", 422);
  }

  const meta = getRequestMeta(request);

  if (shouldUseMockData()) {
    const updated = updateMockConsentAdminState({
      id,
      documentType,
      nextState: "invalidated",
      reason: parsed.data.reason,
      adminStoreId: auth.context.storeId,
      restrictToStore: auth.context.role === "store_admin",
    });

    if (!updated) {
      return apiError("NOT_FOUND", "対象文書が見つかりません", 404);
    }

    return ok({
      ok: true,
      id: updated.id,
      documentType: updated.documentType,
      adminState: updated.adminState,
      intakeStatus: updated.intakeStatus,
      reason: updated.adminStateReason,
      changedAt: updated.adminStateChangedAt,
    });
  }

  const updated = await updateAdminDocumentState({
    id,
    documentType,
    nextState: "invalidated",
    adminStoreId: auth.context.storeId,
    restrictToStore: auth.context.role === "store_admin",
  });

  if (!updated) {
    return apiError("NOT_FOUND", "対象文書が見つかりません", 404);
  }

  await createAdminAuditLog({
    adminUserId: auth.context.adminUserId,
    employeeIntakeId: id,
    action: "returned",
    actionTarget: `document:${documentType}`,
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
    metadataJson: {
      documentType,
      eventType: "invalidated",
      reason: parsed.data.reason,
    },
  });

  return ok({
    ok: true,
    id: updated.intakeId,
    documentType: updated.documentType,
    adminState: "invalidated",
    intakeStatus: updated.intakeStatus,
    reason: parsed.data.reason,
    changedAt: new Date().toISOString(),
  });
}
