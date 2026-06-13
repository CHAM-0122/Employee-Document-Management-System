import { requireAdminAuth } from "@/src/lib/api/auth";
import { parseJson } from "@/src/lib/api/parse";
import { apiError, ok } from "@/src/lib/api/responses";
import { getAdminPermissions } from "@/src/lib/admin-auth/policy";
import { createAdminAuditLog } from "@/src/lib/db/audit-logs";
import {
  findAdminIntakeDetail,
  updateAdminDocumentState,
} from "@/src/lib/db/admin-intakes";
import { adminReturnSchema } from "@/src/lib/intake-contracts/schemas";
import { getRequestMeta } from "@/src/lib/api/request-meta";
import {
  shouldUseMockData,
  updateMockConsentAdminState,
} from "@/src/lib/mock/mock-repositories";
import {
  buildResubmissionUrl,
  getReturnedDocumentLabel,
  sendReturnNotificationEmail,
} from "@/src/lib/notifications/return-notification-email";

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
    return apiError("FORBIDDEN", "この権限では文書を差し戻しできません", 403);
  }

  const parsed = await parseJson(request, adminReturnSchema);
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
      nextState: "returned",
      reason: parsed.data.reason,
      adminStoreId: auth.context.storeId,
      restrictToStore: auth.context.role === "store_admin",
    });

    if (!updated) {
      return apiError("NOT_FOUND", "対象文書が見つかりません", 404);
    }

    const notification = await sendReturnNotificationEmail({
      to: updated.recipientEmail,
      recipientName: updated.recipientName,
      storeName: updated.storeName,
      documentLabel: getReturnedDocumentLabel(documentType),
      reason: parsed.data.reason,
      resubmissionUrl: buildResubmissionUrl({
        requestUrl: request.url,
        token: updated.intakeToken,
        documentType,
      }),
    });

    return ok({
      ok: true,
      id: updated.id,
      documentType: updated.documentType,
      adminState: updated.adminState,
      intakeStatus: updated.intakeStatus,
      reason: updated.adminStateReason,
      changedAt: updated.adminStateChangedAt,
      notification,
    });
  }

  const intake = await findAdminIntakeDetail(
    id,
    auth.context.storeId,
    auth.context.role === "store_admin",
  );

  const updated = await updateAdminDocumentState({
    id,
    documentType,
    nextState: "returned",
    adminStoreId: auth.context.storeId,
    restrictToStore: auth.context.role === "store_admin",
  });

  if (!updated) {
    return apiError("NOT_FOUND", "対象文書が見つかりません", 404);
  }

  if (!intake) {
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
      eventType: "returned",
      reason: parsed.data.reason,
    },
  });

  const notification = await sendReturnNotificationEmail({
    to: intake.email || intake.inviteEmail,
    recipientName: intake.fullName || intake.invitedName || "従業員",
    storeName: intake.store.name,
    documentLabel: getReturnedDocumentLabel(documentType),
    reason: parsed.data.reason,
    resubmissionUrl: buildResubmissionUrl({
      requestUrl: request.url,
      token: intake.intakeToken,
      documentType,
    }),
  });

  return ok({
    ok: true,
    id: updated.intakeId,
    documentType: updated.documentType,
    adminState: "returned",
    intakeStatus: updated.intakeStatus,
    reason: parsed.data.reason,
    changedAt: new Date().toISOString(),
    notification,
  });
}
